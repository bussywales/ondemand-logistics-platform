"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  SupabaseBrowserAuthError,
  createBusinessOrg,
  createBusinessSession,
  fetchBusinessContext,
  signInWithPassword,
  signUpWithPassword
} from "../_lib/auth";
import { readBusinessSession, saveBusinessSession, saveDriverProfile, type VehicleType } from "../_lib/product-state";

type Role = "business" | "driver" | "consumer";
type AuthMode = "create" | "signin";
type BusinessStep = "auth" | "setup";

type AuthSession = {
  accessToken: string;
  refreshToken: string | null;
  userId: string;
  email: string;
};

const authDefaults = {
  email: "",
  password: ""
};

const businessSetupDefaults = {
  businessName: "",
  contactName: "",
  phone: "",
  city: "London"
};

const driverDefaults = {
  name: "",
  phone: "",
  vehicleType: "BIKE" as VehicleType
};

const SIGNUP_RATE_LIMIT_COOLDOWN_SECONDS = 45;

function isSupabaseEmailRateLimitError(issue: unknown) {
  if (!(issue instanceof SupabaseBrowserAuthError)) {
    return false;
  }

  const message = issue.message.toLowerCase();
  const code = issue.code?.toLowerCase() ?? "";
  return (
    code.includes("rate_limit") ||
    code.includes("over_email_send_rate_limit") ||
    message.includes("email rate limit exceeded") ||
    (message.includes("rate limit") && message.includes("email"))
  );
}

function getFriendlyBusinessError(issue: unknown) {
  if (isSupabaseEmailRateLimitError(issue)) {
    return {
      message:
        "Too many signup emails were requested for this address. Wait a short while before trying again, use a different email, or switch to Sign in if the account already exists.",
      requiresCooldown: true
    };
  }

  return {
    message: issue instanceof Error ? issue.message : "Unable to complete business onboarding.",
    requiresCooldown: false
  };
}

function getFallbackDisplayName(email: string) {
  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return localPart && localPart.length >= 2 ? localPart : "Business Operator";
}

export function OnboardingFlow() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("business");
  const [authMode, setAuthMode] = useState<AuthMode>("create");
  const [businessStep, setBusinessStep] = useState<BusinessStep>("auth");
  const [authForm, setAuthForm] = useState(authDefaults);
  const [businessSetupForm, setBusinessSetupForm] = useState(businessSetupDefaults);
  const [driverForm, setDriverForm] = useState(driverDefaults);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingSession, setExistingSession] = useState<ReturnType<typeof readBusinessSession>>(null);
  const [signupCooldownSecondsLeft, setSignupCooldownSecondsLeft] = useState(0);
  const [authenticatedSession, setAuthenticatedSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setExistingSession(readBusinessSession());
  }, []);

  useEffect(() => {
    if (signupCooldownSecondsLeft <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSignupCooldownSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [signupCooldownSecondsLeft]);

  const roleSummary = useMemo(() => {
    if (role === "business") {
      return "Create a real business account, provision the org, and move straight into the authenticated dashboard.";
    }

    if (role === "driver") {
      return "Capture core driver details now, then continue into the staged driver setup handoff flow.";
    }

    return "Consumer flows are not the current priority. Use the business path for the real product activation flow.";
  }, [role]);

  async function handleBusinessAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authMode === "create" && signupCooldownSecondsLeft > 0) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (!authForm.email || !authForm.password) {
        throw new Error("Enter the email and password for the business operator account.");
      }

      const authSession = authMode === "create"
        ? await signUpWithPassword({
            email: authForm.email.trim(),
            password: authForm.password,
            displayName: getFallbackDisplayName(authForm.email.trim())
          })
        : await signInWithPassword({
            email: authForm.email.trim(),
            password: authForm.password
          });

      const context = await fetchBusinessContext(authSession.accessToken);
      if (context.onboarded) {
        saveBusinessSession(
          createBusinessSession({
            accessToken: authSession.accessToken,
            refreshToken: authSession.refreshToken,
            context
          })
        );
        router.push("/app");
        return;
      }

      setAuthenticatedSession(authSession);
      setBusinessStep("setup");
      setBusinessSetupForm((current) => ({
        ...current,
        contactName: current.contactName || context.displayName || "",
        city: current.city || "London"
      }));
    } catch (issue) {
      const friendlyError = getFriendlyBusinessError(issue);
      setError(friendlyError.message);
      if (friendlyError.requiresCooldown && authMode === "create") {
        setSignupCooldownSecondsLeft(SIGNUP_RATE_LIMIT_COOLDOWN_SECONDS);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBusinessSetupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authenticatedSession) {
      setBusinessStep("auth");
      setError("Sign in or create the operator account before setting up the business.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (!businessSetupForm.businessName || !businessSetupForm.contactName || !businessSetupForm.phone || !businessSetupForm.city) {
        throw new Error("Complete the business setup fields before continuing.");
      }

      const context = await createBusinessOrg(authenticatedSession.accessToken, {
        businessName: businessSetupForm.businessName.trim(),
        contactName: businessSetupForm.contactName.trim(),
        email: authenticatedSession.email,
        phone: businessSetupForm.phone.trim(),
        city: businessSetupForm.city.trim()
      });

      saveBusinessSession(
        createBusinessSession({
          accessToken: authenticatedSession.accessToken,
          refreshToken: authenticatedSession.refreshToken,
          context
        })
      );
      router.push("/app");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to complete business setup.");
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

  function resetBusinessFlow(nextMode?: AuthMode) {
    setBusinessStep("auth");
    setAuthenticatedSession(null);
    setError(null);
    if (nextMode) {
      setAuthMode(nextMode);
    }
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
              <li>Step 1 authenticates the business operator with email and password.</li>
              <li>Step 2 creates the org and BUSINESS_OPERATOR membership through the API.</li>
              <li>The dashboard then reuses that real context for jobs, tracking, and payment reads.</li>
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
            businessStep === "auth" ? (
              <form className="form-card" onSubmit={handleBusinessAuthSubmit}>
                <div className="onboarding-step-header">
                  <span className="step-pill">Step 1 of 2</span>
                  <div>
                    <h3>Authenticate operator</h3>
                    <p>Use email and password first. Business setup happens next.</p>
                  </div>
                </div>

                <div className="mode-switch auth-mode-switch">
                  <button className={`mode-chip ${authMode === "create" ? "mode-chip-active" : ""}`} onClick={() => setAuthMode("create")} type="button">
                    Create account
                  </button>
                  <button className={`mode-chip ${authMode === "signin" ? "mode-chip-active" : ""}`} onClick={() => setAuthMode("signin")} type="button">
                    Sign in
                  </button>
                </div>

                <div className="form-grid-two">
                  <label>
                    <span>Email</span>
                    <input
                      name="email"
                      onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="ops@shipwright.local"
                      type="email"
                      value={authForm.email}
                    />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      name="password"
                      onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder={authMode === "create" ? "Choose a password" : "Enter your password"}
                      type="password"
                      value={authForm.password}
                    />
                  </label>
                </div>

                <p className="support-note">
                  {authMode === "create"
                    ? "Create the operator login first. Once that succeeds, you will add the business details in the next step."
                    : "Sign in with the existing operator account. If the business is not set up yet, the next step will collect the org details."}
                </p>

                <div className="auth-helper-row">
                  <span className="support-note">
                    {authMode === "create"
                      ? "Already created the account or hit an email limit?"
                      : "Need to create a new business account instead?"}
                  </span>
                  <button
                    className="text-action"
                    onClick={() => {
                      setAuthMode((current) => (current === "create" ? "signin" : "create"));
                      setError(null);
                    }}
                    type="button"
                  >
                    {authMode === "create" ? "Switch to Sign in" : "Switch to Create account"}
                  </button>
                </div>

                {authMode === "create" && signupCooldownSecondsLeft > 0 ? (
                  <p className="form-hint">
                    Signup is temporarily paused for {signupCooldownSecondsLeft}s to avoid repeated rate-limited requests. You can still switch to Sign in now.
                  </p>
                ) : null}

                {error ? <p className="form-error">{error}</p> : null}

                <div className="hero-actions">
                  <button
                    className="button button-primary"
                    disabled={submitting || (authMode === "create" && signupCooldownSecondsLeft > 0)}
                    type="submit"
                  >
                    {submitting
                      ? "Checking account..."
                      : authMode === "create" && signupCooldownSecondsLeft > 0
                        ? `Try again in ${signupCooldownSecondsLeft}s`
                        : "Continue to Business Setup"}
                  </button>
                  <Link className="button button-secondary" href="/demo">
                    View Demo Flow
                  </Link>
                </div>
              </form>
            ) : (
              <form className="form-card" onSubmit={handleBusinessSetupSubmit}>
                <div className="onboarding-step-header">
                  <span className="step-pill">Step 2 of 2</span>
                  <div>
                    <h3>Set up business</h3>
                    <p>Finish the business profile, then create the org and operator membership.</p>
                  </div>
                </div>

                <div className="inline-details">
                  <span className="support-note">Authenticated operator</span>
                  <strong>{authenticatedSession?.email ?? authForm.email}</strong>
                </div>

                <label>
                  <span>Business name</span>
                  <input
                    name="businessName"
                    onChange={(event) => setBusinessSetupForm((current) => ({ ...current, businessName: event.target.value }))}
                    placeholder="ShipWright Retail Ops"
                    value={businessSetupForm.businessName}
                  />
                </label>
                <label>
                  <span>Contact name</span>
                  <input
                    name="contactName"
                    onChange={(event) => setBusinessSetupForm((current) => ({ ...current, contactName: event.target.value }))}
                    placeholder="Olubusayo Adewale"
                    value={businessSetupForm.contactName}
                  />
                </label>
                <div className="form-grid-two">
                  <label>
                    <span>Phone</span>
                    <input
                      name="phone"
                      onChange={(event) => setBusinessSetupForm((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="+44 20 7946 0958"
                      value={businessSetupForm.phone}
                    />
                  </label>
                  <label>
                    <span>Operating city</span>
                    <input
                      name="city"
                      onChange={(event) => setBusinessSetupForm((current) => ({ ...current, city: event.target.value }))}
                      placeholder="London"
                      value={businessSetupForm.city}
                    />
                  </label>
                </div>

                <p className="support-note">
                  This step calls the live onboarding API to create the business org and attach the signed-in user as the BUSINESS_OPERATOR.
                </p>

                {error ? <p className="form-error">{error}</p> : null}

                <div className="hero-actions">
                  <button className="button button-primary" disabled={submitting} type="submit">
                    {submitting ? "Creating business..." : "Create Business and Open Dashboard"}
                  </button>
                  <button className="button button-secondary" onClick={() => resetBusinessFlow("signin")} type="button">
                    Back to Authentication
                  </button>
                </div>
              </form>
            )
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
