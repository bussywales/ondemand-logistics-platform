import Link from "next/link";
import React from "react";
import { BrandLogo } from "./brand-logo";

const footerLinks = [
  { href: "/get-started", label: "Get started" },
  { href: "/demo", label: "Demo" },
  { href: "/demo/investor", label: "Investor demo" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo/request", label: "Request demo" },
  { href: "/contact", label: "Contact" }
];

export function PublicMarketingFooter() {
  return (
    <footer className="site-footer landing-footer landing-story-footer">
      <div className="footer-brand">
        <BrandLogo className="footer-brand-mark" href="/" mode="full" />
        <p>
          Route intelligence for local commerce: order signal, dispatch movement, customer tracking, payment state,
          and proof-backed fulfilment.
        </p>
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
        {footerLinks.map((link) => (
          <Link href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
