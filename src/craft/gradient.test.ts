import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { select } from "d3-selection";
import { perDatumRadialGradient } from "./gradient";

function defsFixture() {
  const dom = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg"><defs></defs></svg>`);
  return select(dom.window.document.querySelector("defs") as Element);
}

const DATA = [
  { label: "Earth", color: "#2c7bb6" },
  { label: "Mars", color: "#c1440e" },
];

describe("perDatumRadialGradient", () => {
  it("creates one gradient per datum, not one shared gradient", () => {
    const defs = defsFixture();
    perDatumRadialGradient(defs, DATA, { idPrefix: "g", color: (d) => d.color });
    expect(defs.selectAll("radialGradient").size()).toBe(2);
  });

  it("derives each gradient id from the datum so fills are distinct", () => {
    const defs = defsFixture();
    const fill = perDatumRadialGradient(defs, DATA, { idPrefix: "g", color: (d) => d.color });
    expect(fill(DATA[0], 0)).toBe("url(#g-0)");
    expect(fill(DATA[1], 1)).toBe("url(#g-1)");
    expect(fill(DATA[0], 0)).not.toBe(fill(DATA[1], 1));
  });

  it("places the highlight OFF-CENTRE — this is what reads as a sphere", () => {
    const defs = defsFixture();
    perDatumRadialGradient(defs, DATA, { idPrefix: "g", color: (d) => d.color });
    const g = defs.select("radialGradient");
    expect(g.attr("cx")).toBe("35%");
    expect(g.attr("cy")).toBe("35%");
    expect(g.attr("r")).toBe("60%");
    // A centred 50/50/50 gradient renders a symmetric bullseye, not a lit form.
    expect(g.attr("cx")).not.toBe("50%");
  });

  it("builds three stops brightened/darkened from that datum's own colour", () => {
    const defs = defsFixture();
    perDatumRadialGradient(defs, DATA, { idPrefix: "g", color: (d) => d.color });
    const stops = defs.select("radialGradient").selectAll("stop");
    expect(stops.size()).toBe(3);
    const offsets = stops.nodes().map((n) => (n as Element).getAttribute("offset"));
    expect(offsets).toEqual(["0%", "50%", "100%"]);
    const colors = stops.nodes().map((n) => (n as Element).getAttribute("stop-color"));
    expect(new Set(colors).size).toBe(3);
    expect(colors[1]!.toLowerCase()).toContain("44, 123, 182"); // mid stop is the datum colour
  });

  it("honours overridden geometry", () => {
    const defs = defsFixture();
    perDatumRadialGradient(defs, DATA, {
      idPrefix: "g", color: (d) => d.color, cx: "25%", cy: "25%", r: "65%",
    });
    expect(defs.select("radialGradient").attr("cx")).toBe("25%");
    expect(defs.select("radialGradient").attr("r")).toBe("65%");
  });
});
