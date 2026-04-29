import { describe, expect, it, vi } from "vitest";
import { NotificationsService } from "./notifications.service.js";

const USER_ID = "3072f60c-81a5-4658-aa11-13a59b42cc8c";
const JOB_ID = "04f99ff2-df87-4f8b-aa10-8aef6d675fd4";
const ORDER_ID = "3ed1057d-4416-4eee-b05d-8501ce691d59";
const PAYMENT_ID = "fbc20bd9-1d7b-494a-a11b-0f1b6029dc2f";

describe("NotificationsService", () => {
  it("returns business-scoped notifications sorted newest first", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          {
            source_id: "12",
            event_type: "JOB_DISPATCH_FAILED",
            created_at: new Date("2026-04-29T09:00:00.000Z"),
            job_id: JOB_ID,
            order_id: null,
            payment_id: null,
            payload: { reason: "no_eligible_drivers" }
          },
          {
            source_id: "13",
            event_type: "JOB_ASSIGNED",
            created_at: new Date("2026-04-29T09:30:00.000Z"),
            job_id: JOB_ID,
            order_id: ORDER_ID,
            payment_id: PAYMENT_ID,
            payload: {}
          }
        ]
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            source_id: "c4e2f8d9-a8ac-45d8-b4e4-6e0d5effc911",
            event_type: "JOB_DISPATCH_REQUESTED",
            created_at: new Date("2026-04-29T08:45:00.000Z"),
            job_id: JOB_ID,
            order_id: ORDER_ID,
            payment_id: PAYMENT_ID,
            payload: { trigger: "customer_order_submitted" }
          }
        ]
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            source_id: "7",
            event_type: "PAYMENT_CAPTURED",
            created_at: new Date("2026-04-29T10:00:00.000Z"),
            job_id: JOB_ID,
            order_id: ORDER_ID,
            payment_id: PAYMENT_ID,
            payload: { amountCapturedCents: 4180 }
          }
        ]
      });

    const service = new NotificationsService({ query } as never);
    const result = await service.listBusinessNotifications(USER_ID);

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("from public.job_events"),
      [USER_ID, expect.any(Array)]
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("from public.outbox_messages"),
      [USER_ID, expect.any(Array)]
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("from public.payment_events"),
      [USER_ID, expect.any(Array)]
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        id: "payment_event:7",
        type: "PAYMENT_CAPTURED",
        title: "Payment captured",
        severity: "success",
        entityType: "order",
        entityId: ORDER_ID
      }),
      expect.objectContaining({
        id: "job_event:13",
        type: "JOB_ASSIGNED",
        title: "Driver assigned",
        entityType: "job",
        entityId: JOB_ID
      }),
      expect.objectContaining({
        id: "job_event:12",
        type: "JOB_DISPATCH_FAILED",
        severity: "danger",
        entityType: "job",
        entityId: JOB_ID
      }),
      expect.objectContaining({
        id: "outbox:c4e2f8d9-a8ac-45d8-b4e4-6e0d5effc911",
        type: "JOB_DISPATCH_REQUESTED",
        severity: "info",
        entityType: "job",
        entityId: JOB_ID
      })
    ]);
  });

  it("returns a safe empty list when the operator has no relevant events", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const service = new NotificationsService({ query } as never);
    const result = await service.listBusinessNotifications(USER_ID);

    expect(result).toEqual({ items: [] });
  });
});
