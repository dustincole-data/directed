export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const SVGNS = "http://www.w3.org/2000/svg";

  const width = meta.width;
  const height = meta.height;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("font-family", "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif");
  svg.setAttribute("font-kerning", "normal");

  function el(tag, attrs, text) {
    const node = doc.createElementNS(SVGNS, tag);
    for (const key in attrs) {
      node.setAttribute(key, attrs[key]);
    }
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Background
  svg.appendChild(el("rect", { x: 0, y: 0, width, height, fill: "#ffffff" }));

  // Title / subtitle
  svg.appendChild(
    el(
      "text",
      { x: width / 2, y: 22, "text-anchor": "middle", "font-size": 17, "font-weight": "bold", fill: "#1a1a1a" },
      "Life Expectancy at Birth vs. World Baseline"
    )
  );
  svg.appendChild(
    el(
      "text",
      { x: width / 2, y: 39, "text-anchor": "middle", "font-size": 11, fill: "#555555" },
      `Baseline (world): ${data.baseline} ${data.unit} — fetched ${data.fetched}`
    )
  );

  // Layout
  const margin = { top: 54, right: 56, bottom: 34, left: 150 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const rows = data.rows.slice().sort((a, b) => b.delta - a.delta);

  const deltas = rows.map((r) => r.delta);
  const rawMin = Math.min(0, ...deltas);
  const rawMax = Math.max(0, ...deltas);
  const pad = (rawMax - rawMin) * 0.08 || 1;
  const domainMin = rawMin - pad;
  const domainMax = rawMax + pad;

  function xScale(v) {
    return margin.left + ((v - domainMin) / (domainMax - domainMin)) * plotW;
  }

  const zeroX = xScale(0);

  const n = rows.length;
  const rowH = plotH / n;
  const barPad = rowH * 0.22;
  const barH = rowH - barPad * 2;

  const plot = el("g", {});
  svg.appendChild(plot);

  // Gridlines / x-axis ticks
  function niceStep(range) {
    const rough = range / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3.5) step = 2;
    else if (norm < 7.5) step = 5;
    else step = 10;
    return step * mag;
  }

  const step = niceStep(domainMax - domainMin);
  const tickStart = Math.ceil(domainMin / step) * step;
  const axisG = el("g", {});
  plot.appendChild(axisG);
  for (let t = tickStart; t <= domainMax; t += step) {
    const tx = xScale(t);
    const tRound = Math.round(t * 100) / 100;
    axisG.appendChild(
      el("line", {
        x1: tx,
        x2: tx,
        y1: margin.top,
        y2: margin.top + plotH,
        stroke: "#e8e8e8",
        "stroke-width": 1,
      })
    );
    axisG.appendChild(
      el(
        "text",
        {
          x: tx,
          y: margin.top + plotH + 16,
          "text-anchor": "middle",
          "font-size": 9,
          fill: "#666666",
          style: "font-variant-numeric: tabular-nums",
        },
        (tRound > 0 ? "+" : "") + tRound
      )
    );
  }
  axisG.appendChild(
    el(
      "text",
      {
        x: margin.left + plotW / 2,
        y: margin.top + plotH + 30,
        "text-anchor": "middle",
        "font-size": 11,
        fill: "#555555",
      },
      "Δ from world baseline (years)"
    )
  );

  // Bars + labels
  const posColor = "#2a9d8f";
  const negColor = "#e76f51";

  rows.forEach((row, i) => {
    const y = margin.top + i * rowH + barPad;
    const isPos = row.delta >= 0;
    const bx = Math.min(zeroX, xScale(row.delta));
    const bw = Math.abs(xScale(row.delta) - zeroX);

    plot.appendChild(
      el("rect", {
        x: bx,
        y,
        width: Math.max(bw, 0.5),
        height: barH,
        fill: isPos ? posColor : negColor,
        rx: 2,
      })
    );

    // Country label (left of plot)
    plot.appendChild(
      el(
        "text",
        {
          x: margin.left - 10,
          y: y + barH / 2 + 4,
          "text-anchor": "end",
          "font-size": 12,
          "font-weight": 600,
          fill: "#1a1a1a",
        },
        row.label
      )
    );

    // Delta value label at bar end
    const labelX = isPos ? xScale(row.delta) + 5 : xScale(row.delta) - 5;
    plot.appendChild(
      el(
        "text",
        {
          x: labelX,
          y: y + barH / 2 + 4,
          "text-anchor": isPos ? "start" : "end",
          "font-size": 10,
          fill: "#333333",
          style: "font-variant-numeric: tabular-nums",
        },
        `${row.delta > 0 ? "+" : ""}${row.delta} (${row.value})`
      )
    );
  });

  // Zero baseline line (drawn above bars for crispness)
  plot.appendChild(
    el("line", {
      x1: zeroX,
      x2: zeroX,
      y1: margin.top,
      y2: margin.top + plotH,
      stroke: "#333333",
      "stroke-width": 1.25,
    })
  );
}
