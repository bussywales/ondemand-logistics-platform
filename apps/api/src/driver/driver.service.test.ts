import { ConflictException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DriverService } from "./driver.service.js";

const ACTOR_ID = "ea24f6a3-aad4-4f58-a1b6-621e89658b34";
const DRIVER_ID = "2f38e3db-3f4d-4725-b071-b4ca67637dcc";
const OTHER_USER_ID = "42d79749-841d-42bf-b674-afed40ebf8e0";
const OFFER_ID = "45ac7a91-2a30-4586-aa66-e46e317bcaf9";
const JOB_ID = "3f84ca71-0da1-4dd4-a9a5-3d8162a379f4";

function makeService(clientQuery: ReturnType<typeof vi.fn>) {
  const pg = {
    query: vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: DRIVER_ID,
          availability_status: "ONLINE",
          latest_latitude: null,
          latest_longitude: null,
          available_since: null,
          last_location_at: null
        }
      ]
    }),
    withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
      replay: false,
      ...(await execute({ query: clientQuery }))
    }))
  };

  return new DriverService(pg as never);
}

describe("DriverService#acceptOffer", () => {
  it("rejects accepting another driver's offer", async () => {
    const clientQuery = vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          offer_id: OFFER_ID,
          job_id: JOB_ID,
          driver_id: DRIVER_ID,
          driver_user_id: OTHER_USER_ID,
          status: "OFFERED",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          distance_miles_snapshot: "4.2",
          eta_minutes_snapshot: 16,
          payout_gross_snapshot: 1100
        }
      ]
    });

    const service = makeService(clientQuery);

    await expect(service.acceptOffer(OFFER_ID, ACTOR_ID, "idem-offer-1")).rejects.toThrow(
      ForbiddenException
    );
  });

  it("prevents double accept when the job is no longer assignable", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            offer_id: OFFER_ID,
            job_id: JOB_ID,
            driver_id: DRIVER_ID,
            driver_user_id: ACTOR_ID,
            status: "OFFERED",
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            distance_miles_snapshot: "4.2",
            eta_minutes_snapshot: 16,
            payout_gross_snapshot: 1100
          }
        ]
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const service = makeService(clientQuery);

    await expect(service.acceptOffer(OFFER_ID, ACTOR_ID, "idem-offer-2")).rejects.toThrow(
      new ConflictException("job_no_longer_assignable")
    );
  });
});
