"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { listBusinessNotifications } from "../_lib/api";
import {
  groupNotificationsByDate,
  mapNotification,
  type NotificationPresentation
} from "../_lib/notification-mapper";
import type { BusinessNotification, BusinessSession, NotificationSeverity } from "../_lib/product-state";
import { ShipWrightIcon } from "./shipwright-icon";

function severityClass(severity: NotificationSeverity) {
  if (severity === "danger") {
    return "notifications-item-danger";
  }

  if (severity === "warning") {
    return "notifications-item-warning";
  }

  if (severity === "success") {
    return "notifications-item-success";
  }

  return "notifications-item-info";
}

function NotificationListItem(props: {
  compact?: boolean;
  item: NotificationPresentation;
  onNavigate?: () => void;
}) {
  const content = (
    <>
      <span className={`sw-icon-badge ${severityClass(props.item.severity)} notifications-item-icon`} aria-hidden="true">
        <ShipWrightIcon name={props.item.icon} />
      </span>
      <div className="notifications-item-copy">
        <div className="notifications-item-header">
          <strong>{props.item.title}</strong>
          <span>{props.item.timeAgo}</span>
        </div>
        <p>{props.item.message}</p>
      </div>
    </>
  );

  if (props.item.href) {
    return (
      <Link
        className={`sw-supporting-surface notifications-item ${props.compact ? "notifications-item-compact" : ""}`}
        href={props.item.href}
        onClick={props.onNavigate}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={`sw-supporting-surface notifications-item ${props.compact ? "notifications-item-compact" : ""}`}>
      {content}
    </div>
  );
}

export function NotificationFeed(props: {
  compact?: boolean;
  emptyCopy: string;
  emptyTitle: string;
  items: BusinessNotification[];
  onNavigate?: () => void;
}) {
  if (props.items.length === 0) {
    return (
      <div className="sw-empty-state notifications-empty-state">
        <span className="empty-state-icon" aria-hidden="true">
          <ShipWrightIcon name="bell" />
        </span>
        <strong className="sw-empty-title">{props.emptyTitle}</strong>
        <p className="sw-empty-copy">{props.emptyCopy}</p>
      </div>
    );
  }

  return (
    <div className={`notifications-list ${props.compact ? "notifications-list-compact" : ""}`}>
      {props.items.map((item) => (
        <NotificationListItem compact={props.compact} item={mapNotification(item)} key={item.id} onNavigate={props.onNavigate} />
      ))}
    </div>
  );
}

export function NotificationsBell(props: { session: BusinessSession }) {
  const [items, setItems] = useState<BusinessNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const next = await listBusinessNotifications(props.session);
        if (active) {
          setItems(next);
        }
      } catch {
        if (active) {
          setItems([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 20000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [props.session.accessToken, props.session.context.currentOrg?.id]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const unreadCount = items.filter((item) => !item.read).length;
  const latestItems = items.slice(0, 6);

  return (
    <div className="notifications-menu" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="button button-secondary notifications-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="notifications-trigger-icon" aria-hidden="true">
          <ShipWrightIcon name="bell" />
        </span>
        {unreadCount > 0 ? <span className="notifications-trigger-count">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="sw-supporting-surface notifications-dropdown" role="dialog" aria-label="Notifications">
          <div className="notifications-dropdown-header">
            <div>
              <p className="eyebrow">Notifications</p>
              <strong>{unreadCount > 0 ? `${unreadCount} unread` : "All clear"}</strong>
            </div>
            <Link className="text-action" href="/app/notifications" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>

          {loading ? (
            <div className="sw-empty-state notifications-empty-state notifications-empty-state-compact">
              <strong className="sw-empty-title">Loading notifications</strong>
              <p className="sw-empty-copy">Checking the latest system events for this workspace.</p>
            </div>
          ) : (
            <NotificationFeed
              compact
              emptyCopy="Dispatch, payment, and delivery events will appear here."
              emptyTitle="No notifications yet"
              items={latestItems}
              onNavigate={() => setOpen(false)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

export function GroupedNotificationFeed(props: { items: BusinessNotification[] }) {
  const groups = groupNotificationsByDate(props.items);

  if (groups.length === 0) {
    return (
      <div className="sw-empty-state notifications-empty-state">
        <span className="empty-state-icon" aria-hidden="true">
          <ShipWrightIcon name="bell" />
        </span>
        <strong className="sw-empty-title">No notifications yet</strong>
        <p className="sw-empty-copy">Dispatch, payment, and delivery events will appear here for this workspace.</p>
      </div>
    );
  }

  return (
    <div className="notifications-group-stack">
      {groups.map((group) => (
        <section className="notifications-group" key={group.label}>
          <div className="notifications-group-header">
            <p className="eyebrow">{group.label}</p>
            <span className="ops-count-pill">{group.items.length}</span>
          </div>
          <NotificationFeed
            emptyCopy=""
            emptyTitle=""
            items={group.items}
          />
        </section>
      ))}
    </div>
  );
}
