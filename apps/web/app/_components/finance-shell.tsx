"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ProductUpdateAnnouncement } from "./product-updates";
import { WorkspaceNav, AdminWorkspaceLink } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import {
  createBusinessFinanceReview,
  getAdminFinanceSummary,
  getBusinessFinanceSummary,
  getUserFacingApiError,
  listAdminFinanceReviews,
  listAdminFinanceTransactions,
  listBusinessFinanceReviews,
  listBusinessFinanceTransactions,
  updateBusinessFinanceReview
} from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import {
  formatCurrency,
  formatDateTime,
  type BusinessSession,
  type FinanceReviewRecord,
  type FinanceReviewRecordStatus,
  type FinanceSummary,
  type FinanceTransaction,
  type UpdateFinanceReviewInput
} from "../_lib/product-state";

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

function financeReviewStatusBadge(value: FinanceReviewRecord["status"]) {
  if (value === "RESOLVED") return "sw-badge--success";
  if (value === "CANCELLED") return "sw-badge--neutral";
  if (value === "WAITING_SUPPORT") return "sw-badge--warning";
  return "sw-badge--info";
}

function financeReviewSeverityBadge(value: FinanceReviewRecord["severity"]) {
  if (value === "CRITICAL" || value === "HIGH") return "sw-badge--warning";
  if (value === "LOW") return "sw-badge--neutral";
  return "sw-badge--info";
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

function FinanceReviewWorkflow(props: {
  admin?: boolean;
  reviews: FinanceReviewRecord[];
  transactions: FinanceTransaction[];
  onCreateFromCandidate?: (transaction: FinanceTransaction) => void;
  onUpdateReview?: (reviewId: string, input: {
    status?: FinanceReviewRecordStatus;
    ownerLabel?: string | null;
    resolution?: string | null;
    resolutionReason?: string | null;
    confirmation?: string;
  }) => void;
  pendingReviewId?: string | null;
  message?: string | null;
}) {
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [ownerLabel, setOwnerLabel] = useState("");
  const [status, setStatus] = useState<FinanceReviewRecordStatus>("IN_REVIEW");
  const [resolution, setResolution] = useState("");
  const [resolutionReason, setResolutionReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const activeKeys = useMemo(() => new Set(props.reviews
    .filter((review) => review.status === "OPEN" || review.status === "IN_REVIEW" || review.status === "WAITING_SUPPORT")
    .flatMap((review) => [review.paymentId, review.orderId, review.jobId].filter(Boolean) as string[])), [props.reviews]);

  return (
    <section className="sw-operational-surface admin-command-section finance-review-workflow">
      <div className="sw-card-header admin-section-header">
        <div>
          <p className="eyebrow">Persistent review workflow</p>
          <h2>{props.reviews.filter((review) => review.status !== "RESOLVED" && review.status !== "CANCELLED").length} unresolved finance review{props.reviews.length === 1 ? "" : "s"}</h2>
          <p className="ops-detail-note">No automated refunds are performed. Reviews record owner, status, closeout, and audit context for human finance decisions.</p>
        </div>
      </div>
      {props.message ? <div className="form-success-banner">{props.message}</div> : null}

      {!props.admin ? (
        <div className="finance-review-candidate-actions">
          <p className="ops-detail-note">Create a persistent review from a computed candidate when manual follow-up is needed.</p>
          <div className="admin-command-list">
            {props.transactions.filter((tx) => tx.refundReviewRequired).length === 0 ? (
              <p className="ops-detail-note">No computed refund-review candidates are available right now.</p>
            ) : props.transactions.filter((tx) => tx.refundReviewRequired).slice(0, 4).map((transaction) => {
              const alreadyTracked = activeKeys.has(transaction.paymentId) || activeKeys.has(transaction.orderId) || activeKeys.has(transaction.jobId);
              return (
                <div className="sw-list-row" key={`candidate-action:${transaction.paymentId}`}>
                  <div>
                    <strong>{transaction.restaurantName} · {formatCurrency(transaction.amountCents, transaction.currency)}</strong>
                    <p className="ops-detail-note">{transaction.refundReviewReason ?? transaction.recommendedNextAction}</p>
                  </div>
                  <button
                    className="sw-button sw-button--secondary button button-secondary"
                    disabled={alreadyTracked || props.pendingReviewId === transaction.paymentId}
                    onClick={() => props.onCreateFromCandidate?.(transaction)}
                    type="button"
                  >
                    {alreadyTracked ? "Review exists" : "Create review"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="admin-command-list">
        {props.reviews.length === 0 ? (
          <div className="sw-empty-state admin-empty-state">
            <strong className="sw-empty-title">No persistent finance reviews</strong>
            <p className="sw-empty-copy">Create a review from a candidate to track owner, status, and closeout notes.</p>
          </div>
        ) : props.reviews.map((review) => {
          const isEditing = editingReviewId === review.id;
          return (
            <article className="sw-list-row finance-review-row" key={review.id}>
              <div className="sw-stack-sm">
                <div className="sw-row">
                  <strong>{formatLabel(review.reviewType)}</strong>
                  <span className={`sw-badge ${financeReviewStatusBadge(review.status)}`}>{formatLabel(review.status)}</span>
                  <span className={`sw-badge ${financeReviewSeverityBadge(review.severity)}`}>{formatLabel(review.severity)}</span>
                  {props.admin && review.orgName ? <span className="sw-badge sw-badge--neutral">{review.orgName}</span> : null}
                </div>
                <p className="ops-detail-note">{review.reason}</p>
                {review.summary ? <p className="ops-detail-note">{review.summary}</p> : null}
                <p className="ops-detail-note">Owner: {review.ownerLabel ?? "Unassigned"} · Created {formatDateTime(review.createdAt)}</p>
                {review.resolution ? <p className="ops-detail-note">Resolution: {review.resolution}</p> : null}
              </div>
              <div className="orders-financial-grid">
                <div><span className="sw-metric-label">Payment</span><strong>{review.paymentId ? review.paymentId.slice(0, 8) : "None"}</strong></div>
                <div><span className="sw-metric-label">Order</span><strong>{review.orderId ? review.orderId.slice(0, 8) : "None"}</strong></div>
                <div><span className="sw-metric-label">Job</span><strong>{review.jobId ? review.jobId.slice(0, 8) : "None"}</strong></div>
                <div><span className="sw-metric-label">Updated</span><strong>{formatDateTime(review.updatedAt)}</strong></div>
              </div>
              {!props.admin && props.onUpdateReview ? (
                <div className="finance-review-editor">
                  {isEditing ? (
                    <>
                      <label className="sw-field">
                        <span className="sw-label">Owner</span>
                        <input className="sw-input" onChange={(event) => setOwnerLabel(event.target.value)} placeholder="Finance owner" value={ownerLabel} />
                      </label>
                      <label className="sw-field">
                        <span className="sw-label">Status</span>
                        <select className="sw-input" onChange={(event) => setStatus(event.target.value as FinanceReviewRecordStatus)} value={status}>
                          <option value="OPEN">Open</option>
                          <option value="IN_REVIEW">In review</option>
                          <option value="WAITING_SUPPORT">Waiting support</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </label>
                      {(status === "RESOLVED" || status === "CANCELLED") ? (
                        <>
                          <label className="sw-field">
                            <span className="sw-label">Resolution note</span>
                            <textarea className="sw-input" onChange={(event) => setResolution(event.target.value)} placeholder="Document the manual finance decision." value={resolution} />
                          </label>
                          <label className="sw-field">
                            <span className="sw-label">Resolution reason</span>
                            <input className="sw-input" onChange={(event) => setResolutionReason(event.target.value)} placeholder="e.g. refunded outside ShipWright" value={resolutionReason} />
                          </label>
                          <label className="sw-field">
                            <span className="sw-label">Typed confirmation</span>
                            <input className="sw-input" onChange={(event) => setConfirmation(event.target.value)} placeholder="CONFIRM FINANCE REVIEW" value={confirmation} />
                          </label>
                        </>
                      ) : null}
                      <div className="hero-actions">
                        <button
                          className="sw-button sw-button--primary button button-primary"
                          disabled={props.pendingReviewId === review.id}
                          onClick={() => props.onUpdateReview?.(review.id, {
                            status,
                            ownerLabel: ownerLabel.trim() || null,
                            resolution: resolution.trim() || null,
                            resolutionReason: resolutionReason.trim() || null,
                            confirmation
                          })}
                          type="button"
                        >
                          Save review
                        </button>
                        <button className="sw-button sw-button--secondary button button-secondary" onClick={() => setEditingReviewId(null)} type="button">Cancel</button>
                      </div>
                    </>
                  ) : (
                    <button
                      className="sw-button sw-button--secondary button button-secondary"
                      onClick={() => {
                        setEditingReviewId(review.id);
                        setOwnerLabel(review.ownerLabel ?? "");
                        setStatus(review.status === "RESOLVED" || review.status === "CANCELLED" ? "IN_REVIEW" : review.status);
                        setResolution(review.resolution ?? "");
                        setResolutionReason(review.resolutionReason ?? "");
                        setConfirmation("");
                      }}
                      type="button"
                    >
                      Update review
                    </button>
                  )}
                </div>
              ) : <p className="ops-detail-note">Admin view is read-only in v1.1. Manage closeout from the business workspace.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FinancePanels(props: {
  admin?: boolean;
  summary: FinanceSummary;
  transactions: FinanceTransaction[];
  reviews: FinanceReviewRecord[];
  onCreateFromCandidate?: (transaction: FinanceTransaction) => void;
  onUpdateReview?: (reviewId: string, input: UpdateFinanceReviewInput) => void;
  pendingReviewId?: string | null;
  reviewMessage?: string | null;
}) {
  const refundCandidates = useMemo(() => props.transactions.filter((tx) => tx.refundReviewRequired), [props.transactions]);

  return (
    <>
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
          <FinanceMetric copy="Persistent finance reviews still open." label="Open reviews" value={props.summary.openFinanceReviewCount} />
          <FinanceMetric copy="Finance reviews waiting for support context." label="Waiting support" value={props.summary.waitingSupportFinanceReviewCount} />
          <FinanceMetric copy="Delivered jobs visible to finance." label="Delivered jobs" value={props.summary.deliveredJobCount} />
          <FinanceMetric copy="Orders needing finance closeout review." label="Needs review" value={props.summary.ordersNeedingFinanceReview} />
        </div>
      </section>

      <FinanceReviewWorkflow
        admin={props.admin}
        message={props.reviewMessage}
        onCreateFromCandidate={props.onCreateFromCandidate}
        onUpdateReview={props.onUpdateReview}
        pendingReviewId={props.pendingReviewId}
        reviews={props.reviews}
        transactions={props.transactions}
      />

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
    </>
  );
}

export function FinanceView(props: {
  admin?: boolean;
  summary: FinanceSummary;
  transactions: FinanceTransaction[];
  reviews?: FinanceReviewRecord[];
  session?: BusinessSession | null;
  onCreateFromCandidate?: (transaction: FinanceTransaction) => void;
  onUpdateReview?: (reviewId: string, input: UpdateFinanceReviewInput) => void;
  pendingReviewId?: string | null;
  reviewMessage?: string | null;
}) {
  const title = props.admin ? "Platform finance review" : "Finance and settlement visibility";
  const subtitle = props.admin
    ? "Cross-organisation payment, closeout, and refund-review posture. Finance review only; no automated refunds or payouts."
    : "Payment, closeout, and refund-review posture for this workspace. Finance review only; no automated refunds or payouts.";

  if (props.admin) {
    return (
      <main className="app-shell admin-shell-page">
        <div className="sw-row-between admin-shell-header">
          <div>
            <BrandLogo />
            <p className="eyebrow">Finance</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="hero-actions">
            <AdminWorkspaceLink />
            <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/command">
              Admin command
            </Link>
          </div>
        </div>

        <ProductUpdateAnnouncement routePath="/admin/finance" viewer="platform_admin" viewerKey={props.session?.userId ?? "finance"} />
        <FinancePanels admin reviews={props.reviews ?? []} summary={props.summary} transactions={props.transactions} />
      </main>
    );
  }

  const displayName = props.session?.context.displayName ?? "Business operator";
  const email = props.session?.context.email ?? "Signed-in workspace";
  const workspaceName = props.session?.context.currentOrg?.name ?? "Current workspace";

  return (
    <main className="app-shell ops-shell finance-shell-page">
      <header className="ops-topbar">
        <div className="ops-branding">
          <BrandLogo href="/" mode="responsive" />
          <p className="eyebrow">Finance</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="ops-topbar-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/payments">
            Payment risk
          </Link>
        </div>
      </header>

      <section className="ops-layout">
        <aside className="ops-sidebar" aria-label="Workspace finance navigation">
          <WorkspaceNav active="finance" platformAdmin={Boolean(props.session?.context.platformAdmin)} />

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Operator</span>
            <strong>{displayName}</strong>
            <p>{email}</p>
          </section>

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Finance posture</span>
            <div className="ops-summary-list">
              <div>
                <strong>{props.summary.capturedPaymentCount}</strong>
                <span>Captured</span>
              </div>
              <div>
                <strong>{props.summary.pendingPaymentCount}</strong>
                <span>Pending</span>
              </div>
              <div>
                <strong>{props.summary.refundReviewCandidates}</strong>
                <span>Review</span>
              </div>
            </div>
          </section>

          <section className="ops-sidebar-section ops-sidebar-live">
            <span className="ops-section-label">Workspace</span>
            <strong>{workspaceName}</strong>
            <p>Finance visibility is review-only. No refunds or payouts are automated from this surface.</p>
            <span className="sidebar-live-action">
              Review support and order context before any manual finance decision.
            </span>
          </section>
        </aside>

        <div className="ops-main">
          <ProductUpdateAnnouncement routePath="/app/finance" viewer="business" viewerKey={props.session?.userId ?? "finance"} />
          <FinancePanels
            onCreateFromCandidate={props.onCreateFromCandidate}
            onUpdateReview={props.onUpdateReview}
            pendingReviewId={props.pendingReviewId}
            reviewMessage={props.reviewMessage}
            reviews={props.reviews ?? []}
            summary={props.summary}
            transactions={props.transactions}
          />
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
  const [reviews, setReviews] = useState<FinanceReviewRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/app/finance" }));
  }, [router, status]);

  useEffect(() => {
    let active = true;
    if (!session) return () => { active = false; };
    setLoadError(null);
    void Promise.all([getBusinessFinanceSummary(session), listBusinessFinanceTransactions(session), listBusinessFinanceReviews(session)])
      .then(([nextSummary, nextTransactions, nextReviews]) => {
        if (!active) return;
        setSummary(nextSummary);
        setTransactions(nextTransactions);
        setReviews(nextReviews);
      })
      .catch((issue) => {
        if (!active) return;
        setLoadError(getUserFacingApiError(issue, FINANCE_UNAVAILABLE));
      });
    return () => { active = false; };
  }, [session]);

  async function refreshFinance(currentSession = session) {
    if (!currentSession) return;
    const [nextSummary, nextTransactions, nextReviews] = await Promise.all([
      getBusinessFinanceSummary(currentSession),
      listBusinessFinanceTransactions(currentSession),
      listBusinessFinanceReviews(currentSession)
    ]);
    setSummary(nextSummary);
    setTransactions(nextTransactions);
    setReviews(nextReviews);
  }

  async function handleCreateFromCandidate(transaction: FinanceTransaction) {
    if (!session) return;
    setPendingReviewId(transaction.paymentId);
    setReviewMessage(null);
    try {
      await createBusinessFinanceReview(session, {
        orderId: transaction.orderId,
        jobId: transaction.jobId,
        paymentId: transaction.paymentId,
        reviewType: "REFUND_REVIEW",
        severity: "MEDIUM",
        reason: transaction.refundReviewReason ?? "Computed refund-review candidate needs manual finance review.",
        summary: transaction.recommendedNextAction,
        metadata: {
          source: "finance_page_candidate",
          paymentStatus: transaction.paymentStatus,
          orderStatus: transaction.orderStatus,
          jobStatus: transaction.jobStatus
        }
      });
      await refreshFinance(session);
      setReviewMessage("Finance review recorded. No refund or payment-provider action was performed.");
    } catch (issue) {
      setLoadError(getUserFacingApiError(issue, "Could not create finance review."));
    } finally {
      setPendingReviewId(null);
    }
  }

  async function handleUpdateReview(reviewId: string, input: UpdateFinanceReviewInput) {
    if (!session) return;
    setPendingReviewId(reviewId);
    setReviewMessage(null);
    try {
      await updateBusinessFinanceReview(session, reviewId, input);
      await refreshFinance(session);
      setReviewMessage("Finance review updated. Audit history records the change.");
    } catch (issue) {
      setLoadError(getUserFacingApiError(issue, "Could not update finance review."));
    } finally {
      setPendingReviewId(null);
    }
  }

  if (status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState message={error ?? FINANCE_UNAVAILABLE} onRefresh={() => void refreshBusinessSession()} />;
  if (status !== "authenticated" || !session) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} onRefresh={() => void refreshBusinessSession()} />;
  if (!summary) return <LoadingState />;
  return (
    <FinanceView
      onCreateFromCandidate={handleCreateFromCandidate}
      onUpdateReview={handleUpdateReview}
      pendingReviewId={pendingReviewId}
      reviewMessage={reviewMessage}
      reviews={reviews}
      session={session}
      summary={summary}
      transactions={transactions}
    />
  );
}

export function AdminFinanceShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession } = useBusinessAuth();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [reviews, setReviews] = useState<FinanceReviewRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/admin/finance" }));
  }, [router, status]);

  useEffect(() => {
    let active = true;
    if (!session) return () => { active = false; };
    setLoadError(null);
    void Promise.all([getAdminFinanceSummary(session), listAdminFinanceTransactions(session), listAdminFinanceReviews(session)])
      .then(([nextSummary, nextTransactions, nextReviews]) => {
        if (!active) return;
        setSummary(nextSummary);
        setTransactions(nextTransactions);
        setReviews(nextReviews);
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
  return <FinanceView admin reviews={reviews} session={session} summary={summary} transactions={transactions} />;
}
