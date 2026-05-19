import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DemoRequestFeedback, DemoRequestForm } from "./demo-request-form";

describe("DemoRequestForm", () => {
  it("renders real capture copy and honeypot field", () => {
    const html = renderToStaticMarkup(<DemoRequestForm />);

    expect(html).toContain("Submit demo request");
    expect(html).toContain("Email fallback");
    expect(html).toContain("Requests are recorded for admin review");
    expect(html).toContain("name=\"website\"");
  });

  it("renders success and error feedback states", () => {
    const success = renderToStaticMarkup(<DemoRequestFeedback status="success" />);
    expect(success).toContain("Thanks");
    expect(success).toContain("your request has been recorded");

    const error = renderToStaticMarkup(<DemoRequestFeedback error="Capture failed." status="error" />);
    expect(error).toContain("Capture failed.");
  });
});
