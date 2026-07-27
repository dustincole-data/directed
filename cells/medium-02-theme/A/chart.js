export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const NS = "http://www.w3.org/2000/svg";

  const width = 640;
  const height = 400;
  const margin = { top: 56, right: 28, bottom: 48, left: 150 };
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

  const bg = el("rect", {
    x: 0,
    y: 0,
    width,
    height,
    fill: "#ffffff",
  });
  svg.appendChild(bg);

  const rows = data.rows.slice().sort((a, b) => b.delta - a.delta);

  const maxAbsDelta = Math.max(...rows.map((r) => Math.abs(r.delta)));
  const scaleMax = Math.ceil(maxAbsDelta / 2) * 2;

  const xScale = (delta) => (delta / scaleMax) * (innerWidth / 2);
  const xCenter = margin.left + innerWidth / 2;

  const barHeight = innerHeight / rows.length;
  const barPadding = barHeight * 0.22;

  // Title
  svg.appendChild(
    el(
      "text",
      {
        x: width / 2,
        y: 26,
        "text-anchor": "middle",
        "font-size": 17,
        "font-weight": "bold",
        fill: "#1a1a1a",
      },
      "Life Expectancy at Birth vs. World Baseline"
    )
  );

  svg.appendChild(
    el(
      "text",
      {
        x: width / 2,
        y: 44,
        "text-anchor": "middle",
        "font-size": 12,
        fill: "#555555",
      },
      `Baseline = ${data.baseline} years  |  ${data.unit}`
    )
  );

  const chartGroup = el("g", {
    transform: `translate(0, ${margin.top})`,
  });
  svg.appendChild(chartGroup);

  // Zero line
  chartGroup.appendChild(
    el("line", {
      x1: xCenter,
      x2: xCenter,
      y1: 0,
      y2: innerHeight,
      stroke: "#999999",
      "stroke-width": 1,
    })
  );

  rows.forEach((row, i) => {
    const y = i * barHeight + barPadding / 2;
    const h = barHeight - barPadding;
    const dx = xScale(row.delta);
    const barX = dx >= 0 ? xCenter : xCenter + dx;
    const barW = Math.abs(dx);
    const positive = row.delta >= 0;
    const color = positive ? "#2b6cb0" : "#c53030";

    chartGroup.appendChild(
      el("rect", {
        x: barX,
        y,
        width: barW,
        height: h,
        fill: color,
        rx: 2,
      })
    );

    // Country label (left side, outside plot)
    chartGroup.appendChild(
      el(
        "text",
        {
          x: margin.left - 10,
          y: y + h / 2 + 4,
          "text-anchor": "end",
          "font-size": 12,
          fill: "#222222",
        },
        row.label
      )
    );

    // Value + delta label at bar end
    const labelX = positive ? barX + barW + 6 : barX - 6;
    const anchor = positive ? "start" : "end";
    const deltaText = `${row.value.toFixed(1)}y (${
      row.delta >= 0 ? "+" : ""
    }${row.delta.toFixed(1)})`;

    chartGroup.appendChild(
      el(
        "text",
        {
          x: labelX,
          y: y + h / 2 + 4,
          "text-anchor": anchor,
          "font-size": 11,
          fill: "#333333",
        },
        deltaText
      )
    );
  });

  // Axis label
  svg.appendChild(
    el(
      "text",
      {
        x: width / 2,
        y: height - 12,
        "text-anchor": "middle",
        "font-size": 11,
        fill: "#555555",
      },
      "Difference from world baseline (years)"
    )
  );
}
