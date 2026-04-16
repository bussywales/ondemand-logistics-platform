import { describe, expect, it } from "vitest";
import { UnprocessableEntityException } from "@nestjs/common";
import { computeQuote } from "./quotes.service.js";

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
});
