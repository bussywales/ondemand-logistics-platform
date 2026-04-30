import Link from "next/link";
import { PlaceholderPage } from "../_components/placeholder-page";

export default function DemoPage() {
  return (
    <PlaceholderPage
      actions={
        <>
          <Link className="button button-primary" href="/demo/investor">
            Open investor demo
          </Link>
          <Link className="button button-secondary" href="/restaurants/pilot-kitchen-1777370757">
            Open public restaurant
          </Link>
        </>
      }
      eyebrow="Demo"
      title="Run the guided Stage 1 investor demo."
      body="Use the investor demo route to present the proven merchant -> paid order -> dispatch -> delivery -> fulfilment loop with real screens and documented staging evidence."
    >
      <ul className="stack-list">
        <li>Open the investor route for the screen sequence and control panel.</li>
        <li>Use seeded staging accounts for operator, driver, and platform-admin views.</li>
        <li>Use the documented proof summary when live staging verification has not just been rerun.</li>
      </ul>
    </PlaceholderPage>
  );
}
