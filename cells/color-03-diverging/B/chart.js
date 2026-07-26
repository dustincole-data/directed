export const meta = { fixture: "table12", width: 640, height: 400 };

const SVG_NS = "http://www.w3.org/2000/svg";

// 3-stop diverging scale: the design system's blue <-> red poles with a
// neutral gray midpoint (not white/a hue), equal step count per arm. Used
// identically by the bars and the legend so the two always agree.
const STOPS = [
  { t: -1, color: [227, 73, 72] }, // #e34948 — red pole (below baseline)
  { t: 0, color: [240, 239, 236] }, // #f0efec — neutral gray midpoint
  { t: 1, color: [42, 120, 214] }, // #2a78d6 — blue pole (above baseline)
];

function rgbToStr([r, g, b]) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function lerp(a, b, f) {
  return a + (b - a) * f;
}

function colorForT(tRaw) {
  const t = Math.max(-1, Math.min(1, tRaw));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / (b.t - a.t);
      return rgbToStr([
        lerp(a.color[0], b.color[0], f),
        lerp(a.color[1], b.color[1], f),
        lerp(a.color[2], b.color[2], f),
      ]);
    }
  }
  return rgbToStr(STOPS[STOPS.length - 1].color);
}

function el(doc, tag, attrs, text) {
  const node = doc.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const k in attrs) node.setAttribute(k, attrs[k]);
  }
  if (text != null) node.textContent = text;
  return node;
}

function fmtDelta(d) {
  const sign = d > 0 ? "+" : d < 0 ? "−" : "±";
  return `${sign}${Math.abs(d).toFixed(2)}`;
}

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const width = meta.width;
  const height = meta.height;

  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("font-family", "system-ui, -apple-system, sans-serif");

  const bg = el(doc, "rect", {
    x: 0,
    y: 0,
    width,
    height,
    fill: "#ffffff",
  });
  svg.appendChild(bg);

  const rows = data.rows.slice().sort((a, b) => b.delta - a.delta);
  const baseline = data.baseline;
  const maxAbsDelta = rows.reduce(
    (m, r) => Math.max(m, Math.abs(r.delta)),
    0
  );
  const domainMax = maxAbsDelta * 1.08;

  const margin = { top: 78, right: 58, bottom: 34, left: 122 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const rowHeight = innerHeight / rows.length;
  const barHeight = rowHeight * 0.62;

  const zeroX = innerWidth / 2;
  const pxPerUnit = zeroX / domainMax;
  const xForDelta = (d) => zeroX + d * pxPerUnit;

  // --- Header -------------------------------------------------------
  svg.appendChild(
    el(
      doc,
      "text",
      { x: margin.left, y: 22, "font-size": 16, "font-weight": 700, fill: "#1f2937" },
      "Life Expectancy at Birth vs. World Baseline"
    )
  );
  svg.appendChild(
    el(
      doc,
      "text",
      { x: margin.left, y: 39, "font-size": 11.5, fill: "#6b7280" },
      `12 countries · years above/below the world average of ${baseline.toFixed(2)} yrs (World Bank)`
    )
  );

  // --- Legend (diverging color key) ----------------------------------
  const legendW = 220;
  const legendH = 10;
  const legendX = width - margin.right - legendW;
  const legendY = 50;

  const defs = el(doc, "defs");
  const gradId = "diverging-scale";
  const grad = el(doc, "linearGradient", {
    id: gradId,
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "0%",
  });
  STOPS.forEach((s) => {
    grad.appendChild(
      el(doc, "stop", {
        offset: `${((s.t + 1) / 2) * 100}%`,
        "stop-color": rgbToStr(s.color),
      })
    );
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  svg.appendChild(
    el(doc, "rect", {
      x: legendX,
      y: legendY,
      width: legendW,
      height: legendH,
      fill: `url(#${gradId})`,
      stroke: "#d1d5db",
      "stroke-width": 0.5,
      rx: 2,
    })
  );
  svg.appendChild(
    el(
      doc,
      "text",
      { x: legendX, y: legendY + legendH + 12, "font-size": 9.5, fill: "#6b7280", "text-anchor": "start" },
      "below baseline"
    )
  );
  svg.appendChild(
    el(
      doc,
      "text",
      {
        x: legendX + legendW,
        y: legendY + legendH + 12,
        "font-size": 9.5,
        fill: "#6b7280",
        "text-anchor": "end",
      },
      "above baseline"
    )
  );

  // --- Chart group -----------------------------------------------------
  const chart = el(doc, "g", {
    transform: `translate(${margin.left}, ${margin.top})`,
  });
  svg.appendChild(chart);

  // Gridlines at round tick values.
  const tickStep = 5;
  const ticks = [];
  for (let v = 0; v <= Math.floor(domainMax / tickStep) * tickStep; v += tickStep) {
    ticks.push(v);
    if (v !== 0) ticks.push(-v);
  }
  ticks.forEach((v) => {
    const x = xForDelta(v);
    chart.appendChild(
      el(doc, "line", {
        x1: x,
        x2: x,
        y1: 0,
        y2: innerHeight,
        stroke: v === 0 ? "#9ca3af" : "#e5e7eb",
        "stroke-width": v === 0 ? 1.25 : 1,
      })
    );
    chart.appendChild(
      el(
        doc,
        "text",
        {
          x,
          y: innerHeight + 16,
          "font-size": 9.5,
          fill: "#9ca3af",
          "text-anchor": "middle",
        },
        v === 0 ? "0" : v > 0 ? `+${v}` : `${v}`
      )
    );
  });

  // Bars + labels.
  rows.forEach((row, i) => {
    const rowY = i * rowHeight;
    const cy = rowY + rowHeight / 2;
    const barY = cy - barHeight / 2;
    const x0 = xForDelta(0);
    const x1 = xForDelta(row.delta);
    const barX = Math.min(x0, x1);
    const barW = Math.max(Math.abs(x1 - x0), 1);
    const color = colorForT(row.delta / domainMax);

    chart.appendChild(
      el(doc, "rect", {
        x: barX,
        y: barY,
        width: barW,
        height: barHeight,
        fill: color,
        rx: 2,
      })
    );

    chart.appendChild(
      el(
        doc,
        "text",
        {
          x: -10,
          y: cy,
          dy: "0.35em",
          "font-size": 12,
          fill: "#1f2937",
          "text-anchor": "end",
        },
        row.label
      )
    );

    const labelX = row.delta >= 0 ? x1 + 6 : x1 - 6;
    chart.appendChild(
      el(
        doc,
        "text",
        {
          x: labelX,
          y: cy,
          dy: "0.35em",
          "font-size": 10.5,
          fill: "#374151",
          "text-anchor": row.delta >= 0 ? "start" : "end",
        },
        fmtDelta(row.delta)
      )
    );
  });
}
