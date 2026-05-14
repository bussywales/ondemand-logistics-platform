import Link from "next/link";
import { BrandLogo } from "./_components/brand-logo";
import { ShipWrightIcon, type ShipWrightIconName } from "./_components/shipwright-icon";

const proofPoints = [
  "Paid order to delivered proof",
  "Human-in-the-loop operations",
  "Payment-state visibility",
  "Pilot-ready command workflows"
];

const audiences = [
  {
    icon: "restaurant",
    audience: "Restaurants",
    problem: "Delivery demand arrives faster than teams can coordinate menus, orders, couriers, and customer updates.",
    solution: "ShipWright gives restaurant operators a controlled ordering and fulfilment path from public menu to delivery completion.",
    outcome: "More predictable service windows, fewer blind handoffs, and cleaner customer support context."
  },
  {
    icon: "queue",
    audience: "Operators",
    problem: "Live delivery work becomes fragmented across payment tools, dispatch notes, courier chats, and spreadsheets.",
    solution: "One operations surface connects order state, delivery job state, payment posture, tracking, and recommended next action.",
    outcome: "Operators spend less time interpreting dashboards and more time resolving the right work."
  },
  {
    icon: "driver",
    audience: "Couriers",
    problem: "Courier readiness, assignment, and proof of delivery need structure before local delivery can scale.",
    solution: "Driver routes, offers, execution states, proof of delivery, and readiness surfaces keep courier work legible.",
    outcome: "Cleaner execution paths and fewer ambiguous states during controlled pilot operations."
  },
  {
    icon: "payment",
    audience: "Local retail",
    problem: "Retail delivery needs payment confidence, fulfilment visibility, and recovery workflows without enterprise complexity.",
    solution: "ShipWright presents payment risk as an operational lens on orders, not a disconnected finance dashboard.",
    outcome: "Teams know when an order can move, when capture happened, and what still needs review."
  },
  {
    icon: "timeline",
    audience: "Platform oversight",
    problem: "Multi-merchant pilot operations need clear escalation, evidence, and closeout without bypassing human responsibility.",
    solution: "Admin command views show cross-org attention, incidents, courier readiness, and end-of-day closeout signals.",
    outcome: "Platform teams can support operators while preserving org boundaries and approval controls."
  }
] satisfies Array<{
  audience: string;
  icon: ShipWrightIconName;
  outcome: string;
  problem: string;
  solution: string;
}>;

const intelligence = [
  {
    title: "Daily briefing",
    body: "A concise view of what needs attention before service starts."
  },
  {
    title: "Recovery suggestions",
    body: "Deterministic guidance for failed dispatch, no-driver, and payment-blocked situations."
  },
  {
    title: "Incident intelligence",
    body: "Delay detection and calm communication drafts that require review before use."
  },
  {
    title: "End-of-day report",
    body: "A closeout summary of orders, deliveries, incidents, payment risks, and unresolved work."
  }
];

const workflow = [
  "Customer order",
  "Payment authorisation",
  "Dispatch",
  "Courier execution",
  "Tracking",
  "Payment capture",
  "Fulfilment closeout"
];

const confidenceSignals = [
  "Release verification and schema readiness gates",
  "Paid-delivery proof artifacts",
  "Dispatch attempts and job timelines",
  "Payment capture and payout-risk visibility",
  "Pilot recovery playbooks",
  "Operator-approved recovery actions"
];

function EditorialHeading(props: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="landing-editorial-heading">
      <p className="eyebrow">{props.eyebrow}</p>
      <h2>{props.title}</h2>
      {props.body ? <p>{props.body}</p> : null}
    </div>
  );
}

function CommandIllustration() {
  return (
    <div className="landing-command-visual" aria-label="ShipWright operational command visual">
      <div className="landing-command-topline">
        <div>
          <span>Command centre</span>
          <strong>Friday service window</strong>
        </div>
        <span className="landing-status-pill">Operational signals</span>
      </div>

      <div className="landing-route-visual" aria-hidden="true">
        <span className="landing-route-node landing-route-node-start">Pickup</span>
        <span className="landing-route-line" />
        <span className="landing-route-courier">
          <ShipWrightIcon name="driver" />
        </span>
        <span className="landing-route-line" />
        <span className="landing-route-node landing-route-node-end">Drop-off</span>
      </div>

      <div className="landing-command-summary">
        <div>
          <span>Orders today</span>
          <strong>42</strong>
        </div>
        <div>
          <span>Moving</span>
          <strong>9</strong>
        </div>
        <div>
          <span>Review</span>
          <strong>2</strong>
        </div>
      </div>

      <div className="landing-command-stream">
        <article>
          <span className="landing-stream-dot" />
          <div>
            <strong>Payment authorised</strong>
            <p>Ready for dispatch once restaurant confirms handoff.</p>
          </div>
        </article>
        <article>
          <span className="landing-stream-dot landing-stream-dot-attention" />
          <div>
            <strong>Dispatch needs review</strong>
            <p>Retry dispatch first: no open courier offer is active.</p>
          </div>
        </article>
        <article>
          <span className="landing-stream-dot" />
          <div>
            <strong>Delivery completed</strong>
            <p>Proof of delivery recorded and payment captured.</p>
          </div>
        </article>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="landing-page landing-page-premium">
      <header className="topbar landing-topbar">
        <BrandLogo href="/" />
        <nav className="topnav landing-topnav" aria-label="Primary">
          <a href="#platform">Platform</a>
          <a href="#audiences">Who it serves</a>
          <a href="#intelligence">Command Intelligence</a>
          <a href="#workflow">How it works</a>
          <Link href="/get-started">Get started</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-kicker">Premium logistics infrastructure for local commerce</p>
          <h1>AI-assisted logistics command centre for local commerce.</h1>
          <p className="landing-hero-body">
            ShipWright helps restaurants, retailers, operators, and couriers coordinate paid orders, dispatch, tracking,
            delivery proof, payment capture, and recovery workflows from one calm operating layer.
          </p>
          <div className="landing-hero-actions">
            <Link className="button button-primary landing-button-primary" href="/get-started">
              Start a controlled pilot
            </Link>
            <Link className="button button-secondary landing-button-secondary" href="/demo">
              View demo
            </Link>
          </div>
        </div>

        <CommandIllustration />
      </section>

      <section className="landing-proof-strip" aria-label="Operational proof points">
        {proofPoints.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </section>

      <section className="landing-narrative" id="platform">
        <div>
          <p className="eyebrow">The operating gap</p>
          <h2>Local delivery breaks when order, courier, payment, and support state live in different places.</h2>
        </div>
        <p>
          ShipWright is designed as logistics infrastructure, not another dashboard. It connects customer ordering,
          dispatch execution, proof of delivery, payment state, operator review, and admin oversight into one
          decision-oriented system.
        </p>
      </section>

      <section className="landing-audience-section" id="audiences">
        <EditorialHeading
          eyebrow="Who it serves"
          title="Built for the people who keep local commerce moving."
          body="Each surface is shaped around a real operational handoff: what happened, why it matters, and what the human operator should review next."
        />
        <div className="landing-audience-list">
          {audiences.map((item) => (
            <article className="landing-audience-row" key={item.audience}>
              <div className="landing-audience-title">
                <span aria-hidden="true">
                  <ShipWrightIcon name={item.icon} />
                </span>
                <h3>{item.audience}</h3>
              </div>
              <div>
                <p className="landing-row-label">Problem</p>
                <p>{item.problem}</p>
              </div>
              <div>
                <p className="landing-row-label">ShipWright</p>
                <p>{item.solution}</p>
              </div>
              <div>
                <p className="landing-row-label">Outcome</p>
                <p>{item.outcome}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-intelligence-section" id="intelligence">
        <div className="landing-intelligence-copy">
          <EditorialHeading
            eyebrow="Command Intelligence"
            title="Operational guidance without autonomous risk."
            body="Command Intelligence is based on operational signals. It helps teams spot risk, review recommendations, and close the day while keeping recovery actions human-approved."
          />
          <div className="landing-human-note">
            <ShipWrightIcon name="check" />
            <p>Human-in-the-loop by design: ShipWright does not automatically refund, cancel, assign couriers, send customer messages, or close incidents.</p>
          </div>
        </div>
        <div className="landing-intelligence-list">
          {intelligence.map((item) => (
            <article key={item.title}>
              <span className="landing-index-marker" aria-hidden="true" />
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-workflow-section" id="workflow">
        <EditorialHeading
          eyebrow="How it works"
          title="One continuous path from customer order to operational closeout."
        />
        <div className="landing-workflow">
          {workflow.map((step, index) => (
            <article key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-confidence-section">
        <div>
          <EditorialHeading
            eyebrow="Operational confidence"
            title="Proof-driven, reviewable, and built for controlled pilots."
            body="ShipWright makes operational state visible before teams scale volume: readiness checks, proof artifacts, timelines, payment state, playbooks, and support evidence."
          />
          <div className="landing-cta-row">
            <Link className="button button-primary landing-button-primary" href="/get-started">
              Prepare a pilot
            </Link>
            <Link className="button button-secondary landing-button-secondary" href="/demo/investor">
              Investor demo
            </Link>
          </div>
        </div>
        <div className="landing-confidence-list">
          {confidenceSignals.map((item) => (
            <div key={item}>
              <ShipWrightIcon name="check" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="site-footer landing-footer">
        <div className="footer-brand">
          <BrandLogo className="footer-brand-mark" href="/" mode="full" />
          <p>AI-assisted logistics command centre for restaurants, retailers, operators, couriers, and platform teams.</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/get-started">Get started</Link>
          <Link href="/demo">Demo</Link>
          <Link href="/demo/investor">Investor demo</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </footer>
    </main>
  );
}
