"use client";

import type { CreateAnalyticsEventInput, AnalyticsEventName } from "./product-state";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api-staging-qvmv.onrender.com";
const SESSION_KEY = "shipwright_public_analytics_session";

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `session_${crypto.randomUUID()}`;
  }
  return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getAnalyticsSessionId() {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = createSessionId();
    window.sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return null;
  }
}

export function buildAnalyticsPayload(input: CreateAnalyticsEventInput): CreateAnalyticsEventInput {
  if (typeof window === "undefined") {
    return input;
  }

  return {
    source: "public_site",
    path: window.location.pathname,
    referrer: document.referrer || null,
    sessionId: getAnalyticsSessionId(),
    ...input,
    metadata: input.metadata ?? {}
  };
}

export function trackAnalyticsEvent(input: CreateAnalyticsEventInput) {
  if (typeof window === "undefined") return;

  const payload = buildAnalyticsPayload(input);
  const body = JSON.stringify(payload);
  const url = `${normalizeBaseUrl(apiBaseUrl)}/v1/analytics/events`;

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    // Analytics must never block public conversion journeys.
  }

  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true
  }).catch(() => undefined);
}

export function trackCtaClick(label: string, source: string, metadata: Record<string, unknown> = {}) {
  trackAnalyticsEvent({
    eventName: "CTA_CLICKED",
    metadata: { label, source, ...metadata }
  });
}

export function trackPricingCtaClick(label: string, interestType: string, metadata: Record<string, unknown> = {}) {
  trackAnalyticsEvent({
    eventName: "PRICING_CTA_CLICKED",
    metadata: { label, interestType, source: "pricing", ...metadata }
  });
}

export function trackPageView(page: string, metadata: Record<string, unknown> = {}) {
  trackAnalyticsEvent({
    eventName: "PUBLIC_PAGE_VIEW",
    metadata: { page, ...metadata }
  });
}

export function trackMenuOpened(menu: string) {
  trackAnalyticsEvent({
    eventName: "MEGA_MENU_OPENED" satisfies AnalyticsEventName,
    metadata: { menu, source: "public_nav" }
  });
}
