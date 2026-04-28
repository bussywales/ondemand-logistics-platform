import Link from "next/link";
import { BrandLogo } from "./_components/brand-logo";

const proofPoints = ["Pilot-ready operations", "Auth-backed workspaces", "Stripe payment rail", "Dispatch queue intelligence"];

const benefits = [
  {
    title: "Control every live job",
    body: "See pickup, drop, status, driver assignment, ETA, and payment posture in one command surface."
  },
  {
    title: "Resolve exceptions faster",
    body: "Needs Review prioritises blockers, diagnoses the issue, and points operators to the next safe action."
  },
  {
    title: "Launch local delivery without chaos",
    body: "Restaurant setup, menu loading, paid orders, dispatch, tracking, and completion follow one controlled path."
  }
];

const steps = [
  { title: "Activate merchant", body: "Create the business workspace, restaurant profile, and orderable menu." },
  { title: "Accept paid orders", body: "Customers browse the branded route, build a cart, and authorise payment." },
  { title: "Run dispatch", body: "Operators track jobs, retries, driver state, payment, and timeline events." },
  { title: "Close with proof", body: "Delivery completion produces a clean operational record for support and audit." }
];

const advantages = [
  "Queue-first operations console",
  "Decision banners for blocked jobs",
  "Payment state visible before action",
  "Restaurant menu foundation for pilot ordering",
  "Dispatch attempts and timeline surfaced clearly",
  "No fake success states or mock completion"
];

function SectionHeading(props: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{props.eyebrow}</p>
      <h2>{props.title}</h2>
      {props.body ? <p className="section-copy">{props.body}</p> : null}
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="preview-frame" aria-label="Operations console preview">
      <div className="preview-toolbar">
        <div>
          <span className="preview-label">Operations console</span>
          <strong>Stoke pilot workspace</strong>
        </div>
        <span className="status-badge status-live">Live</span>
      </div>

      <div className="preview-metrics">
        <div>
          <span>Active jobs</span>
          <strong>12</strong>
        </div>
        <div>
          <span>Needs review</span>
          <strong>2</strong>
        </div>
        <div>
          <span>Completed today</span>
          <strong>38</strong>
        </div>
      </div>

      <div className="preview-queue">
        <div className="preview-queue-head">
          <span>Job</span>
          <span>Status</span>
          <span>Route</span>
          <span>ETA</span>
        </div>
        <div className="preview-queue-row">
          <strong>JOB-20481</strong>
          <span className="status-badge status-live">En route</span>
          <span>Chapel Street Kitchen to Ashfield Retail</span>
          <strong>14m</strong>
        </div>
        <div className="preview-queue-row preview-queue-row-alert">
          <strong>JOB-20477</strong>
          <span className="status-badge status-negative">Blocker</span>
          <span>Dispatch failed - no driver accepted</span>
          <strong>Review</strong>
        </div>
        <div className="preview-queue-row">
          <strong>JOB-20472</strong>
          <span className="status-badge status-positive">Delivered</span>
          <span>Market Hall to Station Road</span>
          <strong>Closed</strong>
        </div>
      </div>

      <div className="preview-decision-panel">
        <span className="preview-label">Decision intelligence</span>
        <strong>Dispatch failed - no driver accepted</strong>
        <p>Customer is waiting. Retry dispatch or assign manually before the SLA risk increases.</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="landing-page">
      <header className="topbar">
        <BrandLogo href="/" />
        <nav className="topnav" aria-label="Primary">
          <a href="#benefits">Benefits</a>
          <a href="#workflow">How it works</a>
          <a href="#advantages">Advantages</a>
          <Link href="/get-started">Get started</Link>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Premium logistics command centre</p>
            <h1>Take control of local delivery operations</h1>
            <p className="hero-body">
              ShipWright gives food and local retail teams a fintech-grade operating layer for paid orders,
              dispatch decisions, live job state, and delivery completion.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/get-started">
                Start operating
              </Link>
              <Link className="button button-secondary" href="/demo">
                View product demo
              </Link>
            </div>
            <div className="hero-notes" aria-label="Platform proof points">
              {proofPoints.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className="hero-panel">
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Social proof placeholder">
        <p className="trust-strip-title">Built for controlled pilot launch and investor-grade operating discipline</p>
        <div className="trust-items">
          <span className="trust-item">Restaurants</span>
          <span className="trust-item">Local retail</span>
          <span className="trust-item">Operators</span>
          <span className="trust-item">Courier supply</span>
        </div>
      </section>

      <section className="section" id="benefits">
        <SectionHeading
          eyebrow="Benefits"
          title="A delivery product that behaves like an operating system."
          body="The product should make teams more confident under pressure, not give them another generic dashboard to interpret."
        />
        <div className="text-columns">
          {benefits.map((item) => (
            <article className="text-column" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="workflow">
        <SectionHeading eyebrow="How it works" title="From merchant activation to delivery closure." />
        <div className="steps-flow">
          {steps.map((step, index) => (
            <article className="flow-step" key={step.title}>
              <div className="flow-step-topline">
                <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                <p className="step-action">{step.title}</p>
              </div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="advantages">
        <SectionHeading
          eyebrow="Operational advantages"
          title="Structured surfaces for decisions, not decoration."
          body="ShipWright prioritises what is wrong, why it happened, and what action should happen next."
        />
        <div className="feature-list">
          {advantages.map((feature) => (
            <div className="feature-list-row" key={feature}>
              <span className="feature-marker" aria-hidden="true" />
              <p>{feature}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section final-cta" id="contact">
        <div className="cta-card">
          <SectionHeading
            eyebrow="Next step"
            title="Run the pilot from a command centre, not a spreadsheet."
            body="Start with a real business workspace, menu, paid customer order, and operations console that exposes the next decision."
          />
          <div className="hero-actions">
            <Link className="button button-primary" href="/get-started">
              Get started
            </Link>
            <Link className="button button-secondary" href="/contact">
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <BrandLogo className="footer-brand-mark" href="/" mode="full" />
          <p>Premium logistics operations software for food and local retail delivery.</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/get-started">Get started</Link>
          <Link href="/demo">Demo</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </footer>
    </main>
  );
}
