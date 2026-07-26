import type { FixtureName } from "./fixtures";

export type Arm = "A" | "B" | "C";
export type Mode = "refine" | "from-scratch";
export type MethodKind = "default" | "skill" | "tool";

export type ArmDecl = { arm: Arm; kind: MethodKind; method: string };
export type RowDecl = {
  id: string;
  family: string;
  title: string;
  mode: Mode;
  fixture: FixtureName;
  phase: 1 | 2 | 3;
  arms: ArmDecl[];
  gap?: string;
};

const A: ArmDecl = Object.freeze({ arm: "A", kind: "default", method: "clean subagent, naive prompt" });

export const ROWS: RowDecl[] = [
  // ---- Family 1: type ----
  {
    id: "type-01-typeface", family: "type", title: "Typeface", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "/impeccable typeset" },
      { arm: "C", kind: "tool", method: "reference-PNG + Chrome screenshot diff" }],
  },
  {
    id: "type-02-scale", family: "type", title: "Type scale and size hierarchy", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "/impeccable typeset" },
      { arm: "C", kind: "tool", method: "reference-PNG + Chrome screenshot diff" }],
  },
  {
    id: "type-03-weight", family: "type", title: "Weight and contrast", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable typeset" }],
  },
  {
    id: "type-04-numerals", family: "type", title: "Tabular vs proportional figures", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A, { arm: "B", kind: "skill", method: "dataviz" }],
  },
  {
    id: "type-05-casing", family: "type", title: "Casing, tracking, label wrapping", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable typeset" }],
  },

  // ---- Family 2: color ----
  {
    id: "color-01-categorical", family: "color", title: "Categorical palette", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "dataviz" },
      { arm: "C", kind: "skill", method: "/impeccable colorize" }],
  },
  {
    id: "color-02-sequential", family: "color", title: "Sequential ramp", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A,
      { arm: "B", kind: "skill", method: "dataviz" },
      { arm: "C", kind: "skill", method: "craft:spectralField 10-stop ramp" }],
  },
  {
    id: "color-03-diverging", family: "color", title: "Diverging scale, spectral within poles", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "dataviz" },
      { arm: "C", kind: "skill", method: "craft:spectralField" }],
  },
  {
    id: "color-04-ground", family: "color", title: "Light vs dark ground", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable brand" }],
  },
  {
    id: "color-05-cvd", family: "color", title: "Colour-vision-deficiency safety", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A,
      { arm: "B", kind: "skill", method: "dataviz palette validator" },
      { arm: "C", kind: "skill", method: "/impeccable audit" }],
  },
  {
    id: "color-06-accent", family: "color", title: "Accent vs neutral discipline", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable quieter then /impeccable brand" }],
  },

  // ---- Family 3: mark ----
  {
    id: "mark-01-glyph", family: "mark", title: "Default rect/circle vs designed custom mark",
    mode: "from-scratch", fixture: "hero8", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "craft + explicit custom-mark brief" },
      { arm: "C", kind: "tool", method: "raw D3 / Observable Plot render mark" }],
  },
  {
    id: "mark-02-gradient", family: "mark", title: "Flat fill vs one radialGradient per datum",
    mode: "refine", fixture: "hero8", phase: 1,
    arms: [A, { arm: "B", kind: "skill", method: "craft:perDatumRadialGradient" }],
  },
  {
    id: "mark-03-halo", family: "mark", title: "Stroke/halo separation on overlap", mode: "refine",
    fixture: "hero8", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "craft + explicit halo brief" }],
  },
  {
    id: "mark-04-glow", family: "mark", title: "Glow / outer halo filter", mode: "refine",
    fixture: "hero8", phase: 2, arms: [A],
    gap: "The feGaussianBlur + feMerge recipe failed 3-vote verification during research (0-3). Published as an unanswered gap rather than a guessed cell. Closing it requires re-verification against the Visual Cinnamon 'SVGs beyond mere shapes' post and the hexagon playground filter demos.",
  },
  {
    id: "mark-05-texture", family: "mark", title: "Pattern / texture fill", mode: "refine",
    fixture: "hero8", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "craft + SVG pattern brief (needs sourcing)" }],
    gap: "Pattern/texture fill is unsourced — the craft module needs a sourcing pass (a verified technique reference) before this Arm B can be honestly built as a full wiring; ships once sourced, per spec §7/§9.",
  },
  {
    id: "mark-06-size", family: "mark", title: "Size encoding honesty (area vs radius)", mode: "refine",
    fixture: "hero8", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "dataviz" }],
  },
  {
    id: "mark-07-overlap", family: "mark", title: "Overplotting: opacity, jitter, ordering", mode: "refine",
    fixture: "hero8", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "dataviz" },
      { arm: "C", kind: "skill", method: "/impeccable craft" }],
  },

  // ---- Family 4: axis ----
  {
    id: "axis-01-line", family: "axis", title: "Axis line presence and weight", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable distill" }],
  },
  {
    id: "axis-02-ticks", family: "axis", title: "Tick density and format", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "dataviz" }],
  },
  {
    id: "axis-03-grid", family: "axis", title: "Gridlines: whether, how faint, which direction", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable distill" }],
  },
  {
    id: "axis-04-baseline", family: "axis", title: "Zero-baseline and truncation honesty", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "dataviz" }],
  },
  {
    id: "axis-05-labeling", family: "axis", title: "Direct labelling vs a framed axis box", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "craft + explicit direct-labelling brief" }],
  },

  // ---- Family 5: layout ----
  {
    id: "layout-01-ratio", family: "layout", title: "Aspect ratio choice", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable layout" }],
  },
  {
    id: "layout-02-margins", family: "layout", title: "Margins and whitespace", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable layout" }],
  },
  {
    id: "layout-03-order", family: "layout", title: "Sort order as an editorial decision", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "dataviz" }],
  },
  {
    id: "layout-04-facets", family: "layout", title: "Small multiples / faceting", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A,
      { arm: "B", kind: "skill", method: "/impeccable layout" },
      { arm: "C", kind: "skill", method: "/impeccable craft" }],
  },
  {
    id: "layout-05-radial", family: "layout", title: "Cartesian vs radial / polar",
    mode: "from-scratch", fixture: "cycle12", phase: 2,
    arms: [A,
      { arm: "B", kind: "skill", method: "craft + explicit radial-layout brief" },
      { arm: "C", kind: "tool", method: "reference-PNG + Chrome screenshot diff" }],
  },

  // ---- Family 6: annot ----
  {
    id: "annot-01-headline", family: "annot", title: "Generic title vs headline-as-finding", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "intent:articulate" }],
  },
  {
    id: "annot-02-callout", family: "annot", title: "In-chart callouts on the marks that carry the finding", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "craft:annotationAdjacency" }],
  },
  {
    id: "annot-03-leaders", family: "annot", title: "Leader lines: short, uncrossed, distinct from marks", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "craft:annotationAdjacency" }],
  },
  {
    id: "annot-04-source", family: "annot", title: "Source and method note", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "dataviz" }],
  },
  {
    id: "annot-05-uncertainty", family: "annot", title: "Showing uncertainty / caveats", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "dataviz" }],
  },

  // ---- Family 7: legend ----
  {
    id: "legend-01-direct", family: "legend", title: "Detached legend vs labels pinned to marks", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "craft:annotationAdjacency" }],
  },
  {
    id: "legend-02-colorbar", family: "legend", title: "Continuous colour legend quality", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "craft + explicit colorbar brief" }],
  },
  {
    id: "legend-03-art", family: "legend", title: "Legend-as-art / hand-feel", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "tool", method: "image model" }],
    gap: "Legend-as-art / hand-feel is unsourced — flagged per spec §7/§9 alongside texture as needing a sourcing pass before its image-model-assisted Arm B can be treated as a verified technique rather than a guess.",
  },

  // ---- Family 8: motion ----
  {
    id: "motion-01-entrance", family: "motion", title: "Entrance animation", mode: "refine",
    fixture: "cycle12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable animate" }],
  },
  {
    id: "motion-02-scrub", family: "motion",
    title: "Transition / scroll-scrub. Must respect the known GSAP hazard: never drive one transform property with both a from() entrance and a scrub tween",
    mode: "refine", fixture: "cycle12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable animate" }],
  },

  // ---- Family 9: inter ----
  {
    id: "inter-01-hover", family: "inter", title: "Hover / highlight behaviour", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable interaction-design" }],
  },
  {
    id: "inter-02-tooltip", family: "inter", title: "Tooltip content and wording", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "intent:articulate" }],
  },
  {
    id: "inter-03-a11y", family: "inter", title: "Keyboard, focus order, screen-reader description", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "intent:include" }],
  },

  // ---- Family 10: medium ----
  {
    id: "medium-01-svg", family: "medium", title: "SVG vs canvas crispness at the same size",
    mode: "from-scratch", fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "tool", method: "explicit vector directive + /impeccable polish" }],
  },
  {
    id: "medium-02-theme", family: "medium", title: "Dark / light theming of the same chart", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable adapt" }],
  },
  {
    id: "medium-03-share", family: "medium", title: "Share / OG render of the chart", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "tool", method: "satori/resvg OG pattern + /impeccable brand" }],
  },

  // ---- Family 11: num ----
  {
    id: "num-01-units", family: "num", title: "Units and rounding", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "dataviz" }],
  },
  {
    id: "num-02-format", family: "num", title: "Number formatting and locale", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "dataviz" }],
  },

  // ---- Family 12: lib ----
  {
    id: "lib-01-ceiling", family: "lib",
    title: "Preset chart library vs Observable Plot (function-mark escape hatch) vs raw D3/SVG, same brief",
    mode: "from-scratch", fixture: "table12", phase: 3,
    arms: [A,
      { arm: "B", kind: "tool", method: "Observable Plot (function-mark escape hatch)" },
      { arm: "C", kind: "tool", method: "raw D3/SVG" }],
  },
  {
    id: "lib-02-anchored", family: "lib",
    title: "Element-anchored editing (pass the DOM id) vs vague prose. Low-expectation row, published even if the effect is nil",
    mode: "refine", fixture: "table12", phase: 3,
    arms: [A,
      { arm: "B", kind: "tool", method: "DOM-anchored edit (pass the DOM id)" },
      { arm: "C", kind: "tool", method: "precise prose (no DOM anchor)" }],
  },
];

export const FAMILIES = [...new Set(ROWS.map((r) => r.family))];

export function rowsForPhase(phase: 1 | 2 | 3): RowDecl[] {
  return ROWS.filter((r) => r.phase === phase);
}

export function getRow(id: string): RowDecl {
  const r = ROWS.find((x) => x.id === id);
  if (!r) throw new Error(`unknown row: ${id}`);
  return r;
}
