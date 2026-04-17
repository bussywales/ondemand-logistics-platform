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
  it("creates an org and operator membership for the authenticated user", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: USER_ID, email: "ops@example.com", display_name: "Busayo Adewale" }]
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
  });

  it("returns onboarded business context for an operator", async () => {
    const pg = {
      query: vi
        .fn()
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
