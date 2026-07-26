import { JSDOM } from "jsdom";

/**
 * Premise probes — the machine-checkable half of "did this cell test what its
 * row claims to test".
 *
 * Phase 1 shipped 3 treated cells (of 15) whose stated lever was never pulled:
 * `mark-07-overlap.B`/`.C` recoloured and relabelled while leaving every
 * circle's position and opacity byte-identical to the baseline, and
 * `type-04-numerals.B` deleted annotations without ever touching numeral
 * formatting. Every one passed the gate, because every gate check asked
 * "is this cell well-formed and honestly provenanced?" and none asked
 * "is this cell *about* what the row says it is about?".
 *
 * A probe answers that second question by reducing a render.svg to just the
 * dimension its row demonstrates. The gate then compares a treated arm's probe
 * value against its baseline's: equal means the lever never moved.
 *
 * The design constraint that makes this honest is *insensitivity*, not
 * sensitivity. Any probe that responds to incidental change would pass
 * `mark-07-overlap.B` on its recolour alone, which is precisely the failure
 * being closed. Each probe below therefore reads a deliberately narrow slice
 * and is tested for what it must ignore as much as for what it must catch.
 *
 * A probe is evidence of engagement, never of quality: it can prove a lever was
 * pulled, and can never prove it was pulled well. That judgement stays human.
 */

const MARK_TAGS = new Set(["circle", "rect", "path", "line", "polygon", "polyline", "ellipse"]);
const GRADIENT_TAGS = new Set(["linearGradient", "radialGradient"]);
const TEXT_TAGS = new Set(["text", "tspan"]);

// Geometry and opacity: what "overplotting: opacity, jitter, ordering" is made
// of. Deliberately excludes fill, stroke and stroke-width — a recolour is not
// an overplotting fix.
const GEOMETRY_ATTRS = [
  "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height",
  "x1", "y1", "x2", "y2", "d", "points", "transform",
  "opacity", "fill-opacity", "stroke-opacity",
];

const COLOR_PROPS = ["fill", "stroke", "stop-color"];

// The two real routes to tabular figures, plus the family that would carry a
// monospace figure stack. Omitting font-feature-settings would report a genuine
// `font-feature-settings: "tnum"` engagement as a null result.
const NUMERAL_PROPS = ["font-variant-numeric", "font-feature-settings", "font-family"];

let parser;
function parse(svgText) {
  parser ??= new JSDOM("<!doctype html><html><body></body></html>").window.DOMParser;
  const doc = new parser().parseFromString(svgText, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.getElementsByTagName("parsererror").length || root.nodeName === "parsererror") {
    throw new Error("premise probe: render.svg is not parseable XML");
  }
  return root;
}

/** Every element in document order, root included. */
function walk(el, out = []) {
  out.push(el);
  for (const child of el.children) walk(child, out);
  return out;
}

/**
 * Resolve a presentation property the way a renderer does: a `style` declaration
 * wins over the same-named presentation attribute. Without this, a cell that
 * moved its palette into `style` would read as having changed nothing.
 */
function prop(el, name) {
  const style = el.getAttribute("style");
  if (style) {
    for (const decl of style.split(";")) {
      const i = decl.indexOf(":");
      if (i > 0 && decl.slice(0, i).trim() === name) return decl.slice(i + 1).trim();
    }
  }
  return el.getAttribute(name);
}

/** Sorted, de-duplicated — for probes about *which values are in play*. */
const sortedSet = (values) => [...new Set(values.filter((v) => v != null))].sort().join("\n");

export const PROBES = {
  /**
   * Position, size and opacity of every mark, in draw order. Order-sensitive
   * because draw order *is* one of the levers (what occludes what).
   */
  "mark-geometry": (root) =>
    walk(root)
      .filter((el) => MARK_TAGS.has(el.localName))
      .map((el) => `${el.localName}:${GEOMETRY_ATTRS.map((a) => `${a}=${prop(el, a) ?? ""}`).join(",")}`)
      .join("\n"),

  /**
   * Every colour, in document order. Ordered rather than a set: "which mark
   * carries the accent" is the whole subject of color-06-accent, so swapping
   * two hues between marks has to register as a change.
   */
  color: (root) =>
    walk(root)
      .flatMap((el) => COLOR_PROPS.map((p) => prop(el, p)))
      .filter(Boolean)
      .join("\n"),

  /** Which font stacks are in play. */
  "font-family": (root) => sortedSet(walk(root).map((el) => prop(el, "font-family"))),

  /**
   * The set of size tiers — not their frequency. Adding another label at an
   * existing size is not a change to the type scale.
   */
  "font-size": (root) => sortedSet(walk(root).map((el) => prop(el, "font-size"))),

  /**
   * How digit-bearing text is formatted. Restricted to text that actually
   * contains digits, and reduced to a set, so that *deleting* numeric
   * annotations — type-04-numerals.B's real edit — cannot read as engagement
   * with a tabular-vs-proportional-figures premise.
   */
  "numeric-format": (root) =>
    sortedSet(
      walk(root)
        .filter((el) => TEXT_TAGS.has(el.localName) && /\d/.test(el.textContent ?? ""))
        .map((el) => NUMERAL_PROPS.map((p) => `${p}=${prop(el, p) ?? ""}`).join("|")),
    ),

  /**
   * Gradient definitions: parameters and stop ramps, ignoring `id` so that
   * renaming a gradient is not mistaken for re-specifying one, and ignoring the
   * marks that reference them so that moving a mark is not either.
   */
  gradient: (root) =>
    walk(root)
      .filter((el) => GRADIENT_TAGS.has(el.localName))
      .map((el) => {
        const attrs = [...el.attributes]
          .filter((a) => a.name !== "id")
          .map((a) => `${a.name}=${a.value}`)
          .sort()
          .join(",");
        const stops = walk(el)
          .filter((s) => s.localName === "stop")
          .map((s) => `${s.getAttribute("offset")}/${prop(s, "stop-color")}/${prop(s, "stop-opacity") ?? ""}`)
          .join(";");
        return `${el.localName}[${attrs}]{${stops}}`;
      })
      .join("\n"),

  /**
   * Tag census — what the chart is *built out of*. The from-scratch construction
   * rows turn on this (flat circles vs. clip-path layering vs. gradient+filter);
   * it is intentionally blind to colour and position.
   */
  "element-composition": (root) => {
    const counts = new Map();
    for (const el of walk(root)) counts.set(el.localName, (counts.get(el.localName) ?? 0) + 1);
    return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([t, n]) => `${t}=${n}`).join("\n");
  },
};

/** Reduce a render.svg to the single dimension `kind` names. */
export function probeSvg(kind, svgText) {
  const probe = PROBES[kind];
  if (!probe) {
    throw new Error(`unknown premise probe "${kind}" — expected one of ${Object.keys(PROBES).sort().join(", ")}`);
  }
  return probe(parse(svgText));
}
