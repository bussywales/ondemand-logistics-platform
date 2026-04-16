import { PlaceholderPage } from "../_components/placeholder-page";

export default function GetStartedPage() {
  return (
    <PlaceholderPage
      eyebrow="Get Started"
      title="Start the setup conversation."
      body="This placeholder route is ready for a production onboarding or lead capture flow. For now, it gives prospects a clear next step instead of a dead-end CTA."
    >
      <p>
        Typical next steps: confirm operating model, service area, and delivery volume,
        then align dispatch workflow and rollout timing.
      </p>
    </PlaceholderPage>
  );
}
