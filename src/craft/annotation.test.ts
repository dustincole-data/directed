import { describe, expect, it } from "vitest";
import { placeAnnotations } from "./annotation";

const BOX = { width: 600, height: 400 };

describe("placeAnnotations", () => {
  it("places a label adjacent with no leader when there is room", () => {
    const [p] = placeAnnotations([{ x: 300, y: 200, text: "peak", markRadius: 6 }], BOX);
    expect(p.leader).toBeNull();
    const dist = Math.hypot(p.x - 300, p.y - 200);
    expect(dist).toBeLessThan(40);
  });

  it("flips the label inward instead of overflowing the right edge", () => {
    const [p] = placeAnnotations([{ x: 592, y: 200, text: "edge case", markRadius: 4 }], BOX);
    expect(p.x).toBeLessThanOrEqual(BOX.width);
    expect(p.anchor).toBe("end");
  });

  it("adds a leader only for the label that could not sit adjacent", () => {
    const placed = placeAnnotations([
      { x: 300, y: 200, text: "first" },
      { x: 302, y: 202, text: "second collides" },
    ], BOX);
    expect(placed.filter((p) => p.leader === null)).toHaveLength(1);
    expect(placed.filter((p) => p.leader !== null)).toHaveLength(1);
  });

  it("keeps leaders short", () => {
    const placed = placeAnnotations([
      { x: 300, y: 200, text: "first" },
      { x: 302, y: 202, text: "second collides" },
    ], { ...BOX, gap: 10 });
    for (const p of placed) {
      if (!p.leader) continue;
      const len = Math.hypot(p.leader.x2 - p.leader.x1, p.leader.y2 - p.leader.y1);
      expect(len).toBeLessThanOrEqual(40);
    }
  });

  it("never returns two labels at the same position", () => {
    const placed = placeAnnotations(
      Array.from({ length: 5 }, (_, i) => ({ x: 300 + i, y: 200, text: `n${i}` })),
      BOX,
    );
    const keys = placed.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("returns labels in input order", () => {
    const placed = placeAnnotations([
      { x: 100, y: 100, text: "a" },
      { x: 400, y: 300, text: "b" },
    ], BOX);
    expect(placed.map((p) => p.text)).toEqual(["a", "b"]);
  });
});
