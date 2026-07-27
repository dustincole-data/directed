// src/pages/pages.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  getRegistry,
  allCells,
  findCell,
  diffAgainstBaseline,
  declaredNulls,
  type Registry,
} from "../lib/registry";

// A small hand-written registry, independent of anything on disk, so the
// helpers below are exercised against real fixture data rather than
// silently no-op'ing while zero cells have been generated (see
// task-12-brief.md's "two plan problems"). Two rows: one refine-mode row
// with an A/B pair (B ran on A and both differ structurally), one
// from-scratch row with only an A cell, to also prove allCells/findCell
// don't assume every row has more than one arm.
const synthetic: Registry = {
  built: "2026-01-01",
  families: [{ family: "test", rows: ["test-01-row", "test-02-row"] }],
  rows: [
    {
      id: "test-01-row",
      title: "Row One",
      family: "test",
      mode: "refine",
      fixture: "table12",
      premise: "font-family",
      phase: 1,
      gap: null,
      declaredArms: [
        { arm: "A", kind: "default", method: "clean subagent" },
        { arm: "B", kind: "skill", method: "/impeccable typeset" },
      ],
      cells: [
        {
          id: "test-01-row.A",
          arm: "A",
          method: { kind: "default", name: "clean subagent", args: "" },
          prompt: "Here is a dataset. Make a chart of it.",
          runs: 3,
          shipped: "median",
          generated: "2026-01-01",
          svg: "<svg><rect/><line/></svg>",
        },
        {
          id: "test-01-row.B",
          arm: "B",
          method: { kind: "skill", name: "/impeccable typeset", args: "", ranOn: "test-01-row.A" },
          prompt: "Run /impeccable typeset on this chart.",
          runs: 1,
          shipped: "only",
          generated: "2026-01-01",
          svg: "<svg><rect/><circle/><text/></svg>",
        },
      ],
    },
    {
      id: "test-02-row",
      title: "Row Two",
      family: "test",
      mode: "from-scratch",
      fixture: "hero8",
      premise: "element-composition",
      phase: 2,
      gap: null,
      declaredArms: [{ arm: "A", kind: "default", method: "clean subagent" }],
      cells: [
        {
          id: "test-02-row.A",
          arm: "A",
          method: { kind: "default", name: "clean subagent", args: "" },
          prompt: "Here is a different dataset. Make a chart of it.",
          runs: 3,
          shipped: "median",
          generated: "2026-01-01",
          svg: "<svg><path/></svg>",
        },
      ],
    },
  ],
};

describe("registry helpers — real registry invariants", () => {
  it("reads the built registry", () => {
    expect(getRegistry().rows.length).toBe(48);
  });

  it("flattens every generated cell with its row attached", () => {
    for (const { cell, row } of allCells()) {
      expect(cell.id.startsWith(row.id)).toBe(true);
    }
  });
});

describe("registry helpers — synthetic registry", () => {
  it("flattens a hand-built registry into cell/row pairs via the reg parameter", () => {
    const flat = allCells(synthetic);
    expect(flat.map(({ cell }) => cell.id)).toEqual([
      "test-01-row.A",
      "test-01-row.B",
      "test-02-row.A",
    ]);
    expect(flat.every(({ cell, row }) => cell.id.startsWith(row.id))).toBe(true);
  });

  it("finds a cell by composite id", () => {
    const found = findCell("test-01-row.B", synthetic);
    expect(found?.cell.id).toBe("test-01-row.B");
    expect(found?.row.id).toBe("test-01-row");
  });

  it("returns null when the id isn't in the registry", () => {
    expect(findCell("nope.A", synthetic)).toBeNull();
  });

  it("returns null diff for an arm A cell", () => {
    const row = synthetic.rows[0];
    const armA = row.cells.find((c) => c.arm === "A")!;
    expect(diffAgainstBaseline(armA, row)).toBeNull();
  });

  it("diffs a treated cell's SVG against its baseline, pinning exact added/removed tags", () => {
    const row = synthetic.rows[0];
    const armB = row.cells.find((c) => c.arm === "B")!;
    const diff = diffAgainstBaseline(armB, row);
    expect(diff).not.toBeNull();
    expect(diff!.added).toEqual(["circle", "text"]);
    expect(diff!.removed).toEqual(["line"]);
  });

  it("returns null diff when the row has no arm-A baseline to compare against", () => {
    const orphanRow: Registry["rows"][number] = { ...synthetic.rows[1], cells: [] };
    const treated = synthetic.rows[0].cells.find((c) => c.arm === "B")!;
    expect(diffAgainstBaseline(treated, orphanRow)).toBeNull();
  });

  it("collects no nulls from a registry that declares none", () => {
    expect(declaredNulls(synthetic)).toEqual([]);
  });

  it("collects a declared null with its row, method and reason attached", () => {
    const withNull = declare(synthetic, "test-01-row", "B", "the lever never moved");
    const found = declaredNulls(withNull);
    expect(found.map((n) => n.id)).toEqual(["test-01-row.B"]);
    expect(found[0].method).toBe("/impeccable typeset");
    expect(found[0].nullResult).toBe("the lever never moved");
    expect(found[0].row.title).toBe("Row One");
  });

  // A declaration with no generated cell has nothing published to disclose, and
  // /method links every entry to /cell/<id> — listing one would link to a page
  // getStaticPaths never builds.
  it("skips a declared null whose arm has not been generated", () => {
    const declared = declare(synthetic, "test-02-row", "B", "declared ahead of generation");
    expect(declaredNulls(declared)).toEqual([]);
  });
});

/** Copy of `reg` with a nullResult declared on one row's arm, for the tests above. */
function declare(reg: Registry, rowId: string, arm: "A" | "B" | "C", reason: string): Registry {
  return {
    ...reg,
    rows: reg.rows.map((row) =>
      row.id !== rowId
        ? row
        : {
            ...row,
            declaredArms: row.declaredArms.some((a) => a.arm === arm)
              ? row.declaredArms.map((a) => (a.arm === arm ? { ...a, nullResult: reason } : a))
              : [...row.declaredArms, { arm, kind: "skill" as const, method: "dataviz", nullResult: reason }],
          },
    ),
  };
}

// ---- /method -------------------------------------------------------------
//
// The page is Astro, so these read its source rather than its output: what they
// can prove is that the load-bearing disclosures are present and that the null
// list is derived rather than transcribed. The disclosure *text* is guaranteed
// by construction — it comes out of the registry, which check 12 re-derives
// against a live probe on every build.

const methodPage = readFileSync("src/pages/method.astro", "utf8");
const indexPage = readFileSync("src/pages/index.astro", "utf8");
const provenance = readFileSync("src/components/Provenance.astro", "utf8");
const swatch = readFileSync("src/components/Swatch.astro", "utf8");

describe("/method — the disclosures the gate depends on", () => {
  it("discloses that the baseline is not a stock Claude Code", () => {
    expect(methodPage).toMatch(/global <code>CLAUDE\.md/i);
    expect(methodPage).toMatch(/not a stock Claude Code/i);
    expect(methodPage).toMatch(/floor/i);
  });

  it("discloses the contract's library mention before lib-01-ceiling ships", () => {
    expect(methodPage).toContain("lib-01-ceiling");
    expect(methodPage).toMatch(/createElementNS/);
  });

  it("publishes the median rule as mechanical, and B/C as one run", () => {
    expect(methodPage).toMatch(/median total SVG element count/i);
    expect(methodPage).not.toMatch(/the median-looking result ships/i);
    expect(methodPage).toMatch(/exactly once/i);
  });

  it("lists the three permitted post-generation edits", () => {
    expect(methodPage).toMatch(/permitted/i);
    expect(methodPage).toMatch(/shared dataset import/i);
    expect(methodPage).toMatch(/mount point/i);
    expect(methodPage).toMatch(/hardcoded page background/i);
  });

  it("explains refine vs from-scratch, since the isolation depends on it", () => {
    expect(methodPage).toMatch(/from-scratch/);
    expect(methodPage).toMatch(/the lever <i>is<\/i> the generation decision/i);
  });

  it("discloses that Phase 2's prompts differ from Phase 1's", () => {
    expect(methodPage).toMatch(/Phase 1 \/ Phase 2/);
    expect(methodPage).toMatch(/byte-stable/i);
  });

  it("names the refuted claims so readers do not pick them up secondhand", () => {
    expect(methodPage).toMatch(/glow/i);
    expect(methodPage).toMatch(/three annotations/i);
    expect(methodPage).toMatch(/Illustrator/);
    expect(methodPage).toMatch(/not proof of falsehood/i);
  });

  it("publishes the gaps as gaps", () => {
    expect(methodPage).toMatch(/texture/i);
    expect(methodPage).toMatch(/legend-as-art/i);
  });

  it("states that this is not a benchmark", () => {
    expect(methodPage).toMatch(/No scores/i);
    expect(methodPage).toMatch(/No winner declared per row/i);
  });

  // The three cheap ways to make a null disappear. A page that omits them lets a
  // reader assume the nulls are all that was ever available to publish.
  it("names all three refused fixes, not just the two the README lists", () => {
    expect(methodPage).toMatch(/lever-forcing prompt/i);
    expect(methodPage).toMatch(/Relabelling <code>type-04-numerals/i);
    expect(methodPage).toMatch(/does not overplot/i);
    expect(methodPage).toMatch(/disjoint/i);
    expect(methodPage).toMatch(/Swapping the\s+fixture/i);
  });
});

describe("/method — the null-result list", () => {
  it("has nulls to publish at all, so the assertions below are not vacuous", () => {
    expect(declaredNulls().length).toBeGreaterThan(0);
  });

  it("derives the list from the registry rather than transcribing it", () => {
    expect(methodPage).toContain("declaredNulls");
    for (const n of declaredNulls()) {
      expect(methodPage, `hand-written cell id: ${n.id}`).not.toContain(n.id);
      expect(methodPage, `hand-copied disclosure: ${n.id}`).not.toContain(n.nullResult);
    }
  });

  it("links every published null to the cell page the site actually builds", () => {
    expect(methodPage).toContain("`/cell/${n.id}`");
    for (const n of declaredNulls()) {
      expect(findCell(n.id), `null with no generated cell: ${n.id}`).not.toBeNull();
    }
  });

  // The page claims every null so far is a named skill invoked with no brief,
  // and splits them by skill name. A seventh null from a tool arm, or from a
  // skill run with an explicit brief, makes that paragraph false.
  it("pins the page's claim that every null is a bare named-skill invocation", () => {
    for (const n of declaredNulls()) {
      expect(n.method, `not a bare skill invocation: ${n.id} ran "${n.method}"`).toMatch(
        /^(dataviz|\/impeccable)\b/,
      );
    }
  });

  it("is reachable from the gallery and from every 'Premise not engaged' banner", () => {
    expect(indexPage).toContain('href="/method"');
    expect(swatch).toContain('href="/method#nulls"');
    expect(provenance).toContain('href="/method#nulls"');
  });
});
