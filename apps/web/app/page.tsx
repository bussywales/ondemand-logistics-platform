import { existsSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { AnalyticsLink } from "./_components/analytics-link";
import { PublicMarketingFooter } from "./_components/public-marketing-footer";
import { PublicMarketingNav } from "./_components/public-marketing-nav";
import { PublicAnalyticsPageView } from "./_components/public-analytics-page-view";
import { ShipWrightIcon, type ShipWrightIconName } from "./_components/shipwright-icon";

const proofPoints = [
  "Paid order to delivered proof",
  "Release readiness visible",
  "Support and dispatch audit",
  "Fleet and finance posture"
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

const productProofPoints = [
  {
    body: "A staged order can move through payment authorisation, dispatch, delivery, proof of delivery, and captured payment evidence.",
    label: "Paid-delivery proof flow",
    tone: "commerce"
  },
  {
    body: "Release readiness and validation evidence show whether proof, smoke, and release checks are current before a controlled demo.",
    label: "Release readiness dashboard",
    tone: "command"
  },
  {
    body: "Support escalations, closeout notes, and append-only history keep human follow-up visible instead of buried in chat.",
    label: "Support audit history",
    tone: "proof"
  },
  {
    body: "Manual dispatch overrides and assignment changes are recorded with reason, actor, and review context.",
    label: "Dispatch override audit",
    tone: "command"
  },
  {
    body: "Menu changes, price updates, visibility changes, and rollback actions are traceable for merchant pilots.",
    label: "Menu rollback audit",
    tone: "commerce"
  },
  {
    body: "Fleet managers and platform admins can review driver readiness without punitive scoring or automated suspension.",
    label: "Fleet readiness",
    tone: "proof"
  }
] satisfies Array<{ body: string; label: string; tone: "commerce" | "command" | "proof" }>;

const productVisualCards = [
  {
    asset: "admin-command.png",
    title: "Command centre",
    eyebrow: "Cross-org posture",
    rows: ["Release ready: needs review", "Support open: 2", "Dispatch overrides: reviewed"],
    status: "Human review"
  },
  {
    asset: "merchant-menu-operations.png",
    title: "Merchant menu operations",
    eyebrow: "Pilot Kitchen",
    rows: ["Mains live", "Price rollback prepared", "Menu history visible"],
    status: "Audit-backed"
  },
  {
    asset: "fleet-workspace.png",
    title: "Fleet workspace",
    eyebrow: "Staging Fleet",
    rows: ["Ready drivers: 4", "Invite pending: 1", "No scoring language"],
    status: "Readiness only"
  },
  {
    asset: "finance-review.png",
    title: "Finance visibility",
    eyebrow: "Example order",
    rows: ["Captured: visible", "Refund review: human", "No payout automation"],
    status: "Review-only"
  },
  {
    asset: "release-readiness-ready.png",
    title: "Release readiness",
    eyebrow: "Validation evidence",
    rows: ["Release verify", "Paid proof", "Required-auth smoke"],
    status: "Evidence-backed"
  }
] satisfies Array<{ asset: string; eyebrow: string; rows: string[]; status: string; title: string }>;

const pilotStorySteps = [
  {
    body: "A customer orders from a staging-safe restaurant menu and creates a paid fulfilment record.",
    label: "Commerce enters",
    title: "Order placed"
  },
  {
    body: "Merchant, dispatch, courier readiness, and customer tracking stay connected as the job moves.",
    label: "Movement coordinated",
    title: "Operations watch"
  },
  {
    body: "If something drifts, operators can log support follow-up or dispatch recovery without silent automation.",
    label: "Exceptions reviewed",
    title: "Human approval"
  },
  {
    body: "Proof of delivery, payment state, closeout, and validation evidence make the pilot defensible.",
    label: "Proof closes",
    title: "Evidence retained"
  }
] satisfies Array<{ body: string; label: string; title: string }>;

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
  },
  {
    label: "Courier execution in motion",
    title: "Movement signal",
    body: "Courier readiness, offer state, route stage, and handoff context stay legible without pretending to be a live map."
  },
  {
    label: "Platform command oversight",
    title: "Oversight signal",
    body: "Cross-org posture, incidents, closeout summaries, and readiness checks give operators a calmer way to see risk."
  }
];

const conversionPaths = [
  {
    audience: "Restaurants and local retailers",
    body: "See how a paid order moves from public menu to dispatch, customer tracking, payment capture, and proof-backed fulfilment.",
    cta: "Start controlled pilot",
    href: "/demo/request?interest=pilot",
    tone: "commerce",
    value: "Pilot merchant"
  },
  {
    audience: "Operators and platform teams",
    body: "Walk through order queues, job detail, payment risk, command intelligence, admin oversight, and courier readiness.",
    cta: "Request guided demo",
    href: "/demo/request?interest=operator",
    tone: "command",
    value: "Operator/platform"
  },
  {
    audience: "Investors and partners",
    body: "Review the connected Stage 1 loop, validation gates, proof artifacts, and the human-in-the-loop command centre roadmap.",
    cta: "Request investor walkthrough",
    href: "/demo/request?interest=investor",
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

function EditorialEyebrow(props: { children: string }) {
  return <p className="landing-kicker">{props.children}</p>;
}

function RouteTrail(props: { className?: string }) {
  return <span className={["landing-route-trail", props.className].filter(Boolean).join(" ")} aria-hidden="true" />;
}

function CommerceNode(props: { className?: string; label?: string }) {
  return (
    <span className={["landing-commerce-node", props.className].filter(Boolean).join(" ")} aria-hidden="true">
      {props.label}
    </span>
  );
}

function ProofMarker(props: { children?: string; className?: string }) {
  return (
    <span className={["landing-proof-marker", props.className].filter(Boolean).join(" ")} aria-hidden="true">
      {props.children}
    </span>
  );
}

function CityGridAtmosphere(props: { className?: string }) {
  return (
    <div className={["landing-city-grid", props.className].filter(Boolean).join(" ")} aria-hidden="true">
      <span className="landing-city-block landing-city-block-tall" />
      <span className="landing-city-block" />
      <span className="landing-city-block landing-city-block-wide" />
      <span className="landing-city-block" />
      <span className="landing-city-block landing-city-block-low" />
      <span className="landing-city-block landing-city-block-wide" />
    </div>
  );
}

function CommandSignalCard(props: { body: string; className?: string; eyebrow: string; title: string }) {
  return (
    <div className={["landing-floating-card", props.className].filter(Boolean).join(" ")}>
      <span>{props.eyebrow}</span>
      <strong>{props.title}</strong>
      <p>{props.body}</p>
    </div>
  );
}

function RouteOrchestrationScene() {
  return (
    <div className="landing-cinematic-scene" aria-label="ShipWright logistics command scene">
      <span className="landing-scene-orb landing-scene-orb-primary" aria-hidden="true" />
      <span className="landing-scene-orb landing-scene-orb-secondary" aria-hidden="true" />
      <span className="landing-signature-trail landing-signature-trail-commerce" aria-hidden="true" />
      <span className="landing-signature-trail landing-signature-trail-command" aria-hidden="true" />
      <span className="landing-signature-trail landing-signature-trail-proof" aria-hidden="true" />
      <img
        alt=""
        aria-hidden="true"
        className="landing-hero-art"
        src="/brand/shipwright-network-scene.svg"
      />
      <CityGridAtmosphere className="landing-city-grid-hero" />
      <RouteTrail className="landing-route-trail-hero" />
      <CommerceNode className="landing-commerce-node-hero" />
      <ProofMarker className="landing-proof-marker-hero" />
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
      <CommandSignalCard
        body="Route intelligence is watching the flow. Operator approval required."
        className="landing-floating-card-command"
        eyebrow="Command Intelligence"
        title="2 signals need review"
      />
      <CommandSignalCard
        body="Delivery, POD, and capture close the fulfilment record."
        className="landing-floating-card-proof"
        eyebrow="Proof state"
        title="Loop closes cleanly"
      />
    </div>
  );
}

function SignatureMomentCard(props: { body: string; index: number; label: string; title: string }) {
  return (
    <article className="landing-signature-card">
      <div className="landing-signature-card-visual" aria-hidden="true">
        <RouteTrail className="landing-signature-card-route" />
        <CommerceNode className="landing-signature-card-node landing-signature-card-node-start" />
        <CommerceNode className="landing-signature-card-node landing-signature-card-node-mid" />
        <CommerceNode className="landing-signature-card-node landing-signature-card-node-end" />
        <ProofMarker className="landing-signature-card-proof">{String(props.index + 1).padStart(2, "0")}</ProofMarker>
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

function ProductVisualCard(props: { item: (typeof productVisualCards)[number]; index: number }) {
  const assetPath = join(process.cwd(), "public", "proof", props.item.asset);
  const hasReviewedAsset = existsSync(assetPath);

  return (
    <article
      className="landing-product-visual-card"
      data-proof-asset={props.item.asset}
      data-proof-asset-status={hasReviewedAsset ? "available" : "fallback"}
    >
      <div className="landing-product-visual-header">
        <span>{props.item.eyebrow}</span>
        <strong>{props.item.title}</strong>
      </div>
      <div className="landing-product-visual-body" aria-hidden="true">
        {hasReviewedAsset ? (
          <img
            alt=""
            className="landing-product-proof-image"
            loading="lazy"
            src={`/proof/${props.item.asset}`}
          />
        ) : (
          <>
            <span className="landing-product-route" />
            <span className="landing-product-node landing-product-node-commerce" />
            <span className="landing-product-node landing-product-node-command" />
            <span className="landing-product-node landing-product-node-proof" />
            <div className="landing-product-signal">
              <small>{props.item.status}</small>
              <b>{String(props.index + 1).padStart(2, "0")}</b>
            </div>
          </>
        )}
      </div>
      <div className="landing-product-visual-rows">
        {props.item.rows.map((row) => (
          <div key={row}>
            <ShipWrightIcon name="check" size={14} />
            <span>{row}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function ProductProofSection() {
  return (
    <section className="landing-product-proof-section" id="product-proof">
      <div className="landing-section-lead">
        <EditorialEyebrow>Operational proof</EditorialEyebrow>
        <h2>Built for controlled operations, not guesswork.</h2>
        <p>
          ShipWright’s public promise is intentionally narrow: run controlled pilots with evidence, audit visibility,
          human review, and clear readiness posture before teams rely on the workflow.
        </p>
      </div>
      <div className="landing-product-proof-grid">
        {productProofPoints.map((point) => (
          <article className={`landing-product-proof-card landing-product-proof-card-${point.tone}`} key={point.label}>
            <span>{point.label}</span>
            <p>{point.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductVisualsSection() {
  return (
    <section className="landing-product-visuals-section" aria-label="ShipWright product proof visuals">
      <div className="landing-section-lead">
        <EditorialEyebrow>Product maturity</EditorialEyebrow>
        <h2>Five operating surfaces, one proof-backed story.</h2>
        <p>
          These proof slots can show reviewed staging-safe screenshots when available, and otherwise fall back to
          CSS-native visuals. They show platform posture without pretending to be customer logos, private data, or
          fabricated production metrics.
        </p>
      </div>
      <div className="landing-product-visual-grid">
        {productVisualCards.map((item, index) => (
          <ProductVisualCard item={item} index={index} key={item.title} />
        ))}
      </div>
    </section>
  );
}

function PilotStorySection() {
  return (
    <section className="landing-pilot-story-section">
      <div className="landing-pilot-story-copy">
        <EditorialEyebrow>Pilot story</EditorialEyebrow>
        <h2>Pilot story: from order to proof.</h2>
        <p>
          A controlled ShipWright walkthrough follows a real operating spine: order intake, coordinated movement,
          exception review, proof, finance posture, and release evidence.
        </p>
        <AnalyticsLink
          analyticsLabel="Request demo from pilot story"
          analyticsMetadata={{ section: "pilot_story" }}
          analyticsSource="landing_pilot_story"
          className="button button-primary landing-button-primary"
          href="/demo/request?interest=pilot"
        >
          Request demo
        </AnalyticsLink>
      </div>
      <div className="landing-pilot-story-timeline">
        {pilotStorySteps.map((step, index) => (
          <article key={step.label}>
            <span>{String(index + 1).padStart(2, "0")} · {step.label}</span>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
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
            <AnalyticsLink
              analyticsLabel={path.cta}
              analyticsMetadata={{ audience: path.value }}
              analyticsSource="landing_conversion"
              className="landing-conversion-link"
              href={path.href}
            >
              {path.cta}
              <ShipWrightIcon name="arrow" size={16} />
            </AnalyticsLink>
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
        <CommerceNode className="landing-orchestration-node landing-orchestration-node-order" label="Order" />
        <CommerceNode className="landing-orchestration-node landing-orchestration-node-dispatch" label="Dispatch" />
        <ProofMarker className="landing-orchestration-node landing-orchestration-node-proof">Proof</ProofMarker>
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
        <RouteTrail className="landing-atmosphere-route" />
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
        <CommerceNode className="landing-map-node landing-map-node-merchant" />
        <CommerceNode className="landing-map-node landing-map-node-driver" />
        <ProofMarker className="landing-map-node landing-map-node-customer" />
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
      <PublicAnalyticsPageView page="landing" />
      <PublicMarketingNav />

      <section className="landing-story-hero">
        <div className="landing-story-hero-copy">
          <EditorialEyebrow>Modern logistics infrastructure</EditorialEyebrow>
          <h1>The operating system for local commerce in motion.</h1>
          <p>
            ShipWright brings merchant menus, paid ordering, dispatch governance, fleet readiness, support closeout,
            finance visibility, and release evidence into one calm controlled-pilot command layer.
          </p>
          <div className="landing-hero-actions">
            <AnalyticsLink analyticsLabel="Start a controlled pilot" analyticsSource="landing_hero" className="button button-primary landing-button-primary" href="/pricing">
              Start a controlled pilot
            </AnalyticsLink>
            <AnalyticsLink analyticsLabel="View demo walkthrough" analyticsSource="landing_hero" className="button button-secondary landing-button-secondary" href="/demo/investor">
              View demo walkthrough
            </AnalyticsLink>
          </div>
        </div>
        <RouteOrchestrationScene />
      </section>

      <section className="landing-proof-marquee" aria-label="Operational proof points">
        {proofPoints.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </section>

      <AtmosphereScene />

      <SignatureSystemSection />

      <PlatformEcosystemSection />

      <ProductProofSection />

      <ProductVisualsSection />

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

      <PilotStorySection />

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
          <AnalyticsLink analyticsLabel="Start controlled pilot" analyticsSource="landing_final" className="button button-primary landing-button-primary" href="/demo/request">
            Start controlled pilot
          </AnalyticsLink>
          <AnalyticsLink analyticsLabel="View demo walkthrough" analyticsSource="landing_final" className="button button-secondary landing-button-secondary" href="/demo/investor">
            View demo walkthrough
          </AnalyticsLink>
        </div>
      </section>

      <PublicMarketingFooter />
    </main>
  );
}
