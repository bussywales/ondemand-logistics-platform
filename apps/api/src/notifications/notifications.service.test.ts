import { describe, expect, it, vi } from "vitest";
import { NotificationsService } from "./notifications.service.js";

const USER_ID = "3072f60c-81a5-4658-aa11-13a59b42cc8c";
const JOB_ID = "04f99ff2-df87-4f8b-aa10-8aef6d675fd4";
const ORDER_ID = "3ed1057d-4416-4eee-b05d-8501ce691d59";
const PAYMENT_ID = "fbc20bd9-1d7b-494a-a11b-0f1b6029dc2f";

describe("NotificationsService", () => {
  it("returns business-scoped notifications sorted newest first with persisted read state", async () => {
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
        rowCount: 2,
        rows: [
          {
            source_id: "c4e2f8d9-a8ac-45d8-b4e4-6e0d5effc911",
            event_type: "JOB_DISPATCH_REQUESTED",
            created_at: new Date("2026-04-29T08:45:00.000Z"),
            job_id: JOB_ID,
            order_id: ORDER_ID,
            payment_id: PAYMENT_ID,
            payload: { trigger: "customer_order_submitted" }
          },
          {
            source_id: "d8ea4767-a03d-4ddd-9622-814ded463cd0",
            event_type: "NOTIFY_BUSINESS_NEW_ORDER",
            created_at: new Date("2026-04-29T09:45:00.000Z"),
            job_id: JOB_ID,
            order_id: ORDER_ID,
            payment_id: PAYMENT_ID,
            payload: { orderId: ORDER_ID, jobId: JOB_ID },
            customer_name: "Alex Porter",
            restaurant_name: "Pilot Kitchen",
            total_cents: 4180,
            currency: "GBP"
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
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ notification_id: "payment_event:7" }]
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
    expect(query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("from public.notification_reads"),
      [USER_ID, ["payment_event:7", "outbox:d8ea4767-a03d-4ddd-9622-814ded463cd0", "job_event:13", "job_event:12", "outbox:c4e2f8d9-a8ac-45d8-b4e4-6e0d5effc911"]]
    );

    expect(result.items.map((item) => item.id)).toEqual([
      "payment_event:7",
      "outbox:d8ea4767-a03d-4ddd-9622-814ded463cd0",
      "job_event:13",
      "job_event:12",
      "outbox:c4e2f8d9-a8ac-45d8-b4e4-6e0d5effc911"
    ]);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: "payment_event:7",
        type: "PAYMENT_CAPTURED",
        title: "Payment captured",
        severity: "success",
        entityType: "order",
        entityId: ORDER_ID,
        read: true
      })
    );
    expect(result.items[1]).toEqual(
      expect.objectContaining({
        id: "outbox:d8ea4767-a03d-4ddd-9622-814ded463cd0",
        type: "NOTIFY_BUSINESS_NEW_ORDER",
        title: "New paid order",
        message: "Alex Porter · £41.80 · Pilot Kitchen",
        severity: "success",
        entityType: "order",
        entityId: ORDER_ID,
        read: false
      })
    );
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
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("persists a notification read marker for a visible notification", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ "?column?": 1 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ read_at: new Date("2026-04-30T09:00:00.000Z") }]
      });

    const service = new NotificationsService({ query } as never);
    const result = await service.markBusinessNotificationRead(USER_ID, "job_event:12");

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("from public.job_events"),
      [USER_ID, "12", expect.any(Array)]
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("insert into public.notification_reads"),
      [USER_ID, "job_event:12", "job_event"]
    );
    expect(result).toEqual({
      ok: true,
      notificationId: "job_event:12",
      readAt: "2026-04-30T09:00:00.000Z"
    });
  });

  it("rejects mark-read when the notification is outside the user's org scope", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const service = new NotificationsService({ query } as never);

    await expect(service.markBusinessNotificationRead(USER_ID, "payment_event:9")).rejects.toThrow("Notification not found.");
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("marks all currently visible notifications as read idempotently", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            source_id: "12",
            event_type: "JOB_DISPATCH_FAILED",
            created_at: new Date("2026-04-29T09:00:00.000Z"),
            job_id: JOB_ID,
            order_id: null,
            payment_id: null,
            payload: { reason: "no_eligible_drivers" }
          }
        ]
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ read_at: new Date("2026-04-30T10:15:00.000Z") }]
      });

    const service = new NotificationsService({ query } as never);
    const result = await service.markAllBusinessNotificationsRead(USER_ID);

    expect(query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("insert into public.notification_reads"),
      [USER_ID, ["job_event:12"], ["job_event"]]
    );
    expect(result).toEqual({
      ok: true,
      readAt: "2026-04-30T10:15:00.000Z",
      updatedCount: 1
    });
  });
});
