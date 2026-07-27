import { describe, expect, it } from "vitest";
import { ROWS, FAMILIES, rowsForPhase, getRow } from "./rows";
import type { ArmDecl } from "./rows";
import { FIXTURE_NAMES } from "./fixtures";

describe("rows", () => {
  it("declares 48 rows across 12 families", () => {
    expect(ROWS).toHaveLength(48);
    expect(FAMILIES).toHaveLength(12);
  });

  it("declares 107 cells in total", () => {
    const cells = ROWS.reduce((n, r) => n + r.arms.length, 0);
    expect(cells).toBe(107);
  });

  it("phase 1 is exactly the 9 gate rows / 24 cells", () => {
    const p1 = rowsForPhase(1);
    expect(p1.map((r) => r.id).sort()).toEqual([
      "color-01-categorical", "color-03-diverging", "color-06-accent",
      "mark-01-glyph", "mark-02-gradient", "mark-07-overlap",
      "type-01-typeface", "type-02-scale", "type-04-numerals",
    ]);
    expect(p1.reduce((n, r) => n + r.arms.length, 0)).toBe(24);
  });

  it("every row id is unique and kebab-cased with a family prefix", () => {
    const ids = ROWS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of ROWS) {
      expect(r.id).toMatch(/^[a-z]+-\d{2}-[a-z0-9-]+$/);
      expect(r.id.startsWith(r.family + "-")).toBe(true);
    }
  });

  it("every row names a real fixture", () => {
    for (const r of ROWS) expect(FIXTURE_NAMES).toContain(r.fixture);
  });

  it("arm A is always the default arm and comes first", () => {
    for (const r of ROWS) {
      expect(r.arms[0].arm).toBe("A");
      expect(r.arms[0].kind).toBe("default");
    }
  });

  it("every non-A arm names a concrete method, never empty", () => {
    for (const r of ROWS) {
      for (const a of r.arms.filter((x) => x.arm !== "A")) {
        expect(a.method.trim().length, `${r.id}.${a.arm}`).toBeGreaterThan(0);
      }
    }
  });

  it("gap rows have only arm A plus a stated reason", () => {
    const gaps = ROWS.filter((r) => r.gap);
    expect(gaps.map((r) => r.id)).toContain("mark-04-glow");
    const glow = getRow("mark-04-glow");
    expect(glow.arms).toHaveLength(1);
    expect(glow.gap!.length).toBeGreaterThan(20);
  });

  // A `nullResult` is the only way a treated cell gets past the premise probe,
  // so the set of arms carrying one is pinned here rather than left to drift: a
  // fourth appearing is a claim about the gallery, not a refactor.
  it("pins exactly which arms shipped without moving their lever", () => {
    // Deliberately a hard-coded list. A new entry is a claim about the gallery
    // — "another named skill left another row's lever untouched" — and should
    // fail here so it gets stated on /method, not absorbed as a refactor.
    // The three Phase 2 additions: num-01-units.B (dataviz replaced the palette
    // and the mark geometry but wrote every number exactly as the baseline
    // did), axis-03-grid.B (/impeccable distill cut twelve annotations and
    // touched no gridline), and medium-02-theme.B (/impeccable adapt made the
    // chart fluid-width and changed no colour).
    const declared = ROWS.flatMap((r) =>
      r.arms.filter((a) => a.nullResult).map((a) => `${r.id}.${a.arm}`),
    );
    expect(declared.sort()).toEqual([
      "axis-03-grid.B",
      "mark-07-overlap.B",
      "mark-07-overlap.C",
      "medium-02-theme.B",
      "num-01-units.B",
      "type-04-numerals.B",
    ]);
  });

  it("every null result sits on a treated arm and states a reason", () => {
    for (const r of ROWS) {
      for (const a of r.arms) {
        if (!a.nullResult) continue;
        expect(a.arm, `${r.id}.${a.arm}`).not.toBe("A");
        expect(a.nullResult.trim().length, `${r.id}.${a.arm}`).toBeGreaterThan(40);
      }
    }
  });

  it("a row whose arm declares a null result also declares the probe that proves it", () => {
    for (const r of ROWS) {
      if (!r.arms.some((a) => a.nullResult)) continue;
      expect(r.premise, `${r.id} declares a null result but no premise probe`).toBeTruthy();
    }
  });

  it("the shared arm-A object is frozen, so mutating one row's arms[0] cannot corrupt another row's", () => {
    const before = ROWS[0].arms[0].method;
    expect(ROWS[1].arms[0].method).toBe(before); // same shared reference, sanity check

    try {
      (ROWS[0].arms[0] as { method: string }).method = "MUTATED";
    } catch {
      // strict-mode ESM: assigning to a frozen object throws — that's fine, either way nothing changes below
    }

    expect(ROWS[0].arms[0].method).toBe(before);
    expect(ROWS[1].arms[0].method).toBe(before);
    expect(ROWS[1].arms[0].method).not.toBe("MUTATED");

    // The `arms` array container itself must also be frozen — not just its
    // elements — so length- and order-changing mutations can't silently
    // succeed (push growing it, splice shortening/reordering it, sort/reverse
    // reordering it). Assert the observable consequences, not Object.isFrozen,
    // and confirm a row-0 mutation attempt never touches row 1's arms.
    //
    // `RowDecl["arms"]` is `readonly`, which stops these calls at compile time.
    // That is a different guarantee from the one under test here: the callers
    // that matter are the untyped `.mjs` pipeline scripts and any JS consumer,
    // for whom the type is not enforcement at all. Widening back to a mutable
    // array is what lets this test make the call such a caller really can.
    const mutable = (arms: readonly ArmDecl[]) => arms as ArmDecl[];
    const row0ArmsBefore = ROWS[0].arms.map((a) => a.arm);
    const row1Length = ROWS[1].arms.length;
    const row1ArmsBefore = ROWS[1].arms.map((a) => a.arm);

    try {
      mutable(ROWS[0].arms).push({ arm: "C", kind: "tool", method: "INJECTED" });
    } catch {
      // frozen arrays throw on push in strict mode — fine either way, checked below
    }
    expect(ROWS[0].arms.length).toBe(row0ArmsBefore.length);
    expect(ROWS[0].arms.map((a) => a.arm)).toEqual(row0ArmsBefore);

    try {
      mutable(ROWS[0].arms).splice(0, 1);
    } catch {
      // frozen arrays throw on splice in strict mode — fine either way, checked below
    }
    expect(ROWS[0].arms.length).toBe(row0ArmsBefore.length);
    expect(ROWS[0].arms.map((a) => a.arm)).toEqual(row0ArmsBefore);

    try {
      mutable(ROWS[0].arms).sort((a, b) => (a.arm < b.arm ? 1 : -1));
    } catch {
      // frozen arrays throw on sort in strict mode — fine either way, checked below
    }
    expect(ROWS[0].arms.map((a) => a.arm)).toEqual(row0ArmsBefore);

    try {
      mutable(ROWS[0].arms).reverse();
    } catch {
      // frozen arrays throw on reverse in strict mode — fine either way, checked below
    }
    expect(ROWS[0].arms.map((a) => a.arm)).toEqual(row0ArmsBefore);

    // None of the above touched row 1's arms array.
    expect(ROWS[1].arms.length).toBe(row1Length);
    expect(ROWS[1].arms.map((a) => a.arm)).toEqual(row1ArmsBefore);
  });
});
