import Link from "next/link";
import type { ReactNode } from "react";
import { PublicMarketingFooter } from "./public-marketing-footer";
import { PublicMarketingNav } from "./public-marketing-nav";

export function PlaceholderPage(props: {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main className="internal-shell">
      <PublicMarketingNav />
      <section className="internal-card route-card">
        <p className="eyebrow">{props.eyebrow}</p>
        <h1>{props.title}</h1>
        <p>{props.body}</p>
        {props.children ? <div className="route-card-body">{props.children}</div> : null}
        <div className="hero-actions">
          {props.actions ?? (
            <>
              <Link className="button button-primary" href="/">
                Back to Homepage
              </Link>
              <Link className="button button-secondary" href="/contact">
                Contact Team
              </Link>
            </>
          )}
        </div>
      </section>
      <PublicMarketingFooter />
    </main>
  );
}
