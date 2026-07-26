// docs/docs.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const factory = readFileSync("docs/factory.md", "utf8");
const method = readFileSync("docs/method-draft.md", "utf8");

describe("factory runbook", () => {
  it("gives a verbatim prompt template for each arm", () => {
    for (const h of ["## Arm A", "## Arm B", "## Arm C"]) expect(factory).toContain(h);
  });
  it("states the three-run rule for arm A and one-run for B/C", () => {
    expect(factory).toMatch(/three runs/i);
    expect(factory).toMatch(/exactly once/i);
  });
  it("requires the skill be invoked explicitly by name", () => {
    expect(factory).toMatch(/explicitly by name/i);
  });
  it("embeds the cell contract so every arm gets the same one", () => {
    expect(factory).toContain("export function render(svg, data)");
  });
});

describe("method draft", () => {
  it("discloses the global CLAUDE.md contamination of the baseline", () => {
    expect(method).toMatch(/global CLAUDE\.md/i);
    expect(method).toMatch(/not a stock/i);
  });
  it("lists the permitted post-generation edits", () => {
    expect(method).toMatch(/permitted/i);
  });
  it("names the refuted claims so readers do not pick them up secondhand", () => {
    expect(method).toMatch(/glow/i);
    expect(method).toMatch(/three annotations/i);
  });
});
