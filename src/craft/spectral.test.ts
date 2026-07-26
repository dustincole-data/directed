import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { select } from "d3-selection";
import { spectralField, SPECTRAL_10 } from "./spectral";

function defsFixture() {
  const dom = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg"><defs></defs></svg>`);
  return select(dom.window.document.querySelector("defs") as Element);
}

describe("spectralField", () => {
  it("uses userSpaceOnUse so marks do not restart the ramp per bounding box", () => {
    const defs = defsFixture();
    spectralField(defs, { id: "field", x1: -320, x2: 320 });
    const g = defs.select("linearGradient");
    expect(g.attr("gradientUnits")).toBe("userSpaceOnUse");
    // objectBoundingBox is the SVG default and makes x1/x2 fractions of EACH
    // referencing element's box — which is the failure mode this avoids.
    expect(g.attr("gradientUnits")).not.toBe("objectBoundingBox");
  });

  it("anchors x1/x2 to absolute layout coordinates, not 0..1 fractions", () => {
    const defs = defsFixture();
    spectralField(defs, { id: "field", x1: -320, x2: 320 });
    const g = defs.select("linearGradient");
    expect(g.attr("x1")).toBe("-320");
    expect(g.attr("x2")).toBe("320");
  });

  it("ships the verified 10-stop ramp, evenly offset blue to red", () => {
    expect(SPECTRAL_10).toHaveLength(10);
    expect(SPECTRAL_10[0]).toBe("#2c7bb6");
    expect(SPECTRAL_10[9]).toBe("#d7191c");
    const defs = defsFixture();
    spectralField(defs, { id: "field", x1: 0, x2: 100 });
    const stops = defs.select("linearGradient").selectAll("stop");
    expect(stops.size()).toBe(10);
    const offsets = stops.nodes().map((n) => (n as Element).getAttribute("offset"));
    expect(offsets[0]).toBe("0%");
    expect(offsets[9]).toBe("100%");
  });

  it("returns a url() reference usable as a fill", () => {
    const defs = defsFixture();
    expect(spectralField(defs, { id: "field", x1: 0, x2: 100 })).toBe("url(#field)");
  });

  it("accepts a custom stop list", () => {
    const defs = defsFixture();
    spectralField(defs, { id: "f2", x1: 0, x2: 10, stops: ["#000000", "#ffffff"] });
    expect(defs.select("#f2").selectAll("stop").size()).toBe(2);
  });
});
