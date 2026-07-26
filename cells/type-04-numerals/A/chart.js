export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const width = meta.width;
  const height = meta.height;

  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("font-family", "Helvetica, Arial, sans-serif");

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  function el(name, attrs, text) {
    const node = doc.createElementNS(SVG_NS, name);
    if (attrs) {
      for (const key of Object.keys(attrs)) {
        node.setAttribute(key, String(attrs[key]));
      }
    }
    if (text !== undefined && text !== null) {
      node.textContent = text;
    }
    return node;
  }

  const margin = { top: 62, right: 24, bottom: 96, left: 48 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const baseline = data.baseline;
  const rows = data.rows.slice().sort((a, b) => b.value - a.value);

  const maxValue = Math.max(baseline, ...rows.map((r) => r.value));
  const yMax = Math.ceil((maxValue + 4) / 10) * 10;
  const yMin = 0;

  function yScale(v) {
    return margin.top + chartHeight * (1 - (v - yMin) / (yMax - yMin));
  }

  const n = rows.length;
  const bandWidth = chartWidth / n;
  const barPadding = bandWidth * 0.28;
  const barWidth = bandWidth - barPadding * 2;

  // Background
  svg.appendChild(el("rect", { x: 0, y: 0, width, height, fill: "#ffffff" }));

  // Title / subtitle
  svg.appendChild(
    el(
      "text",
      { x: margin.left, y: 24, "font-size": 16, "font-weight": 700, fill: "#1a1a1a" },
      "Life Expectancy at Birth, 12 Countries"
    )
  );
  svg.appendChild(
    el(
      "text",
      { x: margin.left, y: 42, "font-size": 11.5, fill: "#555555" },
      `${data.unit} · dashed line = World Bank world baseline (${baseline.toFixed(2)})`
    )
  );

  // Y gridlines + ticks
  const yTickStep = 20;
  for (let v = 0; v <= yMax; v += yTickStep) {
    const y = yScale(v);
    svg.appendChild(
      el("line", {
        x1: margin.left,
        x2: margin.left + chartWidth,
        y1: y,
        y2: y,
        stroke: "#e6e6e6",
        "stroke-width": 1,
      })
    );
    svg.appendChild(
      el(
        "text",
        {
          x: margin.left - 8,
          y: y + 4,
          "font-size": 10,
          fill: "#777777",
          "text-anchor": "end",
        },
        String(v)
      )
    );
  }

  // Axis line (x-axis at y=0)
  const y0 = yScale(0);
  svg.appendChild(
    el("line", {
      x1: margin.left,
      x2: margin.left + chartWidth,
      y1: y0,
      y2: y0,
      stroke: "#999999",
      "stroke-width": 1,
    })
  );

  // Baseline dashed line
  const yBaseline = yScale(baseline);
  svg.appendChild(
    el("line", {
      x1: margin.left,
      x2: margin.left + chartWidth,
      y1: yBaseline,
      y2: yBaseline,
      stroke: "#333333",
      "stroke-width": 1.25,
      "stroke-dasharray": "5,4",
    })
  );
  svg.appendChild(
    el(
      "text",
      {
        x: margin.left + chartWidth,
        y: yBaseline - 5,
        "font-size": 10,
        fill: "#333333",
        "text-anchor": "end",
      },
      `baseline ${baseline.toFixed(2)}`
    )
  );

  const POSITIVE = "#2a9d8f";
  const NEGATIVE = "#e76f51";

  rows.forEach((row, i) => {
    const bx = margin.left + i * bandWidth + barPadding;
    const barTopY = yScale(row.value);
    const barHeight = Math.max(0, y0 - barTopY);
    const color = row.delta >= 0 ? POSITIVE : NEGATIVE;

    const bar = el("rect", {
      x: bx,
      y: barTopY,
      width: barWidth,
      height: barHeight,
      fill: color,
      rx: 2,
    });
    bar.appendChild(
      el(
        "title",
        null,
        `${row.label}: ${row.value.toFixed(2)} yrs (${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(2)} vs baseline)`
      )
    );
    svg.appendChild(bar);

    // Value label above bar
    svg.appendChild(
      el(
        "text",
        {
          x: bx + barWidth / 2,
          y: barTopY - 5,
          "font-size": 9.5,
          fill: "#1a1a1a",
          "text-anchor": "middle",
        },
        row.value.toFixed(1)
      )
    );

    // Delta label (small, colored)
    svg.appendChild(
      el(
        "text",
        {
          x: bx + barWidth / 2,
          y: y0 + 13,
          "font-size": 9,
          fill: color,
          "text-anchor": "middle",
          "font-weight": 600,
        },
        `${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(1)}`
      )
    );

    // Country label, rotated
    const labelX = bx + barWidth / 2;
    const labelY = y0 + 30;
    const label = el("text", {
      x: 0,
      y: 0,
      "font-size": 10,
      fill: "#333333",
      "text-anchor": "end",
      transform: `translate(${labelX},${labelY}) rotate(-40)`,
    });
    label.textContent = row.label;
    svg.appendChild(label);
  });

  // Legend
  const legendY = height - 14;
  svg.appendChild(el("rect", { x: margin.left, y: legendY - 9, width: 10, height: 10, fill: POSITIVE }));
  svg.appendChild(
    el("text", { x: margin.left + 14, y: legendY, "font-size": 10, fill: "#333333" }, "above baseline")
  );
  svg.appendChild(
    el("rect", { x: margin.left + 110, y: legendY - 9, width: 10, height: 10, fill: NEGATIVE })
  );
  svg.appendChild(
    el("text", { x: margin.left + 124, y: legendY, "font-size": 10, fill: "#333333" }, "below baseline")
  );
}
