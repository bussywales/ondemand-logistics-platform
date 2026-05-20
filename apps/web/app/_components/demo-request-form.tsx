"use client";

import Link from "next/link";
import React from "react";
import { useState, type FormEvent } from "react";
import { createDemoRequest, getUserFacingApiError } from "../_lib/api";
import type { DemoRequestInterestType } from "../_lib/product-state";

const INTEREST_OPTIONS: Array<{ label: string; value: DemoRequestInterestType }> = [
  { label: "Pilot merchant", value: "PILOT_MERCHANT" },
  { label: "Operator/platform", value: "OPERATOR_PLATFORM" },
  { label: "Investor/partner", value: "INVESTOR_PARTNER" },
  { label: "Other", value: "OTHER" }
];

const MAILTO_FALLBACK = "mailto:hello@shipwright.local?subject=ShipWright%20controlled%20pilot%20request";

export function DemoRequestFeedback(props: { status: "success" | "error"; error?: string | null }) {
  if (props.status === "success") {
    return (
      <p className="demo-request-status demo-request-status-success" role="status">
        Thanks — your request has been recorded. We will review it before any controlled pilot or walkthrough is scheduled.
      </p>
    );
  }

  return (
    <p className="demo-request-status demo-request-status-error" role="alert">
      {props.error ?? "Demo request capture is unavailable. Use the email fallback and we will follow up manually."}
    </p>
  );
}

export function DemoRequestForm(props: { defaultInterestType?: DemoRequestInterestType } = {}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const defaultInterestType = props.defaultInterestType ?? "PILOT_MERCHANT";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("submitting");
    setError(null);

    try {
      await createDemoRequest({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        organisation: String(data.get("organisation") ?? "") || null,
        role: String(data.get("role") ?? "") || null,
        interestType: String(data.get("interestType") ?? "OTHER") as DemoRequestInterestType,
        message: String(data.get("message") ?? "") || null,
        source: "landing_page",
        website: String(data.get("website") ?? "")
      });

      form.reset();
      setStatus("success");
    } catch (issue) {
      setStatus("error");
      setError(getUserFacingApiError(issue, "Demo request capture is unavailable. Use the email fallback and we will follow up manually."));
    }
  }

  return (
    <form className="demo-request-form" aria-describedby="demo-request-note" onSubmit={(event) => void handleSubmit(event)}>
      <div className="demo-request-field-grid">
        <label>
          <span>Name</span>
          <input name="name" placeholder="Your name" required type="text" />
        </label>
        <label>
          <span>Email</span>
          <input name="email" placeholder="you@example.com" required type="email" />
        </label>
        <label>
          <span>Organisation</span>
          <input name="organisation" placeholder="Restaurant, retailer, fund, or operator" type="text" />
        </label>
        <label>
          <span>Role</span>
          <input name="role" placeholder="Founder, operator, investor, manager" type="text" />
        </label>
      </div>
      <label>
        <span>Interest type</span>
        <select name="interestType" defaultValue={defaultInterestType}>
          {INTEREST_OPTIONS.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Message</span>
        <textarea
          name="message"
          placeholder="Tell us what you want to see: restaurant pilot, operator workflow, investor walkthrough, or platform oversight."
          rows={5}
        />
      </label>
      <label className="demo-request-honeypot" aria-hidden="true">
        <span>Website</span>
        <input autoComplete="off" name="website" tabIndex={-1} type="text" />
      </label>
      <p className="demo-request-note" id="demo-request-note">
        Requests are recorded for admin review. Do not enter sensitive operational or payment data. Email remains available as a fallback if capture fails.
      </p>
      {status === "success" ? (
        <DemoRequestFeedback status="success" />
      ) : null}
      {status === "error" ? (
        <DemoRequestFeedback error={error} status="error" />
      ) : null}
      <div className="demo-request-actions">
        <button className="button button-primary landing-button-primary" disabled={status === "submitting"} type="submit">
          {status === "submitting" ? "Recording request..." : "Submit demo request"}
        </button>
        <a className="button button-secondary landing-button-secondary" href={MAILTO_FALLBACK}>
          Email fallback
        </a>
        <Link className="button button-secondary landing-button-secondary" href="/demo/investor">
          View investor walkthrough
        </Link>
      </div>
    </form>
  );
}
