import React, { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChipparLanding } from "./chippar-landing";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useState: vi.fn(), useRef: vi.fn() };
});

type ElementProps = {
  children?: React.ReactNode;
  onClick?: () => void;
};

function findAction(
  node: React.ReactNode,
  label: string,
): (() => void) | undefined {
  if (!React.isValidElement<ElementProps>(node)) return;
  const children = React.Children.toArray(node.props.children);
  if (node.type === "button" && children.includes(label))
    return node.props.onClick;
  for (const child of children) {
    const action = findAction(child, label);
    if (action) return action;
  }
}

describe("Chippar inspector's actual event handler", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  function renderAtStage(stage: number) {
    const selectStage = vi.fn();
    const showModal = vi.fn();
    vi.mocked(useState).mockReturnValueOnce([stage, selectStage]);
    vi.mocked(useState).mockReturnValueOnce([false, vi.fn()]);
    vi.mocked(useRef).mockReturnValue({ current: { showModal } });
    return { tree: ChipparLanding(), selectStage, showModal };
  }

  it("Back to dispatch selects dispatch and does not open the proof tour", () => {
    const { tree, selectStage, showModal } = renderAtStage(3);
    const action = findAction(tree, "Back to dispatch");
    expect(action).toBeTypeOf("function");
    action!();
    expect(selectStage).toHaveBeenCalledExactlyOnceWith(1);
    expect(showModal).not.toHaveBeenCalled();
  });

  it("the dispatch review action still opens the current tour without changing stage", () => {
    vi.stubGlobal("document", { activeElement: null });
    vi.stubGlobal("HTMLElement", class {});
    const { tree, selectStage, showModal } = renderAtStage(1);
    const action = findAction(tree, "Review delivery");
    expect(action).toBeTypeOf("function");
    action!();
    expect(showModal).toHaveBeenCalledOnce();
    expect(selectStage).not.toHaveBeenCalled();
  });
});
