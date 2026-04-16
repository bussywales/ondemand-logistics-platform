"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { readBusinessProfile, readDriverProfile, saveBusinessProfile, saveDriverProfile, type VehicleType } from "../_lib/product-state";

type Role = "business" | "driver" | "consumer";

const businessDefaults = {
  businessName: "",
  contactName: "",
  email: "",
  phone: "",
  operatingCity: "London",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api-staging-qvmv.onrender.com",
  authToken: "",
  orgId: "",
  consumerId: ""
};

const driverDefaults = {
  name: "",
  phone: "",
  vehicleType: "BIKE" as VehicleType
};

export function OnboardingFlow() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("business");
  const [businessForm, setBusinessForm] = useState(() => readBusinessProfile() ?? businessDefaults);
  const [driverForm, setDriverForm] = useState(() => readDriverProfile() ?? driverDefaults);
  const [error, setError] = useState<string | null>(null);

  const roleSummary = useMemo(() => {
    if (role === "business") {
      return "Create an operating profile, then move straight into the dashboard shell and delivery workflow.";
    }

    if (role === "driver") {
      return "Capture core driver details now, then continue into the driver setup handoff flow.";
    }

    return "Consumer flows are not the current priority. Use business onboarding to test the platform end-to-end.";
  }, [role]);

  function handleBusinessSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!businessForm.businessName || !businessForm.contactName || !businessForm.email || !businessForm.phone) {
      setError("Complete the required business fields before continuing.");
      return;
    }

    saveBusinessProfile(businessForm);
    router.push("/app");
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
            Start with the role you need right now. Business onboarding is wired into a working delivery dashboard, while driver setup is staged for the next connected step.
          </p>
        </div>

        <div className="onboarding-role-grid">
          <button
            className={`role-card ${role === "business" ? "role-card-active" : ""}`}
            onClick={() => setRole("business")}
            type="button"
          >
            <span className="role-card-eyebrow">Primary</span>
            <strong>Business</strong>
            <span>Create an org profile, move into dashboard setup, and start creating deliveries.</span>
          </button>
          <button
            className={`role-card ${role === "driver" ? "role-card-active" : ""}`}
            onClick={() => setRole("driver")}
            type="button"
          >
            <span className="role-card-eyebrow">Supply</span>
            <strong>Driver</strong>
            <span>Capture core details now and continue into the staged driver setup handoff.</span>
          </button>
          <button
            className={`role-card role-card-muted ${role === "consumer" ? "role-card-active" : ""}`}
            onClick={() => setRole("consumer")}
            type="button"
          >
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
              <li>No production auth wall yet.</li>
              <li>Business mode can run staged or connect to live backend APIs.</li>
              <li>Driver and consumer flows stay intentionally lightweight for now.</li>
            </ul>
          </div>

          {role === "business" ? (
            <form className="form-card" onSubmit={handleBusinessSubmit}>
              <label>
                <span>Business name</span>
                <input
                  name="businessName"
                  onChange={(event) => setBusinessForm((current) => ({ ...current, businessName: event.target.value }))}
                  placeholder="ShipWright Retail Ops"
                  value={businessForm.businessName}
                />
              </label>
              <label>
                <span>Contact name</span>
                <input
                  name="contactName"
                  onChange={(event) => setBusinessForm((current) => ({ ...current, contactName: event.target.value }))}
                  placeholder="Olubusayo Adewale"
                  value={businessForm.contactName}
                />
              </label>
              <div className="form-grid-two">
                <label>
                  <span>Email</span>
                  <input
                    name="email"
                    onChange={(event) => setBusinessForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="ops@shipwright.local"
                    type="email"
                    value={businessForm.email}
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input
                    name="phone"
                    onChange={(event) => setBusinessForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="+44 20 7946 0958"
                    value={businessForm.phone}
                  />
                </label>
              </div>
              <label>
                <span>Operating city</span>
                <input
                  name="operatingCity"
                  onChange={(event) => setBusinessForm((current) => ({ ...current, operatingCity: event.target.value }))}
                  placeholder="London"
                  value={businessForm.operatingCity}
                />
              </label>
              <details className="inline-details">
                <summary>Connect live staging APIs</summary>
                <p>
                  Leave these blank to use staged local mode. Add the staging bearer token and IDs when you want the dashboard to call the real quote, job, tracking, and payment endpoints.
                </p>
                <label>
                  <span>API base URL</span>
                  <input
                    name="apiBaseUrl"
                    onChange={(event) => setBusinessForm((current) => ({ ...current, apiBaseUrl: event.target.value }))}
                    placeholder="https://api-staging-qvmv.onrender.com"
                    value={businessForm.apiBaseUrl}
                  />
                </label>
                <label>
                  <span>Bearer token</span>
                  <textarea
                    name="authToken"
                    onChange={(event) => setBusinessForm((current) => ({ ...current, authToken: event.target.value }))}
                    placeholder="Paste the staging business token from the auth fixture harness"
                    rows={4}
                    value={businessForm.authToken}
                  />
                </label>
                <div className="form-grid-two">
                  <label>
                    <span>Org ID</span>
                    <input
                      name="orgId"
                      onChange={(event) => setBusinessForm((current) => ({ ...current, orgId: event.target.value }))}
                      placeholder="Optional for consumer-style jobs"
                      value={businessForm.orgId}
                    />
                  </label>
                  <label>
                    <span>Consumer ID</span>
                    <input
                      name="consumerId"
                      onChange={(event) => setBusinessForm((current) => ({ ...current, consumerId: event.target.value }))}
                      placeholder="Required for live job creation"
                      value={businessForm.consumerId}
                    />
                  </label>
                </div>
              </details>
              {error ? <p className="form-error">{error}</p> : null}
              <div className="hero-actions">
                <button className="button button-primary" type="submit">
                  Continue to Dashboard
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
                <input
                  name="name"
                  onChange={(event) => setDriverForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Alex Rider"
                  value={driverForm.name}
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  name="phone"
                  onChange={(event) => setDriverForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="+44 20 7946 0958"
                  value={driverForm.phone}
                />
              </label>
              <label>
                <span>Vehicle type</span>
                <select
                  name="vehicleType"
                  onChange={(event) => setDriverForm((current) => ({ ...current, vehicleType: event.target.value as VehicleType }))}
                  value={driverForm.vehicleType}
                >
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
                The current MVP is built around business-owned food delivery and local retail logistics. Use the business path to test quote, job, tracking, and payment behaviour now.
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
