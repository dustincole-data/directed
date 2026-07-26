// src/pages/pages.test.ts
import { describe, expect, it } from "vitest";
import {
  getRegistry,
  allCells,
  findCell,
  diffAgainstBaseline,
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
});
