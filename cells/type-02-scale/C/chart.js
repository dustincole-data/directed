export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const SVGNS = "http://www.w3.org/2000/svg";

  const width = meta.width;
  const height = meta.height;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("font-family", "Arial, Helvetica, sans-serif");

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

  const padX = 24;

  // Title (serif, bold, left-aligned)
  svg.appendChild(
    el(
      "text",
      {
        x: padX,
        y: 28,
        "text-anchor": "start",
        "font-family": "Georgia, 'Times New Roman', serif",
        "font-size": 22,
        "font-weight": "bold",
        fill: "#1a1a1a",
      },
      "Life Expectancy at Birth vs. World Baseline"
    )
  );

  // Subtitle (sans, gray, left-aligned)
  svg.appendChild(
    el(
      "text",
      { x: padX, y: 47, "text-anchor": "start", "font-size": 11.5, fill: "#5b5b5b" },
      `Countries' life expectancy at birth compared with the world average of ${data.baseline} ${data.unit}.`
    )
  );

  // Layout
  const margin = { top: 66, right: 30, bottom: 54, left: 146 };
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
        stroke: "#dddddd",
        "stroke-width": 1,
        "stroke-dasharray": "2,2",
      })
    );
    axisG.appendChild(
      el(
        "text",
        {
          x: tx,
          y: margin.top + plotH + 16,
          "text-anchor": "middle",
          "font-size": 11,
          fill: "#6b6b6b",
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
        y: margin.top + plotH + 32,
        "text-anchor": "middle",
        "font-size": 10,
        fill: "#5b5b5b",
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
          y: y + barH / 2 + 3.5,
          "text-anchor": "end",
          "font-size": 11,
          fill: "#333333",
        },
        row.label
      )
    );

    // Delta value label at bar end, colored to match bar. If the outside
    // position would crowd the row labels (long negative bar) or the right
    // edge (long positive bar), draw the label inside the bar in white instead.
    const farEndX = xScale(row.delta);
    const labelText = `${row.delta > 0 ? "+" : ""}${row.delta} (${row.value})`;
    const crowded = isPos ? farEndX > width - margin.right - 45 : farEndX < margin.left + 45;
    const inside = crowded && bw > 42;
    const labelX = inside ? farEndX + (isPos ? -5 : 5) : farEndX + (isPos ? 5 : -5);
    const anchor = inside ? (isPos ? "end" : "start") : isPos ? "start" : "end";
    plot.appendChild(
      el(
        "text",
        {
          x: labelX,
          y: y + barH / 2 + 3.5,
          "text-anchor": anchor,
          "font-size": 9.5,
          fill: inside ? "#ffffff" : isPos ? posColor : negColor,
          "font-weight": "bold",
        },
        labelText
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

  // Footer / source citation (bottom-left, small gray, no raw URLs)
  const rawSource = String(data.source);
  const sourceLabel = /world bank/i.test(rawSource)
    ? "World Bank, life expectancy at birth"
    : rawSource.split(/[(?]/)[0].trim().slice(0, 60);
  svg.appendChild(
    el(
      "text",
      { x: padX, y: height - 10, "text-anchor": "start", "font-size": 9, fill: "#8a8a8a" },
      `Data source: ${sourceLabel} · fetched ${data.fetched}`
    )
  );
  svg.appendChild(
    el(
      "text",
      {
        x: width - padX,
        y: height - 10,
        "text-anchor": "end",
        "font-size": 9,
        fill: "#8a8a8a",
      },
      "Δ = country value − world baseline"
    )
  );
}
