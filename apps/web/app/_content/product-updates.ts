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

export const productUpdates: ProductUpdate[] = [
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
