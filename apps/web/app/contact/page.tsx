import { PlaceholderPage } from "../_components/placeholder-page";

export default function ContactPage() {
  return (
    <PlaceholderPage
      actions={
        <>
          <a className="button button-primary" href="mailto:hello@shipwright.local?subject=ShipWright%20Launch%20Planning">
            Email team
          </a>
          <a className="button button-secondary" href="mailto:hello@shipwright.local?subject=Need%20Staging%20Credentials">
            Request staging access
          </a>
        </>
      }
      eyebrow="Contact"
      title="Start the rollout conversation."
      body="Use this route as the operational handoff for onboarding, staged credentials, and launch planning while the direct sales and auth flows are still being wired."
    >
      <p><strong>Email:</strong> hello@shipwright.local</p>
      <p><strong>Focus:</strong> business-owned food delivery and local retail logistics</p>
      <p><strong>Best next step:</strong> complete business onboarding, then connect the live staging token when you are ready to exercise the backend flow.</p>
    </PlaceholderPage>
  );
}
