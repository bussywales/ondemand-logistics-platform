"use client";

import { useEffect } from "react";
import { trackPageView } from "../_lib/analytics";

export function PublicAnalyticsPageView(props: { page: string; metadata?: Record<string, unknown> }) {
  useEffect(() => {
    trackPageView(props.page, props.metadata ?? {});
  }, [props.page, props.metadata]);

  return null;
}
