import Link from "next/link";
import { PlaceholderPage } from "../_components/placeholder-page";

export default function DemoPage() {
  return (
    <PlaceholderPage
      actions={
        <>
          <Link className="button button-primary" href="/get-started">
            Start onboarding
          </Link>
          <Link className="button button-secondary" href="/app">
            Open dashboard shell
          </Link>
        </>
      }
      eyebrow="Demo"
      title="Walk through the delivery workflow before rollout."
      body="Use the dashboard shell to create a delivery request, inspect tracking, and see payment state without waiting for a full production auth layer."
    >
      <ul className="stack-list">
        <li>Start in staged mode for a frictionless walkthrough.</li>
        <li>Switch to live mode when you have the staging bearer token and IDs.</li>
        <li>Use the job detail view to inspect tracking and payment state per request.</li>
      </ul>
    </PlaceholderPage>
  );
}
