// src/lib/families.ts
//
// Presentational only. `src/rows.json` is the row inventory the integrity gate
// cross-validates every cell against, so it stays pure data — what a family
// *means* to a reader is a property of the gallery, not of the experiment, and
// lives here.
//
// Each blurb names the levers that family's own rows test. Nothing here asserts
// a result; it is a table of contents, not a finding.

export const FAMILY_LABELS: Record<string, { name: string; blurb: string }> = {
  type: { name: "Type", blurb: "Typeface, size hierarchy, weight, figures, casing." },
  color: { name: "Colour", blurb: "Categorical, sequential and diverging palettes; ground, accent discipline, CVD safety." },
  mark: { name: "Mark", blurb: "What a datum is drawn as — glyph, gradient, halo, texture, size, overlap." },
  axis: { name: "Axis", blurb: "Lines, ticks, gridlines, the zero baseline, and how the frame is labelled." },
  layout: { name: "Layout", blurb: "Aspect ratio, margins, sort order, faceting, cartesian versus radial." },
  annot: { name: "Annotation", blurb: "Headline as finding, in-chart callouts, leader lines, sourcing, uncertainty." },
  legend: { name: "Legend", blurb: "Detached key versus labels pinned to marks; colour bars; legend as artwork." },
  motion: { name: "Motion", blurb: "Entrance animation and scroll-scrubbed transition." },
  inter: { name: "Interaction", blurb: "Hover and highlight, tooltip wording, keyboard and screen-reader access." },
  medium: { name: "Medium", blurb: "SVG versus canvas, dark and light theming, the share render." },
  num: { name: "Numbers", blurb: "Units, rounding, formatting and locale." },
  lib: { name: "Library", blurb: "Preset chart library versus escape hatch versus raw D3, and how an edit is anchored." },
};

export function familyLabel(family: string): { name: string; blurb: string } {
  return FAMILY_LABELS[family] ?? { name: family, blurb: "" };
}
