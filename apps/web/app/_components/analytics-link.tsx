"use client";

import Link, { type LinkProps } from "next/link";
import React from "react";
import type { AnalyticsEventName } from "../_lib/product-state";
import { trackAnalyticsEvent } from "../_lib/analytics";

type AnalyticsLinkProps = LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    analyticsEventName?: AnalyticsEventName;
    analyticsLabel: string;
    analyticsSource: string;
    analyticsMetadata?: Record<string, unknown>;
  };

export function AnalyticsLink({
  analyticsEventName = "CTA_CLICKED",
  analyticsLabel,
  analyticsSource,
  analyticsMetadata,
  onClick,
  ...props
}: AnalyticsLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackAnalyticsEvent({
          eventName: analyticsEventName,
          metadata: {
            label: analyticsLabel,
            source: analyticsSource,
            ...analyticsMetadata
          }
        });
        onClick?.(event);
      }}
    />
  );
}
