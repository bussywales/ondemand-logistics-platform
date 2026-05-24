import type { Metadata } from "next";
import React from "react";
import { AnalyticsLink } from "../_components/analytics-link";
import { PublicAnalyticsPageView } from "../_components/public-analytics-page-view";
import { PublicMarketingFooter } from "../_components/public-marketing-footer";
import { PublicMarketingNav } from "../_components/public-marketing-nav";
import { ShipWrightIcon, type ShipWrightIconName } from "../_components/shipwright-icon";

export const metadata: Metadata = {
  title: "Pricing | Controlled Pilot Packages | ShipWright",
  description: "Controlled ShipWright pilot packages for restaurants, local retailers, operators, investors, and partners."
};

const packages = [
  {
    audience: "Restaurants, local retailers, and small operators",
    cta: "Start controlled pilot",
    href: "/demo/request?interest=pilot",
    icon: "restaurant",
    includes: [
      "Merchant setup and menu readiness",
      "Public order and checkout flow",
      "Dispatch and job workflow",
      "Customer tracking and payment visibility",
      "Support escalation logging",
      "Menu audit and rollback posture",
      "Pilot guardrails and rehearsal support"
    ],
    label: "Controlled Pilot",
    tone: "commerce"
  },
  {
    audience: "Dispatch teams, multi-merchant operators, and local commerce platforms",
    cta: "Book operator walkthrough",
    href: "/demo/request?interest=operator",
    icon: "queue",
    includes: [
      "Admin Command Intelligence",
      "Pilot workspace management",
      "Support closeout workflow",
      "Dispatch override audit",
      "Fleet and courier readiness visibility",
      "End-of-day reporting",
      "Release readiness and validation evidence"
    ],
    label: "Operator / Platform Pilot",
    tone: "command"
  },
  {
    audience: "Investors, strategic partners, and ecosystem partners",
    cta: "Request investor walkthrough",
    href: "/demo/request?interest=investor",
    icon: "document",
    includes: [
      "Product walkthrough",
      "Staging proof flow",
      "Roadmap overview",
      "Operational maturity review",
      "Finance visibility and governance review",
      "Commercial pilot discussion",
      "Known limitation review"
    ],
    label: "Investor / Partner Demo",
    tone: "proof"
  }
] satisfies Array<{
  audience: string;
  cta: string;
  href: string;
  icon: ShipWrightIconName;
  includes: string[];
  label: string;
  tone: "commerce" | "command" | "proof";
}>;

const included = [
  "Controlled staging/live pilot preparation",
  "Payment-state visibility",
  "Tracking and status visibility",
  "Support escalation workflow",
  "Admin oversight",
  "Proof-driven validation",
  "Finance visibility and refund-review posture",
  "Dispatch, support, menu, and access audit visibility"
];

const notYetIncluded = [
  "Autonomous refunds",
  "Autonomous dispatch override",
  "Automated customer messaging",
  "Full settlement or payout automation",
  "Open self-serve onboarding",
  "Live map movement"
];

const faqs = [
  {
    answer:
      "ShipWright is ready for controlled pilots, demos, and managed early deployments. Open, unattended real-world operation still requires live operating ownership and agreed guardrails.",
    question: "Is this live-ready?"
  },
  {
    answer:
      "Restaurants and retailers can use the controlled pilot path to review menu setup, paid ordering, dispatch workflow, tracking, and support handling before a live operating window.",
    question: "Can restaurants use it now?"
  },
  {
    answer:
      "No. Command Intelligence is deterministic and human-in-the-loop. Operators approve refunds, cancellations, dispatch recovery, customer messages, and incident closeout.",
    question: "Is AI making decisions?"
  },
  {
    answer:
      "Yes, with boundaries. ShipWright includes courier readiness, driver execution, admin fleet foundations, and a dedicated fleet-manager workspace. Fleet billing and payout automation are not part of v1.",
    question: "Can drivers and fleets use it?"
  },
  {
    answer:
      "ShipWright supports payment authorization, capture proof, and payment-risk visibility. Full settlement and payout automation remain deferred.",
    question: "Does it support payments?"
  },
  {
    answer:
      "After a pilot fit review, the team defines operating scope, validation gates, support ownership, known limitations, and the next controlled rehearsal or deployment window.",
    question: "What happens after a pilot?"
  }
];

const proofStandards = [
  {
    body: "Release readiness and validation evidence show whether release verification, paid proof, and required-auth smoke are current.",
    label: "Evidence",
    title: "Readiness before demos"
  },
  {
    body: "Support closeout, dispatch override history, menu rollback, and enterprise access events remain audit-visible.",
    label: "Audit",
    title: "Human decisions visible"
  },
  {
    body: "Finance surfaces show captured, pending, failed, and refund-review posture without automated refunds or payout automation.",
    label: "Finance",
    title: "Review-only payment posture"
  },
  {
    body: "Fleet workspace and driver readiness are available for managed courier groups without scoring or automatic suspension.",
    label: "Fleet",
    title: "Courier readiness context"
  }
] satisfies Array<{ body: string; label: string; title: string }>;

function PackageCard(props: { item: (typeof packages)[number] }) {
  return (
    <article className={`pricing-package-card pricing-package-card-${props.item.tone}`}>
      <div className="pricing-package-heading">
        <span className="pricing-package-icon">
          <ShipWrightIcon name={props.item.icon} size={18} />
        </span>
        <div>
          <p>{props.item.label}</p>
          <h2>{props.item.audience}</h2>
        </div>
      </div>
      <ul>
        {props.item.includes.map((includedItem) => (
          <li key={includedItem}>
            <ShipWrightIcon name="check" size={15} />
            <span>{includedItem}</span>
          </li>
        ))}
      </ul>
      <AnalyticsLink
        analyticsEventName="PRICING_CTA_CLICKED"
        analyticsLabel={props.item.cta}
        analyticsMetadata={{ package: props.item.label, interestType: props.item.href.includes("operator") ? "operator" : props.item.href.includes("investor") ? "investor" : "pilot" }}
        analyticsSource="pricing_package"
        className="button button-primary landing-button-primary pricing-package-cta"
        href={props.item.href}
      >
        {props.item.cta}
      </AnalyticsLink>
    </article>
  );
}

function PricingList(props: { items: string[]; title: string; tone: "included" | "limited" }) {
  return (
    <article className={`pricing-boundary-card pricing-boundary-card-${props.tone}`}>
      <h2>{props.title}</h2>
      <ul>
        {props.items.map((item) => (
          <li key={item}>
            <ShipWrightIcon name={props.tone === "included" ? "check" : "alert"} size={15} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function PricingPage() {
  return (
    <main className="pricing-page landing-page-story">
      <PublicAnalyticsPageView page="pricing" />
      <PublicMarketingNav />

      <section className="pricing-hero">
        <div className="pricing-hero-copy">
          <p className="landing-kicker">Controlled pilot packages</p>
          <h1>Commercial entry without public-price theatre.</h1>
          <p>
            ShipWright is packaged for controlled pilots, managed early deployments, and proof-backed walkthroughs.
            Pilot pricing is discussed after fit review and structured around scope, order volume, and operational
            support needs.
          </p>
          <div className="pricing-hero-actions">
            <AnalyticsLink
              analyticsEventName="PRICING_CTA_CLICKED"
              analyticsLabel="Start controlled pilot"
              analyticsMetadata={{ interestType: "pilot" }}
              analyticsSource="pricing_hero"
              className="button button-primary landing-button-primary"
              href="/demo/request?interest=pilot"
            >
              Start controlled pilot
            </AnalyticsLink>
            <AnalyticsLink
              analyticsEventName="PRICING_CTA_CLICKED"
              analyticsLabel="Book operator walkthrough"
              analyticsMetadata={{ interestType: "operator" }}
              analyticsSource="pricing_hero"
              className="button button-secondary landing-button-secondary"
              href="/demo/request?interest=operator"
            >
              Book operator walkthrough
            </AnalyticsLink>
          </div>
        </div>
        <div className="pricing-hero-scene" aria-hidden="true">
          <span className="pricing-route-line" />
          <span className="pricing-node pricing-node-commerce" />
          <span className="pricing-node pricing-node-command" />
          <span className="pricing-node pricing-node-proof" />
          <div className="pricing-scene-card pricing-scene-card-primary">
            <span>Scope</span>
            <strong>Controlled pilot</strong>
          </div>
          <div className="pricing-scene-card pricing-scene-card-secondary">
            <span>Pricing</span>
            <strong>Fit review first</strong>
          </div>
        </div>
      </section>

      <section className="pricing-packages" aria-label="Controlled pilot package options">
        {packages.map((item) => (
          <PackageCard item={item} key={item.label} />
        ))}
      </section>

      <section className="pricing-note">
        <span>Pilot pricing discussed after fit review</span>
        <p>
          ShipWright does not publish generic self-serve pricing yet because the pilot shape depends on operating
          scope, courier coverage, order volume, payment posture, and support ownership.
        </p>
      </section>

      <section className="pricing-proof-standard" aria-label="Pilot readiness proof standards">
        <div className="landing-section-lead">
          <p className="landing-kicker">Readiness standard</p>
          <h2>Every package starts with proof, not a promise.</h2>
          <p>
            Controlled pilots include release readiness, validation evidence, finance visibility, dispatch and support
            audit posture, and fleet-ready operational context where relevant.
          </p>
        </div>
        <div className="pricing-proof-grid">
          {proofStandards.map((standard) => (
            <article className="pricing-proof-card" key={standard.title}>
              <span>{standard.label}</span>
              <strong>{standard.title}</strong>
              <p>{standard.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing-boundaries">
        <PricingList items={included} title="What is included" tone="included" />
        <PricingList items={notYetIncluded} title="Not yet included / human-reviewed" tone="limited" />
      </section>

      <section className="pricing-faq">
        <div className="pricing-faq-lead">
          <p className="landing-kicker">Pilot questions</p>
          <h2>Clear boundaries before commercial commitment.</h2>
        </div>
        <div className="pricing-faq-list">
          {faqs.map((faq) => (
            <article key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing-final">
        <div>
          <p className="landing-kicker">Start with fit</p>
          <h2>Run the first conversation like an operating review.</h2>
          <p>
            Choose the pilot path that matches your role. The request is persisted for platform-admin review; email,
            CRM, and automated follow-up remain intentionally deferred.
          </p>
        </div>
        <div className="pricing-final-actions">
          <AnalyticsLink
            analyticsEventName="PRICING_CTA_CLICKED"
            analyticsLabel="Start controlled pilot"
            analyticsMetadata={{ interestType: "pilot" }}
            analyticsSource="pricing_final"
            className="button button-primary landing-button-primary"
            href="/demo/request?interest=pilot"
          >
            Start controlled pilot
          </AnalyticsLink>
          <AnalyticsLink
            analyticsEventName="PRICING_CTA_CLICKED"
            analyticsLabel="Request investor walkthrough"
            analyticsMetadata={{ interestType: "investor" }}
            analyticsSource="pricing_final"
            className="button button-secondary landing-button-secondary"
            href="/demo/request?interest=investor"
          >
            Request investor walkthrough
          </AnalyticsLink>
        </div>
      </section>

      <PublicMarketingFooter />
    </main>
  );
}
