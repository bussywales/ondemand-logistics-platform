import { describe, expect, it, vi } from "vitest";
import { NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { DemoRequestsService } from "./demo-requests.service.js";

const NOW = "2026-05-19T12:00:00.000Z";
const DEMO_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Ada Operator",
  email: "ada@example.com",
  organisation: "Pilot Kitchen",
  role: "Operator",
  interest_type: "PILOT_MERCHANT",
  message: "We want to rehearse a controlled pilot.",
  source: "landing_page",
  status: "NEW",
  admin_note: null,
  assigned_owner: null,
  next_follow_up_at: null,
  follow_up_priority: null,
  last_contacted_at: null,
  close_reason: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: NOW,
  updated_at: NOW
};

function createService(rows: unknown[] = [DEMO_ROW]) {
  const query = vi.fn().mockResolvedValue({ rows });
  const withTransaction = vi.fn((callback) => callback({ query }));
  return {
    query,
    withTransaction,
    service: new DemoRequestsService({ query, withTransaction } as never)
  };
}

describe("DemoRequestsService", () => {
  it("creates a public demo request", async () => {
    const { query, service, withTransaction } = createService();

    const result = await service.createDemoRequest({
      name: "Ada Operator",
      email: "ADA@example.com",
      organisation: "Pilot Kitchen",
      role: "Operator",
      interestType: "PILOT_MERCHANT",
      message: "We want to rehearse a controlled pilot."
    });

    expect(result.email).toBe("ada@example.com");
    expect(result.status).toBe("NEW");
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.demo_requests"), expect.arrayContaining(["ada@example.com"]));
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("insert into public.outbox_messages"),
      expect.arrayContaining([
        "demo_request",
        DEMO_ROW.id,
        "NOTIFY_ADMIN_DEMO_REQUEST_CREATED",
        expect.stringContaining('"demoRequestId"'),
        `demo-request-created:${DEMO_ROW.id}`
      ])
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("insert into public.demo_request_events"),
      expect.arrayContaining([DEMO_ROW.id, "CREATED", null, null, "NEW"])
    );
  });

  it("rejects invalid public demo request email", async () => {
    const { service } = createService();

    await expect(
      service.createDemoRequest({
        name: "Ada Operator",
        email: "not-an-email",
        interestType: "PILOT_MERCHANT"
      })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("rejects honeypot-filled demo requests", async () => {
    const { service } = createService();

    await expect(
      service.createDemoRequest({
        name: "Ada Operator",
        email: "ada@example.com",
        interestType: "PILOT_MERCHANT",
        website: "bot-filled-field"
      })
    ).rejects.toMatchObject({ message: "demo_request_rejected" });
  });

  it("lists admin demo requests with status filter", async () => {
    const { query, service } = createService();

    const result = await service.listAdminDemoRequests({ status: "NEW" });

    expect(result.items).toHaveLength(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("where d.status = $1"), ["NEW"]);
  });

  it("maps demo request notification delivery state from outbox and audit logs", async () => {
    const { service } = createService([
      {
        ...DEMO_ROW,
        notification_outbox_id: "44444444-4444-4444-8444-444444444444",
        notification_event_type: "NOTIFY_ADMIN_DEMO_REQUEST_CREATED",
        notification_retry_count: 1,
        notification_last_error: null,
        notification_processed_at: NOW,
        notification_next_attempt_at: NOW,
        notification_created_at: NOW,
        notification_audit_action: "external_notification_skipped",
        notification_audit_metadata: {
          sentChannels: [],
          skippedChannels: ["webhook:not_configured", "email:admin_notification_email_not_configured"],
          reason: "admin_notification_not_configured",
          emailProvider: "noop"
        },
        notification_audit_created_at: NOW
      }
    ]);

    const result = await service.listAdminDemoRequests({});

    expect(result.items[0]?.notification).toMatchObject({
      status: "skipped",
      channel: "webhook, email",
      provider: "noop",
      lastEventType: "NOTIFY_ADMIN_DEMO_REQUEST_CREATED",
      retryCount: 1
    });
  });

  it("updates admin status and note", async () => {
    const reviewedRow = {
      ...DEMO_ROW,
      status: "CONTACTED",
      admin_note: "Follow up after investor walkthrough.",
      assigned_owner: "Commercial lead",
      next_follow_up_at: "2026-05-20T12:00:00.000Z",
      follow_up_priority: "HIGH",
      last_contacted_at: NOW,
      close_reason: null,
      reviewed_by: "22222222-2222-4222-8222-222222222222",
      reviewed_at: NOW
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [DEMO_ROW] })
      .mockResolvedValueOnce({ rows: [reviewedRow] })
      .mockResolvedValue({ rows: [] });
    const withTransaction = vi.fn((callback) => callback({ query }));
    const service = new DemoRequestsService({ query, withTransaction } as never);

    const result = await service.updateAdminDemoRequest("22222222-2222-4222-8222-222222222222", DEMO_ROW.id, {
      status: "CONTACTED",
      adminNote: "Follow up after investor walkthrough.",
      assignedOwner: "Commercial lead",
      nextFollowUpAt: "2026-05-20T12:00:00.000Z",
      followUpPriority: "HIGH",
      lastContactedAt: NOW
    });

    expect(result.status).toBe("CONTACTED");
    expect(result.adminNote).toBe("Follow up after investor walkthrough.");
    expect(result.assignedOwner).toBe("Commercial lead");
    expect(result.followUpPriority).toBe("HIGH");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("update public.demo_requests"), expect.arrayContaining([DEMO_ROW.id, "CONTACTED"]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.demo_request_events"), expect.arrayContaining([DEMO_ROW.id, "STATUS_CHANGED"]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.demo_request_events"), expect.arrayContaining([DEMO_ROW.id, "OWNER_ASSIGNED"]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.demo_request_events"), expect.arrayContaining([DEMO_ROW.id, "FOLLOW_UP_SCHEDULED"]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.demo_request_events"), expect.arrayContaining([DEMO_ROW.id, "CONTACT_RECORDED"]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.demo_request_events"), expect.arrayContaining([DEMO_ROW.id, "PRIORITY_CHANGED"]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.outbox_messages"), expect.arrayContaining(["demo_request", DEMO_ROW.id, "DEMO_REQUEST_STATUS_UPDATED"]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.outbox_messages"), expect.arrayContaining(["demo_request", DEMO_ROW.id, "DEMO_REQUEST_FOLLOW_UP_SCHEDULED"]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.outbox_messages"), expect.arrayContaining(["demo_request", DEMO_ROW.id, "DEMO_REQUEST_CONTACT_RECORDED"]));
  });

  it("lists event history for admins", async () => {
    const eventRow = {
      id: "33333333-3333-4333-8333-333333333333",
      demo_request_id: DEMO_ROW.id,
      event_type: "STATUS_CHANGED",
      actor_id: "22222222-2222-4222-8222-222222222222",
      actor_label: null,
      previous_status: "NEW",
      new_status: "REVIEWED",
      note: "Reviewed.",
      metadata: { previousStatus: "NEW", newStatus: "REVIEWED" },
      created_at: NOW
    };
    const query = vi.fn().mockResolvedValueOnce({ rows: [DEMO_ROW] }).mockResolvedValueOnce({ rows: [eventRow] });
    const service = new DemoRequestsService({ query, withTransaction: vi.fn() } as never);

    const result = await service.listAdminDemoRequestEvents(DEMO_ROW.id);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.eventType).toBe("STATUS_CHANGED");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("from public.demo_request_events"), [DEMO_ROW.id]);
  });

  it("throws when updating a missing request", async () => {
    const { service } = createService([]);

    await expect(
      service.updateAdminDemoRequest("22222222-2222-4222-8222-222222222222", DEMO_ROW.id, { status: "REVIEWED" })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
