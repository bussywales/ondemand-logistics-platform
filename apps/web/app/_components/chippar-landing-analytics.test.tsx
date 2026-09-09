import React, { useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsLink } from "./analytics-link";
import { ChipparLanding } from "./chippar-landing";
import { trackAnalyticsEvent } from "../_lib/analytics";

vi.mock("../_lib/analytics", () => ({ trackAnalyticsEvent: vi.fn() }));
vi.mock("./public-analytics-page-view", () => ({
  PublicAnalyticsPageView: () => null,
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: vi.fn(actual.useState),
    useRef: vi.fn(actual.useRef),
  };
});

type LinkProps = React.ComponentProps<typeof AnalyticsLink>;
function collect(node: React.ReactNode): React.ReactElement<LinkProps>[] {
  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return [];
  return [
    ...(node.type === AnalyticsLink
      ? [node as React.ReactElement<LinkProps>]
      : []),
    ...React.Children.toArray(node.props.children).flatMap(collect),
  ];
}

function renderLanding(menuOpen = true) {
  vi.mocked(useState).mockReturnValueOnce([1, vi.fn()]);
  vi.mocked(useState).mockReturnValueOnce([menuOpen, vi.fn()]);
  for (let index = 0; index < 4; index++)
    vi.mocked(useRef).mockReturnValueOnce({ current: null });
  return ChipparLanding();
}

const conversions = [
  ["landing_navigation", "Pilot programme", "/demo/request?interest=pilot"],
  ["landing_navigation", "Book a walkthrough", "/demo/request"],
  [
    "landing_mobile_navigation",
    "Pilot programme",
    "/demo/request?interest=pilot",
  ],
  ["landing_mobile_navigation", "Book a walkthrough", "/demo/request"],
  ["landing_hero", "Book a walkthrough", "/demo/request"],
  ["landing_footer", "Explore the pilot", "/pricing"],
  ["landing_tour", "Book a walkthrough", "/demo/request"],
] as const;

describe("Chippar conversion analytics", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(conversions)(
    "%s / %s emits one unchanged-contract CTA event",
    (source, label, href) => {
      const links = collect(renderLanding());
      const matching = links.filter(
        (link) =>
          link.props.analyticsSource === source &&
          link.props.analyticsLabel === label,
      );
      expect(matching).toHaveLength(1);
      const element = AnalyticsLink(matching[0].props);
      expect(element.props.href).toBe(href);
      expect(element.props.prefetch).toBe(false);
      // Exercise the real shared click handler, not a mocked AnalyticsLink.
      const event = { preventDefault: vi.fn(), defaultPrevented: false };
      element.props.onClick(
        event as unknown as React.MouseEvent<HTMLAnchorElement>,
      );
      expect(trackAnalyticsEvent).toHaveBeenCalledExactlyOnceWith({
        eventName: "CTA_CLICKED",
        metadata: { label, source },
      });
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    },
  );

  it("tracks only the seven conversion placements, not section links, login or demo controls", () => {
    const tree = renderLanding();
    expect(
      collect(tree).map(({ props }) => [
        props.analyticsSource,
        props.analyticsLabel,
        props.href,
      ]),
    ).toEqual(conversions);
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "renders unchanged anchor content/classes and mobile structure, menu=%s, without network",
    (menuOpen) => {
      const fetch = vi.fn(() => {
        throw new Error("No network allowed");
      });
      vi.stubGlobal("fetch", fetch);
      const tree = renderLanding(menuOpen);
      // Compare the same tree's anchors after stripping only the AnalyticsLink wrapper.
      function plainAnchors(node: React.ReactNode): React.ReactNode {
        if (!React.isValidElement<{ children?: React.ReactNode }>(node))
          return node;
        const children = React.Children.map(node.props.children, plainAnchors);
        if (node.type === AnalyticsLink) {
          const {
            analyticsLabel: _label,
            analyticsSource: _source,
            prefetch: _prefetch,
            href,
            ...props
          } = (node as React.ReactElement<LinkProps>).props;
          return (
            <a {...props} href={href as string}>
              {children}
            </a>
          );
        }
        return React.cloneElement(node, undefined, children);
      }
      expect(renderToStaticMarkup(tree)).toBe(
        renderToStaticMarkup(plainAnchors(tree)),
      );
      expect(fetch).not.toHaveBeenCalled();
      expect(trackAnalyticsEvent).not.toHaveBeenCalled();
      expect(collect(tree)).toHaveLength(menuOpen ? 7 : 5);
    },
  );
});
