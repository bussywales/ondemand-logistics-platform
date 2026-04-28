"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useBusinessAuth } from "./business-auth-provider";
import {
  type BrowserAuthSession,
  BrowserAuthTimeoutError,
  SupabaseBrowserAuthError,
  createBusinessOrg,
  fetchBusinessContext,
  signInWithPassword,
  signUpWithPassword
} from "../_lib/auth";
import { saveDriverProfile, type VehicleType } from "../_lib/product-state";
import { sanitizePostAuthDestination } from "../_lib/route-protection";

type Role = "business" | "driver" | "consumer";
type AuthMode = "create" | "signin";
type BusinessStep = "auth" | "setup";
type BusinessSetupPhase = "idle" | "creating" | "opening";

type AuthSession = BrowserAuthSession;

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
const BUSINESS_SETUP_MAX_ATTEMPTS = 3;
const BUSINESS_SETUP_RETRY_DELAY_MS = 800;

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

  if (issue instanceof BrowserAuthTimeoutError) {
    return {
      message:
        "The API is taking longer than usual to load the business context. Wait a few seconds and try again; if this repeats, check staging API health.",
      requiresCooldown: false
    };
  }

  return {
    message: issue instanceof Error ? issue.message : "Unable to complete business onboarding.",
    requiresCooldown: false
  };
}

function getFriendlyBusinessSetupError(issue: unknown) {
  if (issue instanceof Error) {
    const message = issue.message.toLowerCase();

    if (
      message.includes("request failed with status 500") ||
      message.includes("status 500") ||
      message.includes("internal server error")
    ) {
      return "The workspace could not be created on the first attempt. Try again in a moment. If the problem continues, sign out and restart onboarding.";
    }

    if (message.includes("networkerror") || message.includes("failed to fetch")) {
      return "The workspace request could not reach the API. Check the connection and try again.";
    }

    if (message.includes("timed out") && message.includes("/v1/business/context")) {
      return "The API is taking longer than usual to load the business context. Wait a few seconds and try again; if this repeats, check staging API health.";
    }

    if (message.includes("timed out")) {
      return "The API is taking longer than usual. Wait a few seconds and try again.";
    }
  }

  return issue instanceof Error ? issue.message : "Unable to complete business setup.";
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getFallbackDisplayName(email: string) {
  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return localPart && localPart.length >= 2 ? localPart : "Business Operator";
}

export function OnboardingFlow() {
  const router = useRouter();
  const { session: existingSession, hydrateSession } = useBusinessAuth();
  const [role, setRole] = useState<Role>("business");
  const [authMode, setAuthMode] = useState<AuthMode>("create");
  const [businessStep, setBusinessStep] = useState<BusinessStep>("auth");
  const [authForm, setAuthForm] = useState(authDefaults);
  const [businessSetupForm, setBusinessSetupForm] = useState(businessSetupDefaults);
  const [driverForm, setDriverForm] = useState(driverDefaults);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [businessSetupPhase, setBusinessSetupPhase] = useState<BusinessSetupPhase>("idle");
  const [signupCooldownSecondsLeft, setSignupCooldownSecondsLeft] = useState(0);
  const [authenticatedSession, setAuthenticatedSession] = useState<AuthSession | null>(null);
  const [postAuthDestination, setPostAuthDestination] = useState("/app");

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setPostAuthDestination(sanitizePostAuthDestination(params.get("next")));
  }, []);

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
        hydrateSession(authSession, context);
        router.push(postAuthDestination);
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
    setBusinessSetupPhase("creating");

    try {
      if (!businessSetupForm.businessName || !businessSetupForm.contactName || !businessSetupForm.phone || !businessSetupForm.city) {
        throw new Error("Complete the business setup fields before continuing.");
      }

      const payload = {
        businessName: businessSetupForm.businessName.trim(),
        contactName: businessSetupForm.contactName.trim(),
        email: authenticatedSession.email,
        phone: businessSetupForm.phone.trim(),
        city: businessSetupForm.city.trim()
      };

      let context = null as Awaited<ReturnType<typeof createBusinessOrg>> | null;
      let lastIssue: unknown = null;

      for (let attempt = 1; attempt <= BUSINESS_SETUP_MAX_ATTEMPTS; attempt += 1) {
        try {
          context = await createBusinessOrg(authenticatedSession.accessToken, payload);
          break;
        } catch (issue) {
          lastIssue = issue;

          try {
            const recoveredContext = await fetchBusinessContext(authenticatedSession.accessToken);
            if (recoveredContext.onboarded && recoveredContext.currentOrg) {
              context = recoveredContext;
              break;
            }
          } catch (contextIssue) {
            lastIssue = contextIssue;
          }

          if (attempt < BUSINESS_SETUP_MAX_ATTEMPTS) {
            await sleep(BUSINESS_SETUP_RETRY_DELAY_MS);
          }
        }
      }

      if (!context) {
        throw lastIssue ?? new Error("Unable to complete business setup.");
      }

      setBusinessSetupPhase("opening");
      hydrateSession(authenticatedSession, context);
      router.push(postAuthDestination);
    } catch (issue) {
      setError(getFriendlyBusinessSetupError(issue));
    } finally {
      setBusinessSetupPhase("idle");
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
            <h2>
              {role === "business" ? "Business onboarding" : role === "driver" ? "Driver onboarding" : "Current focus"}
            </h2>
            <p>{businessStep === "setup" && role === "business" ? "You’re one step away from going live." : roleSummary}</p>
            {role === "business" && businessStep === "setup" ? (
              <>
                <div className="operator-identity">
                  <span className="support-note">Operator identity</span>
                  <strong>{authenticatedSession?.email ?? authForm.email}</strong>
                </div>
                <div className="next-steps">
                  <span className="support-note">What happens next</span>
                  <ul className="stack-list compact-list">
                    <li>Create business workspace</li>
                    <li>Assign operator role</li>
                    <li>Open dashboard</li>
                  </ul>
                </div>
              </>
            ) : (
              <ul className="stack-list">
                <li>Step 1 authenticates the business operator with email and password.</li>
                <li>Step 2 creates the org and BUSINESS_OPERATOR membership through the API.</li>
                <li>The dashboard then reuses that real context for jobs, tracking, and payment reads.</li>
              </ul>
            )}
            {existingSession?.context.currentOrg ? (
              <div className="existing-session-callout">
                <strong>Existing session detected</strong>
                <p>{existingSession.context.currentOrg.name}</p>
                <Link className="button button-secondary" href={postAuthDestination}>
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
                    <h3>Confirm workspace details</h3>
                    <p>Enter the business details, then open operations.</p>
                  </div>
                </div>

                <div className="setup-form-shell">
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
                </div>

                {error ? <p className="form-error form-error-surface">{error}</p> : null}

                <div className="hero-actions setup-actions">
                  <button className="button button-primary button-emphasis" disabled={submitting} type="submit">
                    {businessSetupPhase === "opening"
                      ? "Opening dashboard..."
                      : submitting
                        ? "Creating workspace..."
                        : "Enter Dashboard"}
                  </button>
                  <button className="button button-secondary" disabled={submitting} onClick={() => resetBusinessFlow("signin")} type="button">
                    Back to Authentication
                  </button>
                </div>

                <p className="form-hint">
                  {businessSetupPhase === "opening"
                    ? "Workspace is ready. Loading the operations console now."
                    : submitting
                      ? "Setting up the workspace, assigning the operator role, and verifying the business context."
                      : "This uses the live onboarding API and opens the authenticated dashboard when complete."}
                </p>
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
