import { HttpException, HttpStatus, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  AdminAnalyticsSummarySchema,
  AnalyticsEventSchema,
  CreateAnalyticsEventSchema,
  type AdminAnalyticsSummaryDto,
  type AnalyticsEventDto,
  type AnalyticsEventName,
  type CreateAnalyticsEventInput
} from "@shipwright/contracts";
import { toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

const ListAnalyticsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  eventName: z
    .enum([
      "PUBLIC_PAGE_VIEW",
      "CTA_CLICKED",
      "PRICING_CTA_CLICKED",
      "DEMO_REQUEST_FORM_STARTED",
      "DEMO_REQUEST_SUBMITTED",
      "DEMO_REQUEST_FAILED",
      "MEGA_MENU_OPENED"
    ])
    .optional()
});

type RequestMeta = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

type AnalyticsEventRow = {
  id: string;
  event_name: string;
  source: string;
  path: string | null;
  referrer: string | null;
  session_id: string | null;
  visitor_id: string | null;
  demo_request_id: string | null;
  metadata: Record<string, unknown> | string | null;
  created_at: string | Date;
};

type MetricRow = {
  page_views: string | number;
  cta_clicks: string | number;
  demo_form_starts: string | number;
  demo_request_submits: string | number;
  demo_request_failures: string | number;
};

type BreakdownRow = {
  label: string | null;
  source: string | null;
  count: string | number;
};

function nullableText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function parseMetadata(value: AnalyticsEventRow["metadata"]) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return value;
}

function hashValue(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  const salt = process.env.ANALYTICS_HASH_SALT ?? "shipwright_analytics_v1";
  return createHash("sha256").update(`${salt}:${normalized}`).digest("hex");
}

function firstHeader(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function ipFromRequest(request?: RequestMeta | null) {
  const forwarded = firstHeader(request?.headers?.["x-forwarded-for"]);
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request?.ip ?? request?.socket?.remoteAddress ?? null;
}

function userAgentFromRequest(request?: RequestMeta | null) {
  return firstHeader(request?.headers?.["user-agent"]);
}

function numberFromRow(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function rate(submits: number, denominator: number) {
  return denominator > 0 ? Number((submits / denominator).toFixed(4)) : null;
}

function mapEvent(row: AnalyticsEventRow): AnalyticsEventDto {
  return AnalyticsEventSchema.parse({
    id: row.id,
    eventName: row.event_name,
    source: row.source,
    path: row.path,
    referrer: row.referrer,
    sessionId: row.session_id,
    visitorId: row.visitor_id,
    demoRequestId: row.demo_request_id,
    metadata: parseMetadata(row.metadata),
    createdAt: toIsoDateTime(row.created_at)
  });
}

function metricWindow(row: MetricRow) {
  const pageViews = numberFromRow(row.page_views);
  const ctaClicks = numberFromRow(row.cta_clicks);
  const demoFormStarts = numberFromRow(row.demo_form_starts);
  const demoRequestSubmits = numberFromRow(row.demo_request_submits);
  const demoRequestFailures = numberFromRow(row.demo_request_failures);

  return {
    pageViews,
    ctaClicks,
    demoFormStarts,
    demoRequestSubmits,
    demoRequestFailures,
    formStartToSubmitRate: rate(demoRequestSubmits, demoFormStarts),
    ctaToDemoRequestRate: rate(demoRequestSubmits, ctaClicks)
  };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly pg: PgService) {}

  async createPublicEvent(rawInput: unknown, request?: RequestMeta | null): Promise<AnalyticsEventDto> {
    const parsed = CreateAnalyticsEventSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new UnprocessableEntityException({ message: "invalid_analytics_event", issues: parsed.error.issues });
    }

    const input: CreateAnalyticsEventInput = parsed.data;
    const ipHash = hashValue(ipFromRequest(request));
    const userAgentHash = hashValue(userAgentFromRequest(request));

    if (ipHash) {
      const recent = await this.pg.query<{ count: string | number }>(
        `select count(*)::int as count
         from public.analytics_events
         where ip_hash = $1
           and created_at > now() - interval '1 minute'`,
        [ipHash]
      );
      if (Number(recent.rows[0]?.count ?? 0) > 120) {
        throw new HttpException("analytics_rate_limited", HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    const result = await this.pg.query<AnalyticsEventRow>(
      `insert into public.analytics_events (
         event_name,
         source,
         path,
         referrer,
         session_id,
         visitor_id,
         demo_request_id,
         metadata,
         user_agent_hash,
         ip_hash
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
       returning id, event_name, source, path, referrer, session_id, visitor_id, demo_request_id, metadata, created_at`,
      [
        input.eventName,
        input.source,
        nullableText(input.path),
        nullableText(input.referrer),
        nullableText(input.sessionId),
        nullableText(input.visitorId),
        input.demoRequestId ?? null,
        JSON.stringify(input.metadata ?? {}),
        userAgentHash,
        ipHash
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new UnprocessableEntityException("analytics_event_create_failed");
    }

    return mapEvent(row);
  }

  async getAdminSummary(rawQuery: Record<string, string | undefined> = {}): Promise<AdminAnalyticsSummaryDto> {
    const parsed = ListAnalyticsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new UnprocessableEntityException("invalid_analytics_filter");
    }

    const eventFilter = parsed.data.eventName ?? null;
    const from = parsed.data.from ?? null;
    const to = parsed.data.to ?? null;
    const [last7, last30, ctaPerformance, pricingInterest, recentEvents] = await Promise.all([
      this.getMetricWindow(7, eventFilter, from, to),
      this.getMetricWindow(30, eventFilter, from, to),
      this.getCtaPerformance(eventFilter, from, to),
      this.getPricingInterest(eventFilter, from, to),
      this.getRecentEvents(eventFilter, from, to)
    ]);

    return AdminAnalyticsSummarySchema.parse({
      generatedAt: new Date().toISOString(),
      windows: {
        last7Days: last7,
        last30Days: last30
      },
      ctaPerformance,
      pricingInterest,
      recentEvents
    });
  }

  private async getMetricWindow(days: number, eventName: AnalyticsEventName | null, from: string | null, to: string | null) {
    const values: unknown[] = [days];
    const clauses: string[] = [`created_at >= now() - ($1::int * interval '1 day')`];
    if (eventName) {
      values.push(eventName);
      clauses.push(`event_name = $${values.length}`);
    }
    if (from) {
      values.push(new Date(from));
      clauses.push(`created_at >= $${values.length}`);
    }
    if (to) {
      values.push(new Date(to));
      clauses.push(`created_at <= $${values.length}`);
    }

    const result = await this.pg.query<MetricRow>(
      `select
         count(*) filter (where event_name = 'PUBLIC_PAGE_VIEW')::int as page_views,
         count(*) filter (where event_name in ('CTA_CLICKED', 'PRICING_CTA_CLICKED'))::int as cta_clicks,
         count(*) filter (where event_name = 'DEMO_REQUEST_FORM_STARTED')::int as demo_form_starts,
         count(*) filter (where event_name = 'DEMO_REQUEST_SUBMITTED')::int as demo_request_submits,
         count(*) filter (where event_name = 'DEMO_REQUEST_FAILED')::int as demo_request_failures
       from public.analytics_events
       where ${clauses.join(" and ")}`,
      values
    );

    return metricWindow(result.rows[0] ?? { page_views: 0, cta_clicks: 0, demo_form_starts: 0, demo_request_submits: 0, demo_request_failures: 0 });
  }

  private async getCtaPerformance(eventName: AnalyticsEventName | null, from: string | null, to: string | null) {
    const values: unknown[] = [];
    const clauses = [`event_name in ('CTA_CLICKED', 'PRICING_CTA_CLICKED')`, `created_at >= now() - interval '30 days'`];
    if (eventName) {
      values.push(eventName);
      clauses.push(`event_name = $${values.length}`);
    }
    if (from) {
      values.push(new Date(from));
      clauses.push(`created_at >= $${values.length}`);
    }
    if (to) {
      values.push(new Date(to));
      clauses.push(`created_at <= $${values.length}`);
    }

    const result = await this.pg.query<BreakdownRow>(
      `select coalesce(nullif(metadata->>'label', ''), event_name) as label,
              nullif(metadata->>'source', '') as source,
              count(*)::int as count
       from public.analytics_events
       where ${clauses.join(" and ")}
       group by 1, 2
       order by count desc, label asc
       limit 20`,
      values
    );

    return result.rows.map((row) => ({ label: row.label ?? "Unknown CTA", source: row.source, count: numberFromRow(row.count) }));
  }

  private async getPricingInterest(eventName: AnalyticsEventName | null, from: string | null, to: string | null) {
    const values: unknown[] = [];
    const clauses = [`event_name in ('PRICING_CTA_CLICKED', 'DEMO_REQUEST_SUBMITTED')`, `created_at >= now() - interval '30 days'`];
    if (eventName) {
      values.push(eventName);
      clauses.push(`event_name = $${values.length}`);
    }
    if (from) {
      values.push(new Date(from));
      clauses.push(`created_at >= $${values.length}`);
    }
    if (to) {
      values.push(new Date(to));
      clauses.push(`created_at <= $${values.length}`);
    }

    const result = await this.pg.query<BreakdownRow>(
      `select coalesce(nullif(metadata->>'interestType', ''), nullif(metadata->>'interest', ''), 'unknown') as label,
              'pricing' as source,
              count(*)::int as count
       from public.analytics_events
       where ${clauses.join(" and ")}
       group by 1
       order by count desc, label asc
       limit 10`,
      values
    );

    return result.rows.map((row) => ({ label: row.label ?? "unknown", source: row.source, count: numberFromRow(row.count) }));
  }

  private async getRecentEvents(eventName: AnalyticsEventName | null, from: string | null, to: string | null) {
    const values: unknown[] = [];
    const clauses: string[] = [];
    if (eventName) {
      values.push(eventName);
      clauses.push(`event_name = $${values.length}`);
    }
    if (from) {
      values.push(new Date(from));
      clauses.push(`created_at >= $${values.length}`);
    }
    if (to) {
      values.push(new Date(to));
      clauses.push(`created_at <= $${values.length}`);
    }
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    const result = await this.pg.query<AnalyticsEventRow>(
      `select id, event_name, source, path, referrer, session_id, visitor_id, demo_request_id, metadata, created_at
       from public.analytics_events
       ${where}
       order by created_at desc
       limit 50`,
      values
    );

    return result.rows.map(mapEvent);
  }
}
