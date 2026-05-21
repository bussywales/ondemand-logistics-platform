import { describe, expect, it, vi } from "vitest";
import { AdminService } from "./admin.service.js";

function createSchemaReadiness(ok = true) {
  return {
    assertCriticalSchemaCompatibility: ok
      ? vi.fn().mockResolvedValue(undefined)
      : vi.fn().mockRejectedValue(new Error("not_ready"))
  };
}

describe("AdminService", () => {
  it("returns the admin overview aggregates and operational sections", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              org_id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
              org_name: "Pilot Org",
              restaurant_name: "Pilot Kitchen",
              restaurant_slug: "pilot-kitchen",
              status: "REQUESTED",
              customer_name: "Ada Customer",
              driver_name: null,
              vehicle_required: "BIKE",
              payment_id: "33333333-3333-4333-8333-333333333333",
              payment_status: "AUTHORIZED",
              pickup_address: "12 Exmouth Market, London",
              dropoff_address: "184 Upper Street, London",
              eta_minutes: 22,
              total_cents: 1886,
              currency: "gbp",
              created_at: new Date("2026-04-30T10:00:00.000Z"),
              updated_at: new Date("2026-04-30T10:05:00.000Z")
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              org_id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
              org_name: "Pilot Org",
              restaurant_id: "44444444-4444-4444-8444-444444444444",
              restaurant_name: "Pilot Kitchen",
              restaurant_slug: "pilot-kitchen",
              status: "PAYMENT_AUTHORIZED",
              customer_name: "Ada Customer",
              customer_email: "ada@example.com",
              customer_phone: "07500000000",
              delivery_address_summary: "184 Upper Street",
              total_cents: 1886,
              currency: "gbp",
              payment_id: "33333333-3333-4333-8333-333333333333",
              payment_status: "AUTHORIZED",
              job_id: "11111111-1111-4111-8111-111111111111",
              job_status: "REQUESTED",
              created_at: new Date("2026-04-30T10:00:00.000Z"),
              updated_at: new Date("2026-04-30T10:05:00.000Z")
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ backlog_count: 2, retrying_count: 1, failed_count: 1 }] })
        .mockResolvedValueOnce({ rows: [{ count: 1 }] })
        .mockResolvedValueOnce({ rows: [{ count: 3 }] })
    };

    const service = new AdminService(pg as never, createSchemaReadiness() as never);
    const overview = await service.getOverview();

    expect(overview.interventionQueue).toHaveLength(0);
    expect(overview.activeJobs).toHaveLength(1);
    expect(overview.recentOrders).toHaveLength(1);
    expect(overview.health.outboxBacklogCount).toBe(2);
    expect(overview.health.readiness.status).toBe("ok");
  });

  it("returns admin lists with normalized fulfilled orders and outbox rows", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: "55555555-5555-4555-8555-555555555555",
              org_id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
              org_name: "Pilot Org",
              restaurant_id: "44444444-4444-4444-8444-444444444444",
              restaurant_name: "Pilot Kitchen",
              restaurant_slug: "pilot-kitchen",
              status: "COMPLETED",
              customer_name: "Ada Customer",
              customer_email: "ada@example.com",
              customer_phone: "07500000000",
              delivery_address_summary: "184 Upper Street",
              total_cents: 1886,
              currency: "gbp",
              payment_id: "66666666-6666-4666-8666-666666666666",
              payment_status: "CAPTURED",
              job_id: "77777777-7777-4777-8777-777777777777",
              job_status: "DELIVERED",
              created_at: new Date("2026-04-30T10:00:00.000Z"),
              updated_at: new Date("2026-04-30T10:05:00.000Z")
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "88888888-8888-4888-8888-888888888888",
              aggregate_type: "job",
              aggregate_id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
              event_type: "JOB_DISPATCH_REQUESTED",
              retry_count: 2,
              last_error: "driver_lookup_failed",
              processed_at: null,
              next_attempt_at: new Date("2026-04-30T10:07:00.000Z"),
              created_at: new Date("2026-04-30T10:06:00.000Z")
            }
          ]
        })
    };

    const service = new AdminService(pg as never, createSchemaReadiness() as never);
    const [orders, outbox] = await Promise.all([service.listOrders(), service.listOutbox()]);

    expect(orders[0]?.status).toBe("FULFILLED");
    expect(outbox[0]?.lastError).toBe("driver_lookup_failed");
    expect(outbox[0]?.retryCount).toBe(2);
  });

  it("maps admin driver readiness statuses and checklist evidence", async () => {
    const pg = {
      query: vi.fn().mockResolvedValueOnce({
        rows: [
          {
            driver_id: "11111111-1111-4111-8111-111111111111",
            driver_name: "Ready Courier",
            availability_status: "ONLINE",
            verification_status: "APPROVED",
            vehicle_type: "BIKE",
            active_job_id: null,
            active_job_status: null,
            org_id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
            org_name: "Pilot Org",
            fleet_org_id: "99999999-9999-4999-8999-999999999999",
            fleet_org_name: "Northside Couriers",
            fleet_role: "DRIVER",
            restaurant_name: null,
            restaurant_slug: null,
            last_location_at: new Date(),
            created_at: new Date("2026-04-30T10:00:00.000Z"),
            updated_at: new Date("2026-04-30T10:05:00.000Z")
          },
          {
            driver_id: "22222222-2222-4222-8222-222222222222",
            driver_name: "Pending Courier",
            availability_status: "ONLINE",
            verification_status: "PENDING",
            vehicle_type: "CAR",
            active_job_id: null,
            active_job_status: null,
            org_id: null,
            org_name: null,
            fleet_org_id: null,
            fleet_org_name: null,
            fleet_role: null,
            restaurant_name: null,
            restaurant_slug: null,
            last_location_at: new Date(),
            created_at: new Date("2026-04-30T10:00:00.000Z"),
            updated_at: new Date("2026-04-30T10:05:00.000Z")
          },
          {
            driver_id: "33333333-3333-4333-8333-333333333333",
            driver_name: "Offline Courier",
            availability_status: "OFFLINE",
            verification_status: "APPROVED",
            vehicle_type: "BIKE",
            active_job_id: null,
            active_job_status: null,
            org_id: null,
            org_name: null,
            fleet_org_id: null,
            fleet_org_name: null,
            fleet_role: null,
            restaurant_name: null,
            restaurant_slug: null,
            last_location_at: null,
            created_at: new Date("2026-04-30T10:00:00.000Z"),
            updated_at: new Date("2026-04-30T10:05:00.000Z")
          },
          {
            driver_id: "44444444-4444-4444-8444-444444444444",
            driver_name: "Busy Courier",
            availability_status: "ONLINE",
            verification_status: "APPROVED",
            vehicle_type: "BIKE",
            active_job_id: "55555555-5555-4555-8555-555555555555",
            active_job_status: "ASSIGNED",
            org_id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
            org_name: "Pilot Org",
            fleet_org_id: "99999999-9999-4999-8999-999999999999",
            fleet_org_name: "Northside Couriers",
            fleet_role: "DRIVER",
            restaurant_name: "Pilot Kitchen",
            restaurant_slug: "pilot-kitchen",
            last_location_at: new Date(),
            created_at: new Date("2026-04-30T10:00:00.000Z"),
            updated_at: new Date("2026-04-30T10:05:00.000Z")
          }
        ]
      })
    };

    const service = new AdminService(pg as never, createSchemaReadiness() as never);
    const readiness = await service.listDriverReadiness();

    expect(readiness.items.map((item) => item.readinessStatus)).toEqual([
      "READY",
      "NEEDS_REVIEW",
      "NOT_ELIGIBLE",
      "NOT_ELIGIBLE"
    ]);
    expect(readiness.items[1]?.recommendedNextAction).toContain("Review verification");
    expect(readiness.items[2]?.recommendedNextAction).toContain("go online");
    expect(readiness.items[3]?.checklist.find((item) => item.key === "no_active_blocking_job")?.result).toBe("fail");
    expect(readiness.items[0]?.fleetOrgName).toBe("Northside Couriers");
    expect(readiness.items[0]?.fleetRole).toBe("DRIVER");
  });

  it("returns notification diagnostics without exposing secrets", async () => {
    const previousWebhook = process.env.DEMO_REQUEST_WEBHOOK_URL;
    const previousAdminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    const previousResend = process.env.RESEND_API_KEY;
    const previousFrom = process.env.NOTIFICATION_FROM_EMAIL;
    process.env.DEMO_REQUEST_WEBHOOK_URL = "https://hooks.example.test/shipwright";
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    delete process.env.RESEND_API_KEY;
    process.env.NOTIFICATION_FROM_EMAIL = "ShipWright <noreply@example.com>";

    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ pending: 1, retrying: 0, failed: 0, sent: 2, skipped: 3 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "audit:1",
              outbox_message_id: null,
              event_type: "TEST_ADMIN_NOTIFICATION",
              notification_type: "DEMO_REQUEST_CREATED",
              channel: "webhook:not_configured",
              status: "skipped",
              provider: "noop",
              last_attempt_at: new Date("2026-05-21T10:00:00.000Z"),
              retry_count: 0,
              safe_error_summary: "admin_notification_not_configured",
              created_at: new Date("2026-05-21T10:00:00.000Z")
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [] })
    };

    try {
      const diagnostics = await new AdminService(pg as never, createSchemaReadiness() as never).getNotificationDiagnostics();
      expect(diagnostics.configuration.webhookConfigured).toBe(true);
      expect(diagnostics.configuration.emailConfigured).toBe(false);
      expect(JSON.stringify(diagnostics)).not.toContain("hooks.example.test/shipwright");
      expect(diagnostics.counts.skipped).toBe(3);
    } finally {
      if (previousWebhook === undefined) delete process.env.DEMO_REQUEST_WEBHOOK_URL;
      else process.env.DEMO_REQUEST_WEBHOOK_URL = previousWebhook;
      if (previousAdminEmail === undefined) delete process.env.ADMIN_NOTIFICATION_EMAIL;
      else process.env.ADMIN_NOTIFICATION_EMAIL = previousAdminEmail;
      if (previousResend === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previousResend;
      if (previousFrom === undefined) delete process.env.NOTIFICATION_FROM_EMAIL;
      else process.env.NOTIFICATION_FROM_EMAIL = previousFrom;
    }
  });

  it("queues admin notification test events", async () => {
    const pg = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] })
    };

    const result = await new AdminService(pg as never, createSchemaReadiness() as never).createNotificationTest(
      { channel: "WEBHOOK", notificationType: "DEMO_REQUEST_CREATED" },
      "11111111-1111-4111-8111-111111111111"
    );

    expect(result.eventType).toBe("TEST_ADMIN_NOTIFICATION");
    expect(result.status).toBe("queued");
    expect(pg.query.mock.calls[0]?.[0]).toContain("insert into public.outbox_messages");
    expect(pg.query.mock.calls[0]?.[1]?.[3]).toContain('"test":true');
    expect(pg.query.mock.calls[0]?.[1]?.[3]).not.toContain("webhookUrl");
  });
});
