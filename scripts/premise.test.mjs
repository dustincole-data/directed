import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { probeSvg, PROBES } from "./premise.mjs";

// Each probe extracts, from a render.svg, exactly the dimension its row claims
// to demonstrate — and nothing else. The property that matters is *insensitivity*:
// a probe must return an unchanged value when a cell changes things the row
// isn't about, so that "the treated arm's probe equals the baseline's" means
// "the lever was never pulled" rather than "nothing at all changed".

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">${body}</svg>`;

describe("probeSvg mark-geometry", () => {
  it("is unchanged when only colour and stroke-width move", () => {
    // The mark-07-overlap.B shape verbatim: same circle positions, radii and
    // fill-opacity as the baseline, recoloured with a heavier stroke.
    const a = svg('<circle cx="374.6" cy="210" r="34" fill="#b07d52" fill-opacity="0.92" stroke="#0b0f19" stroke-width="1.5"/>');
    const b = svg('<circle cx="374.6" cy="210" r="34" fill="#d55181" fill-opacity="0.92" stroke="#0b0f19" stroke-width="2"/>');
    expect(probeSvg("mark-geometry", b)).toBe(probeSvg("mark-geometry", a));
  });

  it("changes when fill-opacity moves", () => {
    const a = svg('<circle cx="10" cy="10" r="5" fill-opacity="0.92"/>');
    const b = svg('<circle cx="10" cy="10" r="5" fill-opacity="0.45"/>');
    expect(probeSvg("mark-geometry", b)).not.toBe(probeSvg("mark-geometry", a));
  });

  it("changes when marks are jittered", () => {
    const a = svg('<circle cx="10" cy="10" r="5"/>');
    const b = svg('<circle cx="12" cy="9" r="5"/>');
    expect(probeSvg("mark-geometry", b)).not.toBe(probeSvg("mark-geometry", a));
  });

  it("changes when mark draw order changes", () => {
    // Ordering is one of mark-07-overlap's three stated levers, so the probe
    // must be order-sensitive — a sorted set of marks would miss it.
    const a = svg('<circle cx="10" cy="10" r="5"/><circle cx="20" cy="10" r="9"/>');
    const b = svg('<circle cx="20" cy="10" r="9"/><circle cx="10" cy="10" r="5"/>');
    expect(probeSvg("mark-geometry", b)).not.toBe(probeSvg("mark-geometry", a));
  });

  it("ignores text, so relabelling alone does not read as engagement", () => {
    const a = svg('<circle cx="10" cy="10" r="5"/><text x="1" y="2">Mercury</text>');
    const b = svg('<circle cx="10" cy="10" r="5"/>');
    expect(probeSvg("mark-geometry", b)).toBe(probeSvg("mark-geometry", a));
  });
});

describe("probeSvg numeric-text", () => {
  it("changes when rounding changes", () => {
    const a = svg("<text>73.48</text>");
    const b = svg("<text>73.5</text>");
    expect(probeSvg("numeric-text", b)).not.toBe(probeSvg("numeric-text", a));
  });

  it("changes when a unit is added", () => {
    const a = svg("<text>73.48</text>");
    const b = svg("<text>73.48 years</text>");
    expect(probeSvg("numeric-text", b)).not.toBe(probeSvg("numeric-text", a));
  });

  it("changes when a thousands separator is introduced", () => {
    const a = svg("<text>142984</text>");
    const b = svg("<text>142,984</text>");
    expect(probeSvg("numeric-text", b)).not.toBe(probeSvg("numeric-text", a));
  });

  it("is unchanged when numeric labels are merely deleted", () => {
    // The type-04-numerals failure mode, written as a test: that arm cut 24
    // numeric annotations to 2 and never touched formatting. A probe that
    // responded to the count would score the deletion as engagement.
    const a = svg("<text>73.48</text><text>72.23</text><text>71.81</text>");
    const b = svg("<text>73.48</text>");
    expect(probeSvg("numeric-text", b)).toBe(probeSvg("numeric-text", a));
  });

  it("is unchanged when the values differ but the format does not", () => {
    // Every arm renders the same fixture, so a value difference here means a
    // re-sort or a relabel — not a units-and-rounding decision.
    const a = svg("<text>73.48</text>");
    const b = svg("<text>81.92</text>");
    expect(probeSvg("numeric-text", b)).toBe(probeSvg("numeric-text", a));
  });

  it("ignores non-numeric copy, so a headline rewrite is not a numbers change", () => {
    const a = svg("<text>Life expectancy at birth</text><text>73.48</text>");
    const b = svg("<text>Japan leads the world by nine years</text><text>73.48</text>");
    expect(probeSvg("numeric-text", b)).toBe(probeSvg("numeric-text", a));
  });

  it("ignores position, colour and font on the numeric text", () => {
    const a = svg('<text x="1" y="2" fill="#111" font-size="9">73.48</text>');
    const b = svg('<text x="90" y="40" fill="#c00" font-size="14">73.48</text>');
    expect(probeSvg("numeric-text", b)).toBe(probeSvg("numeric-text", a));
  });
});

describe("probeSvg color", () => {
  it("changes when a palette is replaced", () => {
    const a = svg('<rect fill="#b07d52"/><rect fill="#c9b47a"/>');
    const b = svg('<rect fill="#d55181"/><rect fill="#008300"/>');
    expect(probeSvg("color", b)).not.toBe(probeSvg("color", a));
  });

  it("is unchanged when only geometry moves", () => {
    const a = svg('<rect x="0" width="10" fill="#b07d52"/>');
    const b = svg('<rect x="40" width="90" fill="#b07d52"/>');
    expect(probeSvg("color", b)).toBe(probeSvg("color", a));
  });

  it("sees a colour swapped between two marks as a change", () => {
    // color-06-accent is "which mark carries the accent", so a probe that
    // collapsed to an unordered set of hues would call a swap unchanged.
    const a = svg('<rect fill="#b07d52"/><rect fill="#c9b47a"/>');
    const b = svg('<rect fill="#c9b47a"/><rect fill="#b07d52"/>');
    expect(probeSvg("color", b)).not.toBe(probeSvg("color", a));
  });

  it("reads a colour set in a style attribute, not only a presentation attribute", () => {
    const a = svg('<rect fill="#b07d52"/>');
    const b = svg('<rect style="fill:#d55181"/>');
    expect(probeSvg("color", b)).not.toBe(probeSvg("color", a));
  });
});

describe("probeSvg font-family", () => {
  it("changes when a font stack is swapped", () => {
    const a = svg('<text font-family="Helvetica, Arial, sans-serif">x</text>');
    const b = svg('<text font-family="Georgia, serif">x</text>');
    expect(probeSvg("font-family", b)).not.toBe(probeSvg("font-family", a));
  });

  it("is unchanged when only the words change", () => {
    const a = svg('<text font-family="Helvetica, Arial, sans-serif">Nigeria</text>');
    const b = svg('<text font-family="Helvetica, Arial, sans-serif">Japan</text>');
    expect(probeSvg("font-family", b)).toBe(probeSvg("font-family", a));
  });
});

describe("probeSvg font-size", () => {
  it("changes when the size tiers collapse", () => {
    const a = svg('<text font-size="9">a</text><text font-size="9.5">b</text><text font-size="15">c</text>');
    const b = svg('<text font-size="9">a</text><text font-size="11">b</text><text font-size="17">c</text>');
    expect(probeSvg("font-size", b)).not.toBe(probeSvg("font-size", a));
  });

  it("is unchanged when the same tiers are reused on more elements", () => {
    // type-02-scale is about the *tier set*, not how many labels use each tier,
    // so adding a label at an existing size is not engagement with the premise.
    const a = svg('<text font-size="9">a</text><text font-size="15">c</text>');
    const b = svg('<text font-size="9">a</text><text font-size="9">b</text><text font-size="15">c</text>');
    expect(probeSvg("font-size", b)).toBe(probeSvg("font-size", a));
  });
});

describe("probeSvg numeric-format", () => {
  it("is unchanged when annotations are merely deleted", () => {
    // type-04-numerals.B verbatim: it cut 24 numeric annotations to 2 without
    // ever touching numeral formatting. Deleting labels must not read as
    // engagement with a tabular-vs-proportional-figures premise.
    const a = svg('<text font-family="Helvetica, Arial, sans-serif">54.63</text><text font-family="Helvetica, Arial, sans-serif">71.2</text>');
    const b = svg('<text font-family="Helvetica, Arial, sans-serif">54.63</text>');
    expect(probeSvg("numeric-format", b)).toBe(probeSvg("numeric-format", a));
  });

  it("changes when tabular figures are switched on", () => {
    const a = svg('<text font-family="Helvetica, Arial, sans-serif">54.63</text>');
    const b = svg('<text font-family="Helvetica, Arial, sans-serif" font-variant-numeric="tabular-nums">54.63</text>');
    expect(probeSvg("numeric-format", b)).not.toBe(probeSvg("numeric-format", a));
  });

  it("changes when numerals move to a monospace stack", () => {
    const a = svg('<text font-family="Helvetica, Arial, sans-serif">54.63</text>');
    const b = svg('<text font-family="ui-monospace, SFMono-Regular, monospace">54.63</text>');
    expect(probeSvg("numeric-format", b)).not.toBe(probeSvg("numeric-format", a));
  });

  it("ignores text that carries no digits", () => {
    const a = svg('<text font-family="Helvetica">54.63</text><text font-family="Helvetica">Nigeria</text>');
    const b = svg('<text font-family="Helvetica">54.63</text><text font-family="Georgia">Nigeria</text>');
    expect(probeSvg("numeric-format", b)).toBe(probeSvg("numeric-format", a));
  });
});

describe("probeSvg gradient", () => {
  it("changes when gradient parameters are re-specified", () => {
    // mark-02-gradient's real situation: the baseline already shipped per-datum
    // gradients, so the lever is the parameters, not the presence of a gradient.
    const a = svg('<defs><radialGradient id="p0" cx="38%" cy="32%" r="72%"><stop offset="0" stop-color="#fff"/></radialGradient></defs>');
    const b = svg('<defs><radialGradient id="p0" cx="35%" cy="35%" r="60%"><stop offset="0" stop-color="#fff"/></radialGradient></defs>');
    expect(probeSvg("gradient", b)).not.toBe(probeSvg("gradient", a));
  });

  it("changes when a flat fill becomes a gradient", () => {
    const a = svg("<defs></defs>");
    const b = svg('<defs><radialGradient id="p0" cx="35%" cy="35%" r="60%"/></defs>');
    expect(probeSvg("gradient", b)).not.toBe(probeSvg("gradient", a));
  });

  it("changes when the stop ramp is rewritten at identical geometry", () => {
    const a = svg('<defs><linearGradient id="f" x1="0" x2="460"><stop offset="0" stop-color="#2166ac"/></linearGradient></defs>');
    const b = svg('<defs><linearGradient id="f" x1="0" x2="460"><stop offset="0" stop-color="#b2182b"/></linearGradient></defs>');
    expect(probeSvg("gradient", b)).not.toBe(probeSvg("gradient", a));
  });

  it("is unchanged when only the marks referencing the gradient move", () => {
    const g = '<defs><radialGradient id="p0" cx="35%" cy="35%" r="60%"/></defs>';
    const a = svg(`${g}<circle cx="10" cy="10" r="5" fill="url(#p0)"/>`);
    const b = svg(`${g}<circle cx="90" cy="40" r="5" fill="url(#p0)"/>`);
    expect(probeSvg("gradient", b)).toBe(probeSvg("gradient", a));
  });
});

describe("probeSvg element-composition", () => {
  it("changes when construction strategy changes", () => {
    const a = svg('<circle cx="1" cy="1" r="1"/><circle cx="2" cy="2" r="1"/>');
    const b = svg('<g><clipPath id="c"><rect/></clipPath><circle cx="1" cy="1" r="1"/></g>');
    expect(probeSvg("element-composition", b)).not.toBe(probeSvg("element-composition", a));
  });

  it("is unchanged when the same elements are merely recoloured", () => {
    const a = svg('<circle fill="#b07d52"/><circle fill="#c9b47a"/>');
    const b = svg('<circle fill="#d55181"/><circle fill="#008300"/>');
    expect(probeSvg("element-composition", b)).toBe(probeSvg("element-composition", a));
  });
});

describe("PROBES registry", () => {
  it("rejects an unknown probe kind rather than silently passing a row", () => {
    expect(() => probeSvg("vibes", svg(""))).toThrow(/unknown premise probe/i);
  });

  it("declares a probe for every premise named in src/rows.json", () => {
    const rows = JSON.parse(readFileSync("src/rows.json", "utf8"));
    const named = [...new Set(rows.map((r) => r.premise).filter(Boolean))];
    expect(named.length).toBeGreaterThan(0);
    for (const kind of named) expect(Object.keys(PROBES)).toContain(kind);
  });
});
