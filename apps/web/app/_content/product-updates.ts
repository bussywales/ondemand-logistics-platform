export type ProductUpdateAudience = "business" | "driver" | "customer" | "platform_admin";

export type ProductUpdate = {
  id: string;
  title: string;
  summary: string;
  audience: ProductUpdateAudience[];
  routeContext?: string[];
  releasedAt: string;
  version?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

// Major user-visible deliveries should add a short operator-facing entry here.
// Keep entries concise: title, summary, audience, release date/version, and an optional CTA.
export const productUpdates: ProductUpdate[] = [
  {
    id: "public-site-product-storytelling-proof",
    title: "Public site now tells the controlled-pilot proof story",
    summary: "The landing and pricing pages now explain ShipWright’s pilot workflow, validation evidence, support and dispatch audit posture, finance visibility, and fleet readiness without overclaiming automation.",
    audience: ["platform_admin"],
    routeContext: ["/admin", "/admin/updates"],
    releasedAt: "2026-05-24T09:00:00.000Z",
    version: "v3.5",
    ctaLabel: "Open public site",
    ctaHref: "/"
  },
  {
    id: "enterprise-governance-suspension-audit",
    title: "Enterprise governance controls are available",
    summary: "Platform admins can now suspend or reactivate organisations and users with typed confirmation, reason capture, and access audit history. Impersonation remains disabled pending audited session controls.",
    audience: ["platform_admin"],
    routeContext: ["/admin/governance", "/admin/users", "/admin/orgs"],
    releasedAt: "2026-05-23T22:00:00.000Z",
    version: "v3.4",
    ctaLabel: "Open governance",
    ctaHref: "/admin/governance"
  },
  {
    id: "dispatch-governance-assignment-audit",
    title: "Dispatch governance is now auditable",
    summary: "Operators can record human dispatch review context, while platform admins can inspect assignment and override history across organisations.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/jobs", "/admin/dispatch-audit", "/admin/command"],
    releasedAt: "2026-05-23T21:00:00.000Z",
    version: "v3.3",
    ctaLabel: "Open dispatch audit",
    ctaHref: "/admin/dispatch-audit"
  },
  {
    id: "finance-settlement-refund-review",
    title: "Finance review surfaces are available",
    summary: "Business operators and platform admins can now review captured, pending, failed, and refund-review payment posture without automated refunds or payouts.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/finance", "/admin/finance", "/admin/command"],
    releasedAt: "2026-05-23T19:00:00.000Z",
    version: "v3.2",
    ctaLabel: "Open finance",
    ctaHref: "/app/finance"
  },
  {
    id: "fleet-driver-detail-team-invites",
    title: "Fleet workspace now includes driver detail and team invites",
    summary: "Fleet managers can now open driver readiness detail, review pending fleet invites, and manage invitation follow-up without changing dispatch or payout rules.",
    audience: ["driver", "platform_admin"],
    routeContext: ["/fleet", "/fleet/team", "/admin/fleets"],
    releasedAt: "2026-05-23T18:00:00.000Z",
    version: "v3.1",
    ctaLabel: "Open fleet workspace",
    ctaHref: "/fleet"
  },
  {
    id: "product-analytics-v1",
    title: "Public funnel analytics are available",
    summary: "Platform admins can now review first-party page, CTA, pricing, and demo request funnel signals without adding an external analytics vendor.",
    audience: ["platform_admin"],
    routeContext: ["/admin", "/admin/command", "/admin/analytics"],
    releasedAt: "2026-05-23T10:00:00.000Z",
    version: "v3.0",
    ctaLabel: "Open analytics",
    ctaHref: "/admin/analytics"
  },
  {
    id: "commercial-notification-diagnostics",
    title: "Commercial notification diagnostics are available",
    summary: "Platform admins can now review notification delivery posture and queue safe email or webhook tests without exposing secrets.",
    audience: ["platform_admin"],
    routeContext: ["/admin", "/admin/command", "/admin/notifications"],
    releasedAt: "2026-05-21T23:00:00.000Z",
    version: "v2.9",
    ctaLabel: "Open notifications",
    ctaHref: "/admin/notifications"
  },
  {
    id: "iam-invite-lifecycle-audit",
    title: "Team invites now have clearer lifecycle controls",
    summary: "Business owners and platform admins can now see pending invites, resend or cancel them, and review recent access changes from the team workspace.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/settings/team", "/admin/orgs"],
    releasedAt: "2026-05-21T22:00:00.000Z",
    version: "v2.8",
    ctaLabel: "Open team settings",
    ctaHref: "/app/settings/team"
  },
  {
    id: "operational-reset-selection",
    title: "Operational resets now support per-record selection",
    summary: "Platform admins can preview eligible staging/demo reset records, select exactly which ones to include, and execute a non-destructive reset with typed confirmation.",
    audience: ["platform_admin"],
    routeContext: ["/admin", "/admin/command", "/admin/operational-resets"],
    releasedAt: "2026-05-21T20:00:00.000Z",
    version: "v2.7",
    ctaLabel: "Open reset tools",
    ctaHref: "/admin/operational-resets"
  },
  {
    id: "merchant-menu-rollback",
    title: "Menu rollback is available for prepared changes",
    summary: "Restaurant operators can now preview and apply rollback for prepared menu history events with typed confirmation and a full audit trail.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/restaurant", "/admin/menu-history"],
    releasedAt: "2026-05-21T18:00:00.000Z",
    version: "v2.6",
    ctaLabel: "Open menu history",
    ctaHref: "/app/restaurant"
  },
  {
    id: "merchant-menu-rollback-prep",
    title: "Menu rollback readiness is now labelled",
    summary: "Menu history now shows whether price, visibility, section, and ordering changes have enough audit metadata for future human-reviewed rollback.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/restaurant", "/admin/menu-history"],
    releasedAt: "2026-05-21T16:00:00.000Z",
    version: "v2.5",
    ctaLabel: "Review menu history",
    ctaHref: "/app/restaurant"
  },
  {
    id: "admin-menu-history",
    title: "Admin menu history is available",
    summary: "Platform admins can now review cross-org menu price, visibility, section, and ordering changes without entering a merchant workspace.",
    audience: ["platform_admin"],
    routeContext: ["/admin", "/admin/command", "/admin/menu-history"],
    releasedAt: "2026-05-21T13:00:00.000Z",
    version: "v2.4",
    ctaLabel: "Open menu history",
    ctaHref: "/admin/menu-history"
  },
  {
    id: "merchant-menu-audit-history",
    title: "Menu change history is now visible",
    summary: "Restaurant operators can now review recent menu price, visibility, section, and ordering changes with actor and timestamp context.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/restaurant"],
    releasedAt: "2026-05-21T10:00:00.000Z",
    version: "v2.3",
    ctaLabel: "Review menu history",
    ctaHref: "/app/restaurant"
  },
  {
    id: "merchant-menu-availability-reordering",
    title: "Menu availability and ordering controls improved",
    summary: "Restaurant operators can now see clearer live/hidden item status and reorder menu sections or items without manually managing display numbers.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/restaurant", "/restaurants"],
    releasedAt: "2026-05-20T18:30:00.000Z",
    version: "v2.2",
    ctaLabel: "Manage restaurant menu",
    ctaHref: "/app/restaurant"
  },
  {
    id: "operational-reset-tools",
    title: "Operational reset tools are available",
    summary: "Platform admins can now preview and record non-destructive staging/demo tidy actions without deleting audit evidence or proof history.",
    audience: ["platform_admin"],
    routeContext: ["/admin", "/admin/command", "/admin/operational-resets"],
    releasedAt: "2026-05-20T10:00:00.000Z",
    version: "v2.1",
    ctaLabel: "Open reset tools",
    ctaHref: "/admin/operational-resets"
  },
  {
    id: "demo-request-follow-up-workflow",
    title: "Demo request follow-up is now surfaced",
    summary: "New public demo requests now create an internal admin signal and appear in Admin Command with next-action guidance for human follow-up.",
    audience: ["platform_admin"],
    routeContext: ["/admin", "/admin/command", "/admin/demo-requests"],
    releasedAt: "2026-05-19T22:30:00.000Z",
    version: "v2.0",
    ctaLabel: "Open demo requests",
    ctaHref: "/admin/demo-requests"
  },
  {
    id: "demo-request-persistence",
    title: "Demo requests are now recorded",
    summary: "Public controlled-pilot and walkthrough requests are now persisted for platform admin review before any manual follow-up.",
    audience: ["platform_admin"],
    routeContext: ["/admin/demo-requests", "/demo/request", "/admin"],
    releasedAt: "2026-05-19T17:00:00.000Z",
    version: "v1.9",
    ctaLabel: "Review demo requests",
    ctaHref: "/admin/demo-requests"
  },
  {
    id: "fleet-manager-workspace",
    title: "Fleet manager workspace is live",
    summary: "Fleet owners, managers, dispatchers, and compliance leads can now review their courier pool and readiness from a dedicated fleet workspace.",
    audience: ["driver", "platform_admin"],
    routeContext: ["/fleet", "/admin/fleets", "/admin/drivers"],
    releasedAt: "2026-05-19T14:00:00.000Z",
    version: "v1.8",
    ctaLabel: "Open fleet workspace",
    ctaHref: "/fleet"
  },
  {
    id: "driver-fleet-organisations-v1",
    title: "Driver fleet organisations are available",
    summary: "Platform admins can now create driver-company groups, add existing couriers, and review fleet readiness without changing dispatch automation.",
    audience: ["platform_admin"],
    routeContext: ["/admin/fleets", "/admin/drivers", "/admin"],
    releasedAt: "2026-05-19T13:00:00.000Z",
    version: "v1.8",
    ctaLabel: "Open fleet companies",
    ctaHref: "/admin/fleets"
  },
  {
    id: "merchant-menu-price-editing",
    title: "Menu price editing is available",
    summary: "Restaurant operators can now update menu item details, prices, sections, and orderable state without recreating the item.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/restaurant", "/restaurants"],
    releasedAt: "2026-05-19T12:15:00.000Z",
    version: "v1.7",
    ctaLabel: "Open restaurant setup",
    ctaHref: "/app/restaurant"
  },
  {
    id: "identity-access-management-v1",
    title: "Identity and team management is live",
    summary: "Platform admins can now review users, organisations, and memberships while business operators manage team access from workspace settings.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/settings/team", "/admin/users", "/admin/orgs", "/admin"],
    releasedAt: "2026-05-19T11:30:00.000Z",
    version: "v1.7",
    ctaLabel: "Open team settings",
    ctaHref: "/app/settings/team"
  },
  {
    id: "pilot-workspaces-live",
    title: "Pilot workspaces are live",
    summary: "Admins can now track pilot mode, readiness stage, owners, and checklist progress before rehearsal or live operation.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app", "/admin", "/admin/pilots"],
    releasedAt: "2026-05-19T10:00:00.000Z",
    version: "v1.6",
    ctaLabel: "Review pilots",
    ctaHref: "/admin/pilots"
  },
  {
    id: "pilot-guardrails-operations",
    title: "Pilot guardrails now appear across operations",
    summary: "Workspaces now show demo, internal test, controlled pilot, paused, or live-ready posture so operators understand context before acting.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app", "/app/orders", "/app/jobs", "/app/payments", "/app/reports/end-of-day", "/admin/pilots"],
    releasedAt: "2026-05-19T09:45:00.000Z",
    version: "v1.6",
    ctaLabel: "Open workspace",
    ctaHref: "/app"
  },
  {
    id: "support-escalation-logging",
    title: "Support escalation logging is available",
    summary: "Operators can record human follow-up on orders and jobs, including category, severity, owner, contact needs, and current status.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/orders", "/app/jobs", "/admin/command"],
    releasedAt: "2026-05-19T09:30:00.000Z",
    version: "v1.5",
    ctaLabel: "Open orders",
    ctaHref: "/app/orders"
  },
  {
    id: "support-escalation-audit-history",
    title: "Support escalation history is now auditable",
    summary: "Support records now keep append-only history for status, owner, contact flag, resolution, cancellation, and reopening changes.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/orders", "/app/jobs", "/admin/command"],
    releasedAt: "2026-05-19T09:15:00.000Z",
    version: "v1.5",
    ctaLabel: "Review jobs",
    ctaHref: "/app/jobs"
  },
  {
    id: "admin-command-intelligence-expanded",
    title: "Admin command intelligence expanded",
    summary: "Platform admins now get a broader cross-org view of pilot posture, support follow-up, courier readiness, incidents, and closeout signals.",
    audience: ["platform_admin"],
    routeContext: ["/admin", "/admin/command"],
    releasedAt: "2026-05-19T09:00:00.000Z",
    version: "v1.4",
    ctaLabel: "Open admin command",
    ctaHref: "/admin/command"
  },
  {
    id: "landing-page-demo-request-path",
    title: "Demo request path added to the public site",
    summary: "The public landing page now includes platform navigation and controlled pilot or demo request pathways for merchants, operators, and investors.",
    audience: ["business", "platform_admin", "customer"],
    routeContext: ["/app/updates", "/admin/updates"],
    releasedAt: "2026-05-19T08:45:00.000Z",
    version: "v1.4",
    ctaLabel: "View public site",
    ctaHref: "/"
  },
  {
    id: "paid-delivery-loop-proven",
    title: "Full paid delivery loop proven",
    summary: "Stage 1 now proves checkout, dispatch, driver completion, payment capture, and order fulfilment as one connected staging flow.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app", "/app/orders", "/admin"],
    releasedAt: "2026-04-30T17:45:00.000Z",
    version: "v1.0",
    ctaLabel: "Review orders",
    ctaHref: "/app/orders"
  },
  {
    id: "business-orders-queue",
    title: "Business orders queue is live",
    summary: "Operators can now see customer order, payment, delivery job, and fulfilment state from one business queue.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/orders", "/app"],
    releasedAt: "2026-04-30T16:30:00.000Z",
    ctaLabel: "Open orders",
    ctaHref: "/app/orders"
  },
  {
    id: "driver-execution-page",
    title: "Driver execution page is available",
    summary: "Staged drivers can go online, review offers, progress delivery steps, and submit proof of delivery from the driver route.",
    audience: ["driver", "platform_admin"],
    routeContext: ["/driver", "/admin"],
    releasedAt: "2026-04-30T15:45:00.000Z",
    ctaLabel: "Open driver view",
    ctaHref: "/driver"
  },
  {
    id: "admin-control-plane",
    title: "Admin Control Plane is live",
    summary: "Platform admins can inspect cross-org interventions, active jobs, recent orders, system posture, and outbox pressure from one control plane.",
    audience: ["platform_admin"],
    routeContext: ["/admin"],
    releasedAt: "2026-04-30T14:45:00.000Z",
    ctaLabel: "Open admin",
    ctaHref: "/admin"
  },
  {
    id: "persistent-notifications",
    title: "Notifications now remember read state",
    summary: "In-app operational notifications now persist read and unread state per signed-in operator instead of resetting on every refresh.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/notifications", "/app"],
    releasedAt: "2026-04-30T13:45:00.000Z",
    ctaLabel: "Open notifications",
    ctaHref: "/app/notifications"
  },
  {
    id: "driver-assignment-picker",
    title: "Driver assignment picker is available",
    summary: "Operators can now assign or reassign eligible drivers from a guided picker instead of entering raw driver IDs.",
    audience: ["business", "platform_admin"],
    routeContext: ["/app/jobs", "/admin"],
    releasedAt: "2026-04-30T12:30:00.000Z",
    ctaLabel: "Open jobs",
    ctaHref: "/app/jobs"
  },
  {
    id: "help-centre",
    title: "Help centre is now in-app",
    summary: "ShipWright now includes practical help articles for onboarding, orders, deliveries, driver flow, payments, and troubleshooting.",
    audience: ["business", "driver", "platform_admin", "customer"],
    routeContext: ["/app", "/driver", "/admin", "/restaurants"],
    releasedAt: "2026-04-30T11:00:00.000Z",
    ctaLabel: "Open help",
    ctaHref: "/help"
  }
];
