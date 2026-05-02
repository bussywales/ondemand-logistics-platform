"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ContextualHelpLink } from "./help";
import { NotificationsBell } from "./notifications";
import { ProductUpdateAnnouncement } from "./product-updates";
import { ShipWrightIcon, type ShipWrightIconName } from "./shipwright-icon";
import { WorkspaceNav } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import { listBusinessPayments } from "../_lib/api";
import {
  formatCurrency,
  formatDateTime,
  type BusinessPaymentSummary
} from "../_lib/product-state";
import {
  getPaymentRiskState,
  getPaymentShortId,
  getPayoutStatusLabel,
  matchesPaymentFilter,
  PAYMENT_FILTERS,
  summarizePaymentPortfolio,
  type PaymentFilterKey
} from "../_lib/payments-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";

function statusTone(status: string) {
  if (["FAILED", "PAYMENT_FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(status)) {
    return "status-negative";
  }

  if (["FULFILLED", "DELIVERED", "CAPTURED", "PAID"].includes(status)) {
    return "status-positive";
  }

  if (["AUTHORIZED", "PAYMENT_AUTHORIZED", "READY", "PENDING", "REQUESTED", "ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(status)) {
    return "status-live";
  }

  return "status-neutral";
}

function statusIcon(status: string): ShipWrightIconName {
  if (["FAILED", "PAYMENT_FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(status)) {
    return "alert";
  }

  if (["CAPTURED", "FULFILLED", "DELIVERED", "PAID"].includes(status)) {
    return "check";
  }

  if (["AUTHORIZED", "PAYMENT_AUTHORIZED"].includes(status)) {
    return "payment";
  }

  if (["READY", "PENDING"].includes(status)) {
    return "queue";
  }

  return "route";
}

function StatusBadge(props: { value: string; label?: string }) {
  return (
    <span className={`status-badge status-with-icon ${statusTone(props.value)}`}>
      <ShipWrightIcon name={statusIcon(props.value)} />
      <span>{props.label ?? props.value.replace(/_/g, " ")}</span>
    </span>
  );
}

function FilterChip(props: {
  active: boolean;
  count: number;
  filter: { key: PaymentFilterKey; label: string };
  onClick: (key: PaymentFilterKey) => void;
}) {
  return (
    <button
      className={`mode-chip orders-filter-chip ${props.active ? "mode-chip-active orders-filter-chip-active" : ""}`}
      onClick={() => props.onClick(props.filter.key)}
      type="button"
    >
      <span>{props.filter.label}</span>
      <strong>{props.count}</strong>
    </button>
  );
}

function SummaryCard(props: {
  body: string;
  label: string;
  tone: "danger" | "warning" | "info" | "success";
  value: number;
}) {
  return (
    <div className={`sw-metric-card payments-metric-card payments-metric-card-${props.tone}`}>
      <span className="sw-metric-label">{props.label}</span>
      <strong className="sw-metric-value">{props.value}</strong>
      <p className="sw-metric-copy">{props.body}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="sw-empty-state payments-empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <ShipWrightIcon name="payment" />
      </span>
      <strong className="sw-empty-title">No payment records yet</strong>
      <p className="sw-empty-copy">Authorized and captured customer orders will appear here once the public checkout starts creating paid orders.</p>
    </div>
  );
}

function PaymentQueueRow({ payment }: { payment: BusinessPaymentSummary }) {
  const riskState = getPaymentRiskState(payment);
  const payoutLabel = getPayoutStatusLabel(payment.payoutStatus);

  return (
    <article className={`sw-queue-row sw-list-row payments-queue-row payments-queue-row-${riskState.tone}`}>
      <div className="sw-queue-row-main payments-queue-main">
        <div className="payments-queue-identity">
          <span
            className={`icon-chip ${riskState.tone === "danger" ? "icon-chip-blocker" : riskState.tone === "warning" ? "icon-chip-risk" : "icon-chip-success"}`}
            aria-hidden="true"
          >
            <ShipWrightIcon name={riskState.tone === "danger" ? "alert" : riskState.tone === "warning" ? "payment" : "check"} />
          </span>
          <div>
            <span className="ops-section-label">Payment {getPaymentShortId(payment.id)}</span>
            <h3>{payment.customerName}</h3>
            <p>
              {payment.restaurant.name} · Updated {formatDateTime(payment.updatedAt)}
            </p>
          </div>
        </div>

        <div className="payments-queue-facts" aria-label="Payment facts">
          <div>
            <span>Total</span>
            <strong>{formatCurrency(payment.customerTotalCents, payment.currency)}</strong>
          </div>
          <div>
            <span>Authorized</span>
            <strong>{formatCurrency(payment.amountAuthorizedCents, payment.currency)}</strong>
          </div>
          <div>
            <span>Captured</span>
            <strong>{formatCurrency(payment.amountCapturedCents, payment.currency)}</strong>
          </div>
          <div>
            <span>Platform fee</span>
            <strong>{formatCurrency(payment.platformFeeCents, payment.currency)}</strong>
          </div>
          <div>
            <span>Driver payout</span>
            <strong>{formatCurrency(payment.payoutGrossCents, payment.currency)}</strong>
          </div>
        </div>

        <div className="payments-status-cluster" aria-label="Payment status summary">
          <div className="orders-status-block">
            <span>Payment</span>
            <StatusBadge value={payment.paymentStatus} />
          </div>
          <div className="orders-status-block">
            <span>Order</span>
            <StatusBadge value={payment.orderStatus} />
          </div>
          <div className="orders-status-block">
            <span>Delivery</span>
            <StatusBadge value={payment.jobStatus} />
          </div>
          <div className="orders-status-block">
            <span>Payout</span>
            <StatusBadge value={payment.payoutStatus ?? "PENDING"} label={payoutLabel} />
          </div>
        </div>

        <div className="payments-risk-strip">
          <strong>{riskState.title}</strong>
          <p>{riskState.summary}</p>
        </div>
      </div>

      <div className="sw-queue-row-actions payments-queue-actions">
        <Link className="sw-button sw-button--primary button button-primary" href={`/app/orders/${payment.orderId}`}>
          <ShipWrightIcon name="arrow" />
          <span>View order</span>
        </Link>
        <Link className="sw-button sw-button--secondary button button-secondary" href={`/app/jobs/${payment.jobId}`}>
          <ShipWrightIcon name="route" />
          <span>View job</span>
        </Link>
      </div>
    </article>
  );
}

function riskMessage(summary: ReturnType<typeof summarizePaymentPortfolio>) {
  if (summary.risks > 0) {
    return `${summary.risks} payment risks need review before settlement can be considered clear.`;
  }

  if (summary.authorized > 0) {
    return `${summary.authorized} authorised orders are waiting on capture or delivery completion.`;
  }

  return "Payment authorisation, capture, and payout readiness look clear in the current pilot window.";
}

export function PaymentsShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [payments, setPayments] = useState<BusinessPaymentSummary[]>([]);
  const [filter, setFilter] = useState<PaymentFilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/app/payments" }));
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);

    void listBusinessPayments(session)
      .then((items) => {
        if (active) {
          setPayments(items);
        }
      })
      .catch((issue) => {
        if (active) {
          setLoadError(issue instanceof Error ? issue.message : "Unable to load payment visibility.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [session, status]);

  const filteredPayments = useMemo(() => payments.filter((payment) => matchesPaymentFilter(payment, filter)), [filter, payments]);
  const summary = useMemo(() => summarizePaymentPortfolio(payments), [payments]);
  const counts = useMemo(
    () =>
      Object.fromEntries(PAYMENT_FILTERS.map((item) => [item.key, payments.filter((payment) => matchesPaymentFilter(payment, item.key)).length])) as Record<PaymentFilterKey, number>,
    [payments]
  );

  if (status === "loading" || loading) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <strong>Loading payment visibility</strong>
          <p>Pulling the latest authorization, capture, and payout readiness signals.</p>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Session issue</p>
          <h1>Workspace session could not be restored.</h1>
          <p>{error ?? "Retry the session restore or sign out and start again."}</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => void refreshBusinessSession()} type="button">
              Retry session
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                void signOut().then(() => router.replace("/get-started"));
              }}
              type="button"
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (status !== "authenticated" || !session) {
    return null;
  }

  return (
    <main className="app-shell payments-shell-page">
      <header className="app-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Payments and settlement</p>
          <h1>Reconciliation</h1>
          <p>Track authorisation, capture, refund posture, payout readiness, and unresolved settlement risks.</p>
        </div>
        <div className="hero-actions">
          <NotificationsBell session={session} />
          <ContextualHelpLink href="/help/pilot-operations" label="Help" />
        </div>
      </header>

      <WorkspaceNav active="payments" platformAdmin={Boolean(session.context.platformAdmin)} />
      <ProductUpdateAnnouncement routePath="/app/payments" viewer="business" viewerKey={session.userId} />

      {loadError ? (
        <section className="sw-empty-state payments-empty-state payments-empty-state-danger">
          <span className="empty-state-icon" aria-hidden="true">
            <ShipWrightIcon name="alert" />
          </span>
          <strong className="sw-empty-title">Unable to load payment visibility</strong>
          <p className="sw-empty-copy">{loadError}</p>
        </section>
      ) : null}

      <section className={`sw-command-surface payments-command-surface ${summary.risks > 0 ? "sw-command-surface--warning" : ""}`}>
        <div className="sw-row payments-command-copy">
          <span className={`sw-icon-badge payments-command-icon ${summary.risks > 0 ? "admin-command-icon-warning" : "admin-command-icon-success"}`} aria-hidden="true">
            <ShipWrightIcon name={summary.risks > 0 ? "alert" : "payment"} />
          </span>
          <div>
            <p className="eyebrow">Decision summary</p>
            <h2>{summary.risks > 0 ? `${summary.risks} items need payment review` : "Settlement view clear"}</h2>
            <p>{riskMessage(summary)}</p>
          </div>
        </div>
        <div className="payments-metric-grid">
          <SummaryCard body="Authorized but not yet settled or refunded." label="Authorised" tone="warning" value={summary.authorized} />
          <SummaryCard body="Captured customer funds now visible in settlement." label="Captured" tone="success" value={summary.captured} />
          <SummaryCard body="Failed or refunded payment paths requiring closure checks." label="Refunded / failed" tone={summary.failed > 0 ? "danger" : "info"} value={summary.failed + summary.refundedOrCancelled} />
          <SummaryCard body="Captured deliveries ready for payout release or already paid." label="Payout ready" tone="info" value={summary.payoutReady} />
        </div>
      </section>

      <section className="sw-operational-surface payments-section">
        <div className="sw-card-header payments-section-header">
          <div>
            <p className="eyebrow">Payment queue</p>
            <h2>Operational settlement visibility</h2>
          </div>
          <span className={`status-badge ${summary.risks > 0 ? "status-negative" : "status-positive"}`}>
            {summary.risks > 0 ? `${summary.risks} risks open` : "No current blockers"}
          </span>
        </div>
        <div className="payments-filter-bar" role="tablist" aria-label="Payment filters">
          {PAYMENT_FILTERS.map((item) => (
            <FilterChip
              active={filter === item.key}
              count={counts[item.key]}
              filter={item}
              key={item.key}
              onClick={setFilter}
            />
          ))}
        </div>
        {filteredPayments.length ? (
          <div className="payments-list">
            {filteredPayments.map((payment) => (
              <PaymentQueueRow key={payment.id} payment={payment} />
            ))}
          </div>
        ) : payments.length ? (
          <div className="sw-empty-state payments-empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <ShipWrightIcon name="queue" />
            </span>
            <strong className="sw-empty-title">No items in this filter</strong>
            <p className="sw-empty-copy">Try another payment view to inspect authorised, captured, refunded, or payout-ready activity.</p>
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
    </main>
  );
}
