import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync } from "node:fs";
import path from "node:path";
import { BrandLogo } from "../../_components/brand-logo";
import { ShipWrightIcon, type ShipWrightIconName } from "../../_components/shipwright-icon";
import { investorDemoControlLinks, investorDemoSteps, investorDemoWarnings } from "../../_content/investor-demo";

export const metadata: Metadata = {
  title: "Investor Demo | ShipWright",
  description: "Guided investor-facing walkthrough of ShipWright's proven Stage 1 paid delivery loop."
};

type ProofSummary = {
  capturedAt: string;
  environment: string;
  apiBaseUrl: string;
  webBaseUrl: string;
  restaurantSlug: string;
  result: "pass" | "fail" | "partial";
  proofType: string;
  summary: {
    orderId: string;
    jobId: string;
    offerId: string;
    paymentId: string;
    podId: string;
    paymentStatus: string;
    jobStatus: string;
    orderStatus: string;
  };
  notes: string[];
  sourceDocument: string;
};

function readProofSummary(): ProofSummary | null {
  try {
    const filePath = path.join(process.cwd(), "docs/demo/investor-proof-summary.json");
    return JSON.parse(readFileSync(filePath, "utf8")) as ProofSummary;
  } catch {
    return null;
  }
}

function proofTone(result: ProofSummary["result"] | null) {
  if (result === "pass") {
    return "sw-badge--success";
  }

  if (result === "partial") {
    return "sw-badge--info";
  }

  return "sw-badge--neutral";
}

function proofIcon(result: ProofSummary["result"] | null): ShipWrightIconName {
  if (result === "pass") {
    return "check";
  }

  if (result === "partial") {
    return "warning";
  }

  return "document";
}

export default function InvestorDemoPage() {
  const proof = readProofSummary();

  return (
    <main className="help-shell investor-demo-shell">
      <header className="sw-command-surface investor-demo-hero">
        <div>
          <BrandLogo href="/" />
          <p className="eyebrow">Investor demo mode</p>
          <h1>Show the proven Stage 1 loop as one connected operating product.</h1>
          <p>
            This route is the guided control panel for merchant activation, public ordering, paid delivery execution,
            notifications, and platform oversight. It points at real screens and documented staging proof rather than demo-only logic.
          </p>
        </div>
        <div className="hero-actions investor-demo-actions">
          <Link className="sw-button sw-button--primary button button-primary" href="/restaurants/pilot-kitchen-1777370757">
            <ShipWrightIcon name="restaurant" />
            <span>Open public restaurant</span>
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/restaurant">
            <ShipWrightIcon name="menu" />
            <span>Open merchant setup</span>
          </Link>
        </div>
      </header>

      <section className="investor-demo-grid">
        <section className="sw-operational-surface investor-demo-section">
          <div className="investor-demo-section-header">
            <div>
              <p className="eyebrow">Demo narrative</p>
              <h2>What each screen proves</h2>
            </div>
          </div>
          <div className="investor-demo-step-list">
            {investorDemoSteps.map((step, index) => (
              <article className="sw-queue-row investor-demo-step" key={step.title}>
                <div className="sw-queue-row-main">
                  <div className="investor-demo-step-index">{index + 1}</div>
                  <div>
                    <div className="investor-demo-step-meta">
                      <span>{step.screen}</span>
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.proof}</p>
                    <p className="investor-demo-step-value">{step.audienceValue}</p>
                  </div>
                </div>
                <div className="sw-queue-row-actions">
                  <Link className="sw-button sw-button--secondary button button-secondary" href={step.href}>
                    <ShipWrightIcon name="arrow" />
                    <span>Open screen</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="sw-operational-surface investor-demo-section">
          <div className="investor-demo-section-header">
            <div>
              <p className="eyebrow">Control panel</p>
              <h2>Fast screen access</h2>
            </div>
          </div>
          <div className="help-card-grid investor-demo-links-grid">
            {investorDemoControlLinks.map((item) => (
              <Link className="sw-operational-surface help-card investor-demo-link-card" href={item.href} key={item.href}>
                <span className="sw-icon-badge sw-icon-badge--info help-card-icon" aria-hidden="true">
                  <ShipWrightIcon name={item.href === "/admin" ? "alert" : item.href === "/driver" ? "driver" : item.href === "/app/notifications" ? "bell" : item.href === "/app/orders" ? "document" : item.href === "/app/jobs" ? "queue" : "restaurant"} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <p>{item.proof}</p>
                </span>
                <span className="help-card-arrow" aria-hidden="true">
                  <ShipWrightIcon name="arrow" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <section className="investor-demo-grid">
        <section className="sw-supporting-surface investor-demo-section">
          <div className="investor-demo-section-header">
            <div>
              <p className="eyebrow">Latest documented proof</p>
              <h2>Staging paid-delivery summary</h2>
            </div>
            <span className={`sw-badge ${proofTone(proof?.result ?? null)}`}>
              <ShipWrightIcon name={proofIcon(proof?.result ?? null)} />
              <span>{proof ? proof.result.toUpperCase() : "UNAVAILABLE"}</span>
            </span>
          </div>

          {proof ? (
            <>
              <p className="investor-demo-proof-copy">
                Last documented proof captured at {new Date(proof.capturedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} against {proof.environment}.
                This is a recorded proof summary, not a live monitoring feed.
              </p>
              <div className="investor-demo-proof-grid">
                <article className="sw-metric-card investor-demo-proof-card">
                  <span className="sw-metric-label">Order</span>
                  <strong className="sw-metric-value">{proof.summary.orderStatus}</strong>
                  <p className="sw-metric-copy">{proof.summary.orderId}</p>
                </article>
                <article className="sw-metric-card investor-demo-proof-card">
                  <span className="sw-metric-label">Job</span>
                  <strong className="sw-metric-value">{proof.summary.jobStatus}</strong>
                  <p className="sw-metric-copy">{proof.summary.jobId}</p>
                </article>
                <article className="sw-metric-card investor-demo-proof-card">
                  <span className="sw-metric-label">Payment</span>
                  <strong className="sw-metric-value">{proof.summary.paymentStatus}</strong>
                  <p className="sw-metric-copy">{proof.summary.paymentId}</p>
                </article>
                <article className="sw-metric-card investor-demo-proof-card">
                  <span className="sw-metric-label">POD</span>
                  <strong className="sw-metric-value">Recorded</strong>
                  <p className="sw-metric-copy">{proof.summary.podId}</p>
                </article>
              </div>
              <div className="investor-demo-note-list">
                {proof.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
                <p>
                  Source: <code>{proof.sourceDocument}</code>
                </p>
              </div>
            </>
          ) : (
            <div className="sw-empty-state investor-demo-proof-empty">
              <span className="empty-state-icon" aria-hidden="true">
                <ShipWrightIcon name="document" />
              </span>
              <strong className="sw-empty-title">No static proof summary loaded</strong>
              <p className="sw-empty-copy">Add a documented proof artifact before claiming a fresh staging pass in the investor demo.</p>
            </div>
          )}
        </section>

        <section className="sw-supporting-surface investor-demo-section">
          <div className="investor-demo-section-header">
            <div>
              <p className="eyebrow">Demo guardrails</p>
              <h2>What to say and what not to fake</h2>
            </div>
          </div>
          <ul className="help-list investor-demo-warning-list">
            {investorDemoWarnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="hero-actions investor-demo-actions-left">
            <Link className="sw-button sw-button--secondary button button-secondary" href="/help/troubleshooting">
              <ShipWrightIcon name="document" />
              <span>Open troubleshooting help</span>
            </Link>
          </div>
          <p className="investor-demo-doc-note">
            Full talk track: <code>/Users/olubusayoadewale/Coding Projects/shipwright/docs/demo/investor-demo-script.md</code>
          </p>
        </section>
      </section>
    </main>
  );
}
