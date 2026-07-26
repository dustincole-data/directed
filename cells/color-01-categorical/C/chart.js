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

  // --- Clean slate & base canvas -------------------------------------
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const width = meta.width;
  const height = meta.height;
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("font-family", "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif");

  svg.appendChild(el("rect", {
    x: 0, y: 0, width, height, fill: "#ffffff",
  }));

  // --- Derive display strings from the data, not hardcoded assumptions
  const rows = data.rows;
  const baseline = data.baseline;
  const unitMatch = /^(.*?)\s*\((.*)\)\s*$/.exec(data.unit || "");
  const unitShort = unitMatch ? unitMatch[1].trim() : (data.unit || "");
  const unitDescr = unitMatch ? unitMatch[2].trim() : "";
  const titleText = (unitDescr ? unitDescr[0].toUpperCase() + unitDescr.slice(1) : "Values") +
    ` — ${rows.length} countries vs. world baseline`;

  // --- Color system (OKLCH) ------------------------------------------
  // Tinted-neutral ink family: a hair of chroma toward a cool slate hue
  // (265) so gridlines/axes/text cohere with the data hues instead of
  // reading as flat, lifeless gray.
  const INK = "oklch(20% 0.02 265)"; // primary text: title, row labels, baseline label
  const TEXT_MUTED = "oklch(40% 0.02 265)"; // secondary text: legend labels, neutral delta text
  const AXIS_MUTED = "oklch(46% 0.02 265)"; // axis ticks + unit label
  const GRID_LINE = "oklch(92% 0.012 265)"; // gridlines (decorative, no contrast requirement)
  const AXIS_LINE = "oklch(60% 0.02 265)"; // x-axis rule (UI component, needs >=3:1)

  // Diverging categorical pair, matched lightness so neither pole reads
  // as heavier than the other; used for bar fills and legend swatches
  // (non-text, only needs >=3:1 against the canvas).
  const POS_COLOR = "oklch(60% 0.13 165)"; // above baseline — teal-green
  const NEG_COLOR = "oklch(60% 0.16 27)"; // below baseline — coral-red
  const NEUTRAL_COLOR = "oklch(55% 0.02 265)"; // exactly at baseline (fallback)

  // Same hues, darkened for body-text use so the paired value/delta
  // labels can carry the same semantic color and still clear 4.5:1
  // against the white canvas.
  const POS_TEXT = "oklch(45% 0.13 165)";
  const NEG_TEXT = "oklch(45% 0.16 27)";

  function colorFor(delta) {
    if (delta > 0) return POS_COLOR;
    if (delta < 0) return NEG_COLOR;
    return NEUTRAL_COLOR;
  }

  function colorForText(delta) {
    if (delta > 0) return POS_TEXT;
    if (delta < 0) return NEG_TEXT;
    return TEXT_MUTED;
  }

  const hasNeutralRow = rows.some((r) => r.delta === 0);

  // --- Layout ----------------------------------------------------------
  const margin = { top: 60, right: 78, bottom: 36, left: 150 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // --- Title -------------------------------------------------------------
  svg.appendChild(el("text", {
    x: 20, y: 20, "font-size": 15, "font-weight": 700, fill: INK,
  }, titleText));

  // --- Legend (categorical color key) -------------------------------
  const legendY = 38;
  svg.appendChild(el("rect", { x: 20, y: legendY - 9, width: 10, height: 10, fill: POS_COLOR, rx: 2 }));
  svg.appendChild(el("text", {
    x: 34, y: legendY, "font-size": 11, fill: TEXT_MUTED,
  }, "Above baseline"));
  svg.appendChild(el("rect", { x: 150, y: legendY - 9, width: 10, height: 10, fill: NEG_COLOR, rx: 2 }));
  svg.appendChild(el("text", {
    x: 164, y: legendY, "font-size": 11, fill: TEXT_MUTED,
  }, "Below baseline"));
  if (hasNeutralRow) {
    svg.appendChild(el("rect", { x: 284, y: legendY - 9, width: 10, height: 10, fill: NEUTRAL_COLOR, rx: 2 }));
    svg.appendChild(el("text", {
      x: 298, y: legendY, "font-size": 11, fill: TEXT_MUTED,
    }, "At baseline"));
  }

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
  const barThickness = Math.max(6, rowHeight * 0.6);

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
      stroke: GRID_LINE, "stroke-width": 1,
    }));
    gridGroup.appendChild(el("text", {
      x, y: innerHeight + 16, "font-size": 10, fill: AXIS_MUTED, "text-anchor": "middle",
    }, Math.round(t)));
  }

  // Baseline reference line (drawn above gridlines, below bars). Kept
  // ink-neutral rather than borrowing pos/neg hues: it's a structural
  // reference, not a data category, so it stays out of the semantic set.
  const baselineX = xScale(baseline);
  chart.appendChild(el("line", {
    x1: baselineX, x2: baselineX, y1: -14, y2: innerHeight,
    stroke: INK, "stroke-width": 1.25, "stroke-dasharray": "4 3",
  }));
  chart.appendChild(el("text", {
    x: baselineX, y: -18, "font-size": 10, fill: INK, "text-anchor": "middle", "font-weight": 600,
  }, `world baseline ${baseline.toFixed(1)}`));

  // x-axis line
  chart.appendChild(el("line", {
    x1: 0, x2: innerWidth, y1: innerHeight, y2: innerHeight, stroke: AXIS_LINE, "stroke-width": 1,
  }));

  // unit label, bottom-right of axis
  if (unitShort) {
    chart.appendChild(el("text", {
      x: innerWidth, y: innerHeight + 30, "font-size": 10, fill: AXIS_MUTED, "text-anchor": "end",
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
    const color = colorFor(row.delta);
    const textColor = colorForText(row.delta);

    barsGroup.appendChild(el("rect", {
      x: xLo, y, width: Math.max(0, xHi - xLo), height: barThickness,
      fill: color, rx: 2,
    }));

    // Row (country) label, left of the plot area
    barsGroup.appendChild(el("text", {
      x: -10, y: y + barThickness / 2 + 4, "font-size": 11, fill: INK, "text-anchor": "end",
    }, row.label));

    // Value + delta label, past the bar's far end. Colored to match its
    // bar's semantic hue (darkened for text-safe contrast) so the label
    // reinforces the category instead of repeating it in flat gray.
    const deltaSign = row.delta > 0 ? "+" : row.delta < 0 ? "−" : "±";
    const deltaLabel = `${row.value.toFixed(1)} (${deltaSign}${Math.abs(row.delta).toFixed(1)})`;
    const labelOnRight = xVal >= baselineX;
    barsGroup.appendChild(el("text", {
      x: labelOnRight ? xHi + 6 : xLo - 6,
      y: y + barThickness / 2 + 4,
      "font-size": 10,
      fill: textColor,
      "text-anchor": labelOnRight ? "start" : "end",
    }, deltaLabel));
  });
}
