import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException
} from "@nestjs/common";
import {
  CreateQuoteSchema,
  type CreateQuoteInput,
  type QuoteBreakdownLine,
  type QuoteDto,
  QuoteSchema,
  VehicleTypeSchema,
  type QuoteTimeOfDay
} from "@shipwright/contracts";
import { PgService } from "../database/pg.service.js";
import { createLogger, enrichLogContext } from "@shipwright/observability";

const PRICING_VERSION = "phase1_2026_04_16_v1";

const CUSTOMER_BASE_CENTS = { BIKE: 650, CAR: 925 } as const;
const CUSTOMER_MILE_CENTS = { BIKE: 185, CAR: 255 } as const;
const CUSTOMER_MINUTE_CENTS = { BIKE: 14, CAR: 18 } as const;
const DRIVER_BASE_CENTS = { BIKE: 380, CAR: 540 } as const;
const DRIVER_MILE_CENTS = { BIKE: 110, CAR: 150 } as const;
const DRIVER_MINUTE_CENTS = { BIKE: 9, CAR: 11 } as const;
const DEMAND_SURCHARGE_CENTS = { BIKE: 180, CAR: 250 } as const;
const WEATHER_SURCHARGE_CENTS = { BIKE: 140, CAR: 180 } as const;
const DRIVER_DEMAND_BONUS_CENTS = { BIKE: 120, CAR: 170 } as const;
const DRIVER_WEATHER_BONUS_CENTS = { BIKE: 110, CAR: 150 } as const;
const PREMIUM_DISTANCE_SURCHARGE_CENTS = { BIKE: 325, CAR: 450 } as const;
const DRIVER_PREMIUM_DISTANCE_BONUS_CENTS = { BIKE: 220, CAR: 320 } as const;
const TIME_OF_DAY_SURCHARGE_CENTS: Record<QuoteTimeOfDay, number> = {
  BREAKFAST: 0,
  LUNCH: 75,
  AFTERNOON: 40,
  DINNER: 180,
  OVERNIGHT: 260
};

type QuoteRow = {
  id: string;
  org_id: string | null;
  created_by_user_id: string;
  distance_miles: string;
  eta_minutes: number;
  vehicle_type: string;
  time_of_day: QuoteTimeOfDay;
  demand_flag: boolean;
  weather_flag: boolean;
  customer_total_cents: number;
  driver_payout_gross_cents: number;
  platform_fee_cents: number;
  pricing_version: string;
  premium_distance_flag: boolean;
  breakdown_lines: QuoteBreakdownLine[];
  created_at: string;
};

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}

export type ComputedQuote = {
  customerTotalCents: number;
  driverPayoutGrossCents: number;
  platformFeeCents: number;
  breakdownLines: QuoteBreakdownLine[];
  pricingVersion: string;
  premiumDistanceFlag: boolean;
};

export function computeQuote(input: CreateQuoteInput): ComputedQuote {
  if (input.distanceMiles > 12) {
    throw new UnprocessableEntityException("distance_exceeds_hard_cap");
  }

  const vehicle = VehicleTypeSchema.parse(input.vehicleType);
  const premiumDistanceFlag = input.distanceMiles > 8 && input.distanceMiles <= 12;
  const roundedMiles = Math.round(input.distanceMiles * 100) / 100;

  const breakdownLines: QuoteBreakdownLine[] = [
    {
      code: "BASE_FARE",
      label: `${vehicle.toLowerCase()} base fare`,
      amountCents: CUSTOMER_BASE_CENTS[vehicle]
    },
    {
      code: "DISTANCE",
      label: "distance component",
      amountCents: Math.round(roundedMiles * CUSTOMER_MILE_CENTS[vehicle])
    },
    {
      code: "ETA",
      label: "time estimate component",
      amountCents: input.etaMinutes * CUSTOMER_MINUTE_CENTS[vehicle]
    }
  ];

  const timeOfDaySurcharge = TIME_OF_DAY_SURCHARGE_CENTS[input.timeOfDay];
  if (timeOfDaySurcharge > 0) {
    breakdownLines.push({
      code: "TIME_OF_DAY",
      label: `${input.timeOfDay.toLowerCase()} surcharge`,
      amountCents: timeOfDaySurcharge
    });
  }

  if (input.demandFlag) {
    breakdownLines.push({
      code: "DEMAND",
      label: "demand surcharge",
      amountCents: DEMAND_SURCHARGE_CENTS[vehicle]
    });
  }

  if (input.weatherFlag) {
    breakdownLines.push({
      code: "WEATHER",
      label: "weather surcharge",
      amountCents: WEATHER_SURCHARGE_CENTS[vehicle]
    });
  }

  if (premiumDistanceFlag) {
    breakdownLines.push({
      code: "PREMIUM_DISTANCE",
      label: "premium distance surcharge",
      amountCents: PREMIUM_DISTANCE_SURCHARGE_CENTS[vehicle]
    });
  }

  const customerTotalCents = breakdownLines.reduce((sum, line) => sum + line.amountCents, 0);
  const driverPayoutGrossCents =
    DRIVER_BASE_CENTS[vehicle] +
    Math.round(roundedMiles * DRIVER_MILE_CENTS[vehicle]) +
    input.etaMinutes * DRIVER_MINUTE_CENTS[vehicle] +
    (input.demandFlag ? DRIVER_DEMAND_BONUS_CENTS[vehicle] : 0) +
    (input.weatherFlag ? DRIVER_WEATHER_BONUS_CENTS[vehicle] : 0) +
    (premiumDistanceFlag ? DRIVER_PREMIUM_DISTANCE_BONUS_CENTS[vehicle] : 0);

  const platformFeeCents = customerTotalCents - driverPayoutGrossCents;
  if (platformFeeCents < 0) {
    throw new UnprocessableEntityException("invalid_pricing_configuration");
  }

  return {
    customerTotalCents,
    driverPayoutGrossCents,
    platformFeeCents,
    breakdownLines,
    pricingVersion: PRICING_VERSION,
    premiumDistanceFlag
  };
}

@Injectable()
export class QuotesService {
  private readonly logger = createLogger({ name: "api-quotes" });

  constructor(private readonly pg: PgService) {}

  async createQuote(input: unknown, userId: string, idempotencyKey: string) {
    const parsed = CreateQuoteSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_quote_payload",
        issues: parsed.error.issues
      });
    }

    const payload = parsed.data;
    if (payload.orgId) {
      await this.assertOrgOperator(payload.orgId, userId);
    }

    const computed = computeQuote(payload);
    const log = enrichLogContext(this.logger, { actor_id: userId });

    const result = await this.pg.withIdempotency({
      actorId: userId,
      endpoint: "/v1/quotes",
      idempotencyKey,
      execute: async (client) => {
        const inserted = await client.query<QuoteRow>(
          `insert into public.quotes (
             org_id,
             created_by_user_id,
             distance_miles,
             eta_minutes,
             vehicle_type,
             time_of_day,
             demand_flag,
             weather_flag,
             customer_total_cents,
             driver_payout_gross_cents,
             platform_fee_cents,
             premium_distance_flag,
             pricing_version,
             breakdown_lines,
             quote_input,
             quote_output
           ) values (
             $1, $2, $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb
           )
           returning id, org_id, created_by_user_id, distance_miles, eta_minutes,
             vehicle_type, time_of_day, demand_flag, weather_flag,
             customer_total_cents, driver_payout_gross_cents, platform_fee_cents,
             pricing_version, premium_distance_flag, breakdown_lines, created_at`,
          [
            payload.orgId ?? null,
            userId,
            payload.distanceMiles,
            payload.etaMinutes,
            payload.vehicleType,
            payload.timeOfDay,
            payload.demandFlag,
            payload.weatherFlag,
            computed.customerTotalCents,
            computed.driverPayoutGrossCents,
            computed.platformFeeCents,
            computed.premiumDistanceFlag,
            computed.pricingVersion,
            JSON.stringify(computed.breakdownLines),
            JSON.stringify(payload),
            JSON.stringify({
              ...computed,
              distanceMiles: payload.distanceMiles,
              etaMinutes: payload.etaMinutes,
              vehicleType: payload.vehicleType,
              timeOfDay: payload.timeOfDay,
              demandFlag: payload.demandFlag,
              weatherFlag: payload.weatherFlag
            })
          ]
        );

        const body = this.mapQuote(inserted.rows[0]);
        return {
          responseCode: 201,
          body
        };
      }
    });

    log.info({ replay: result.replay, quote_id: result.body.id }, "quote_created");
    return result;
  }

  private async assertOrgOperator(orgId: string, userId: string) {
    const membership = await this.pg.query<{ role: string }>(
      `select role
       from public.org_memberships
       where org_id = $1 and user_id = $2 and is_active = true
         and role in ('BUSINESS_OPERATOR', 'ADMIN')`,
      [orgId, userId]
    );

    if (membership.rowCount === 0) {
      throw new ForbiddenException("org_operator_required");
    }
  }

  private mapQuote(row: QuoteRow): QuoteDto {
    return QuoteSchema.parse({
      id: row.id,
      orgId: row.org_id,
      createdByUserId: row.created_by_user_id,
      distanceMiles: Number(row.distance_miles),
      etaMinutes: row.eta_minutes,
      vehicleType: row.vehicle_type,
      timeOfDay: row.time_of_day,
      demandFlag: row.demand_flag,
      weatherFlag: row.weather_flag,
      customerTotalCents: row.customer_total_cents,
      driverPayoutGrossCents: row.driver_payout_gross_cents,
      platformFeeCents: row.platform_fee_cents,
      pricingVersion: row.pricing_version,
      premiumDistanceFlag: row.premium_distance_flag,
      breakdownLines: row.breakdown_lines,
      createdAt: toIsoString(row.created_at)
    });
  }
}
