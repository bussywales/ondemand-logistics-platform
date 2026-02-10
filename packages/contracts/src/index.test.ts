import { describe, expect, it } from "vitest";
import { CreateJobSchema } from "./index.js";

describe("CreateJobSchema", () => {
  it("enforces hard distance cap at 12 miles", () => {
    const parsed = CreateJobSchema.safeParse({
      orgId: "38db8fef-ef0b-45ff-a88c-c5c8f4ca4766",
      consumerId: "d1ec1f2e-a2db-4f35-af56-ac5fec00945f",
      pickupAddress: "101 Main St",
      dropoffAddress: "202 Oak Ave",
      distanceMiles: 12.1,
      quotedPayoutCents: 1250,
      supplyType: "BIKE"
    });

    expect(parsed.success).toBe(false);
  });
});
