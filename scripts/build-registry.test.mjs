import { describe, expect, it, beforeAll } from "vitest";
import { buildRegistry } from "./build-registry.mjs";

let reg;
beforeAll(async () => { reg = await buildRegistry(); });

describe("buildRegistry", () => {
  it("includes every declared row, generated or not", () => {
    expect(reg.rows).toHaveLength(48);
  });

  it("groups rows under 12 families in declaration order", () => {
    expect(reg.families).toHaveLength(12);
    expect(reg.families[0].family).toBe("type");
  });

  it("inlines each generated cell's frozen SVG", () => {
    const withCells = reg.rows.filter((r) => r.cells.length > 0);
    for (const r of withCells) {
      for (const c of r.cells) expect(c.svg.startsWith("<svg")).toBe(true);
    }
  });

  it("orders cells A, B, C", () => {
    for (const r of reg.rows) {
      const arms = r.cells.map((c) => c.arm);
      expect(arms).toEqual([...arms].sort());
    }
  });

  it("carries the gap reason through for gap rows", () => {
    const glow = reg.rows.find((r) => r.id === "mark-04-glow");
    expect(glow.gap).toMatch(/verification/i);
  });

  it("never emits a cell whose prompt is missing", () => {
    for (const r of reg.rows) for (const c of r.cells) expect(c.prompt.length).toBeGreaterThan(0);
  });
});
