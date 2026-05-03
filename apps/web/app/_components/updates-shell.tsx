"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandLogo } from "./brand-logo";
import { useBusinessAuth } from "./business-auth-provider";
import { ContextualHelpLink } from "./help";
import { NotificationsBell } from "./notifications";
import { ProductUpdatesContent } from "./product-updates";
import type { ProductUpdate } from "../_content/product-updates";
import { AdminWorkspaceLink, WorkspaceNav } from "./workspace-nav";

function useAutoRefreshUpdates() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();
    const interval = window.setInterval(refresh, 60_000);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh();
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);
}

export function BusinessUpdatesShell(props: { updates: ProductUpdate[] }) {
  const router = useRouter();
  const { status, session, signOut, refreshBusinessSession } = useBusinessAuth();
  useAutoRefreshUpdates();

  async function handleSignOut() {
    await signOut();
    router.push("/get-started");
  }

  if (status === "loading" || !session) {
    return (
      <main className="app-shell loading-shell">
        <section className="sw-empty-state">
          <strong className="sw-empty-title">Loading product updates</strong>
          <p className="sw-empty-copy">Restoring the workspace session and update feed.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell ops-shell orders-shell">
      <header className="ops-topbar">
        <div className="ops-branding">
          <BrandLogo href="/" mode="responsive" />
          <p className="eyebrow">Operations console</p>
          <h1>{session.context.currentOrg?.name ?? "Workspace"}</h1>
        </div>
        <div className="ops-topbar-actions">
          <NotificationsBell session={session} />
          <ContextualHelpLink href="/help/getting-started" />
          <button
            className="button button-secondary"
            onClick={() =>
              void refreshBusinessSession().finally(() => {
                router.refresh();
              })
            }
            type="button"
          >
            Refresh
          </button>
          <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
            Sign Out
          </button>
        </div>
      </header>

      <section className="ops-layout">
        <aside className="ops-sidebar">
          <WorkspaceNav active="updates" platformAdmin={session.context.platformAdmin} />

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Operator</span>
            <strong>{session.context.displayName}</strong>
            <p>{session.context.email}</p>
          </section>
        </aside>

        <div className="ops-main">
          <ProductUpdatesContent
            description="Short release notes for business operators. These are product changes, not live operational events."
            title="What’s new for the workspace"
            updates={props.updates}
            viewer="business"
          />
        </div>
      </section>
    </main>
  );
}

export function DriverUpdatesShell(props: { updates: ProductUpdate[] }) {
  const router = useRouter();
  const { status, session, signOut, refreshBusinessSession } = useBusinessAuth();
  useAutoRefreshUpdates();

  async function handleSignOut() {
    await signOut();
    router.push("/get-started");
  }

  if (status === "loading" || !session) {
    return (
      <main className="app-shell loading-shell">
        <section className="sw-empty-state">
          <strong className="sw-empty-title">Loading driver updates</strong>
          <p className="sw-empty-copy">Restoring the signed-in driver session.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell driver-shell">
      <header className="driver-topbar">
        <BrandLogo href="/" mode="responsive" />
        <div className="driver-topbar-actions">
          <Link className="button button-secondary" href="/driver">
            Back to Driver
          </Link>
          <ContextualHelpLink href="/help/driver" />
          <button
            className="button button-secondary"
            onClick={() =>
              void refreshBusinessSession().finally(() => {
                router.refresh();
              })
            }
            type="button"
          >
            Refresh
          </button>
          <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
            Sign out
          </button>
        </div>
      </header>

      <ProductUpdatesContent
        description="Short release notes relevant to staged driver execution. These notes explain what changed in the driver product surface."
        title="What’s new for drivers"
        updates={props.updates}
        viewer="driver"
      />
    </main>
  );
}

export function AdminUpdatesShell(props: { updates: ProductUpdate[] }) {
  const router = useRouter();
  const { status, session, signOut, refreshBusinessSession } = useBusinessAuth();
  useAutoRefreshUpdates();

  if (status === "loading") {
    return (
      <main className="app-shell loading-shell">
        <section className="sw-empty-state">
          <strong className="sw-empty-title">Loading control plane updates</strong>
          <p className="sw-empty-copy">Restoring the platform admin session.</p>
        </section>
      </main>
    );
  }

  if (!session?.context.platformAdmin) {
    return (
      <main className="app-shell loading-shell">
        <section className="sw-empty-state">
          <strong className="sw-empty-title">Platform admin required</strong>
          <p className="sw-empty-copy">Sign in with a seeded platform admin to view control-plane product updates.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell admin-shell-page">
      <div className="admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Platform control plane</p>
          <h1>What’s new for platform admins</h1>
          <p>Release notes relevant to cross-org oversight, intervention, and pilot support.</p>
        </div>
        <div className="hero-actions">
          <AdminWorkspaceLink />
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">
            Back to Admin
          </Link>
          <button
            className="button button-secondary"
            onClick={() =>
              void refreshBusinessSession().finally(() => {
                router.refresh();
              })
            }
            type="button"
          >
            Refresh
          </button>
          <button
            className="button button-primary"
            onClick={() => {
              void signOut().then(() => router.replace("/get-started"));
            }}
            type="button"
          >
            Sign Out
          </button>
        </div>
      </div>

      <ProductUpdatesContent
        description="Short release notes relevant to the control plane. Platform admins also see business and driver-facing updates when they affect release confidence."
        title="Admin and release updates"
        updates={props.updates}
        viewer="platform_admin"
      />
    </main>
  );
}
