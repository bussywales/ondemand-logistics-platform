import Link from "next/link";
import { helpNavigation, type HelpArticle as HelpArticleModel, type HelpCallout as HelpCalloutModel, type HelpStatusRow } from "../_content/help";
import { ShipWrightIcon, type ShipWrightIconName } from "./shipwright-icon";

type HelpCardProps = {
  description: string;
  href: string;
  icon?: ShipWrightIconName;
  title: string;
};

function calloutClass(tone: HelpCalloutModel["tone"]) {
  return `help-callout help-callout-${tone}`;
}

function calloutIcon(tone: HelpCalloutModel["tone"]): ShipWrightIconName {
  if (tone === "success") {
    return "check";
  }

  if (tone === "warning") {
    return "warning";
  }

  if (tone === "danger") {
    return "alert";
  }

  return "document";
}

function SectionList(props: { items: string[] }) {
  return (
    <ul className="help-list">
      {props.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function HelpCard({ description, href, icon = "document", title }: HelpCardProps) {
  return (
    <Link className="sw-operational-surface help-card" href={href}>
      <span className="sw-icon-badge sw-icon-badge--info help-card-icon" aria-hidden="true">
        <ShipWrightIcon name={icon} />
      </span>
      <span>
        <strong>{title}</strong>
        <p>{description}</p>
      </span>
      <span className="help-card-arrow" aria-hidden="true">
        <ShipWrightIcon name="arrow" />
      </span>
    </Link>
  );
}

export function HelpCallout({ body, title, tone }: HelpCalloutModel) {
  return (
    <aside className={calloutClass(tone)}>
      <span className="sw-icon-badge help-callout-icon" aria-hidden="true">
        <ShipWrightIcon name={calloutIcon(tone)} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </aside>
  );
}

export function HelpStatusTable({ rows }: { rows: HelpStatusRow[] }) {
  return (
    <div className="help-status-table" role="table" aria-label="Status meanings">
      <div className="help-status-head" role="row">
        <span>Status</span>
        <span>Meaning</span>
        <span>Next action</span>
      </div>
      {rows.map((row) => (
        <div className="help-status-row" key={row.status} role="row">
          <strong>{row.status}</strong>
          <span>{row.meaning}</span>
          <span>{row.nextAction ?? "No immediate action."}</span>
        </div>
      ))}
    </div>
  );
}

export function HelpArticle({ article }: { article: HelpArticleModel }) {
  return (
    <article className="help-article">
      <header className="sw-command-surface help-article-hero">
        <div>
          <p className="eyebrow">ShipWright help</p>
          <h1>{article.title}</h1>
          <p>{article.description}</p>
        </div>
        <Link className="sw-button sw-button--secondary button button-secondary" href="/help">
          <ShipWrightIcon name="arrow" />
          <span>All help</span>
        </Link>
      </header>

      <div className="help-article-grid">
        <section className="sw-operational-surface help-section">
          <h2>What this screen does</h2>
          <SectionList items={article.whatThisScreenDoes} />
        </section>

        <section className="sw-operational-surface help-section">
          <h2>What to do next</h2>
          <SectionList items={article.whatToDoNext} />
        </section>
      </div>

      {article.callouts?.map((callout) => <HelpCallout key={callout.title} {...callout} />)}

      {article.statusMeanings && article.statusMeanings.length > 0 ? (
        <section className="sw-supporting-surface help-section help-section-wide">
          <h2>Status meanings</h2>
          <HelpStatusTable rows={article.statusMeanings} />
        </section>
      ) : null}

      <div className="help-article-grid">
        <section className="sw-supporting-surface help-section">
          <h2>Operator actions</h2>
          <SectionList items={article.operatorActions} />
        </section>
        <section className="sw-supporting-surface help-section">
          <h2>Common problems</h2>
          <SectionList items={article.commonProblems} />
        </section>
      </div>
    </article>
  );
}

export function HelpIndex() {
  return (
    <main className="help-shell">
      <header className="sw-command-surface help-index-hero">
        <div>
          <p className="eyebrow">ShipWright help</p>
          <h1>Operate the pilot flow with evidence.</h1>
          <p>
            Short practical guides for the current product: onboarding, orders, deliveries, driver execution,
            payments, and staging troubleshooting.
          </p>
        </div>
        <Link className="sw-button sw-button--primary button button-primary" href="/app">
          <ShipWrightIcon name="queue" />
          <span>Open operations</span>
        </Link>
      </header>

      <section className="help-card-grid" aria-label="Help topics">
        {helpNavigation.map((item) => (
          <HelpCard description={item.description} href={item.href} key={item.slug} title={item.title} />
        ))}
      </section>
    </main>
  );
}

export function ContextualHelpLink({ href, label = "Help" }: { href: string; label?: string }) {
  return (
    <Link className="sw-button sw-button--secondary button button-secondary help-context-link" href={href}>
      <ShipWrightIcon name="document" />
      <span>{label}</span>
    </Link>
  );
}
