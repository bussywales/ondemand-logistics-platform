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

const orchestrationSignals = [
  { label: "Order signal", value: "Authorised" },
  { label: "Courier state", value: "Available" },
  { label: "Risk posture", value: "Reviewable" },
  { label: "Closeout", value: "Evidence-backed" }
];

const atmosphereSignals = ["Kitchen", "Dispatch", "Courier", "Doorstep"];

const signatureMoments = [
  {
    label: "Order enters the network",
    title: "Commerce signal",
    body: "A paid customer order becomes visible work with payment state, fulfilment context, and delivery intent."
  },
  {
    label: "Dispatch intelligence coordinates movement",
    title: "Command signal",
    body: "Operators see route stage, courier readiness, recovery guidance, and risk before the service window breaks."
  },
  {
    label: "Proof closes the loop",
    title: "Proof signal",
    body: "Delivery, POD, capture, fulfilment, and closeout evidence converge into one operating record."
  }
];

const platformMenu = [
  {
    description: "Restaurant setup, menu readiness, paid orders, and fulfilment context.",
    href: "#platform",
    icon: "restaurant",
    title: "Merchant Operations"
  },
  {
    description: "Jobs, dispatch attempts, driver assignment, and recovery state.",
    href: "#platform",
    icon: "queue",
    title: "Dispatch & Jobs"
  },
  {
    description: "Availability, offers, execution stages, and proof of delivery.",
    href: "#platform",
    icon: "driver",
    title: "Courier Flow"
  },
  {
    description: "Customer-safe order progress without fake live-map movement.",
    href: "#platform",
    icon: "route",
    title: "Customer Tracking"
  },
  {
    description: "Authorization, capture, risk, payout visibility, and order impact.",
    href: "#platform",
    icon: "payment",
    title: "Payment Visibility"
  },
  {
    description: "Cross-org command posture, incidents, readiness, and support oversight.",
    href: "#platform",
    icon: "document",
    title: "Platform Oversight"
  }
] satisfies Array<{ description: string; href: string; icon: ShipWrightIconName; title: string }>;

const solutionsMenu = [
  {
    description: "Paid menu ordering, delivery handoff, support context, and closeout evidence.",
    href: "#operators",
    icon: "restaurant",
    title: "Restaurants"
  },
  {
    description: "Local commerce fulfilment for operators who need delivery state visibility.",
    href: "#operators",
    icon: "menu",
    title: "Local Retailers"
  },
  {
    description: "Exception-first queues, recovery guidance, and human-approved controls.",
    href: "#operators",
    icon: "queue",
    title: "Dispatch Operators"
  },
  {
    description: "Structured offers, route stages, readiness signals, and POD.",
    href: "#operators",
    icon: "driver",
    title: "Couriers"
  },
  {
    description: "Validation gates, proof artifacts, playbooks, and controlled demo discipline.",
    href: "/demo",
    icon: "check",
    title: "Pilot Teams"
  }
] satisfies Array<{ description: string; href: string; icon: ShipWrightIconName; title: string }>;

const commandMenu = [
  {
    description: "A deterministic service-window summary of what needs attention.",
    href: "#intelligence",
    icon: "bell",
    title: "Daily Briefing"
  },
  {
    description: "Suggested recovery paths for failed dispatch and blocked courier assignment.",
    href: "#intelligence",
    icon: "retry",
    title: "Recovery Suggestions"
  },
  {
    description: "Delay detection, incident context, and operator-readable summaries.",
    href: "#intelligence",
    icon: "warning",
    title: "Incident Intelligence"
  },
  {
    description: "Closeout summaries for orders, deliveries, payments, and unresolved actions.",
    href: "#intelligence",
    icon: "timeline",
    title: "End-of-Day Reports"
  },
  {
    description: "No silent refunds, cancellations, assignments, messages, or incident closure.",
    href: "#intelligence",
    icon: "alert",
    title: "Human-in-the-loop Controls"
  }
] satisfies Array<{ description: string; href: string; icon: ShipWrightIconName; title: string }>;

const resourcesMenu = [
  {
    description: "Audience-specific route order, talk track, and proof-backed walkthrough.",
    href: "/demo/investor",
    icon: "document",
    title: "Demo Walkthrough"
  },
  {
    description: "Start with a guided staging session and proof-backed operating walkthrough.",
    href: "/demo/request",
    icon: "route",
    title: "Controlled Pilot"
  },
  {
    description: "Artifacts for paid delivery, fulfilled order state, capture, and readiness.",
    href: "#proof",
    icon: "payment",
    title: "Proof-Driven Operations"
  },
  {
    description: "Release verification, paid-delivery proof, and browser smoke standards.",
    href: "/demo",
    icon: "check",
    title: "Validation Standard"
  },
  {
    description: "Failed dispatch, no eligible driver, support, refund, and escalation guidance.",
    href: "/help/pilot-operations",
    icon: "warning",
    title: "Pilot Playbooks"
  },
  {
    description: "Clear boundaries for staging, tracking, email, payouts, and autonomy.",
    href: "/demo",
    icon: "alert",
    title: "Known Limitations"
  }
] satisfies Array<{ description: string; href: string; icon: ShipWrightIconName; title: string }>;

const conversionPaths = [
  {
    audience: "Restaurants and local retailers",
    body: "See how a paid order moves from public menu to dispatch, customer tracking, payment capture, and proof-backed fulfilment.",
    cta: "Start controlled pilot",
    href: "/demo/request",
    tone: "commerce",
    value: "Pilot merchant"
  },
  {
    audience: "Operators and platform teams",
    body: "Walk through order queues, job detail, payment risk, command intelligence, admin oversight, and courier readiness.",
    cta: "Request guided demo",
    href: "/demo/request",
    tone: "command",
    value: "Operator/platform"
  },
  {
    audience: "Investors and partners",
    body: "Review the connected Stage 1 loop, validation gates, proof artifacts, and the human-in-the-loop command centre roadmap.",
    cta: "View demo walkthrough",
    href: "/demo/investor",
    tone: "proof",
    value: "Investor/partner"
  }
];

const platformPillars = [
  {
    description: "Branded menu ordering and customer checkout create real downstream fulfilment work.",
    title: "Order intake"
  },
  {
    description: "Jobs, dispatch attempts, driver assignment, and recovery posture stay visible.",
    title: "Dispatch coordination"
  },
  {
    description: "Courier availability, offers, execution stages, and POD keep delivery legible.",
    title: "Courier execution"
  },
  {
    description: "Customer tracking, proof markers, and timelines close the service loop.",
    title: "Tracking and proof"
  },
  {
    description: "Payment authorization, capture, and risk connect directly to order state.",
    title: "Payment-state visibility"
  },
  {
    description: "Briefings, suggestions, incident summaries, reports, and oversight stay human-approved.",
    title: "Command intelligence"
  },
  {
    description: "Platform admins see cross-org posture, driver readiness, and intervention context.",
    title: "Admin oversight"
  },
  {
    description: "Validation, artifacts, playbooks, and controlled session discipline support pilots.",
    title: "Pilot closeout"
  }
];

function LandingMegaMenu(props: {
  items: Array<{ description: string; href: string; icon: ShipWrightIconName; title: string }>;
  label: string;
  summary: string;
}) {
  return (
    <details className="landing-mega-menu">
      <summary>
        <span>{props.label}</span>
        <ShipWrightIcon name="arrow" size={14} />
      </summary>
      <div className="landing-mega-panel">
        <div className="landing-mega-intro">
          <span>{props.label}</span>
          <p>{props.summary}</p>
        </div>
        <div className="landing-mega-grid">
          {props.items.map((item) => (
            <a className="landing-mega-item" href={item.href} key={item.title}>
              <span className="landing-mega-icon">
                <ShipWrightIcon name={item.icon} size={18} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}

function EditorialEyebrow(props: { children: string }) {
  return <p className="landing-kicker">{props.children}</p>;
}

function HeroScene() {
  return (
    <div className="landing-cinematic-scene" aria-label="ShipWright logistics command scene">
      <span className="landing-scene-orb landing-scene-orb-primary" aria-hidden="true" />
      <span className="landing-scene-orb landing-scene-orb-secondary" aria-hidden="true" />
      <span className="landing-signature-trail landing-signature-trail-commerce" aria-hidden="true" />
      <span className="landing-signature-trail landing-signature-trail-command" aria-hidden="true" />
      <span className="landing-signature-trail landing-signature-trail-proof" aria-hidden="true" />
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
      <div className="landing-scene-signal landing-scene-signal-order">
        <span>Order placed</span>
        <strong>19:42</strong>
      </div>
      <div className="landing-scene-signal landing-scene-signal-driver">
        <span>Courier matched</span>
        <strong>Bike · 1.8 mi</strong>
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

function SignatureMomentCard(props: { body: string; index: number; label: string; title: string }) {
  return (
    <article className="landing-signature-card">
      <div className="landing-signature-card-visual" aria-hidden="true">
        <span className="landing-signature-card-route" />
        <span className="landing-signature-card-node landing-signature-card-node-start" />
        <span className="landing-signature-card-node landing-signature-card-node-mid" />
        <span className="landing-signature-card-node landing-signature-card-node-end" />
        <span className="landing-signature-card-proof">{String(props.index + 1).padStart(2, "0")}</span>
      </div>
      <div>
        <span>{props.title}</span>
        <h3>{props.label}</h3>
        <p>{props.body}</p>
      </div>
    </article>
  );
}

function SignatureSystemSection() {
  return (
    <section className="landing-signature-section" aria-label="ShipWright visual signature system">
      <div className="landing-section-lead landing-signature-lead">
        <EditorialEyebrow>ShipWright signature</EditorialEyebrow>
        <h2>Route light, command signals, and proof markers.</h2>
        <p>
          The product language follows the operating loop: commerce enters the network, dispatch coordinates movement,
          and proof closes the fulfilment record.
        </p>
      </div>
      <div className="landing-signature-grid">
        {signatureMoments.map((moment, index) => (
          <SignatureMomentCard key={moment.label} {...moment} index={index} />
        ))}
      </div>
    </section>
  );
}

function PlatformEcosystemSection() {
  return (
    <section className="landing-platform-section" id="platform">
      <div className="landing-section-lead landing-platform-lead">
        <EditorialEyebrow>Platform ecosystem</EditorialEyebrow>
        <h2>One connected operating layer for local commerce fulfilment.</h2>
        <p>
          ShipWright is more than a delivery dashboard. It is a staged platform spine for order intake, dispatch,
          courier execution, tracking, payment visibility, command intelligence, admin oversight, and pilot closeout.
        </p>
      </div>
      <div className="landing-platform-pillars">
        {platformPillars.map((pillar, index) => (
          <article key={pillar.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{pillar.title}</strong>
            <p>{pillar.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ConversionSection() {
  return (
    <section className="landing-conversion-section" id="pilot">
      <div className="landing-conversion-copy">
        <EditorialEyebrow>Controlled pilot entry</EditorialEyebrow>
        <h2>See ShipWright in a live operations walkthrough.</h2>
        <p>
          Start with a focused staging session: release verification, paid-delivery proof, browser smoke, customer
          tracking, command intelligence, and human-approved recovery paths.
        </p>
      </div>
      <div className="landing-conversion-grid">
        {conversionPaths.map((path) => (
          <article className={`landing-conversion-card landing-conversion-card-${path.tone}`} key={path.audience}>
            <span>{path.value}</span>
            <h3>{path.audience}</h3>
            <p>{path.body}</p>
            <Link className="landing-conversion-link" href={path.href}>
              {path.cta}
              <ShipWrightIcon name="arrow" size={16} />
            </Link>
          </article>
        ))}
      </div>
      <div className="landing-conversion-proof">
        <span>Proof posture</span>
        <p>Release verification, paid-delivery proof, browser smoke, and human-in-the-loop Command Intelligence are part of the demo standard.</p>
      </div>
    </section>
  );
}

function OrchestrationScene() {
  return (
    <div className="landing-orchestration-visual" aria-label="Commerce orchestration visual">
      <div className="landing-orchestration-map" aria-hidden="true">
        <span className="landing-orchestration-lane landing-orchestration-lane-one" />
        <span className="landing-orchestration-lane landing-orchestration-lane-two" />
        <span className="landing-orchestration-lane landing-orchestration-lane-three" />
        <span className="landing-orchestration-node landing-orchestration-node-order">Order</span>
        <span className="landing-orchestration-node landing-orchestration-node-dispatch">Dispatch</span>
        <span className="landing-orchestration-node landing-orchestration-node-proof">Proof</span>
      </div>
      <div className="landing-orchestration-signals">
        {orchestrationSignals.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function AtmosphereScene() {
  return (
    <section className="landing-atmosphere-section" aria-label="ShipWright service window atmosphere">
      <div className="landing-atmosphere-copy">
        <EditorialEyebrow>Service window</EditorialEyebrow>
        <h2>Warmth for customers. Control for operators.</h2>
      </div>
      <div className="landing-atmosphere-visual" aria-hidden="true">
        <span className="landing-atmosphere-glow landing-atmosphere-glow-amber" />
        <span className="landing-atmosphere-glow landing-atmosphere-glow-blue" />
        <span className="landing-atmosphere-route" />
        <div className="landing-atmosphere-points">
          {atmosphereSignals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
      </div>
    </section>
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
        <nav className="topnav landing-topnav landing-platform-nav" aria-label="Primary">
          <LandingMegaMenu
            items={platformMenu}
            label="Platform"
            summary="The operational spine for paid ordering, dispatch, courier execution, tracking, payment state, and oversight."
          />
          <LandingMegaMenu
            items={solutionsMenu}
            label="Solutions"
            summary="Focused workflows for the teams moving local commerce from checkout to proof."
          />
          <LandingMegaMenu
            items={commandMenu}
            label="Command Intelligence"
            summary="Rules-based operations intelligence that supports human decisions without silent automation."
          />
          <LandingMegaMenu
            items={resourcesMenu}
            label="Resources"
            summary="Demo material, validation discipline, playbooks, proof artifacts, and claims boundaries."
          />
        </nav>
        <div className="landing-nav-actions">
          <Link className="landing-nav-link" href="/get-started">
            Get started
          </Link>
          <Link className="landing-nav-cta" href="/demo/request">
            Start controlled pilot
          </Link>
        </div>
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
            <Link className="button button-primary landing-button-primary" href="/demo/request">
              Start a controlled pilot
            </Link>
            <Link className="button button-secondary landing-button-secondary" href="/demo/investor">
              View demo walkthrough
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

      <AtmosphereScene />

      <SignatureSystemSection />

      <PlatformEcosystemSection />

      <section className="landing-statement-section" id="story">
        <p>Local delivery is not a dashboard problem.</p>
        <h2>It is a choreography problem: customer demand, merchant readiness, courier movement, payment state, and operator judgement all have to stay aligned.</h2>
      </section>

      <section className="landing-orchestration-section">
        <div className="landing-orchestration-copy">
          <EditorialEyebrow>Route intelligence</EditorialEyebrow>
          <h2>Every delivery carries a chain of signals.</h2>
          <p>
            ShipWright turns those signals into operational continuity: an order that can be trusted, a courier path
            that can be followed, a payment state that can be reviewed, and a closeout record that can be defended.
          </p>
        </div>
        <OrchestrationScene />
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

      <ConversionSection />

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
          <Link className="button button-primary landing-button-primary" href="/demo/request">
            Start controlled pilot
          </Link>
          <Link className="button button-secondary landing-button-secondary" href="/demo/investor">
            View demo walkthrough
          </Link>
        </div>
      </section>

      <footer className="site-footer landing-footer landing-story-footer">
        <div className="footer-brand">
          <BrandLogo className="footer-brand-mark" href="/" mode="full" />
          <p>Route intelligence for local commerce: order signal, dispatch movement, customer tracking, payment state, and proof-backed fulfilment.</p>
        </div>
        <div className="landing-footer-route" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="landing-footer-signal" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <nav aria-label="Footer">
          <Link href="/get-started">Get started</Link>
          <Link href="/demo">Demo</Link>
          <Link href="/demo/investor">Investor demo</Link>
          <Link href="/demo/request">Request demo</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </footer>
    </main>
  );
}
