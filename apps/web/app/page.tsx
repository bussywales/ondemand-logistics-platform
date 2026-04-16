const valueCards = [
  {
    title: "For Businesses",
    body: "Create deliveries, track progress, and keep control of your customer relationship."
  },
  {
    title: "For Drivers",
    body: "See distance, ETA, and payout before you accept."
  },
  {
    title: "For Operations",
    body: "Manage dispatch, redispatch, tracking, and delivery completion in one system."
  }
];

const steps = [
  {
    number: "01",
    title: "Create a delivery",
    body: "Set a single pickup and single drop for a food order or local retail run."
  },
  {
    number: "02",
    title: "Driver is matched",
    body: "Verified bike and car drivers receive clear offer details before they accept."
  },
  {
    number: "03",
    title: "Track it live",
    body: "Monitor progress in real time with branded delivery visibility from dispatch to drop."
  },
  {
    number: "04",
    title: "Delivered with proof",
    body: "Complete every job with delivery confirmation and proof of delivery records."
  }
];

const features = [
  "Verified drivers",
  "Real-time tracking",
  "Redispatch logic",
  "Proof of delivery",
  "Clear pricing",
  "Operational visibility"
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
            <h1>On-demand delivery for food and local goods.</h1>
            <p className="hero-body">
              Connect your business to verified drivers, dispatch jobs in minutes,
              track deliveries live, and complete every drop with proof of delivery.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#contact">
                Get Started
              </a>
              <a className="button button-secondary" href="#drivers">
                Become a Driver
              </a>
            </div>
            <p className="trust-line">
              Built for business-owned food delivery and local retail logistics.
            </p>
          </div>

          <div className="hero-panel" aria-label="Platform summary">
            <div className="hero-panel-card">
              <span className="status-pill">Live delivery visibility</span>
              <h2>Dispatch with clarity, not guesswork.</h2>
              <ul className="hero-metrics">
                <li>
                  <strong>Single pickup → single drop</strong>
                  <span>Purpose-built for faster, operationally clear jobs.</span>
                </li>
                <li>
                  <strong>Bike + car supply</strong>
                  <span>Flexible coverage for short urban routes and premium-distance drops.</span>
                </li>
                <li>
                  <strong>Driver transparency</strong>
                  <span>Distance, ETA, and payout are visible before acceptance.</span>
                </li>
              </ul>
            </div>
          </div>
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
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
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
            <article className="feature-card" key={feature}>
              <div className="feature-icon" aria-hidden="true">
                <span />
              </div>
              <h3>{feature}</h3>
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
            title="Ready to start delivering?"
            body="Start with a business conversation, align your delivery flow, and get set up for local dispatch and tracking."
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
