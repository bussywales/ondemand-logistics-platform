import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { BusinessService } from "./business.service.js";

const USER_ID = "9d90d9cb-aaed-494e-aebf-d0f02b9618fe";
const ORG_ID = "07ce83ef-3d05-4f78-9f5f-a21191f2d07e";
const MEMBERSHIP_ID = "c028cb10-f12f-4300-8f0b-6d398e3dd870";

function createUser() {
  return {
    id: USER_ID,
    token: {
      email: "ops@example.com",
      user_metadata: {
        display_name: "Busayo Adewale"
      }
    }
  };
}

describe("BusinessService", () => {
  it("returns a clean non-onboarded context when the auth user has no org yet", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            { column_name: "contact_name" },
            { column_name: "contact_email" },
            { column_name: "contact_phone" },
            { column_name: "operating_city" }
          ]
        })
        .mockResolvedValueOnce({
          rowCount: 0,
          rows: []
        })
        .mockResolvedValueOnce({
          rowCount: 0,
          rows: []
        })
    };

    const service = new BusinessService(pg as never);
    const context = await service.getBusinessContext(createUser());

    expect(context.onboarded).toBe(false);
    expect(context.currentOrg).toBeNull();
    expect(context.memberships).toHaveLength(0);
    expect(context.email).toBe("ops@example.com");
  });

  it("creates an org and operator membership for the authenticated user", async () => {
    const pgQuery = vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{ id: USER_ID, email: "ops@example.com", display_name: "Busayo Adewale" }]
    });
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          { column_name: "contact_name" },
          { column_name: "contact_email" },
          { column_name: "contact_phone" },
          { column_name: "operating_city" }
        ]
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: USER_ID, email: "ops@example.com", display_name: "Busayo Adewale" }]
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: USER_ID }]
      })
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: []
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: ORG_ID,
          name: "ShipWright Retail Ops",
          contact_name: "Busayo Adewale",
          contact_email: "ops@example.com",
          contact_phone: "+44 20 7946 0958",
          operating_city: "London",
          created_by: USER_ID,
          created_at: new Date().toISOString()
        }]
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: MEMBERSHIP_ID,
          org_id: ORG_ID,
          user_id: USER_ID,
          role: "BUSINESS_OPERATOR",
          is_active: true,
          created_at: new Date().toISOString()
        }]
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const pg = {
      query: pgQuery,
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({ query: clientQuery }))
      }))
    };

    const service = new BusinessService(pg as never);
    const result = await service.createBusinessOrg(
      {
        businessName: "ShipWright Retail Ops",
        contactName: "Busayo Adewale",
        email: "ops@example.com",
        phone: "+44 20 7946 0958",
        city: "London"
      },
      createUser(),
      "idem-business-org-1"
    );

    expect(result.body.currentOrg?.id).toBe(ORG_ID);
    expect(result.body.memberships[0]?.membership.role).toBe("BUSINESS_OPERATOR");
    expect(pgQuery).toHaveBeenCalledTimes(1);
  });

  it("returns the existing business context instead of creating a second org", async () => {
    const existingCreatedAt = new Date().toISOString();
    const pg = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [{ id: USER_ID, email: "ops@example.com", display_name: "Busayo Adewale" }]
      }),
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({
          query: vi
            .fn()
            .mockResolvedValueOnce({
              rows: [
                { column_name: "contact_name" },
                { column_name: "contact_email" },
                { column_name: "contact_phone" },
                { column_name: "operating_city" }
              ]
            })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: USER_ID, email: "ops@example.com", display_name: "Busayo Adewale" }]
            })
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: USER_ID }] })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{
                membership_id: MEMBERSHIP_ID,
                membership_org_id: ORG_ID,
                membership_user_id: USER_ID,
                membership_role: "BUSINESS_OPERATOR",
                membership_is_active: true,
                membership_created_at: existingCreatedAt,
                org_id: ORG_ID,
                org_name: "Existing Ops",
                org_contact_name: "Busayo Adewale",
                org_contact_email: "ops@example.com",
                org_contact_phone: "+44 20 7946 0958",
                org_operating_city: "London",
                org_created_by: USER_ID,
                org_created_at: existingCreatedAt
              }]
            })
        }))
      }))
    };

    const service = new BusinessService(pg as never);
    const result = await service.createBusinessOrg(
      {
        businessName: "New Name Ignored",
        contactName: "Busayo Adewale",
        email: "ops@example.com",
        phone: "+44 20 7946 0958",
        city: "London"
      },
      createUser(),
      "idem-business-org-existing"
    );

    expect(result.responseCode).toBe(200);
    expect(result.body.currentOrg?.id).toBe(ORG_ID);
    expect(result.body.currentOrg?.name).toBe("Existing Ops");
  });

  it("returns the cached idempotent response when the same key is retried", async () => {
    const cachedBody = {
      userId: USER_ID,
      email: "ops@example.com",
      displayName: "Busayo Adewale",
      onboarded: true,
      currentOrg: {
        id: ORG_ID,
        name: "ShipWright Retail Ops",
        contactName: "Busayo Adewale",
        contactEmail: "ops@example.com",
        contactPhone: "+44 20 7946 0958",
        city: "London",
        createdByUserId: USER_ID,
        createdAt: new Date().toISOString()
      },
      memberships: [{
        membership: {
          id: MEMBERSHIP_ID,
          orgId: ORG_ID,
          userId: USER_ID,
          role: "BUSINESS_OPERATOR",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        org: {
          id: ORG_ID,
          name: "ShipWright Retail Ops",
          contactName: "Busayo Adewale",
          contactEmail: "ops@example.com",
          contactPhone: "+44 20 7946 0958",
          city: "London",
          createdByUserId: USER_ID,
          createdAt: new Date().toISOString()
        }
      }]
    };

    const pg = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [{ id: USER_ID, email: "ops@example.com", display_name: "Busayo Adewale" }]
      }),
      withIdempotency: vi.fn().mockResolvedValue({
        replay: true,
        responseCode: 201,
        body: cachedBody
      })
    };

    const service = new BusinessService(pg as never);
    const result = await service.createBusinessOrg(
      {
        businessName: "ShipWright Retail Ops",
        contactName: "Busayo Adewale",
        email: "ops@example.com",
        phone: "+44 20 7946 0958",
        city: "London"
      },
      createUser(),
      "idem-business-org-retry"
    );

    expect(result.replay).toBe(true);
    expect(result.body.currentOrg?.id).toBe(ORG_ID);
  });

  it("returns onboarded business context for an operator", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            { column_name: "contact_name" },
            { column_name: "contact_email" },
            { column_name: "contact_phone" },
            { column_name: "operating_city" }
          ]
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: USER_ID, email: "ops@example.com", display_name: "Busayo Adewale" }]
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{
            membership_id: MEMBERSHIP_ID,
            membership_org_id: ORG_ID,
            membership_user_id: USER_ID,
            membership_role: "BUSINESS_OPERATOR",
            membership_is_active: true,
            membership_created_at: new Date().toISOString(),
            org_id: ORG_ID,
            org_name: "ShipWright Retail Ops",
            org_contact_name: "Busayo Adewale",
            org_contact_email: "ops@example.com",
            org_contact_phone: "+44 20 7946 0958",
            org_operating_city: "London",
            org_created_by: USER_ID,
            org_created_at: new Date().toISOString()
          }]
        })
    };

    const service = new BusinessService(pg as never);
    const context = await service.getBusinessContext(createUser());

    expect(context.onboarded).toBe(true);
    expect(context.currentOrg?.name).toBe("ShipWright Retail Ops");
  });

  it("serializes pg timestamp dates to ISO strings in business context responses", async () => {
    const createdAt = new Date("2026-04-22T12:34:56.000Z");
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            { column_name: "contact_name" },
            { column_name: "contact_email" },
            { column_name: "contact_phone" },
            { column_name: "operating_city" }
          ]
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: USER_ID, email: "ops@example.com", display_name: "Busayo Adewale" }]
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{
            membership_id: MEMBERSHIP_ID,
            membership_org_id: ORG_ID,
            membership_user_id: USER_ID,
            membership_role: "BUSINESS_OPERATOR",
            membership_is_active: true,
            membership_created_at: createdAt,
            org_id: ORG_ID,
            org_name: "ShipWright Retail Ops",
            org_contact_name: "Busayo Adewale",
            org_contact_email: "ops@example.com",
            org_contact_phone: "+44 20 7946 0958",
            org_operating_city: "London",
            org_created_by: USER_ID,
            org_created_at: createdAt
          }]
        })
    };

    const service = new BusinessService(pg as never);
    const context = await service.getBusinessContext(createUser());

    expect(context.currentOrg?.createdAt).toBe(createdAt.toISOString());
    expect(context.memberships[0]?.membership.createdAt).toBe(createdAt.toISOString());
  });

  it("handles legacy org schemas without contact columns", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rowCount: 0,
          rows: []
        })
        .mockResolvedValueOnce({
          rowCount: 0,
          rows: []
        })
    };

    const service = new BusinessService(pg as never);
    const context = await service.getBusinessContext(createUser());

    expect(context.onboarded).toBe(false);
    expect(context.currentOrg).toBeNull();
    expect(context.memberships).toHaveLength(0);
  });

  it("rejects business org creation when the payload email differs from the authenticated user", async () => {
    const service = new BusinessService({ withIdempotency: vi.fn() } as never);

    await expect(
      service.createBusinessOrg(
        {
          businessName: "ShipWright Retail Ops",
          contactName: "Busayo Adewale",
          email: "different@example.com",
          phone: "+44 20 7946 0958",
          city: "London"
        },
        createUser(),
        "idem-business-org-2"
      )
    ).rejects.toThrow(ForbiddenException);
  });
});
