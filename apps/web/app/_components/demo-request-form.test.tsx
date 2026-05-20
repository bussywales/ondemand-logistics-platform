import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { normalizeDemoRequestInterest } from "../_lib/demo-request-interest";
import { DemoRequestFeedback, DemoRequestForm } from "./demo-request-form";

describe("DemoRequestForm", () => {
  it("renders real capture copy and honeypot field", () => {
    const html = renderToStaticMarkup(<DemoRequestForm />);

    expect(html).toContain("Submit demo request");
    expect(html).toContain("Email fallback");
    expect(html).toContain("Requests are recorded for admin review");
    expect(html).toContain("name=\"website\"");
  });

  it("preselects the requested interest type", () => {
    const html = renderToStaticMarkup(<DemoRequestForm defaultInterestType="OPERATOR_PLATFORM" />);

    expect(html).toContain('<option value="OPERATOR_PLATFORM" selected="">Operator/platform</option>');
  });

  it("normalizes pricing CTA interest query values", () => {
    expect(normalizeDemoRequestInterest("pilot")).toBe("PILOT_MERCHANT");
    expect(normalizeDemoRequestInterest("operator")).toBe("OPERATOR_PLATFORM");
    expect(normalizeDemoRequestInterest("investor")).toBe("INVESTOR_PARTNER");
    expect(normalizeDemoRequestInterest("unknown")).toBe("PILOT_MERCHANT");
  });

  it("renders success and error feedback states", () => {
    const success = renderToStaticMarkup(<DemoRequestFeedback status="success" />);
    expect(success).toContain("Thanks");
    expect(success).toContain("your request has been recorded");

    const error = renderToStaticMarkup(<DemoRequestFeedback error="Capture failed." status="error" />);
    expect(error).toContain("Capture failed.");
  });
});
