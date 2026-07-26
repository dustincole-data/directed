// src/components/components.test.ts
import { describe, expect, it } from "vitest";
import { armLabel, methodChip, modeBadge } from "../lib/labels";

describe("labels", () => {
  it("names arms in reader language, not internal letters alone", () => {
    expect(armLabel("A")).toBe("A · Claude default");
    expect(armLabel("B")).toBe("B · with a skill");
    expect(armLabel("C")).toBe("C · with a tool");
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
