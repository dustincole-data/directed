import { describe, expect, it } from "vitest";
import { ROWS, FAMILIES, rowsForPhase, getRow } from "./rows";
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
});
