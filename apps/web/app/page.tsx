import Link from "next/link";

const audienceItems = [
  {
    title: "For businesses",
    body: "Create deliveries quickly, keep the customer relationship in-house, and see every active drop from one operational view."
  },
  {
    title: "For drivers",
    body: "Distance, ETA, and payout are visible before acceptance, so offers are clear before work starts."
  },
  {
    title: "For operations",
    body: "Dispatch, redispatch, tracking, and delivery completion stay in one controlled workflow instead of scattered updates."
  }
];

const steps = [
  {
    number: "01",
    action: "Create",
    title: "Create the job",
    body: "Enter one pickup and one drop for a business-owned food or local retail delivery."
  },
  {
    number: "02",
    action: "Match",
    title: "Match the driver",
    body: "The platform offers the job to verified bike or car drivers with full payout visibility."
  },
  {
    number: "03",
    action: "Track",
    title: "Track execution",
    body: "Operators follow live status, location, and timing instead of chasing messages."
  },
  {
    number: "04",
    action: "Deliver",
    title: "Close the drop",
    body: "Each job completes with proof of delivery and a clean operational record."
  }
];

const trustItems = [
  "Single pickup -> single drop",
  "Built for food and retail",
  "Live dispatch tracking",
  "Proof of delivery"
];

const features = [
  "Verified driver network",
  "Real-time dispatch visibility",
  "Automatic redispatch when an offer fails",
  "Proof of delivery with audit trail",
  "Transparent pricing before acceptance",
  "Operational control from request to drop"
];

function SectionHeading(props: { eyebrow?: string; title: string; body?: string }) {
  return (
    <div className="section-heading">
      {props.eyebrow ? <p className="eyebrow">{props.eyebrow}</p> : null}
      <h2>{props.title}</h2>
      {props.body ? <p className="section-copy">{props.body}</p> : null}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="hero-section">
        <header className="topbar">
          <a className="brand" href="/">
            ShipWright
          </a>
          <nav className="topnav" aria-label="Primary">
            <a href="#businesses">Businesses</a>
            <a href="#drivers">Drivers</a>
            <a href="#how-it-works">How it works</a>
            <a href="#contact">Contact</a>
          </nav>
        </header>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">On-demand delivery operations</p>
            <h1>Dispatch local delivery with control.</h1>
            <p className="hero-body">
              ShipWright helps food and retail teams run single-pickup, single-drop jobs
              without losing visibility across dispatch, tracking, and delivery completion.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/get-started">
                Get Started
              </Link>
              <Link className="button button-secondary" href="/demo">
                Book a Demo
              </Link>
            </div>
            <div className="hero-notes" aria-label="Operational fit">
              <span>Business-owned food delivery</span>
              <span>Local retail logistics</span>
              <span>Verified driver supply</span>
            </div>
          </div>

          <div className="hero-panel" aria-label="Live operations preview">
            <div className="hero-panel-card">
              <div className="preview-frame">
                <div className="preview-toolbar">
                  <strong>Dispatch console</strong>
                  <span className="preview-timestamp">22 Apr 2026, 16:18</span>
                </div>

                <div className="preview-overview">
                  <div>
                    <span className="preview-label">Job</span>
                    <strong>JOB-20481</strong>
                  </div>
                  <div>
                    <span className="preview-label">Created</span>
                    <strong>16:07:13</strong>
                  </div>
                  <div className="preview-status preview-status-live">
                    <span className="signal-dot" />
                    Driver en route
                  </div>
                </div>

                <div className="preview-route">
                  <div className="preview-route-row">
                    <span className="preview-stop">Pickup</span>
                    <div>
                      <strong>Chapel Street Kitchen</strong>
                      <span>Stoke-on-Trent ST4</span>
                    </div>
                    <span className="preview-time">16:20</span>
                  </div>
                  <div className="preview-route-row">
                    <span className="preview-stop">Drop</span>
                    <div>
                      <strong>Ashfield Retail Park</strong>
                      <span>Stoke-on-Trent ST1</span>
                    </div>
                    <span className="preview-time">16:34</span>
                  </div>
                </div>

                <div className="preview-meta-grid">
                  <div className="preview-meta">
                    <span className="preview-label">Driver</span>
                    <strong>Marcus A.</strong>
                    <span>Bike courier</span>
                  </div>
                  <div className="preview-meta">
                    <span className="preview-label">Distance</span>
                    <strong>4.8 mi</strong>
                    <span>ETA 14 min</span>
                  </div>
                  <div className="preview-meta">
                    <span className="preview-label">Offer</span>
                    <strong>Accepted</strong>
                    <span>Payout visible</span>
                  </div>
                  <div className="preview-meta">
                    <span className="preview-label">Tracking</span>
                    <strong>Live</strong>
                    <span>Proof required</span>
                  </div>
                </div>

                <div className="preview-map" aria-hidden="true">
                  <div className="map-grid" />
                  <div className="map-route-line" />
                  <span className="map-pin map-pin-start" />
                  <span className="map-pin map-pin-driver" />
                  <span className="map-pin map-pin-end" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Operational trust points">
        <p className="trust-strip-title">Built for real delivery operations</p>
        <div className="trust-items">
          {trustItems.map((item) => (
            <span className="trust-item" key={item}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="section" id="businesses">
        <SectionHeading
          eyebrow="Who it serves"
          title="For operators who need the delivery layer to stay predictable."
          body="The platform is focused on business-owned food delivery and local retail runs where execution quality matters more than decorative workflow."
        />
        <div className="text-columns">
          {audienceItems.map((item) => (
            <article className="text-column" key={item.title} id={item.title === "For drivers" ? "drivers" : undefined}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="how-it-works">
        <SectionHeading
          eyebrow="How it works"
          title="A direct path from request to confirmed drop."
        />
        <div className="steps-flow">
          {steps.map((step) => (
            <article className="flow-step" key={step.number}>
              <div className="flow-step-topline">
                <span className="step-number">{step.number}</span>
                <p className="step-action">{step.action}</p>
              </div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeading
          eyebrow="Operational advantages"
          title="Visibility where most delivery teams usually lose it."
        />
        <div className="feature-list">
          {features.map((feature) => (
            <div className="feature-list-row" key={feature}>
              <span className="feature-marker" aria-hidden="true" />
              <p>{feature}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section scope-strip">
        <p className="eyebrow">Current focus</p>
        <p className="scope-copy">
          Currently focused on business-owned food delivery and local retail logistics.
        </p>
      </section>

      <section className="section final-cta" id="contact">
        <div className="cta-card">
          <SectionHeading
            eyebrow="Next step"
            title="Take control of delivery operations."
            body="Start with a cleaner dispatch workflow, live job visibility, and delivery completion you can verify."
          />
          <div className="hero-actions">
            <Link className="button button-primary" href="/get-started">
              Get Started
            </Link>
            <Link className="button button-secondary" href="/contact">
              Talk to Us
            </Link>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <p className="eyebrow">ShipWright</p>
          <strong>Delivery operations software for food and local retail.</strong>
          <p>
            Dispatch, tracking, proof of delivery, and payment state in one product surface.
          </p>
        </div>
        <div className="footer-links-group">
          <span className="footer-heading">Navigate</span>
          <nav aria-label="Footer">
            <a href="/">Home</a>
            <a href="#businesses">For Businesses</a>
            <a href="#drivers">For Drivers</a>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
