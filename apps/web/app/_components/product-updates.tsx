"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { type ProductUpdate } from "../_content/product-updates";
import {
  dismissProductUpdate,
  getLatestRelevantProductUpdate,
  getRelevantProductUpdates,
  type ProductUpdateViewerContext
} from "../_lib/product-updates";
import { formatDateTime } from "../_lib/product-state";
import { ShipWrightIcon } from "./shipwright-icon";

function audienceLabel(viewer: ProductUpdateViewerContext) {
  if (viewer === "platform_admin") {
    return "Control plane updates";
  }

  if (viewer === "driver") {
    return "Driver updates";
  }

  if (viewer === "customer") {
    return "Customer updates";
  }

  return "Workspace updates";
}

function UpdateCard(props: { update: ProductUpdate; compact?: boolean }) {
  return (
    <article className={`sw-operational-surface product-update-card ${props.compact ? "product-update-card-compact" : ""}`}>
      <div className="product-update-card-header">
        <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true">
          <ShipWrightIcon name="document" />
        </span>
        <div>
          <p className="eyebrow">What’s new</p>
          <h3>{props.update.title}</h3>
        </div>
        <span className="status-badge status-live">New</span>
      </div>
      <p className="product-update-summary">{props.update.summary}</p>
      <div className="product-update-meta">
        <span>{formatDateTime(props.update.releasedAt)}</span>
        {props.update.version ? <span>{props.update.version}</span> : null}
      </div>
      {props.update.ctaHref && props.update.ctaLabel ? (
        <div className="product-update-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href={props.update.ctaHref}>
            <ShipWrightIcon name="arrow" />
            <span>{props.update.ctaLabel}</span>
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function ProductUpdateAnnouncement(props: {
  viewer: ProductUpdateViewerContext;
  routePath: string;
  viewerKey: string;
}) {
  const [dismissedVersion, setDismissedVersion] = useState(0);
  const update = useMemo(
    () =>
      getLatestRelevantProductUpdate({
        viewer: props.viewer,
        routePath: props.routePath,
        viewerKey: props.viewerKey
      }),
    [dismissedVersion, props.routePath, props.viewer, props.viewerKey]
  );

  useEffect(() => {
    setDismissedVersion((current) => current + 1);
  }, [props.viewerKey]);

  if (!update) {
    return null;
  }

  return (
    <section className="sw-command-surface product-update-announcement" aria-label="Latest product update">
      <div className="product-update-announcement-copy">
        <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true">
          <ShipWrightIcon name="document" />
        </span>
        <div>
          <p className="eyebrow">What’s new</p>
          <h2>{update.title}</h2>
          <p>{update.summary}</p>
        </div>
      </div>
      <div className="product-update-actions">
        {update.ctaHref && update.ctaLabel ? (
          <Link className="sw-button sw-button--secondary button button-secondary" href={update.ctaHref}>
            <ShipWrightIcon name="arrow" />
            <span>{update.ctaLabel}</span>
          </Link>
        ) : null}
        <button
          className="sw-button sw-button--ghost button button-secondary"
          onClick={() => {
            dismissProductUpdate(props.viewerKey, update.id);
            setDismissedVersion((current) => current + 1);
          }}
          type="button"
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}

export function ProductUpdatesContent(props: {
  viewer: ProductUpdateViewerContext;
  routePath?: string;
  title: string;
  description: string;
}) {
  const updates = useMemo(
    () =>
      getRelevantProductUpdates({
        viewer: props.viewer,
        routePath: props.routePath
      }),
    [props.routePath, props.viewer]
  );

  return (
    <section className="ops-stack">
      <section className="sw-command-surface product-updates-hero">
        <div className="product-update-announcement-copy">
          <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true">
            <ShipWrightIcon name="document" />
          </span>
          <div>
            <p className="eyebrow">{audienceLabel(props.viewer)}</p>
            <h1>{props.title}</h1>
            <p>{props.description}</p>
          </div>
        </div>
      </section>

      {updates.length === 0 ? (
        <section className="sw-empty-state product-updates-empty">
          <span className="empty-state-icon" aria-hidden="true">
            <ShipWrightIcon name="document" />
          </span>
          <strong className="sw-empty-title">No relevant product updates yet</strong>
          <p className="sw-empty-copy">New feature summaries will appear here when this surface gains relevant release notes.</p>
        </section>
      ) : (
        <section className="product-updates-grid">
          {updates.map((update) => (
            <UpdateCard key={update.id} update={update} />
          ))}
        </section>
      )}
    </section>
  );
}

export function ProductUpdatesFeed(props: {
  viewer: ProductUpdateViewerContext;
  routePath?: string;
  title: string;
  description: string;
}) {
  return (
    <main className="app-shell loading-shell updates-shell">
      <ProductUpdatesContent {...props} />
    </main>
  );
}
