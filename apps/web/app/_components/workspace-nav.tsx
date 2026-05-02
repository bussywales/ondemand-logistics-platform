import React from "react";
import Link from "next/link";
import { ShipWrightIcon } from "./shipwright-icon";

type WorkspaceNavView =
  | "operations"
  | "jobs"
  | "orders"
  | "payments"
  | "notifications"
  | "restaurant"
  | "updates"
  | "help";

const items = [
  { href: "/app", label: "Operations", view: "operations" },
  { href: "/app/jobs", label: "Jobs", view: "jobs" },
  { href: "/app/orders", label: "Orders", view: "orders" },
  { href: "/app/payments", label: "Payments", view: "payments" },
  { href: "/app/notifications", label: "Notifications", view: "notifications" },
  { href: "/app/restaurant", label: "Restaurant", view: "restaurant" },
  { href: "/app/updates", label: "What’s new", view: "updates" },
  { href: "/help", label: "Help", view: "help" }
] as const satisfies ReadonlyArray<{ href: string; label: string; view: WorkspaceNavView }>;

export function WorkspaceNav(props: {
  active: WorkspaceNavView;
  className?: string;
  platformAdmin?: boolean;
}) {
  return (
    <nav className={props.className ?? "ops-nav"} aria-label="Workspace navigation">
      {items.map((item) => (
        <Link
          className={props.active === item.view ? "ops-nav-link active" : "ops-nav-link"}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
      {props.platformAdmin ? (
        <Link className="ops-nav-link" href="/admin">
          Admin Control Plane
        </Link>
      ) : null}
    </nav>
  );
}

export function AdminWorkspaceLink() {
  return (
    <Link className="sw-button sw-button--secondary button button-secondary" href="/app">
      <ShipWrightIcon name="arrow" />
      <span>Back to Workspace</span>
    </Link>
  );
}
