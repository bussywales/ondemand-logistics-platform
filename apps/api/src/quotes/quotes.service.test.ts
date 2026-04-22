import { describe, expect, it, vi } from "vitest";
import { UnprocessableEntityException } from "@nestjs/common";
import { computeQuote, QuotesService } from "./quotes.service.js";

const USER_ID = "9d90d9cb-aaed-494e-aebf-d0f02b9618fe";
const ORG_ID = "96660470-0513-49ae-9f6c-c84dd5b1028c";
const QUOTE_ID = "07ce83ef-3d05-4f78-9f5f-a21191f2d07e";

describe("computeQuote", () => {
  it("prices quotes at or below 8 miles without premium flag", () => {
    const quote = computeQuote({
      distanceMiles: 7.5,
      etaMinutes: 24,
      vehicleType: "BIKE",
      timeOfDay: "LUNCH",
      demandFlag: false,
      weatherFlag: false
    });

    expect(quote.premiumDistanceFlag).toBe(false);
    expect(quote.customerTotalCents).toBeGreaterThan(0);
    expect(quote.platformFeeCents + quote.driverPayoutGrossCents).toBe(quote.customerTotalCents);
  });

  it("flags quotes above 8 miles and at or below 12 miles as premium", () => {
    const quote = computeQuote({
      distanceMiles: 9.25,
      etaMinutes: 31,
      vehicleType: "CAR",
      timeOfDay: "DINNER",
      demandFlag: true,
      weatherFlag: false
    });

    expect(quote.premiumDistanceFlag).toBe(true);
    expect(quote.breakdownLines.some((line) => line.code === "PREMIUM_DISTANCE")).toBe(true);
  });

  it("rejects quotes above the hard cap", () => {
    expect(() =>
      computeQuote({
        distanceMiles: 12.01,
        etaMinutes: 40,
        vehicleType: "CAR",
        timeOfDay: "AFTERNOON",
        demandFlag: false,
        weatherFlag: false
      })
    ).toThrow(UnprocessableEntityException);
  });

  it("serializes pg timestamp dates in quote responses", async () => {
    const createdAt = new Date("2026-04-22T13:55:42.000Z");
    const clientQuery = vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{
        id: QUOTE_ID,
        org_id: ORG_ID,
        created_by_user_id: USER_ID,
        distance_miles: "4.80",
        eta_minutes: 22,
        vehicle_type: "BIKE",
        time_of_day: "LUNCH",
        demand_flag: false,
        weather_flag: false,
        customer_total_cents: 1879,
        driver_payout_gross_cents: 1106,
        platform_fee_cents: 773,
        pricing_version: "phase1_2026_04_16_v1",
        premium_distance_flag: false,
        breakdown_lines: [
          { code: "BASE_FARE", label: "bike base fare", amountCents: 650 }
        ],
        created_at: createdAt
      }]
    });

    const pg = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [{ role: "BUSINESS_OPERATOR" }]
      }),
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({ query: clientQuery }))
      }))
    };

    const service = new QuotesService(pg as never);
    const result = await service.createQuote(
      {
        orgId: ORG_ID,
        distanceMiles: 4.8,
        etaMinutes: 22,
        vehicleType: "BIKE",
        timeOfDay: "LUNCH",
        demandFlag: false,
        weatherFlag: false
      },
      USER_ID,
      "idem-quote-serialize-1"
    );

    expect(result.body.createdAt).toBe(createdAt.toISOString());
  });
});
