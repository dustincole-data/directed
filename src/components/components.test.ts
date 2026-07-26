// src/components/components.test.ts
import { describe, expect, it } from "vitest";
import { armLabel, methodChip, modeBadge } from "../lib/labels";

describe("labels", () => {
  it("names arms in reader language, not internal letters alone", () => {
    expect(armLabel("A", "default")).toBe("A · Claude default");
    expect(armLabel("B", "skill")).toBe("B · with a skill");
    expect(armLabel("C", "tool")).toBe("C · with a tool");
  });

  // src/rows.json declares 6 Arm C cells as skills and 5 Arm B cells as tools.
  // Deriving the caption from the arm letter captioned those cells with a method
  // they contradict — and this test used to pin that mapping with toBe.
  it("captions the method the cell actually records, not the one its letter implies", () => {
    expect(armLabel("C", "skill")).toBe("C · with a skill");
    expect(armLabel("B", "tool")).toBe("B · with a tool");
  });

  it("chips a skill method with its exact invocation", () => {
    expect(methodChip({ kind: "skill", name: "/impeccable typeset", args: "" }))
      .toBe("/impeccable typeset");
  });

  it("chips a default method without pretending a tool was used", () => {
    expect(methodChip({ kind: "default", name: "clean subagent", args: "" }))
      .toBe("clean subagent");
  });

  it("appends args when present", () => {
    expect(methodChip({ kind: "skill", name: "dataviz", args: "diverging" }))
      .toBe("dataviz (diverging)");
  });

  it("explains the mode rather than just naming it", () => {
    expect(modeBadge("refine")).toMatch(/on the default/i);
    expect(modeBadge("from-scratch")).toMatch(/independently/i);
  });
});
