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
    const lines: string[] = contract.split("\n");
    const signature = lines.filter((l) => l.startsWith("export ")).map((l) => l.trim());
    const constraints = lines
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

  // The runbook is what the next generation session reads. A row with no
  // `premise` now blocks its own treated cells at the gate, so a runbook that
  // doesn't say so sends that session into an avoidable failure.
  it("requires a row to declare a premise probe before its treated cells are generated", () => {
    expect(factory).toMatch(/premise/i);
    expect(factory).toContain("scripts/premise.mjs");
    expect(factory).toMatch(/check 12/i);
  });

  // A check-12 failure has one honest resolution and two destructive ones. The
  // runbook is what the next generation session reads when it hits that failure
  // at 2am; if it only says "the lever didn't move", the cheap fixes are to
  // delete the cell or add "…and fix the overplotting" to the prompt.
  it("tells a blocked session to declare the null result, not to force the lever", () => {
    expect(factory).toContain("nullResult");
    expect(factory).toMatch(/lever-forcing prompt/i);
    expect(factory).toMatch(/relabel/i);
    expect(factory).toMatch(/both\s*\*?\*?ways/i);
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

  // /method is what a reader sees. Three Phase 1 cells are published under a
  // row title whose lever they never pulled; a methodology page that omits
  // them lets the gallery's strongest claim — "the difference is exact and
  // independently verifiable" — cover cells where there is no difference.
  it("names the cells whose stated premise was never engaged", () => {
    expect(method).toMatch(/premise/i);
    for (const cell of ["mark-07-overlap.B", "mark-07-overlap.C", "type-04-numerals.B"]) {
      expect(method, `undisclosed null-result cell: ${cell}`).toContain(cell);
    }
  });

  // The gate could have been cleared by deleting those three cells or by
  // regenerating them under prompts that name the lever. Both were rejected;
  // a reader can only weigh the gallery's claim if the page says so.
  it("records that the three null results ship labelled, and what was rejected", () => {
    expect(method).toMatch(/premise not engaged/i);
    expect(method).toMatch(/lever-forcing prompt/i);
    expect(method).toMatch(/relabelling/i);
  });

  // mark-07-overlap's nulls are not a verdict on the two skills: the chart they
  // were handed has no overlapping marks. Publishing the row without that fact
  // would read as "two named skills both failed at overplotting".
  it("discloses that mark-07-overlap's baseline does not actually overplot", () => {
    expect(method).toMatch(/does not overplot/i);
    expect(method).toMatch(/disjoint/i);
  });
});
