export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const NS = "http://www.w3.org/2000/svg";

  const width = 640;
  const height = 400;
  const margin = { top: 48, right: 32, bottom: 32, left: 140 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("font-family", "Helvetica, Arial, sans-serif");

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  function el(tag, attrs, text) {
    const node = doc.createElementNS(NS, tag);
    for (const key in attrs) {
      node.setAttribute(key, attrs[key]);
    }
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const rows = data.rows.slice().sort((a, b) => b.delta - a.delta);
  const baseline = data.baseline;

  const maxAbsDelta = Math.max(...rows.map((r) => Math.abs(r.delta)));
  const scaleMax = Math.ceil(maxAbsDelta / 2) * 2;

  const zeroX = margin.left + innerWidth / 2;
  const xScale = innerWidth / 2 / scaleMax;

  const bandHeight = innerHeight / rows.length;
  const barHeight = bandHeight * 0.6;

  const bg = el("rect", { x: 0, y: 0, width, height, fill: "#ffffff" });
  svg.appendChild(bg);

  const title = el(
    "text",
    { x: margin.left, y: 24, "font-size": "16", "font-weight": "bold", fill: "#111111" },
    "Life Expectancy at Birth vs. World Baseline"
  );
  svg.appendChild(title);

  const subtitle = el(
    "text",
    { x: margin.left, y: 40, "font-size": "11", fill: "#555555" },
    `Deviation from world baseline of ${baseline} years, by country`
  );
  svg.appendChild(subtitle);

  const plotArea = el("g", { transform: `translate(0, ${margin.top})` });
  svg.appendChild(plotArea);

  const zeroLine = el("line", {
    x1: zeroX,
    x2: zeroX,
    y1: 0,
    y2: innerHeight,
    stroke: "#999999",
    "stroke-width": "1",
  });
  plotArea.appendChild(zeroLine);

  rows.forEach((row, i) => {
    const bandTop = i * bandHeight;
    const barY = bandTop + (bandHeight - barHeight) / 2;

    const isPositive = row.delta >= 0;
    const barWidth = Math.abs(row.delta) * xScale;
    const barX = isPositive ? zeroX : zeroX - barWidth;
    const color = isPositive ? "#2b7a78" : "#c0433d";

    const bar = el("rect", {
      x: barX,
      y: barY,
      width: barWidth,
      height: barHeight,
      fill: color,
    });
    plotArea.appendChild(bar);

    const label = el(
      "text",
      {
        x: margin.left - 10,
        y: bandTop + bandHeight / 2 + 4,
        "text-anchor": "end",
        "font-size": "12",
        fill: "#222222",
      },
      row.label
    );
    plotArea.appendChild(label);

    const valueLabelX = isPositive ? barX + barWidth + 6 : barX - 6;
    const valueLabel = el(
      "text",
      {
        x: valueLabelX,
        y: bandTop + bandHeight / 2 + 4,
        "text-anchor": isPositive ? "start" : "end",
        "font-size": "11",
        fill: "#333333",
      },
      `${row.delta > 0 ? "+" : ""}${row.delta.toFixed(2)}`
    );
    plotArea.appendChild(valueLabel);
  });

  const axisLabel = el(
    "text",
    {
      x: zeroX,
      y: innerHeight + 20,
      "text-anchor": "middle",
      "font-size": "10",
      fill: "#666666",
    },
    "Δ years from baseline"
  );
  plotArea.appendChild(axisLabel);
}
