export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const svgNS = "http://www.w3.org/2000/svg";
  const FONT = "'Helvetica Neue', Arial, sans-serif";

  const width = meta.width;
  const height = meta.height;

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("font-family", FONT);

  function el(tag, attrs, text) {
    const node = doc.createElementNS(svgNS, tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (v !== undefined && v !== null) node.setAttribute(k, String(v));
    }
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Background
  svg.appendChild(el("rect", { x: 0, y: 0, width, height, fill: "#ffffff" }));

  // Layout
  const margin = { top: 58, right: 74, bottom: 32, left: 132 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  // Title + subtitle
  svg.appendChild(
    el(
      "text",
      { x: margin.left, y: 22, "font-size": 16, "font-weight": 700, fill: "#1a1a1a", "font-family": FONT },
      "Life Expectancy at Birth vs. World Baseline"
    )
  );
  svg.appendChild(
    el(
      "text",
      { x: margin.left, y: 39, "font-size": 11.5, fill: "#666666", "font-family": FONT },
      `12 countries · baseline ${data.baseline.toFixed(2)} yrs · World Bank, fetched ${data.fetched}`
    )
  );

  // Legend (top-right)
  const legendX = width - margin.right - 150;
  const legendY = 12;
  svg.appendChild(el("rect", { x: legendX, y: legendY, width: 10, height: 10, fill: "#1b9e77", rx: 2 }));
  svg.appendChild(
    el("text", { x: legendX + 14, y: legendY + 9, "font-size": 10, fill: "#444444", "font-family": FONT }, "Above baseline")
  );
  svg.appendChild(el("rect", { x: legendX, y: legendY + 15, width: 10, height: 10, fill: "#d95f02", rx: 2 }));
  svg.appendChild(
    el("text", { x: legendX + 14, y: legendY + 24, "font-size": 10, fill: "#444444", "font-family": FONT }, "Below baseline")
  );

  // Sort rows by delta, descending (best to worst)
  const rows = data.rows.slice().sort((a, b) => b.delta - a.delta);

  // Domain: pad a few units past the rounded extremes so end labels never
  // crowd the chart edge or the row labels.
  const deltas = rows.map((r) => r.delta);
  const rawMin = Math.min(...deltas, 0);
  const rawMax = Math.max(...deltas, 0);
  const domainMin = Math.floor((rawMin - 3) / 5) * 5;
  const domainMax = Math.ceil((rawMax + 3) / 5) * 5;
  const span = domainMax - domainMin;

  function xScale(v) {
    return margin.left + ((v - domainMin) / span) * chartW;
  }

  const zeroX = xScale(0);
  const chartTop = margin.top;
  const chartBottom = margin.top + chartH;

  const chartG = el("g", {});
  svg.appendChild(chartG);

  // Gridlines + axis ticks
  const tickStep = 5;
  for (let t = domainMin; t <= domainMax + 0.001; t += tickStep) {
    const tx = xScale(t);
    chartG.appendChild(
      el("line", {
        x1: tx,
        x2: tx,
        y1: chartTop,
        y2: chartBottom,
        stroke: t === 0 ? "#999999" : "#e6e6e6",
        "stroke-width": t === 0 ? 1.25 : 1,
      })
    );
    chartG.appendChild(
      el(
        "text",
        { x: tx, y: chartBottom + 16, "font-size": 9.5, fill: "#888888", "text-anchor": "middle", "font-family": FONT },
        (t > 0 ? "+" : "") + t
      )
    );
  }

  chartG.appendChild(
    el(
      "text",
      { x: zeroX, y: chartTop - 8, "font-size": 9.5, fill: "#777777", "text-anchor": "middle", "font-family": FONT },
      "baseline"
    )
  );

  // Bars
  const rowH = chartH / rows.length;
  const barH = rowH * 0.58;

  const posColor = "#1b9e77";
  const negColor = "#d95f02";

  rows.forEach((row, i) => {
    const rowY = chartTop + i * rowH;
    const barY = rowY + (rowH - barH) / 2;
    const vx = xScale(row.delta);
    const barX = Math.min(zeroX, vx);
    const barW = Math.max(Math.abs(vx - zeroX), 0.5);
    const color = row.delta >= 0 ? posColor : negColor;
    const textY = barY + barH / 2 + 3.5;

    chartG.appendChild(el("rect", { x: barX, y: barY, width: barW, height: barH, fill: color, rx: 2, ry: 2 }));

    // Country label (left of chart)
    chartG.appendChild(
      el(
        "text",
        { x: margin.left - 10, y: textY, "font-size": 11, fill: "#333333", "text-anchor": "end", "font-family": FONT },
        row.label
      )
    );

    // Delta value label at the outer end of the bar
    const deltaText = (row.delta > 0 ? "+" : "") + row.delta.toFixed(2);
    const labelX = row.delta >= 0 ? vx + 6 : vx - 6;
    const anchor = row.delta >= 0 ? "start" : "end";

    chartG.appendChild(
      el(
        "text",
        {
          x: labelX,
          y: textY,
          "font-size": 10.5,
          fill: "#333333",
          "text-anchor": anchor,
          "font-weight": 600,
          "font-family": FONT,
        },
        deltaText
      )
    );
  });

  // Axis caption
  svg.appendChild(
    el(
      "text",
      { x: margin.left + chartW / 2, y: height - 4, "font-size": 10, fill: "#888888", "text-anchor": "middle", "font-family": FONT },
      "Δ years from world baseline"
    )
  );
}
