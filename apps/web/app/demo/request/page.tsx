import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "../../_components/brand-logo";
import { ShipWrightIcon } from "../../_components/shipwright-icon";

export const metadata: Metadata = {
  title: "Request Demo | ShipWright",
  description: "Request a controlled ShipWright pilot or guided operations walkthrough."
};

const interestTypes = ["Pilot merchant", "Operator/platform", "Investor/partner", "Other"];

export default function DemoRequestPage() {
  return (
    <main className="demo-request-page">
      <header className="demo-request-hero">
        <BrandLogo href="/" />
        <div className="demo-request-hero-grid">
          <div className="demo-request-copy">
            <p className="landing-kicker">Controlled pilot request</p>
            <h1>Start with a guided ShipWright operations walkthrough.</h1>
            <p>
              Tell us who you are and what you want to see. Demo request capture is staged for now, so use the email
              handoff below until a CRM or email provider is wired.
            </p>
            <div className="demo-request-proof-row" aria-label="Demo readiness proof points">
              <span>Release verification</span>
              <span>Paid-delivery proof</span>
              <span>Browser smoke</span>
              <span>Human approval required</span>
            </div>
          </div>
          <div className="demo-request-signal" aria-hidden="true">
            <span className="demo-request-route" />
            <span className="demo-request-node demo-request-node-commerce" />
            <span className="demo-request-node demo-request-node-command" />
            <span className="demo-request-node demo-request-node-proof" />
            <strong>Controlled handoff</strong>
          </div>
        </div>
      </header>

      <section className="demo-request-shell">
        <form className="demo-request-form" aria-describedby="demo-request-note">
          <div className="demo-request-field-grid">
            <label>
              <span>Name</span>
              <input name="name" placeholder="Your name" type="text" />
            </label>
            <label>
              <span>Email</span>
              <input name="email" placeholder="you@example.com" type="email" />
            </label>
            <label>
              <span>Organisation</span>
              <input name="organisation" placeholder="Restaurant, retailer, fund, or operator" type="text" />
            </label>
            <label>
              <span>Role</span>
              <input name="role" placeholder="Founder, operator, investor, manager" type="text" />
            </label>
          </div>
          <label>
            <span>Interest type</span>
            <select name="interestType" defaultValue="Pilot merchant">
              {interestTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Message</span>
            <textarea
              name="message"
              placeholder="Tell us what you want to see: restaurant pilot, operator workflow, investor walkthrough, or platform oversight."
              rows={5}
            />
          </label>
          <p className="demo-request-note" id="demo-request-note">
            This form is not connected to email or CRM yet. Do not enter sensitive data. Use the email handoff to send a
            real request while Resend/external delivery remains parked.
          </p>
          <div className="demo-request-actions">
            <a
              className="button button-primary landing-button-primary"
              href="mailto:hello@shipwright.local?subject=ShipWright%20controlled%20pilot%20request"
            >
              Email demo request
            </a>
            <Link className="button button-secondary landing-button-secondary" href="/demo/investor">
              View investor walkthrough
            </Link>
          </div>
        </form>

        <aside className="demo-request-aside">
          <p className="landing-kicker">What the walkthrough covers</p>
          <ul>
            <li>
              <ShipWrightIcon name="restaurant" />
              <span>Public restaurant ordering and checkout surface</span>
            </li>
            <li>
              <ShipWrightIcon name="route" />
              <span>Customer tracking and delivery progress state</span>
            </li>
            <li>
              <ShipWrightIcon name="queue" />
              <span>Business orders, jobs, and payment risk</span>
            </li>
            <li>
              <ShipWrightIcon name="bell" />
              <span>Command Intelligence with human approval</span>
            </li>
            <li>
              <ShipWrightIcon name="check" />
              <span>Proof artifacts, browser smoke, and known limitations</span>
            </li>
          </ul>
          <div className="demo-request-links">
            <Link href="/restaurants/pilot-kitchen-1777370757">Open public restaurant</Link>
            <Link href="/demo">Open demo hub</Link>
            <Link href="/contact">Contact route</Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
