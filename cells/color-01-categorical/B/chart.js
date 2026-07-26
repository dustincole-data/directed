export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const SVG_NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs = {}, text) {
    const node = doc.createElementNS(SVG_NS, tag);
    for (const key in attrs) {
      if (attrs[key] !== undefined && attrs[key] !== null) {
        node.setAttribute(key, attrs[key]);
      }
    }
    if (text !== undefined && text !== null) {
      node.textContent = text;
    }
    return node;
  }

  // Rounded-rect path with an independent radius per corner (clockwise
  // winding, sweep-flag 1 throughout) so a bar can be square at the
  // baseline and rounded only at its data end.
  function roundedRectPath(x, y, w, h, tl, tr, br, bl) {
    const x2 = x + w;
    const y2 = y + h;
    return [
      `M${x + tl},${y}`,
      `H${x2 - tr}`,
      tr ? `A${tr},${tr} 0 0 1 ${x2},${y + tr}` : "",
      `V${y2 - br}`,
      br ? `A${br},${br} 0 0 1 ${x2 - br},${y2}` : "",
      `H${x + bl}`,
      bl ? `A${bl},${bl} 0 0 1 ${x},${y2 - bl}` : "",
      `V${y + tl}`,
      tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : "",
      "Z",
    ].filter(Boolean).join(" ");
  }

  // --- Clean slate & base canvas -------------------------------------
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const width = meta.width;
  const height = meta.height;
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("font-family", "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif");

  // Chart surface + chrome/ink tokens (validated palette; see dataviz skill).
  const SURFACE = "#fcfcfb";
  const INK_PRIMARY = "#0b0b0b";
  const INK_SECONDARY = "#52514e";
  const INK_MUTED = "#898781";
  const GRIDLINE = "#e1e0d9";
  const AXIS_LINE = "#c3c2b7";

  svg.appendChild(el("rect", {
    x: 0, y: 0, width, height, fill: SURFACE,
  }));

  // --- Derive display strings from the data, not hardcoded assumptions
  const rows = data.rows;
  const baseline = data.baseline;
  const unitMatch = /^(.*?)\s*\((.*)\)\s*$/.exec(data.unit || "");
  const unitShort = unitMatch ? unitMatch[1].trim() : (data.unit || "");
  const unitDescr = unitMatch ? unitMatch[2].trim() : "";
  const titleText = (unitDescr ? unitDescr[0].toUpperCase() + unitDescr.slice(1) : "Values") +
    ` — ${rows.length} countries vs. world baseline`;

  // Above/below a baseline is a polarity encoding: the diverging pair
  // (blue = above, red = below) plus a neutral gray for the exact-zero
  // case, per the dataviz skill's documented palette (validated: worst
  // adjacent ΔE 21.6 CVD / 32.3 normal-vision, both ≥ 3:1 on this surface).
  const POS_COLOR = "#2a78d6"; // above baseline
  const NEG_COLOR = "#e34948"; // below baseline
  const NEUTRAL_COLOR = INK_MUTED; // exactly at baseline (fallback)

  function colorFor(delta) {
    if (delta > 0) return POS_COLOR;
    if (delta < 0) return NEG_COLOR;
    return NEUTRAL_COLOR;
  }

  // --- Layout ----------------------------------------------------------
  const margin = { top: 60, right: 78, bottom: 36, left: 150 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // --- Title -------------------------------------------------------------
  svg.appendChild(el("text", {
    x: 20, y: 20, "font-size": 15, "font-weight": 700, fill: INK_PRIMARY,
  }, titleText));

  // --- Legend (categorical color key) -------------------------------
  const legendY = 38;
  svg.appendChild(el("rect", { x: 20, y: legendY - 9, width: 10, height: 10, fill: POS_COLOR, rx: 2 }));
  svg.appendChild(el("text", {
    x: 34, y: legendY, "font-size": 11, fill: INK_SECONDARY,
  }, "Above baseline"));
  svg.appendChild(el("rect", { x: 150, y: legendY - 9, width: 10, height: 10, fill: NEG_COLOR, rx: 2 }));
  svg.appendChild(el("text", {
    x: 164, y: legendY, "font-size": 11, fill: INK_SECONDARY,
  }, "Below baseline"));

  // --- Scales ------------------------------------------------------------
  const values = rows.map((r) => r.value);
  const domainLo = Math.min(baseline, ...values);
  const domainHi = Math.max(baseline, ...values);
  const niceMin = Math.floor(domainLo / 10) * 10;
  const niceMax = Math.ceil(domainHi / 10) * 10;
  const span = niceMax - niceMin || 1;

  function xScale(v) {
    return ((v - niceMin) / span) * innerWidth;
  }

  const sorted = rows.slice().sort((a, b) => b.value - a.value);
  const rowHeight = innerHeight / sorted.length;
  // Bar thickness is capped (never fills the row band) so the band's
  // leftover stays air, per the mark spec.
  const barThickness = Math.min(24, Math.max(6, rowHeight * 0.6));

  function yBand(i) {
    return i * rowHeight + (rowHeight - barThickness) / 2;
  }

  // --- Chart group ---------------------------------------------------
  const chart = el("g", { transform: `translate(${margin.left}, ${margin.top})` });
  svg.appendChild(chart);

  // Gridlines + x-axis ticks
  const tickCount = span / 10;
  const gridGroup = el("g");
  chart.appendChild(gridGroup);
  for (let t = niceMin; t <= niceMax + 0.001; t += 10) {
    const x = xScale(t);
    gridGroup.appendChild(el("line", {
      x1: x, x2: x, y1: 0, y2: innerHeight,
      stroke: GRIDLINE, "stroke-width": 1,
    }));
    gridGroup.appendChild(el("text", {
      x, y: innerHeight + 16, "font-size": 10, fill: INK_MUTED, "text-anchor": "middle",
    }, Math.round(t)));
  }

  // Baseline reference line (drawn above gridlines, below bars) — a named
  // threshold, not routine chart chrome, so it stays visually distinct.
  const baselineX = xScale(baseline);
  chart.appendChild(el("line", {
    x1: baselineX, x2: baselineX, y1: -14, y2: innerHeight,
    stroke: INK_PRIMARY, "stroke-width": 1.25, "stroke-dasharray": "4 3",
  }));
  chart.appendChild(el("text", {
    x: baselineX, y: -18, "font-size": 10, fill: INK_PRIMARY, "text-anchor": "middle", "font-weight": 600,
  }, `world baseline ${baseline.toFixed(1)}`));

  // x-axis line
  chart.appendChild(el("line", {
    x1: 0, x2: innerWidth, y1: innerHeight, y2: innerHeight, stroke: AXIS_LINE, "stroke-width": 1,
  }));

  // unit label, bottom-right of axis
  if (unitShort) {
    chart.appendChild(el("text", {
      x: innerWidth, y: innerHeight + 30, "font-size": 10, fill: INK_MUTED, "text-anchor": "end",
    }, unitShort));
  }

  // --- Bars + labels ---------------------------------------------------
  const barsGroup = el("g");
  chart.appendChild(barsGroup);

  sorted.forEach((row, i) => {
    const y = yBand(i);
    const xVal = xScale(row.value);
    const xLo = Math.min(xVal, baselineX);
    const xHi = Math.max(xVal, baselineX);
    const w = Math.max(0, xHi - xLo);
    const color = colorFor(row.delta);

    // Square at the baseline, 4px rounded data-end (capped so the radius
    // never exceeds the bar's own half-width or half-thickness).
    const growsRight = xVal >= baselineX;
    const r = Math.min(4, w / 2, barThickness / 2);
    const d = growsRight
      ? roundedRectPath(xLo, y, w, barThickness, 0, r, r, 0)
      : roundedRectPath(xLo, y, w, barThickness, r, 0, 0, r);

    barsGroup.appendChild(el("path", { d, fill: color }));

    // Row (country) label, left of the plot area
    barsGroup.appendChild(el("text", {
      x: -10, y: y + barThickness / 2 + 4, "font-size": 11, fill: INK_PRIMARY, "text-anchor": "end",
    }, row.label));

    // Value + delta label, past the bar's far end
    const deltaSign = row.delta > 0 ? "+" : row.delta < 0 ? "−" : "±";
    const deltaLabel = `${row.value.toFixed(1)} (${deltaSign}${Math.abs(row.delta).toFixed(1)})`;
    const labelOnRight = xVal >= baselineX;
    barsGroup.appendChild(el("text", {
      x: labelOnRight ? xHi + 6 : xLo - 6,
      y: y + barThickness / 2 + 4,
      "font-size": 10,
      fill: INK_SECONDARY,
      "text-anchor": labelOnRight ? "start" : "end",
    }, deltaLabel));
  });
}
