const valueCards = [
  {
    title: "For Businesses",
    body: "Create deliveries in seconds, track every drop, and keep full control of your operations."
  },
  {
    title: "For Drivers",
    body: "See distance, ETA, and payout before accepting - no surprises."
  },
  {
    title: "For Operations",
    body: "Manage dispatch, redispatch, and delivery completion from one system."
  }
];

const steps = [
  {
    number: "01",
    action: "Create",
    title: "Create a delivery",
    body: "Set a single pickup and single drop for a food order or local retail run."
  },
  {
    number: "02",
    action: "Match",
    title: "Driver is matched",
    body: "Verified bike and car drivers receive clear offer details before they accept."
  },
  {
    number: "03",
    action: "Track",
    title: "Track it live",
    body: "Monitor progress in real time with branded delivery visibility from dispatch to drop."
  },
  {
    number: "04",
    action: "Deliver",
    title: "Delivered with proof",
    body: "Complete every job with delivery confirmation and proof of delivery records."
  }
];

const trustItems = [
  "Single pickup -> single drop",
  "Built for food & retail",
  "Live dispatch tracking",
  "Proof-of-delivery system"
];

const features = [
  {
    title: "Verified driver network",
    body: "Only approved drivers enter the dispatch flow, giving operators cleaner supply and more reliable handoff."
  },
  {
    title: "Real-time dispatch visibility",
    body: "See the job lifecycle clearly from request to drop, with live status and driver movement."
  },
  {
    title: "Automatic redispatch if driver fails",
    body: "If an offer stalls or is rejected, the system can move the job forward instead of leaving operators guessing."
  },
  {
    title: "Proof of delivery with audit trail",
    body: "Capture delivery completion with verifiable records that support accountability after the drop."
  },
  {
    title: "Transparent pricing before acceptance",
    body: "Drivers can see distance, ETA, and payout before taking the job, reducing friction and confusion."
  },
  {
    title: "Full operational control dashboard",
    body: "Keep delivery execution, redispatch decisions, and completion visibility in one operational workflow."
  }
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
            <a href="#businesses">For Businesses</a>
            <a href="#drivers">For Drivers</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#contact">Contact</a>
          </nav>
        </header>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Business-owned food delivery and local retail logistics</p>
            <h1>Run deliveries without chasing drivers or guessing ETAs.</h1>
            <p className="hero-body">
              ShipWright gives you full control over your delivery operations -
              dispatch in minutes, track every job live, and complete every drop with proof.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#contact">
                Get Started
              </a>
              <a className="button button-secondary" href="mailto:hello@shipwright.local?subject=Book%20a%20Demo">
                Book a Demo
              </a>
            </div>
            <p className="trust-line">
              Built for business-owned food delivery and local retail logistics.
            </p>
          </div>

          <div className="hero-panel" aria-label="Product preview">
            <div className="hero-panel-card">
              <div className="preview-topline">
                <span className="status-pill">Live job tracking</span>
                <span className="preview-badge">ETA updating</span>
              </div>
              <h2>See the job move in real time.</h2>
              <div className="preview-shell">
                <div className="preview-header">
                  <div>
                    <p className="preview-label">Job status</p>
                    <strong>Driver assigned</strong>
                  </div>
                  <div className="preview-status">
                    <span className="signal-dot" />
                    En route
                  </div>
                </div>
                <div className="preview-grid">
                  <div className="preview-stat">
                    <span className="preview-label">Job created</span>
                    <strong>2 mins ago</strong>
                  </div>
                  <div className="preview-stat">
                    <span className="preview-label">Driver matched</span>
                    <strong>Bike courier</strong>
                  </div>
                </div>
                <div className="preview-eta">
                  <span className="preview-label">ETA countdown</span>
                  <strong>08:24</strong>
                </div>
                <div className="preview-map" aria-hidden="true">
                  <div className="map-route" />
                  <span className="map-pin map-pin-start" />
                  <span className="map-pin map-pin-driver" />
                  <span className="map-pin map-pin-end" />
                </div>
              </div>
              <ul className="hero-metrics">
                <li>
                  <strong>Delivery chaos reduced</strong>
                  <span>Operators can see what is happening without chasing drivers for updates.</span>
                </li>
                <li>
                  <strong>Clear handoff accountability</strong>
                  <span>Every drop ends with status clarity and proof instead of informal confirmation.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Operational trust points">
        <p className="trust-strip-title">Designed for real delivery operations</p>
        <div className="trust-items">
          {trustItems.map((item) => (
            <span className="trust-item" key={item}>
              <span className="trust-check" aria-hidden="true">
                ✓
              </span>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="section surface-section" id="businesses">
        <SectionHeading
          eyebrow="Who it serves"
          title="Built for teams that need deliveries to move reliably."
          body="From restaurant groups to local retailers, the platform gives operators a cleaner path from dispatch to proof of delivery."
        />
        <div className="card-grid card-grid-three">
          {valueCards.map((card) => (
            <article className="info-card" key={card.title} id={card.title === "For Drivers" ? "drivers" : undefined}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="how-it-works">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps from request to completed drop."
        />
        <div className="steps-grid steps-grid-flow">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <p className="step-action">{step.action}</p>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section surface-section">
        <SectionHeading
          eyebrow="Operational trust"
          title="Features that support real delivery operations."
          body="The current MVP is focused on the pieces teams need most: trustworthy supply, clean dispatch, live tracking, and accountable completion."
        />
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon" aria-hidden="true">
                <span />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
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
            title="Take control of your delivery operations."
            body="Stop relying on guesswork. Start dispatching with clarity, speed, and full visibility."
          />
          <div className="hero-actions">
            <a className="button button-primary" href="#contact">
              Get Started
            </a>
            <a className="button button-secondary" href="mailto:hello@shipwright.local">
              Talk to Us
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <strong>ShipWright</strong>
          <p>On-demand delivery for food and local goods.</p>
        </div>
        <nav aria-label="Footer">
          <a href="/">Home</a>
          <a href="#businesses">For Businesses</a>
          <a href="#drivers">For Drivers</a>
          <a href="#contact">Contact</a>
        </nav>
      </footer>
    </main>
  );
}
