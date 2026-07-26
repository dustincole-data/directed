// Technique: gradientUnits="userSpaceOnUse" so every mark samples ONE continuous
// ramp anchored to the layout, instead of restarting it inside its own bounding box.
//   https://observablehq.com/@nbremer/svg-gradient-filter-playground-hexagons
//   https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/gradientUnits
//   https://www.w3.org/TR/SVG11/pservers.html  (objectBoundingBox is the default)
//
// SIMPLER BASELINE: if you only need "marks coloured by position", a per-mark solid
// fill from a positional scale (d3.scaleSequential) needs zero gradient nodes. Reach
// for this when you need sub-mark colour variation on large marks, or a static field
// that MOVING marks traverse.
import type { Selection } from "d3-selection";

export const SPECTRAL_10 = [
  "#2c7bb6", "#00a1c3", "#00c4b8", "#70e29f", "#cff88c",
  "#fceb74", "#f5c049", "#ee9429", "#e56219", "#d7191c",
] as const;

export type SpectralOpts = {
  id: string;
  x1: number;
  x2: number;
  stops?: readonly string[];
};

export function spectralField(
  defs: Selection<any, unknown, any, unknown>,
  opts: SpectralOpts,
): string {
  const stops = opts.stops ?? SPECTRAL_10;
  const grad = defs
    .append("linearGradient")
    .attr("id", opts.id)
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", String(opts.x1))
    .attr("x2", String(opts.x2));

  stops.forEach((c, i) => {
    grad
      .append("stop")
      .attr("offset", `${Math.round((i / (stops.length - 1)) * 100)}%`)
      .attr("stop-color", c);
  });

  return `url(#${opts.id})`;
}
