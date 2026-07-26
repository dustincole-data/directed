export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const svgNS = "http://www.w3.org/2000/svg";
  const { width, height } = meta;

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute(
    "font-family",
    "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  );

  function el(tag, attrs, text) {
    const node = doc.createElementNS(svgNS, tag);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (text != null) node.textContent = text;
    return node;
  }

  svg.appendChild(el("rect", { x: 0, y: 0, width, height, fill: "#ffffff" }));

  const rows = data.rows.slice().sort((a, b) => b.value - a.value);
  const baseline = data.baseline;

  const unitMatch = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(data.unit || "");
  const axisUnit = unitMatch ? unitMatch[1].trim() : data.unit || "";
  const titleLabel = unitMatch
    ? unitMatch[2].charAt(0).toUpperCase() + unitMatch[2].slice(1)
    : data.unit || "Value";

  const margin = { top: 66, right: 92, bottom: 40, left: 136 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const rowHeight = innerHeight / rows.length;
  const barHeight = Math.min(18, rowHeight * 0.62);

  const allValues = rows.map((r) => r.value).concat([baseline]);
  const rawMin = Math.min.apply(null, allValues);
  const rawMax = Math.max.apply(null, allValues);
  const pad = Math.max((rawMax - rawMin) * 0.1, 1);
  const domainMin = rawMin - pad;
  const domainMax = rawMax + pad;
  const span = domainMax - domainMin || 1;

  function x(v) {
    return ((v - domainMin) / span) * innerWidth;
  }

  const above = "#2a9d8f";
  const below = "#e76f51";

  // Title (serif display face) + subtitle (muted sans paragraph), OWID-style masthead.
  svg.appendChild(
    el(
      "text",
      {
        x: margin.left,
        y: 26,
        "font-family": "Georgia, 'Times New Roman', serif",
        "font-size": 19,
        "font-weight": 700,
        fill: "#1d1d1d",
      },
      `${titleLabel} by country`
    )
  );
  svg.appendChild(
    el(
      "text",
      { x: margin.left, y: 45, "font-size": 12, fill: "#5b5b5b" },
      `${rows.length} countries vs. world baseline of ${baseline.toFixed(2)} ${axisUnit}`
    )
  );

  const plot = el("g", { transform: `translate(${margin.left}, ${margin.top})` });
  svg.appendChild(plot);

  // Gridlines + x-axis ticks (nice step) — light dashed rules, unit folded into each label.
  const tickCount = 5;
  const rawStep = span / (tickCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceMultiples = [1, 2, 5, 10];
  let step = magnitude;
  for (let i = 0; i < niceMultiples.length; i++) {
    if (rawStep <= niceMultiples[i] * magnitude) {
      step = niceMultiples[i] * magnitude;
      break;
    }
  }
  const tickStart = Math.ceil(domainMin / step) * step;
  const ticks = [];
  for (let t = tickStart; t <= domainMax + 1e-9; t += step) {
    ticks.push(Math.round(t * 100) / 100);
  }

  ticks.forEach((t) => {
    const tx = x(t);
    plot.appendChild(
      el("line", {
        x1: tx,
        x2: tx,
        y1: 0,
        y2: innerHeight,
        stroke: "#e3e3e3",
        "stroke-width": 1,
        "stroke-dasharray": "3,3",
      })
    );
    plot.appendChild(
      el("line", {
        x1: tx,
        x2: tx,
        y1: innerHeight,
        y2: innerHeight + 4,
        stroke: "#bbbbbb",
        "stroke-width": 1,
      })
    );
    plot.appendChild(
      el(
        "text",
        {
          x: tx,
          y: innerHeight + 18,
          "font-size": 10.5,
          fill: "#888888",
          "text-anchor": "middle",
        },
        `${t} ${axisUnit}`
      )
    );
  });

  // Baseline reference line
  const baseX = x(baseline);
  plot.appendChild(
    el("line", {
      x1: baseX,
      x2: baseX,
      y1: -4,
      y2: innerHeight,
      stroke: "#999999",
      "stroke-width": 1.25,
      "stroke-dasharray": "4,3",
    })
  );
  plot.appendChild(
    el(
      "text",
      {
        x: baseX,
        y: -8,
        "font-size": 10.5,
        fill: "#666666",
        "text-anchor": "middle",
      },
      `baseline ${baseline.toFixed(2)}`
    )
  );

  // Bars, with smart label placement: outside the bar when there's room,
  // otherwise inside (white) so long bars near the axis never collide with
  // the row's category label.
  const maxRightLocalX = innerWidth + margin.right - 10;

  rows.forEach((row, i) => {
    const rowY = i * rowHeight + (rowHeight - barHeight) / 2;
    const isAbove = row.value >= baseline;
    const valueX = x(row.value);
    const barX = Math.min(baseX, valueX);
    const barW = Math.max(Math.abs(valueX - baseX), 1);
    const color = isAbove ? above : below;

    plot.appendChild(
      el("rect", {
        x: barX,
        y: rowY,
        width: barW,
        height: barHeight,
        fill: color,
        rx: 2,
      })
    );

    plot.appendChild(
      el(
        "text",
        {
          x: -10,
          y: rowY + barHeight / 2 + 4,
          "font-size": 11.5,
          fill: "#333333",
          "text-anchor": "end",
        },
        row.label
      )
    );

    const deltaSign = row.delta > 0 ? "+" : "";
    const labelText = `${row.value.toFixed(2)} (${deltaSign}${row.delta.toFixed(2)})`;
    const labelWidth = labelText.length * 5.6;
    const fitsInside = barW >= labelWidth + 10;
    const fitsOutside = isAbove
      ? maxRightLocalX - (valueX + 6) >= labelWidth
      : valueX - 6 - labelWidth >= 4;

    let labelX, anchor, labelFill;
    if (fitsOutside) {
      labelX = isAbove ? valueX + 6 : valueX - 6;
      anchor = isAbove ? "start" : "end";
      labelFill = color;
    } else if (fitsInside) {
      labelX = isAbove ? barX + barW - 6 : barX + 6;
      anchor = isAbove ? "end" : "start";
      labelFill = "#ffffff";
    } else {
      labelX = isAbove ? valueX + 6 : Math.max(valueX - 6, labelWidth + 4);
      anchor = isAbove ? "start" : "end";
      labelFill = color;
    }

    plot.appendChild(
      el(
        "text",
        {
          x: labelX,
          y: rowY + barHeight / 2 + 4,
          "font-size": 10.5,
          fill: labelFill,
          "text-anchor": anchor,
        },
        labelText
      )
    );
  });

  // Footer: muted, low-emphasis attribution.
  if (data.source) {
    const footnote =
      data.source.length > 92 ? data.source.slice(0, 89) + "..." : data.source;
    svg.appendChild(
      el(
        "text",
        {
          x: margin.left,
          y: height - 8,
          "font-size": 9,
          fill: "#a0a0a0",
        },
        `Data source: ${footnote}`
      )
    );
  }
}
