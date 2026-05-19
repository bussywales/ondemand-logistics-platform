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
    expect(query).toHaveBeenCalledWith(expect.stringContaining("where status = $1"), ["NEW"]);
  });

  it("updates admin status and note", async () => {
    const reviewedRow = {
      ...DEMO_ROW,
      status: "CONTACTED",
      admin_note: "Follow up after investor walkthrough.",
      reviewed_by: "22222222-2222-4222-8222-222222222222",
      reviewed_at: NOW
    };
    const { query, service } = createService([reviewedRow]);

    const result = await service.updateAdminDemoRequest("22222222-2222-4222-8222-222222222222", DEMO_ROW.id, {
      status: "CONTACTED",
      adminNote: "Follow up after investor walkthrough."
    });

    expect(result.status).toBe("CONTACTED");
    expect(result.adminNote).toBe("Follow up after investor walkthrough.");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("update public.demo_requests"), expect.arrayContaining([DEMO_ROW.id, "CONTACTED"]));
  });

  it("throws when updating a missing request", async () => {
    const { service } = createService([]);

    await expect(
      service.updateAdminDemoRequest("22222222-2222-4222-8222-222222222222", DEMO_ROW.id, { status: "REVIEWED" })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
