import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminWorkspaceLink, WorkspaceNav } from "./workspace-nav";

describe("WorkspaceNav", () => {
  it("shows the admin control plane link for platform admins", () => {
    const markup = renderToStaticMarkup(<WorkspaceNav active="operations" platformAdmin />);

    expect(markup).toContain("Admin Control Plane");
    expect(markup).toContain("href=\"/admin\"");
    expect(markup).toContain("Operations");
  });

  it("hides the admin control plane link for non-admin users", () => {
    const markup = renderToStaticMarkup(<WorkspaceNav active="operations" platformAdmin={false} />);

    expect(markup).not.toContain("Admin Control Plane");
    expect(markup).not.toContain("href=\"/admin\"");
  });
});

describe("AdminWorkspaceLink", () => {
  it("renders the back-to-workspace link for the admin shell", () => {
    const markup = renderToStaticMarkup(<AdminWorkspaceLink />);

    expect(markup).toContain("Back to Workspace");
    expect(markup).toContain("href=\"/app\"");
  });
});
