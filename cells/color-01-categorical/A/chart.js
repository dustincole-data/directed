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

  const POS_COLOR = "#2a9d8f"; // above baseline
  const NEG_COLOR = "#e76f51"; // below baseline
  const NEUTRAL_COLOR = "#6b7280"; // exactly at baseline (fallback)

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
    x: 20, y: 20, "font-size": 15, "font-weight": 700, fill: "#111827",
  }, titleText));

  // --- Legend (categorical color key) -------------------------------
  const legendY = 38;
  svg.appendChild(el("rect", { x: 20, y: legendY - 9, width: 10, height: 10, fill: POS_COLOR, rx: 2 }));
  svg.appendChild(el("text", {
    x: 34, y: legendY, "font-size": 11, fill: "#374151",
  }, "Above baseline"));
  svg.appendChild(el("rect", { x: 150, y: legendY - 9, width: 10, height: 10, fill: NEG_COLOR, rx: 2 }));
  svg.appendChild(el("text", {
    x: 164, y: legendY, "font-size": 11, fill: "#374151",
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
      stroke: "#e5e7eb", "stroke-width": 1,
    }));
    gridGroup.appendChild(el("text", {
      x, y: innerHeight + 16, "font-size": 10, fill: "#6b7280", "text-anchor": "middle",
    }, Math.round(t)));
  }

  // Baseline reference line (drawn above gridlines, below bars)
  const baselineX = xScale(baseline);
  chart.appendChild(el("line", {
    x1: baselineX, x2: baselineX, y1: -14, y2: innerHeight,
    stroke: "#111827", "stroke-width": 1.25, "stroke-dasharray": "4 3",
  }));
  chart.appendChild(el("text", {
    x: baselineX, y: -18, "font-size": 10, fill: "#111827", "text-anchor": "middle", "font-weight": 600,
  }, `world baseline ${baseline.toFixed(1)}`));

  // x-axis line
  chart.appendChild(el("line", {
    x1: 0, x2: innerWidth, y1: innerHeight, y2: innerHeight, stroke: "#9ca3af", "stroke-width": 1,
  }));

  // unit label, bottom-right of axis
  if (unitShort) {
    chart.appendChild(el("text", {
      x: innerWidth, y: innerHeight + 30, "font-size": 10, fill: "#6b7280", "text-anchor": "end",
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

    barsGroup.appendChild(el("rect", {
      x: xLo, y, width: Math.max(0, xHi - xLo), height: barThickness,
      fill: color, rx: 2,
    }));

    // Row (country) label, left of the plot area
    barsGroup.appendChild(el("text", {
      x: -10, y: y + barThickness / 2 + 4, "font-size": 11, fill: "#111827", "text-anchor": "end",
    }, row.label));

    // Value + delta label, past the bar's far end
    const deltaSign = row.delta > 0 ? "+" : row.delta < 0 ? "−" : "±";
    const deltaLabel = `${row.value.toFixed(1)} (${deltaSign}${Math.abs(row.delta).toFixed(1)})`;
    const labelOnRight = xVal >= baselineX;
    barsGroup.appendChild(el("text", {
      x: labelOnRight ? xHi + 6 : xLo - 6,
      y: y + barThickness / 2 + 4,
      "font-size": 10,
      fill: "#374151",
      "text-anchor": labelOnRight ? "start" : "end",
    }, deltaLabel));
  });
}
