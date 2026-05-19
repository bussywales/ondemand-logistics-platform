import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "../../_components/brand-logo";
import { DemoRequestForm, normalizeDemoRequestInterest } from "../../_components/demo-request-form";
import { ShipWrightIcon } from "../../_components/shipwright-icon";

export const metadata: Metadata = {
  title: "Request Demo | ShipWright",
  description: "Request a controlled ShipWright pilot or guided operations walkthrough."
};

export default async function DemoRequestPage(props: {
  searchParams?: Promise<{ interest?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const requestedInterest = Array.isArray(searchParams?.interest) ? searchParams?.interest[0] : searchParams?.interest;
  const defaultInterestType = normalizeDemoRequestInterest(requestedInterest);

  return (
    <main className="demo-request-page">
      <header className="demo-request-hero">
        <BrandLogo href="/" />
        <div className="demo-request-hero-grid">
          <div className="demo-request-copy">
            <p className="landing-kicker">Controlled pilot request</p>
            <h1>Start with a guided ShipWright operations walkthrough.</h1>
            <p>
              Tell us who you are and what you want to see. Requests are now recorded for admin review before any
              controlled pilot, operator walkthrough, or investor conversation is scheduled.
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
        <DemoRequestForm defaultInterestType={defaultInterestType} />

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
