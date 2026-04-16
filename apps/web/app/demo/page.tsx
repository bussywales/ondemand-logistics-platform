import { PlaceholderPage } from "../_components/placeholder-page";

export default function DemoPage() {
  return (
    <PlaceholderPage
      eyebrow="Book a Demo"
      title="See the delivery workflow in action."
      body="This placeholder route is ready for a scheduling flow or product walkthrough handoff. It keeps the demo CTA meaningful while the fuller sales funnel is still being built."
    >
      <p>
        A production version would show scheduling options, qualification prompts,
        and a lightweight demo request form.
      </p>
    </PlaceholderPage>
  );
}
