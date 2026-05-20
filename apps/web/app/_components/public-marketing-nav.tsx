"use client";

import Link from "next/link";
import React, { useEffect, useId, useRef, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ShipWrightIcon, type ShipWrightIconName } from "./shipwright-icon";

type PublicMenuItem = {
  description: string;
  href: string;
  icon: ShipWrightIconName;
  title: string;
};

type PublicMenu = {
  accent: "commerce" | "command" | "proof" | "route";
  intro: string;
  items: PublicMenuItem[];
  key: string;
  label: string;
  proof: string;
  summary: string;
};

const publicMenus: PublicMenu[] = [
  {
    accent: "route",
    intro: "Operational spine for local commerce",
    key: "platform",
    label: "Platform",
    proof: "Order signal -> dispatch movement -> proof-backed closeout.",
    summary: "Paid ordering, dispatch, courier execution, tracking, payment state, and platform oversight in one operating layer.",
    items: [
      { description: "Restaurant setup, menu readiness, paid orders, and fulfilment context.", href: "/#platform", icon: "restaurant", title: "Merchant Operations" },
      { description: "Jobs, dispatch attempts, driver assignment, and recovery state.", href: "/#platform", icon: "queue", title: "Dispatch & Jobs" },
      { description: "Availability, offers, execution stages, and proof of delivery.", href: "/#platform", icon: "driver", title: "Courier Flow" },
      { description: "Customer-safe order progress without fake live-map movement.", href: "/#platform", icon: "route", title: "Customer Tracking" },
      { description: "Authorization, capture, risk, payout visibility, and order impact.", href: "/#platform", icon: "payment", title: "Payment Visibility" },
      { description: "Cross-org command posture, incidents, readiness, and support oversight.", href: "/#platform", icon: "document", title: "Platform Oversight" }
    ]
  },
  {
    accent: "commerce",
    intro: "Workflows for teams moving local commerce",
    key: "solutions",
    label: "Solutions",
    proof: "Controlled pilot paths for merchants, operators, couriers, and platform teams.",
    summary: "Focused routes for the teams that need orders, courier work, payment visibility, and support context to stay aligned.",
    items: [
      { description: "Paid menu ordering, delivery handoff, support context, and closeout evidence.", href: "/#operators", icon: "restaurant", title: "Restaurants" },
      { description: "Local commerce fulfilment for operators who need delivery state visibility.", href: "/#operators", icon: "menu", title: "Local Retailers" },
      { description: "Exception-first queues, recovery guidance, and human-approved controls.", href: "/#operators", icon: "queue", title: "Dispatch Operators" },
      { description: "Structured offers, route stages, readiness signals, and POD.", href: "/#operators", icon: "driver", title: "Couriers" },
      { description: "Validation gates, proof artifacts, playbooks, and controlled demo discipline.", href: "/demo", icon: "check", title: "Pilot Teams" }
    ]
  },
  {
    accent: "command",
    intro: "Human-in-the-loop operational guidance",
    key: "command",
    label: "Command Intelligence",
    proof: "Signals are advisory. Operators approve recovery, refunds, messaging, and incident closeout.",
    summary: "Deterministic operating intelligence that helps teams spot risk and review next steps without silent automation.",
    items: [
      { description: "A deterministic service-window summary of what needs attention.", href: "/#intelligence", icon: "bell", title: "Daily Briefing" },
      { description: "Suggested recovery paths for failed dispatch and blocked courier assignment.", href: "/#intelligence", icon: "retry", title: "Recovery Suggestions" },
      { description: "Delay detection, incident context, and operator-readable summaries.", href: "/#intelligence", icon: "warning", title: "Incident Intelligence" },
      { description: "Closeout summaries for orders, deliveries, payments, and unresolved actions.", href: "/#intelligence", icon: "timeline", title: "End-of-Day Reports" },
      { description: "No silent refunds, cancellations, assignments, messages, or incident closure.", href: "/#intelligence", icon: "alert", title: "Human Approval Controls" }
    ]
  },
  {
    accent: "proof",
    intro: "Learn, validate, and prepare pilots",
    key: "resources",
    label: "Resources",
    proof: "Release verification, paid-delivery proof, smoke checks, and known limitations stay explicit.",
    summary: "Demo material, commercial pilot paths, validation discipline, playbooks, and claims boundaries.",
    items: [
      { description: "Guided route order, talk track, and proof-backed walkthrough.", href: "/demo", icon: "document", title: "Demo Walkthrough" },
      { description: "Investor-facing product walkthrough and staging proof narrative.", href: "/demo/investor", icon: "route", title: "Investor Walkthrough" },
      { description: "Controlled pilot packages for merchants, operators, investors, and partners.", href: "/pricing", icon: "payment", title: "Controlled Pilot" },
      { description: "Artifacts for paid delivery, fulfilled order state, capture, and readiness.", href: "/#proof", icon: "check", title: "Proof-Driven Operations" },
      { description: "Clear boundaries for staging, tracking, email, payouts, and autonomy.", href: "/demo", icon: "alert", title: "Known Limitations" },
      { description: "Release checks, smoke routes, and pre-demo quality gates.", href: "/demo", icon: "warning", title: "Validation Standard" }
    ]
  }
];

export function PublicMarketingNav() {
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const panelId = useId();
  const activeMenu = publicMenus.find((menu) => menu.key === activeMenuKey) ?? null;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setActiveMenuKey(null);
        setMobileOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveMenuKey(null);
        setMobileOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function closeMenus() {
    setActiveMenuKey(null);
    setMobileOpen(false);
  }

  return (
    <header className="topbar landing-topbar landing-story-topbar public-marketing-header" ref={headerRef}>
      <div className="public-marketing-header-row">
        <BrandLogo href="/" />

        <nav className="topnav landing-topnav landing-platform-nav public-marketing-desktop-nav" aria-label="Primary">
          {publicMenus.map((menu) => (
            <button
              aria-controls={`${panelId}-${menu.key}`}
              aria-expanded={activeMenuKey === menu.key}
              className="landing-mega-trigger"
              key={menu.key}
              onClick={() => setActiveMenuKey(menu.key)}
              onFocus={() => setActiveMenuKey(menu.key)}
              onMouseEnter={() => setActiveMenuKey(menu.key)}
              type="button"
            >
              <span>{menu.label}</span>
              <ShipWrightIcon name="arrow" size={14} />
            </button>
          ))}
          <Link className="landing-nav-link landing-nav-pricing-link" href="/pricing" onClick={closeMenus}>
            Pricing
          </Link>
        </nav>

        <div className="landing-nav-actions public-marketing-desktop-actions">
          <Link className="landing-nav-link" href="/get-started" onClick={closeMenus}>
            Get started
          </Link>
          <Link className="landing-nav-cta" href="/demo/request" onClick={closeMenus}>
            Start controlled pilot
          </Link>
        </div>

        <button
          aria-expanded={mobileOpen}
          className="public-marketing-mobile-toggle"
          onClick={() => {
            setMobileOpen((current) => !current);
            setActiveMenuKey(null);
          }}
          type="button"
        >
          <span>Menu</span>
          <ShipWrightIcon name="menu" size={18} />
        </button>
      </div>

      {activeMenu ? (
        <div className={`landing-mega-panel public-mega-panel public-mega-panel-${activeMenu.accent}`} id={`${panelId}-${activeMenu.key}`}>
          <div className="landing-mega-intro public-mega-intro">
            <span>{activeMenu.intro}</span>
            <p>{activeMenu.summary}</p>
            <div className="landing-mega-art public-mega-art" aria-hidden="true">
              <span className="landing-mega-art-route" />
              <span className="landing-mega-art-node landing-mega-art-node-commerce" />
              <span className="landing-mega-art-node landing-mega-art-node-command" />
              <span className="landing-mega-art-node landing-mega-art-node-proof" />
            </div>
          </div>
          <div className="landing-mega-grid public-mega-grid">
            {activeMenu.items.map((item) => (
              <Link className="landing-mega-item" href={item.href} key={item.title} onClick={closeMenus}>
                <span className="landing-mega-icon">
                  <ShipWrightIcon name={item.icon} size={18} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
              </Link>
            ))}
          </div>
          <div className="public-mega-proof-card">
            <span>{activeMenu.label}</span>
            <strong>{activeMenu.proof}</strong>
            <Link href={activeMenu.key === "resources" ? "/demo/request" : "/pricing"} onClick={closeMenus}>
              {activeMenu.key === "resources" ? "Request walkthrough" : "See pilot packages"}
              <ShipWrightIcon name="arrow" size={15} />
            </Link>
          </div>
        </div>
      ) : null}

      <nav className={mobileOpen ? "public-mobile-menu is-open" : "public-mobile-menu"} aria-label="Mobile marketing navigation">
        <Link className="public-mobile-direct-link" href="/pricing" onClick={closeMenus}>
          Pricing
        </Link>
        {publicMenus.map((menu) => (
          <details className="public-mobile-menu-group" key={menu.key}>
            <summary>{menu.label}</summary>
            <div>
              {menu.items.map((item) => (
                <Link href={item.href} key={item.title} onClick={closeMenus}>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </Link>
              ))}
            </div>
          </details>
        ))}
        <div className="public-mobile-actions">
          <Link className="landing-nav-link" href="/get-started" onClick={closeMenus}>
            Get started
          </Link>
          <Link className="landing-nav-cta" href="/demo/request" onClick={closeMenus}>
            Start controlled pilot
          </Link>
        </div>
      </nav>
    </header>
  );
}
