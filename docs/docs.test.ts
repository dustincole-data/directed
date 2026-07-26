// docs/docs.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const factory = readFileSync("docs/factory.md", "utf8");
const method = readFileSync("docs/method-draft.md", "utf8");
const contract = readFileSync("cells/_contract.md", "utf8");

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

  // factory.md claims its contract block is "reproduced verbatim from
  // cells/_contract.md". It wasn't: it changed the meta signature and dropped
  // three constraints, including the byte-stability requirement the integrity
  // gate's re-render check depends on. Pin every line of the contract that
  // matters instead of trusting the claim.
  it("reproduces cells/_contract.md's module shape and constraints verbatim", () => {
    const signature = contract
      .split("\n")
      .filter((l) => l.startsWith("export "))
      .map((l) => l.trim());
    const constraints = contract
      .split("\n")
      .filter((l) => l.startsWith("- ") || l.startsWith("  and ") || l.startsWith("  `"))
      .map((l) => l.trimEnd());
    expect(signature.length).toBe(2);
    expect(constraints.length).toBeGreaterThanOrEqual(4);
    for (const line of [...signature, ...constraints]) expect(factory).toContain(line);
  });

  it("states the mechanical median rule, not a look-alike judgement call", () => {
    expect(factory).toMatch(/median total SVG element count/i);
    expect(factory).not.toMatch(/keep the median-looking/i);
  });

  it("documents how a cell imports a craft helper, with the .ts extension", () => {
    expect(factory).toContain('from "../../../src/craft/index.ts"');
    expect(factory).toMatch(/ERR_MODULE_NOT_FOUND/);
  });

  it("says rows.json outranks --row-title/--family and gives the row-id regex", () => {
    expect(factory).toContain("^[a-z]+-\\d{2}-[a-z0-9-]+$");
    expect(factory).toMatch(/rows\.json`?\s+is\s+the\s+authority/);
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

  it("publishes the median rule as mechanical, since /method is what readers see", () => {
    expect(method).toMatch(/median total SVG element count/i);
    expect(method).not.toMatch(/the median-looking result ships/i);
  });

  it("discloses that Phase 2's prompts differ from Phase 1's", () => {
    expect(method).toMatch(/Phase 1 \/ Phase 2 prompt difference/i);
    expect(method).toMatch(/byte-stable/i);
  });
});
