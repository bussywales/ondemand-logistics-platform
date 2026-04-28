import type { ReactNode } from "react";

export type ShipWrightIconName =
  | "alert"
  | "assign"
  | "cancel"
  | "check"
  | "driver"
  | "menu"
  | "payment"
  | "queue"
  | "restaurant"
  | "retry"
  | "route"
  | "timeline"
  | "warning"
  | "arrow"
  | "document";

type ShipWrightIconProps = {
  className?: string;
  name: ShipWrightIconName;
  size?: number;
};

const iconPaths: Record<ShipWrightIconName, ReactNode> = {
  alert: (
    <>
      <path d="M12 3.2 21 19H3L12 3.2Z" />
      <path d="M12 8.7v4.7" />
      <path d="M12 16.7h.01" />
    </>
  ),
  assign: (
    <>
      <path d="M15 19.5c0-2.5-2.2-4.5-5-4.5s-5 2-5 4.5" />
      <path d="M10 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M18 8v6" />
      <path d="M15 11h6" />
    </>
  ),
  cancel: (
    <>
      <path d="M7.7 4.8h8.6l3.9 3.9v6.6l-3.9 3.9H7.7l-3.9-3.9V8.7l3.9-3.9Z" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </>
  ),
  check: (
    <>
      <path d="M21 11.1v.9a9 9 0 1 1-5.3-8.2" />
      <path d="m9.2 11.8 2.2 2.2L21 4.4" />
    </>
  ),
  driver: (
    <>
      <path d="M12 12a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4Z" />
      <path d="M5.2 20c.6-3.2 3.3-5.2 6.8-5.2s6.2 2 6.8 5.2" />
    </>
  ),
  menu: (
    <>
      <path d="M5 6.5h14" />
      <path d="M5 12h14" />
      <path d="M5 17.5h10" />
      <path d="M3 6.5h.01" />
      <path d="M3 12h.01" />
      <path d="M3 17.5h.01" />
    </>
  ),
  payment: (
    <>
      <rect height="13" rx="2.2" width="18" x="3" y="5.5" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </>
  ),
  queue: (
    <>
      <path d="M5 6h14" />
      <path d="M5 12h14" />
      <path d="M5 18h14" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </>
  ),
  restaurant: (
    <>
      <path d="M4 10h16" />
      <path d="M6 10V7.5L8 5h8l2 2.5V10" />
      <path d="M6 10v9h12v-9" />
      <path d="M9 19v-5h6v5" />
    </>
  ),
  retry: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M18.2 11A6.5 6.5 0 0 0 6.1 8.4L4 12" />
      <path d="M5.8 13A6.5 6.5 0 0 0 17.9 15.6L20 12" />
    </>
  ),
  route: (
    <>
      <path d="M6 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M18 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M8 16h3.2c2.4 0 3.6-1.2 3.6-3.6V9.8" />
      <path d="M16.6 8H12" />
    </>
  ),
  timeline: (
    <>
      <path d="M12 5v14" />
      <path d="M8 7h8" />
      <path d="M8 12h8" />
      <path d="M8 17h8" />
      <path d="M12 7h.01" />
      <path d="M12 12h.01" />
      <path d="M12 17h.01" />
    </>
  ),
  warning: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.8v5" />
      <path d="M12 16.3h.01" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  document: (
    <>
      <path d="M7 3.8h6.5L18 8.3V20H7V3.8Z" />
      <path d="M13 3.8V9h5" />
      <path d="M9.5 13h5" />
      <path d="M9.5 16h4" />
    </>
  )
};

export function ShipWrightIcon({ className, name, size = 20 }: ShipWrightIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className ? `sw-icon ${className}` : "sw-icon"}
      fill="none"
      focusable="false"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        {iconPaths[name]}
      </g>
    </svg>
  );
}
