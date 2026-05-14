import Link from "next/link";
import { BrandLogo } from "./_components/brand-logo";
import { ShipWrightIcon, type ShipWrightIconName } from "./_components/shipwright-icon";

const proofPoints = [
  "Paid order to delivered proof",
  "Human-in-the-loop recovery",
  "Payment state visible",
  "Pilot-ready operating evidence"
];

const operatingMoments = [
  {
    icon: "restaurant",
    label: "Merchant",
    title: "The order is real.",
    body: "A customer checks out from a branded restaurant menu. Payment is authorised before fulfilment work begins."
  },
  {
    icon: "queue",
    label: "Operator",
    title: "The work becomes visible.",
    body: "Orders, jobs, driver state, tracking, payment posture, and next action live in one operating picture."
  },
  {
    icon: "driver",
    label: "Courier",
    title: "Execution is structured.",
    body: "Offer, accept, pickup, drop-off, proof of delivery, and closeout move through a controlled delivery path."
  }
] satisfies Array<{ body: string; icon: ShipWrightIconName; label: string; title: string }>;

const audienceNarrative = [
  {
    audience: "Restaurants",
    statement: "Keep orders moving without turning service into a dispatch room.",
    outcome: "Menus, paid orders, delivery handoff, and support context stay connected."
  },
  {
    audience: "Operators",
    statement: "See the exception before the customer feels the failure.",
    outcome: "Blocked dispatch, payment risk, driver gaps, and stale jobs surface as reviewable work."
  },
  {
    audience: "Couriers",
    statement: "Make courier execution legible enough for a live pilot.",
    outcome: "Driver readiness, offers, assignment, route stages, and POD create a clear operating record."
  },
  {
    audience: "Platform teams",
    statement: "Support multiple businesses without bypassing accountability.",
    outcome: "Admin views expose cross-org attention while preserving human approval and access boundaries."
  }
];

const intelligenceMoments = [
  "Daily briefing",
  "Recovery suggestions",
  "Delay detection",
  "Incident summaries",
  "End-of-day reports"
];

const workflow = [
  "Customer order",
  "Payment authorised",
  "Dispatch",
  "Courier accepts",
  "Pickup",
  "Drop-off",
  "Capture",
  "Closeout"
];

const confidenceSignals = [
  "Release verification gates",
  "Paid-delivery proof artifacts",
  "Dispatch attempt history",
  "Proof of delivery records",
  "Payment capture visibility",
  "Pilot fallback playbooks"
];

function EditorialEyebrow(props: { children: string }) {
  return <p className="landing-kicker">{props.children}</p>;
}

function HeroScene() {
  return (
    <div className="landing-cinematic-scene" aria-label="ShipWright logistics command scene">
      <div className="landing-city-grid" aria-hidden="true">
        <span className="landing-city-block landing-city-block-tall" />
        <span className="landing-city-block" />
        <span className="landing-city-block landing-city-block-wide" />
        <span className="landing-city-block" />
        <span className="landing-city-block landing-city-block-low" />
        <span className="landing-city-block landing-city-block-wide" />
      </div>
      <div className="landing-route-thread" aria-hidden="true">
        <span className="landing-route-pin landing-route-pin-start">Kitchen</span>
        <span className="landing-route-arc" />
        <span className="landing-route-courier-marker">
          <ShipWrightIcon name="driver" />
        </span>
        <span className="landing-route-arc landing-route-arc-second" />
        <span className="landing-route-pin landing-route-pin-end">Customer</span>
      </div>
      <div className="landing-floating-card landing-floating-card-command">
        <span>Command Intelligence</span>
        <strong>2 items need review</strong>
        <p>Dispatch delay detected. Operator approval required.</p>
      </div>
      <div className="landing-floating-card landing-floating-card-proof">
        <span>Proof state</span>
        <strong>Payment captured</strong>
        <p>Delivery fulfilled with POD recorded.</p>
      </div>
    </div>
  );
}

function MovementScene() {
  return (
    <div className="landing-movement-scene" aria-hidden="true">
      <div className="landing-movement-map">
        <span className="landing-map-road landing-map-road-one" />
        <span className="landing-map-road landing-map-road-two" />
        <span className="landing-map-road landing-map-road-three" />
        <span className="landing-map-node landing-map-node-merchant" />
        <span className="landing-map-node landing-map-node-driver" />
        <span className="landing-map-node landing-map-node-customer" />
      </div>
      <div className="landing-movement-caption">
        <span>Service window</span>
        <strong>Orders, drivers, payments, and recovery state moving together.</strong>
      </div>
    </div>
  );
}

function IntelligenceScene() {
  return (
    <div className="landing-intelligence-theatre" aria-label="Assistive operations intelligence">
      <div className="landing-theatre-header">
        <span>Based on operational signals</span>
        <strong>Human approval required</strong>
      </div>
      <div className="landing-theatre-list">
        {intelligenceMoments.map((item, index) => (
          <div key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="landing-page landing-page-premium landing-page-story">
      <header className="topbar landing-topbar landing-story-topbar">
        <BrandLogo href="/" />
        <nav className="topnav landing-topnav" aria-label="Primary">
          <a href="#story">Story</a>
          <a href="#operators">Operators</a>
          <a href="#intelligence">Intelligence</a>
          <a href="#proof">Proof</a>
          <Link href="/get-started">Get started</Link>
        </nav>
      </header>

      <section className="landing-story-hero">
        <div className="landing-story-hero-copy">
          <EditorialEyebrow>Modern logistics infrastructure</EditorialEyebrow>
          <h1>The operating system for local commerce in motion.</h1>
          <p>
            ShipWright brings paid ordering, dispatch, courier execution, customer tracking, payment capture, and
            assistive operations intelligence into one calm command centre.
          </p>
          <div className="landing-hero-actions">
            <Link className="button button-primary landing-button-primary" href="/get-started">
              Start a controlled pilot
            </Link>
            <Link className="button button-secondary landing-button-secondary" href="/demo/investor">
              View investor demo
            </Link>
          </div>
        </div>
        <HeroScene />
      </section>

      <section className="landing-proof-marquee" aria-label="Operational proof points">
        {proofPoints.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </section>

      <section className="landing-statement-section" id="story">
        <p>Local delivery is not a dashboard problem.</p>
        <h2>It is a choreography problem: customer demand, merchant readiness, courier movement, payment state, and operator judgement all have to stay aligned.</h2>
      </section>

      <section className="landing-motion-section">
        <div className="landing-motion-copy">
          <EditorialEyebrow>Commerce movement</EditorialEyebrow>
          <h2>From order intake to proof of delivery, every stage needs a visible owner.</h2>
          <p>
            ShipWright turns fulfilment into a traceable operating sequence. The product does not hide risk behind
            green dashboards; it shows what is moving, what is blocked, and what needs human review.
          </p>
        </div>
        <MovementScene />
      </section>

      <section className="landing-moments-section">
        {operatingMoments.map((moment) => (
          <article className="landing-moment" key={moment.label}>
            <span className="landing-moment-icon" aria-hidden="true">
              <ShipWrightIcon name={moment.icon} />
            </span>
            <p>{moment.label}</p>
            <h3>{moment.title}</h3>
            <span>{moment.body}</span>
          </article>
        ))}
      </section>

      <section className="landing-operators-section" id="operators">
        <div className="landing-section-lead">
          <EditorialEyebrow>Operational clarity</EditorialEyebrow>
          <h2>Different teams. One shared operating picture.</h2>
        </div>
        <div className="landing-operator-rows">
          {audienceNarrative.map((item) => (
            <article key={item.audience}>
              <span>{item.audience}</span>
              <strong>{item.statement}</strong>
              <p>{item.outcome}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-dark-section" id="intelligence">
        <div className="landing-dark-copy">
          <EditorialEyebrow>Command Intelligence</EditorialEyebrow>
          <h2>Assistive intelligence for operators, not silent automation.</h2>
          <p>
            ShipWright uses operational signals to brief teams, suggest recovery paths, detect delays, draft incident
            summaries, and close the day. Humans still approve refunds, cancellations, courier assignment, customer
            messages, and incident closure.
          </p>
        </div>
        <IntelligenceScene />
      </section>

      <section className="landing-workflow-story">
        <div className="landing-section-lead">
          <EditorialEyebrow>How work moves</EditorialEyebrow>
          <h2>One continuous fulfilment path, not seven disconnected tools.</h2>
        </div>
        <div className="landing-story-rail">
          {workflow.map((step, index) => (
            <article key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-proof-section" id="proof">
        <div className="landing-proof-quote">
          <p>“A pilot should not depend on heroic operators remembering what happened. The system should preserve the operating truth.”</p>
        </div>
        <div className="landing-proof-list">
          {confidenceSignals.map((item) => (
            <div key={item}>
              <ShipWrightIcon name="check" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-final-scene">
        <div>
          <EditorialEyebrow>ShipWright</EditorialEyebrow>
          <h2>Run the pilot like infrastructure, not improvisation.</h2>
          <p>
            Prepare the merchant, take a paid order, dispatch the courier, track the delivery, capture payment, record
            proof, and close the day with evidence.
          </p>
        </div>
        <div className="landing-cta-row">
          <Link className="button button-primary landing-button-primary" href="/get-started">
            Prepare a pilot
          </Link>
          <Link className="button button-secondary landing-button-secondary" href="/contact">
            Talk to us
          </Link>
        </div>
      </section>

      <footer className="site-footer landing-footer landing-story-footer">
        <div className="footer-brand">
          <BrandLogo className="footer-brand-mark" href="/" mode="full" />
          <p>Premium logistics command infrastructure for restaurants, retailers, operators, couriers, and platform teams.</p>
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
