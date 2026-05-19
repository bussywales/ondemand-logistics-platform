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
