import type { AppJob, BusinessProfile, PaymentSummary, TimelineEvent, TrackingSummary, VehicleType } from "./product-state";
import { createId } from "./product-state";

type ApiConfig = Pick<BusinessProfile, "apiBaseUrl" | "authToken" | "orgId" | "consumerId">;

type QuoteResponse = {
  id: string;
  premiumDistanceFlag: boolean;
  pricingVersion: string;
  customerTotalCents: number;
  driverPayoutGrossCents: number;
  platformFeeCents: number;
};

type JobResponse = {
  id: string;
  quoteId: string | null;
  status: AppJob["status"];
  pickupAddress: string;
  dropoffAddress: string;
  distanceMiles: number;
  etaMinutes: number;
  vehicleRequired: VehicleType;
  premiumDistanceFlag: boolean;
  customerTotalCents: number;
  driverPayoutGrossCents: number;
  platformFeeCents: number;
  pricingVersion: string;
  createdAt: string;
  assignedDriverId: string | null;
};

type JobsPageResponse = {
  items: JobResponse[];
  page: number;
  limit: number;
  hasMore: boolean;
};

type TrackingResponse = {
  status: AppJob["status"];
  etaMinutes: number;
  premiumDistanceFlag: boolean;
  assignedDriver: {
    displayName: string;
    latestLocation: { latitude: number; longitude: number } | null;
  } | null;
  timeline: Array<{
    id: number;
    eventType: string;
    createdAt: string;
  }>;
};

type PaymentResponse = {
  payment: {
    id: string;
    status: PaymentSummary["status"];
    amountAuthorizedCents: number;
    amountCapturedCents: number;
    amountRefundedCents: number;
    customerTotalCents: number;
    platformFeeCents: number;
    payoutGrossCents: number;
    currency: string;
    clientSecret: string | null;
    lastError: string | null;
  };
};

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function ensureLiveConfig(config: ApiConfig) {
  if (!config.authToken.trim()) {
    throw new Error("Live mode requires a bearer token.");
  }

  if (!config.consumerId.trim()) {
    throw new Error("Live mode requires a consumer ID.");
  }
}

async function apiFetch<T>(config: ApiConfig, path: string, init?: RequestInit): Promise<T> {
  ensureLiveConfig(config);

  const response = await fetch(`${normalizeBaseUrl(config.apiBaseUrl)}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.authToken.trim()}`,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as unknown) : null;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function toTrackingSummary(tracking?: TrackingResponse | null): TrackingSummary {
  if (!tracking) {
    return {
      latestLocation: null,
      assignedDriverName: null,
      timeline: []
    };
  }

  return {
    latestLocation: tracking.assignedDriver?.latestLocation ?? null,
    assignedDriverName: tracking.assignedDriver?.displayName ?? null,
    timeline: tracking.timeline.map((event): TimelineEvent => ({
      id: String(event.id),
      eventType: event.eventType,
      createdAt: event.createdAt,
      summary: event.eventType.replace(/_/g, " ").toLowerCase()
    }))
  };
}

function toPaymentSummary(job: JobResponse, payment?: PaymentResponse | null): PaymentSummary {
  const item = payment?.payment;
  return {
    id: item?.id ?? createId("payment"),
    status: item?.status ?? "REQUIRES_PAYMENT_METHOD",
    customerTotalCents: item?.customerTotalCents ?? job.customerTotalCents,
    platformFeeCents: item?.platformFeeCents ?? job.platformFeeCents,
    payoutGrossCents: item?.payoutGrossCents ?? job.driverPayoutGrossCents,
    amountAuthorizedCents: item?.amountAuthorizedCents ?? 0,
    amountCapturedCents: item?.amountCapturedCents ?? 0,
    amountRefundedCents: item?.amountRefundedCents ?? 0,
    currency: item?.currency ?? "GBP",
    clientSecret: item?.clientSecret ?? null,
    lastError: item?.lastError ?? null
  };
}

function toAppJob(job: JobResponse, tracking?: TrackingResponse | null, payment?: PaymentResponse | null): AppJob {
  return {
    id: job.id,
    mode: "live",
    quoteId: job.quoteId,
    status: job.status,
    pickupAddress: job.pickupAddress,
    dropoffAddress: job.dropoffAddress,
    distanceMiles: job.distanceMiles,
    etaMinutes: tracking?.etaMinutes ?? job.etaMinutes,
    vehicleRequired: job.vehicleRequired,
    premiumDistanceFlag: tracking?.premiumDistanceFlag ?? job.premiumDistanceFlag,
    customerTotalCents: job.customerTotalCents,
    driverPayoutGrossCents: job.driverPayoutGrossCents,
    platformFeeCents: job.platformFeeCents,
    pricingVersion: job.pricingVersion,
    createdAt: job.createdAt,
    tracking: toTrackingSummary(tracking),
    payment: toPaymentSummary(job, payment)
  };
}

export async function createLiveJob(config: ApiConfig, input: {
  pickupAddress: string;
  dropoffAddress: string;
  distanceMiles: number;
  etaMinutes: number;
  vehicleType: VehicleType;
  pickupCoordinates: { latitude: number; longitude: number };
  dropoffCoordinates: { latitude: number; longitude: number };
}) {
  const idempotencyKey = createId("idem");
  const quote = await apiFetch<QuoteResponse>(config, "/v1/quotes", {
    method: "POST",
    headers: {
      "x-idempotency-key": `${idempotencyKey}-quote`
    },
    body: JSON.stringify({
      orgId: config.orgId.trim() || null,
      distanceMiles: input.distanceMiles,
      etaMinutes: input.etaMinutes,
      vehicleType: input.vehicleType,
      timeOfDay: "AFTERNOON",
      demandFlag: false,
      weatherFlag: false
    })
  });

  const job = await apiFetch<JobResponse>(config, "/v1/jobs", {
    method: "POST",
    headers: {
      "x-idempotency-key": `${idempotencyKey}-job`
    },
    body: JSON.stringify({
      orgId: config.orgId.trim() || null,
      consumerId: config.consumerId.trim(),
      quoteId: quote.id,
      pickupAddress: input.pickupAddress,
      dropoffAddress: input.dropoffAddress,
      pickupCoordinates: input.pickupCoordinates,
      dropoffCoordinates: input.dropoffCoordinates
    })
  });

  const payment = await fetchPayment(config, job.id).catch(() => null);
  return toAppJob(job, null, payment ? { payment } : null);
}

export async function listLiveJobs(config: ApiConfig) {
  const page = await apiFetch<JobsPageResponse>(config, "/v1/business/jobs?page=1&limit=20", {
    method: "GET"
  });

  return page.items.map((job) => toAppJob(job));
}

export async function getLiveJob(config: ApiConfig, jobId: string) {
  const [job, tracking, payment] = await Promise.all([
    apiFetch<JobResponse>(config, `/v1/jobs/${jobId}`, { method: "GET" }),
    fetchTracking(config, jobId).catch(() => null),
    fetchPayment(config, jobId).catch(() => null)
  ]);

  return toAppJob(job, tracking, payment ? { payment } : null);
}

export async function fetchTracking(config: ApiConfig, jobId: string) {
  return apiFetch<TrackingResponse>(config, `/v1/jobs/${jobId}/tracking`, { method: "GET" });
}

export async function fetchPayment(config: ApiConfig, jobId: string) {
  const payload = await apiFetch<PaymentResponse>(config, `/v1/jobs/${jobId}/payment`, { method: "GET" });
  return payload.payment;
}

export async function authorizePayment(config: ApiConfig, jobId: string, paymentMethodId: string) {
  const payload = await apiFetch<PaymentResponse>(config, `/v1/jobs/${jobId}/payment/authorize`, {
    method: "POST",
    headers: {
      "x-idempotency-key": `${createId("idem")}-payment`
    },
    body: JSON.stringify({ paymentMethodId })
  });

  return payload.payment;
}
