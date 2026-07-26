import { describe, expect, it } from "vitest";
import { loadFixture } from "./index";

describe("fixtures", () => {
  it.each(["table12", "hero8", "cycle12"] as const)("%s carries provenance", (name) => {
    const f = loadFixture(name);
    expect(f.source).toMatch(/^https?:\/\/|^derived:/);
    expect(f.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(f.unit.length).toBeGreaterThan(0);
  });

  it("table12 has 12 rows and a real diverging baseline", () => {
    const f = loadFixture("table12");
    expect(f.rows).toHaveLength(12);
    const deltas = f.rows.map((r: any) => r.delta);
    expect(deltas.some((d) => d > 0)).toBe(true);
    expect(deltas.some((d) => d < 0)).toBe(true);
  });

  it("table12 delta equals value minus baseline for every row", () => {
    const f = loadFixture("table12");
    for (const r of f.rows as any[]) {
      expect(r.delta).toBeCloseTo(r.value - f.baseline, 6);
    }
  });

  it("hero8 has 8 rows with distinct labels and colors", () => {
    const f = loadFixture("hero8");
    expect(f.rows).toHaveLength(8);
    const labels = new Set(f.rows.map((r: any) => r.label));
    expect(labels.size).toBe(8);
    for (const r of f.rows as any[]) expect(r.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("cycle12 is periodic: first and last are adjacent in value", () => {
    const f = loadFixture("cycle12");
    expect(f.rows).toHaveLength(12);
    const vals = f.rows.map((r: any) => r.value);
    const wrapGap = Math.abs(vals[0] - vals[11]);
    const maxGap = Math.max(...vals) - Math.min(...vals);
    expect(wrapGap).toBeLessThan(maxGap);
  });

  it("no fixture contains a fabricated placeholder", () => {
    for (const name of ["table12", "hero8", "cycle12"] as const) {
      const raw = JSON.stringify(loadFixture(name));
      expect(raw).not.toMatch(/TBD|TODO|lorem|example\.com|0\.12345/i);
    }
  });
});
