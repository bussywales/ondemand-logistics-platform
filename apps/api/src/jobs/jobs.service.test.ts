import { describe, expect, it, vi } from "vitest";
import { JobsService } from "./jobs.service.js";

const ACTOR_ID = "9d90d9cb-aaed-494e-aebf-d0f02b9618fe";
const QUOTE_ID = "07ce83ef-3d05-4f78-9f5f-a21191f2d07e";
const JOB_ID = "c028cb10-f12f-4300-8f0b-6d398e3dd870";

describe("JobsService#createJobRequest", () => {
  it("returns cached idempotent responses on retry", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            id: QUOTE_ID,
            org_id: null,
            created_by_user_id: ACTOR_ID,
            distance_miles: "4.25",
            eta_minutes: 18,
            vehicle_type: "BIKE",
            customer_total_cents: 1600,
            driver_payout_gross_cents: 980,
            platform_fee_cents: 620,
            pricing_version: "phase1_test_v1",
            premium_distance_flag: false
          }
        ]
      }),
      withIdempotency: vi.fn().mockResolvedValue({
        replay: true,
        responseCode: 201,
        body: { id: JOB_ID }
      })
    };

    const service = new JobsService(pg as never);
    const result = await service.createJobRequest(
      {
        consumerId: ACTOR_ID,
        quoteId: QUOTE_ID,
        pickupAddress: "101 Main St",
        dropoffAddress: "202 Oak Ave",
        pickupCoordinates: { latitude: 51.5, longitude: -0.1 },
        dropoffCoordinates: { latitude: 51.51, longitude: -0.09 }
      },
      ACTOR_ID,
      "idem-job-0001"
    );

    expect(result.replay).toBe(true);
    expect(result.body).toEqual({ id: JOB_ID });
    expect(pg.withIdempotency).toHaveBeenCalledOnce();
  });
});
