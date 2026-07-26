// Technique: Visual Cinnamon, "Making a static SVG gradient data-based with D3"
//   https://www.visualcinnamon.com/2016/05/data-based-svg-gradient-d3/
// plus the shipped variant in the Observable hexagon playground:
//   https://observablehq.com/@nbremer/svg-gradient-filter-playground-hexagons
//
// PERF CEILING: N marks produce N gradient defs. Fine at tens (the source uses 8
// and 20). A documented hazard past a few hundred — SVG paint layers plus DOM
// node count. Do not reach for this on a scatter of thousands.
import { rgb } from "d3-color";
import { select } from "d3-selection";
import type { Selection } from "d3-selection";

export type GradientOpts<T> = {
  idPrefix: string;
  color: (d: T, i: number) => string;
  cx?: string;
  cy?: string;
  r?: string;
  brighten?: number;
  darken?: number;
};

export function perDatumRadialGradient<T>(
  defs: Selection<any, unknown, any, unknown>,
  data: T[],
  opts: GradientOpts<T>,
): (d: T, i: number) => string {
  const { idPrefix, color } = opts;
  // Off-centre highlight is the whole effect. A 3D sphere is conventionally lit
  // diagonally from above; SVG's 50/50/50 default gives a bullseye instead.
  const cx = opts.cx ?? "35%";
  const cy = opts.cy ?? "35%";
  const r = opts.r ?? "60%";
  const brighten = opts.brighten ?? 1;
  const darken = opts.darken ?? 1.75;

  const grads = defs
    .selectAll(`radialGradient.${idPrefix}`)
    .data(data)
    .join("radialGradient")
    .attr("class", idPrefix)
    // The id must depend on the datum — that is what makes this per-datum
    // rather than one generic gradient reused everywhere.
    .attr("id", (_d: T, i: number) => `${idPrefix}-${i}`)
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", r);

  // Stops are built via a plain loop over grads.nodes() rather than d3's
  // `each` paired with a per-node `filter` back into the joined selection.
  // That each/filter round-trip depends on __data__ surviving a re-wrapped
  // selection the same way it does in a browser DOM, which jsdom does not
  // reliably guarantee. Indexing `data` directly by the node's position is
  // simpler and produces identical output.
  grads.nodes().forEach((node, i) => {
    const base = rgb(color(data[i] as T, i));
    const stops: [string, string][] = [
      ["0%", base.brighter(brighten).toString()],
      ["50%", base.toString()],
      ["100%", base.darker(darken).toString()],
    ];
    select(node)
      .selectAll("stop")
      .data(stops)
      .join("stop")
      .attr("offset", (s: [string, string]) => s[0])
      .attr("stop-color", (s: [string, string]) => s[1]);
  });

  return (_d: T, i: number) => `url(#${idPrefix}-${i})`;
}
