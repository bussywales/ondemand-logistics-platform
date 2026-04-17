"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBusinessOrg, createBusinessSession, fetchBusinessContext, signInWithPassword, signUpWithPassword } from "../_lib/auth";
import { readBusinessSession, saveBusinessSession, saveDriverProfile, type VehicleType } from "../_lib/product-state";

type Role = "business" | "driver" | "consumer";
type AuthMode = "create" | "signin";

const businessDefaults = {
  businessName: "",
  contactName: "",
  email: "",
  password: "",
  phone: "",
  city: "London"
};

const driverDefaults = {
  name: "",
  phone: "",
  vehicleType: "BIKE" as VehicleType
};

export function OnboardingFlow() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("business");
  const [authMode, setAuthMode] = useState<AuthMode>("create");
  const [businessForm, setBusinessForm] = useState(businessDefaults);
  const [driverForm, setDriverForm] = useState(driverDefaults);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingSession, setExistingSession] = useState<ReturnType<typeof readBusinessSession>>(null);

  useEffect(() => {
    setExistingSession(readBusinessSession());
  }, []);

  const roleSummary = useMemo(() => {
    if (role === "business") {
      return "Create a real business account, provision the org, and move straight into the authenticated dashboard.";
    }

    if (role === "driver") {
      return "Capture core driver details now, then continue into the staged driver setup handoff flow.";
    }

    return "Consumer flows are not the current priority. Use the business path for the real product activation flow.";
  }, [role]);

  async function handleBusinessSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!businessForm.email || !businessForm.password) {
        throw new Error("Enter the email and password for the business operator account.");
      }

      const authSession = authMode === "create"
        ? await signUpWithPassword({
            email: businessForm.email.trim(),
            password: businessForm.password,
            displayName: businessForm.contactName.trim()
          })
        : await signInWithPassword({
            email: businessForm.email.trim(),
            password: businessForm.password
          });

      let context = await fetchBusinessContext(authSession.accessToken);
      if (!context.onboarded) {
        if (!businessForm.businessName || !businessForm.contactName || !businessForm.phone || !businessForm.city) {
          throw new Error("This account is not onboarded yet. Complete the business profile fields to create the org.");
        }

        context = await createBusinessOrg(authSession.accessToken, {
          businessName: businessForm.businessName.trim(),
          contactName: businessForm.contactName.trim(),
          email: businessForm.email.trim(),
          phone: businessForm.phone.trim(),
          city: businessForm.city.trim()
        });
      }

      saveBusinessSession(
        createBusinessSession({
          accessToken: authSession.accessToken,
          refreshToken: authSession.refreshToken,
          context
        })
      );
      router.push("/app");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to complete business onboarding.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDriverSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!driverForm.name || !driverForm.phone) {
      setError("Complete the required driver fields before continuing.");
      return;
    }

    saveDriverProfile(driverForm);
    router.push("/contact?audience=driver");
  }

  return (
    <main className="internal-shell onboarding-shell">
      <section className="internal-card onboarding-card">
        <div className="section-heading onboarding-heading">
          <p className="eyebrow">Get Started</p>
          <h1>Set up the first operating profile.</h1>
          <p className="section-copy">
            Start with the role you need right now. Business onboarding now creates a real org and operator membership through the API, then lands directly in the dashboard.
          </p>
        </div>

        <div className="onboarding-role-grid">
          <button className={`role-card ${role === "business" ? "role-card-active" : ""}`} onClick={() => setRole("business")} type="button">
            <span className="role-card-eyebrow">Primary</span>
            <strong>Business</strong>
            <span>Create the org, become the operator, and move straight into the live dashboard flow.</span>
          </button>
          <button className={`role-card ${role === "driver" ? "role-card-active" : ""}`} onClick={() => setRole("driver")} type="button">
            <span className="role-card-eyebrow">Supply</span>
            <strong>Driver</strong>
            <span>Capture core details now and continue into the staged driver setup handoff.</span>
          </button>
          <button className={`role-card role-card-muted ${role === "consumer" ? "role-card-active" : ""}`} onClick={() => setRole("consumer")} type="button">
            <span className="role-card-eyebrow">Secondary</span>
            <strong>Consumer</strong>
            <span>Available later. The current product focus is business-owned food and local retail operations.</span>
          </button>
        </div>

        <div className="onboarding-panel">
          <div className="onboarding-panel-copy">
            <h2>{role === "business" ? "Business onboarding" : role === "driver" ? "Driver onboarding" : "Current focus"}</h2>
            <p>{roleSummary}</p>
            <ul className="stack-list">
              <li>Supabase email/password auth identifies the business user.</li>
              <li>The API creates the org and BUSINESS_OPERATOR membership transactionally.</li>
              <li>The dashboard reuses that real context for jobs, tracking, and payment reads.</li>
            </ul>
            {existingSession?.context.currentOrg ? (
              <div className="existing-session-callout">
                <strong>Existing session detected</strong>
                <p>{existingSession.context.currentOrg.name}</p>
                <Link className="button button-secondary" href="/app">
                  Continue to Dashboard
                </Link>
              </div>
            ) : null}
          </div>

          {role === "business" ? (
            <form className="form-card" onSubmit={handleBusinessSubmit}>
              <div className="mode-switch auth-mode-switch">
                <button className={`mode-chip ${authMode === "create" ? "mode-chip-active" : ""}`} onClick={() => setAuthMode("create")} type="button">
                  Create account
                </button>
                <button className={`mode-chip ${authMode === "signin" ? "mode-chip-active" : ""}`} onClick={() => setAuthMode("signin")} type="button">
                  Sign in
                </button>
              </div>
              <label>
                <span>Business name</span>
                <input name="businessName" onChange={(event) => setBusinessForm((current) => ({ ...current, businessName: event.target.value }))} placeholder="ShipWright Retail Ops" value={businessForm.businessName} />
              </label>
              <label>
                <span>Contact name</span>
                <input name="contactName" onChange={(event) => setBusinessForm((current) => ({ ...current, contactName: event.target.value }))} placeholder="Olubusayo Adewale" value={businessForm.contactName} />
              </label>
              <div className="form-grid-two">
                <label>
                  <span>Email</span>
                  <input name="email" onChange={(event) => setBusinessForm((current) => ({ ...current, email: event.target.value }))} placeholder="ops@shipwright.local" type="email" value={businessForm.email} />
                </label>
                <label>
                  <span>Password</span>
                  <input name="password" onChange={(event) => setBusinessForm((current) => ({ ...current, password: event.target.value }))} placeholder="Choose a password" type="password" value={businessForm.password} />
                </label>
              </div>
              <div className="form-grid-two">
                <label>
                  <span>Phone</span>
                  <input name="phone" onChange={(event) => setBusinessForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+44 20 7946 0958" value={businessForm.phone} />
                </label>
                <label>
                  <span>Operating city</span>
                  <input name="city" onChange={(event) => setBusinessForm((current) => ({ ...current, city: event.target.value }))} placeholder="London" value={businessForm.city} />
                </label>
              </div>
              <p className="support-note">
                {authMode === "create"
                  ? "Creating an account also provisions the first org if one does not already exist."
                  : "Sign in with an existing business account. If the account is already onboarded, only email and password are required. If not, the business fields above create the org next."}
              </p>
              {error ? <p className="form-error">{error}</p> : null}
              <div className="hero-actions">
                <button className="button button-primary" disabled={submitting} type="submit">
                  {submitting ? "Connecting account..." : "Continue to Dashboard"}
                </button>
                <Link className="button button-secondary" href="/demo">
                  View Demo Flow
                </Link>
              </div>
            </form>
          ) : null}

          {role === "driver" ? (
            <form className="form-card" onSubmit={handleDriverSubmit}>
              <label>
                <span>Name</span>
                <input name="name" onChange={(event) => setDriverForm((current) => ({ ...current, name: event.target.value }))} placeholder="Alex Rider" value={driverForm.name} />
              </label>
              <label>
                <span>Phone</span>
                <input name="phone" onChange={(event) => setDriverForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+44 20 7946 0958" value={driverForm.phone} />
              </label>
              <label>
                <span>Vehicle type</span>
                <select name="vehicleType" onChange={(event) => setDriverForm((current) => ({ ...current, vehicleType: event.target.value as VehicleType }))} value={driverForm.vehicleType}>
                  <option value="BIKE">Bike</option>
                  <option value="CAR">Car</option>
                </select>
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <div className="hero-actions">
                <button className="button button-primary" type="submit">
                  Continue to Driver Setup
                </button>
                <Link className="button button-secondary" href="/contact?audience=driver">
                  Talk to Ops
                </Link>
              </div>
            </form>
          ) : null}

          {role === "consumer" ? (
            <div className="form-card consumer-card">
              <h3>Consumer entry is intentionally de-emphasized.</h3>
              <p>
                The current MVP is built around business-owned food delivery and local retail logistics. Use the business path for the real org-backed onboarding flow.
              </p>
              <div className="hero-actions">
                <button className="button button-primary" onClick={() => setRole("business")} type="button">
                  Use Business Flow
                </button>
                <Link className="button button-secondary" href="/contact">
                  Contact Team
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
