"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ProductUpdateAnnouncement } from "./product-updates";
import { WorkspaceNav, AdminWorkspaceLink } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import {
  getAdminFinanceSummary,
  getBusinessFinanceSummary,
  getUserFacingApiError,
  listAdminFinanceTransactions,
  listBusinessFinanceTransactions
} from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import { formatCurrency, formatDateTime, type BusinessSession, type FinanceSummary, type FinanceTransaction } from "../_lib/product-state";

const FINANCE_UNAVAILABLE = "Finance data unavailable. Refresh or contact support.";

function formatLabel(value: string | null) {
  if (!value) return "Not recorded";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function reviewBadge(value: FinanceTransaction["financeReviewStatus"]) {
  if (value === "REFUND_REVIEW") return "sw-badge--warning";
  if (value === "NEEDS_REVIEW") return "sw-badge--info";
  return "sw-badge--success";
}

function FinanceMetric(props: { label: string; value: string | number; copy: string }) {
  return (
    <div className="sw-list-row">
      <div>
        <span className="ops-detail-note">{props.label}</span>
        <strong>{props.value}</strong>
      </div>
      <p className="ops-detail-note">{props.copy}</p>
    </div>
  );
}

function FinanceTransactionRow(props: { admin?: boolean; transaction: FinanceTransaction }) {
  const tx = props.transaction;
  return (
    <div className="sw-list-row">
      <div className="sw-stack-sm">
        <div className="sw-row">
          <strong>{formatCurrency(tx.amountCents, tx.currency)}</strong>
          <span className={`sw-badge ${reviewBadge(tx.financeReviewStatus)}`}>{formatLabel(tx.financeReviewStatus)}</span>
          <span className="sw-badge sw-badge--neutral">{formatLabel(tx.paymentStatus)}</span>
        </div>
        <p className="ops-detail-note">
          {props.admin && tx.orgName ? `${tx.orgName} · ` : ""}{tx.restaurantName} · {tx.customerReference ?? "customer reference withheld"}
        </p>
        <p className="ops-detail-note">{tx.recommendedNextAction}</p>
        {tx.refundReviewReason ? <p className="ops-detail-note">Refund review: {tx.refundReviewReason}</p> : null}
      </div>
      <div className="orders-financial-grid">
        <div><span className="sw-metric-label">Captured</span><strong>{formatCurrency(tx.capturedAmountCents, tx.currency)}</strong></div>
        <div><span className="sw-metric-label">Pending</span><strong>{formatCurrency(tx.pendingAmountCents, tx.currency)}</strong></div>
        <div><span className="sw-metric-label">Order</span><strong>{formatLabel(tx.orderStatus)}</strong></div>
        <div><span className="sw-metric-label">Job</span><strong>{formatLabel(tx.jobStatus)}</strong></div>
        <div><span className="sw-metric-label">Updated</span><strong>{formatDateTime(tx.updatedAt)}</strong></div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href={props.admin ? `/admin` : `/app/orders/${tx.orderId}`}>Order</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href={props.admin ? `/admin` : `/app/jobs/${tx.jobId}`}>Job</Link>
        </div>
      </div>
    </div>
  );
}

export function FinanceView(props: { admin?: boolean; summary: FinanceSummary; transactions: FinanceTransaction[]; session?: BusinessSession | null }) {
  const title = props.admin ? "Platform finance review" : "Finance and settlement visibility";
  const subtitle = props.admin
    ? "Cross-organisation payment, closeout, and refund-review posture. Finance review only; no automated refunds or payouts."
    : "Payment, closeout, and refund-review posture for this workspace. Finance review only; no automated refunds or payouts.";
  const refundCandidates = useMemo(() => props.transactions.filter((tx) => tx.refundReviewRequired), [props.transactions]);

  return (
    <main className={`app-shell ${props.admin ? "admin-shell-page" : "ops-shell"}`}>
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Finance</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="hero-actions">
          {props.admin ? <AdminWorkspaceLink /> : null}
          <Link className="sw-button sw-button--secondary button button-secondary" href={props.admin ? "/admin/command" : "/app/payments"}>
            {props.admin ? "Admin command" : "Payment risk"}
          </Link>
        </div>
      </div>

      {!props.admin && props.session ? <WorkspaceNav active="finance" platformAdmin={Boolean(props.session.context.platformAdmin)} /> : null}
      <ProductUpdateAnnouncement routePath={props.admin ? "/admin/finance" : "/app/finance"} viewer={props.admin ? "platform_admin" : "business"} viewerKey={props.session?.userId ?? "finance"} />

      <section className="sw-command-surface admin-command-page-hero">
        <div>
          <span className="sw-badge sw-badge--info">Review only</span>
          <h2>{formatCurrency(props.summary.totalCapturedAmountCents, props.summary.currency)} captured</h2>
          <p>Captured, pending, failed, and refund-review signals are computed from existing order, job, payment, payout, and support records.</p>
        </div>
        <div className="team-summary-grid">
          <FinanceMetric copy="Payments captured in the selected period." label="Captured" value={props.summary.capturedPaymentCount} />
          <FinanceMetric copy="Authorised or waiting payment action." label="Pending" value={props.summary.pendingPaymentCount} />
          <FinanceMetric copy="Failed or cancelled payment states." label="Failed" value={props.summary.failedPaymentCount} />
          <FinanceMetric copy="Human refund review candidates." label="Refund review" value={props.summary.refundReviewCandidates} />
          <FinanceMetric copy="Delivered jobs visible to finance." label="Delivered jobs" value={props.summary.deliveredJobCount} />
          <FinanceMetric copy="Orders needing finance closeout review." label="Needs review" value={props.summary.ordersNeedingFinanceReview} />
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Refund review foundation</p>
            <h2>{refundCandidates.length} candidate{refundCandidates.length === 1 ? "" : "s"}</h2>
            <p className="ops-detail-note">No refund button is available in v1. Review support context and confirm with merchant/customer before any manual refund decision.</p>
          </div>
        </div>
        <div className="admin-command-list">
          {refundCandidates.length === 0 ? (
            <div className="sw-empty-state admin-empty-state">
              <strong className="sw-empty-title">No refund review candidates</strong>
              <p className="sw-empty-copy">Captured payments with failed fulfilment or unresolved refund-review support records will appear here.</p>
            </div>
          ) : refundCandidates.slice(0, 5).map((transaction) => (
            <FinanceTransactionRow admin={props.admin} key={`refund:${transaction.paymentId}`} transaction={transaction} />
          ))}
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Transactions</p>
            <h2>Finance transaction rows</h2>
            <p className="ops-detail-note">Card details and sensitive provider data are not shown.</p>
          </div>
        </div>
        <div className="admin-command-list">
          {props.transactions.length === 0 ? (
            <div className="sw-empty-state admin-empty-state">
              <strong className="sw-empty-title">No finance transactions</strong>
              <p className="sw-empty-copy">Orders and payments will appear here after customer checkout activity.</p>
            </div>
          ) : props.transactions.map((transaction) => (
            <FinanceTransactionRow admin={props.admin} key={transaction.paymentId} transaction={transaction} />
          ))}
        </div>
      </section>
    </main>
  );
}

function LoadingState() {
  return <main className="app-shell loading-shell"><section className="sw-empty-state"><strong className="sw-empty-title">Loading finance</strong></section></main>;
}

function ErrorState(props: { message: string; onRefresh: () => void }) {
  return (
    <main className="app-shell loading-shell">
      <section className="sw-empty-state">
        <h1>Unable to load finance</h1>
        <p className="sw-empty-copy">{props.message}</p>
        <button className="sw-button sw-button--primary button button-primary" onClick={props.onRefresh} type="button">Refresh</button>
      </section>
    </main>
  );
}

export function BusinessFinanceShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession } = useBusinessAuth();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/app/finance" }));
  }, [router, status]);

  useEffect(() => {
    let active = true;
    if (!session) return () => { active = false; };
    setLoadError(null);
    void Promise.all([getBusinessFinanceSummary(session), listBusinessFinanceTransactions(session)])
      .then(([nextSummary, nextTransactions]) => {
        if (!active) return;
        setSummary(nextSummary);
        setTransactions(nextTransactions);
      })
      .catch((issue) => {
        if (!active) return;
        setLoadError(getUserFacingApiError(issue, FINANCE_UNAVAILABLE));
      });
    return () => { active = false; };
  }, [session]);

  if (status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState message={error ?? FINANCE_UNAVAILABLE} onRefresh={() => void refreshBusinessSession()} />;
  if (status !== "authenticated" || !session) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} onRefresh={() => void refreshBusinessSession()} />;
  if (!summary) return <LoadingState />;
  return <FinanceView session={session} summary={summary} transactions={transactions} />;
}

export function AdminFinanceShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession } = useBusinessAuth();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/admin/finance" }));
  }, [router, status]);

  useEffect(() => {
    let active = true;
    if (!session) return () => { active = false; };
    setLoadError(null);
    void Promise.all([getAdminFinanceSummary(session), listAdminFinanceTransactions(session)])
      .then(([nextSummary, nextTransactions]) => {
        if (!active) return;
        setSummary(nextSummary);
        setTransactions(nextTransactions);
      })
      .catch((issue) => {
        if (!active) return;
        setLoadError(getUserFacingApiError(issue, FINANCE_UNAVAILABLE));
      });
    return () => { active = false; };
  }, [session]);

  if (status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState message={error ?? FINANCE_UNAVAILABLE} onRefresh={() => void refreshBusinessSession()} />;
  if (status !== "authenticated") return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} onRefresh={() => void refreshBusinessSession()} />;
  if (!summary) return <LoadingState />;
  return <FinanceView admin summary={summary} transactions={transactions} />;
}
