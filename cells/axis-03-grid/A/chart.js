export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const NS = "http://www.w3.org/2000/svg";

  const width = 640;
  const height = 400;
  const margin = { top: 48, right: 32, bottom: 90, left: 56 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("font-family", "Helvetica, Arial, sans-serif");

  function el(tag, attrs, text) {
    const node = doc.createElementNS(NS, tag);
    for (const key in attrs) {
      node.setAttribute(key, attrs[key]);
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  const bg = el("rect", { x: 0, y: 0, width, height, fill: "#ffffff" });
  svg.appendChild(bg);

  const title = el(
    "text",
    { x: margin.left, y: 24, "font-size": 16, "font-weight": "bold", fill: "#1a1a1a" },
    "Life Expectancy at Birth vs. World Baseline"
  );
  svg.appendChild(title);

  const subtitle = el(
    "text",
    { x: margin.left, y: 40, "font-size": 11, fill: "#666666" },
    `Baseline = ${data.baseline} years (World Bank)`
  );
  svg.appendChild(subtitle);

  const rows = data.rows.slice().sort((a, b) => b.value - a.value);

  const maxValue = Math.max(data.baseline, ...rows.map((r) => r.value));
  const minValue = Math.min(data.baseline, ...rows.map((r) => r.value));
  const pad = (maxValue - minValue) * 0.1 || 1;
  const yMax = maxValue + pad;
  const yMin = Math.min(0, minValue - pad);

  function yScale(v) {
    return margin.top + innerHeight * (1 - (v - yMin) / (yMax - yMin));
  }

  const bandWidth = innerWidth / rows.length;
  const barWidth = bandWidth * 0.6;

  const chartGroup = el("g", {});
  svg.appendChild(chartGroup);

  // Gridlines + y-axis ticks
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const value = yMin + ((yMax - yMin) * i) / tickCount;
    const y = yScale(value);
    chartGroup.appendChild(
      el("line", {
        x1: margin.left,
        x2: margin.left + innerWidth,
        y1: y,
        y2: y,
        stroke: "#e0e0e0",
        "stroke-width": 1,
      })
    );
    chartGroup.appendChild(
      el(
        "text",
        {
          x: margin.left - 8,
          y: y + 3,
          "font-size": 10,
          fill: "#666666",
          "text-anchor": "end",
        },
        value.toFixed(0)
      )
    );
  }

  // Baseline reference line
  const baselineY = yScale(data.baseline);
  chartGroup.appendChild(
    el("line", {
      x1: margin.left,
      x2: margin.left + innerWidth,
      y1: baselineY,
      y2: baselineY,
      stroke: "#d62728",
      "stroke-width": 1.5,
      "stroke-dasharray": "4,3",
    })
  );
  chartGroup.appendChild(
    el(
      "text",
      {
        x: margin.left + innerWidth,
        y: baselineY - 5,
        "font-size": 10,
        fill: "#d62728",
        "text-anchor": "end",
      },
      `World baseline: ${data.baseline}`
    )
  );

  // Bars
  rows.forEach((row, i) => {
    const bandX = margin.left + i * bandWidth;
    const barX = bandX + (bandWidth - barWidth) / 2;
    const barY = yScale(row.value);
    const barHeight = margin.top + innerHeight - barY;
    const color = row.delta >= 0 ? "#2c7fb8" : "#e6550d";

    chartGroup.appendChild(
      el("rect", {
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        fill: color,
      })
    );

    chartGroup.appendChild(
      el(
        "text",
        {
          x: barX + barWidth / 2,
          y: barY - 6,
          "font-size": 10,
          fill: "#1a1a1a",
          "text-anchor": "middle",
        },
        row.value.toFixed(1)
      )
    );

    const deltaLabel = `${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(1)}`;
    chartGroup.appendChild(
      el(
        "text",
        {
          x: barX + barWidth / 2,
          y: margin.top + innerHeight + 14,
          "font-size": 9,
          fill: color,
          "text-anchor": "middle",
        },
        deltaLabel
      )
    );

    chartGroup.appendChild(
      el(
        "text",
        {
          x: barX + barWidth / 2,
          y: margin.top + innerHeight + 28,
          "font-size": 10,
          fill: "#333333",
          "text-anchor": "end",
          transform: `rotate(-40, ${barX + barWidth / 2}, ${margin.top + innerHeight + 28})`,
        },
        row.label
      )
    );
  });

  // Axis line
  chartGroup.appendChild(
    el("line", {
      x1: margin.left,
      x2: margin.left + innerWidth,
      y1: margin.top + innerHeight,
      y2: margin.top + innerHeight,
      stroke: "#333333",
      "stroke-width": 1,
    })
  );

  // Y-axis unit label
  chartGroup.appendChild(
    el(
      "text",
      {
        x: 14,
        y: margin.top - 10,
        "font-size": 10,
        fill: "#666666",
      },
      data.unit
    )
  );
}
