import { describe, expect, it } from "vitest";
import { CreateJobRequestSchema, CreateQuoteSchema } from "./index.js";

describe("CreateQuoteSchema", () => {
  it("allows quotes at or below the hard cap", () => {
    const parsed = CreateQuoteSchema.safeParse({
      distanceMiles: 12,
      etaMinutes: 42,
      vehicleType: "BIKE",
      timeOfDay: "DINNER",
      demandFlag: false,
      weatherFlag: false
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects quotes above the hard cap", () => {
    const parsed = CreateQuoteSchema.safeParse({
      distanceMiles: 12.1,
      etaMinutes: 42,
      vehicleType: "BIKE",
      timeOfDay: "DINNER",
      demandFlag: false,
      weatherFlag: false
    });

    expect(parsed.success).toBe(false);
  });
});

describe("CreateJobRequestSchema", () => {
  it("requires single pickup and single drop coordinates", () => {
    const parsed = CreateJobRequestSchema.safeParse({
      consumerId: "d1ec1f2e-a2db-4f35-af56-ac5fec00945f",
      quoteId: "38db8fef-ef0b-45ff-a88c-c5c8f4ca4766",
      pickupAddress: "101 Main St",
      dropoffAddress: "202 Oak Ave",
      pickupCoordinates: { latitude: 51.5, longitude: -0.1 },
      dropoffCoordinates: { latitude: 51.51, longitude: -0.09 }
    });

    expect(parsed.success).toBe(true);
  });
});
