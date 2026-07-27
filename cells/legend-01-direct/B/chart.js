import { placeAnnotations } from "../../../src/craft/annotation.ts";

export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const NS = "http://www.w3.org/2000/svg";

  const width = meta.width;
  const height = meta.height;
  const margin = { top: 48, right: 24, bottom: 56, left: 160 };
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

  const title = el(
    "text",
    {
      x: width / 2,
      y: 24,
      "text-anchor": "middle",
      "font-size": 16,
      "font-weight": "bold",
      fill: "#1a1a1a",
    },
    "Life Expectancy at Birth vs. World Baseline"
  );
  svg.appendChild(title);

  const subtitle = el(
    "text",
    {
      x: width / 2,
      y: 40,
      "text-anchor": "middle",
      "font-size": 11,
      fill: "#666666",
    },
    `Baseline = ${data.baseline} ${data.unit}`
  );
  svg.appendChild(subtitle);

  const rows = data.rows.slice().sort((a, b) => b.delta - a.delta);

  const maxAbsDelta = Math.max(...rows.map((r) => Math.abs(r.delta)));
  const scaleMax = Math.ceil(maxAbsDelta / 5) * 5 || 1;

  const xScale = (delta) => (delta / scaleMax) * (innerWidth / 2);
  const centerX = margin.left + innerWidth / 2;

  const barHeight = innerHeight / rows.length;
  const barPadding = barHeight * 0.25;

  const plotGroup = el("g", {
    transform: `translate(${margin.left}, ${margin.top})`,
  });
  svg.appendChild(plotGroup);

  const zeroLine = el("line", {
    x1: innerWidth / 2,
    y1: 0,
    x2: innerWidth / 2,
    y2: innerHeight,
    stroke: "#999999",
    "stroke-width": 1,
  });
  plotGroup.appendChild(zeroLine);

  const anchors = [];

  rows.forEach((row, i) => {
    const y = i * barHeight + barPadding / 2;
    const h = barHeight - barPadding;
    const dx = xScale(row.delta);
    const barX = dx >= 0 ? innerWidth / 2 : innerWidth / 2 + dx;
    const barW = Math.abs(dx);
    const color = row.delta >= 0 ? "#2b7a78" : "#c0392b";

    const bar = el("rect", {
      x: barX,
      y,
      width: barW,
      height: h,
      fill: color,
    });
    plotGroup.appendChild(bar);

    const label = el(
      "text",
      {
        x: -10,
        y: y + h / 2 + 4,
        "text-anchor": "end",
        "font-size": 12,
        fill: "#1a1a1a",
      },
      row.label
    );
    plotGroup.appendChild(label);

    anchors.push({
      x: margin.left + innerWidth / 2 + dx,
      y: margin.top + y + h / 2,
      text: `${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(2)}`,
      markRadius: h / 2,
    });
  });

  const placed = placeAnnotations(anchors, { width, height });

  placed.forEach((p) => {
    if (p.leader) {
      const leaderLine = el("line", {
        x1: p.leader.x1,
        y1: p.leader.y1,
        x2: p.leader.x2,
        y2: p.leader.y2,
        stroke: "#999999",
        "stroke-width": 1,
      });
      svg.appendChild(leaderLine);
    }

    const valueLabel = el(
      "text",
      {
        x: p.x,
        y: p.y,
        "text-anchor": p.anchor,
        "font-size": 11,
        fill: "#333333",
      },
      p.text
    );
    svg.appendChild(valueLabel);
  });

  const legendGroup = el("g", {
    transform: `translate(${margin.left}, ${height - 24})`,
  });
  svg.appendChild(legendGroup);

  const legendSwatchAbove = el("rect", {
    x: 0,
    y: -10,
    width: 12,
    height: 12,
    fill: "#2b7a78",
  });
  legendGroup.appendChild(legendSwatchAbove);

  const legendLabelAbove = el(
    "text",
    {
      x: 18,
      y: 0,
      "font-size": 11,
      fill: "#1a1a1a",
    },
    "Above baseline"
  );
  legendGroup.appendChild(legendLabelAbove);

  const legendSwatchBelow = el("rect", {
    x: 150,
    y: -10,
    width: 12,
    height: 12,
    fill: "#c0392b",
  });
  legendGroup.appendChild(legendSwatchBelow);

  const legendLabelBelow = el(
    "text",
    {
      x: 168,
      y: 0,
      "font-size": 11,
      fill: "#1a1a1a",
    },
    "Below baseline"
  );
  legendGroup.appendChild(legendLabelBelow);
}
