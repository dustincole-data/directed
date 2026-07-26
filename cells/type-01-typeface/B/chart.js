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

  // Monospace pairing for pure-numeral roles (axis ticks, value/delta labels):
  // tabular figures keep stacked digits aligned, a standard chart-typography
  // move; the prose roles keep the inherited system sans above.
  const monoStack =
    "ui-monospace, 'SFMono-Regular', 'Roboto Mono', Menlo, Consolas, monospace";

  // Type scale: 5 roles, each with a committed size + weight so hierarchy
  // reads by more than size alone (title 17/700 > subtitle 14/500 >
  // row label 11.5/600 > caption 10/400 > footnote 9/400).
  const type = {
    subtitle: { size: 14, weight: 500 },
    label: { size: 11.5, weight: 600 },
    caption: { size: 10, weight: 400 },
    data: { size: 10, weight: 500 },
    footnote: { size: 9, weight: 400 },
  };

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

  const margin = { top: 64, right: 92, bottom: 36, left: 136 };
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

  // Title + subtitle
  svg.appendChild(
    el(
      "text",
      { x: margin.left, y: 22, "font-size": 17, "font-weight": 700, fill: "#1a1a1a" },
      `${titleLabel} by country`
    )
  );
  svg.appendChild(
    el(
      "text",
      {
        x: margin.left,
        y: 40,
        "font-size": type.subtitle.size,
        "font-weight": type.subtitle.weight,
        fill: "#666666",
      },
      `${rows.length} countries vs. world baseline of ${baseline.toFixed(2)} ${axisUnit}`
    )
  );

  // Legend (top right, independent of title length)
  const above = "#2a9d8f";
  const below = "#e76f51";
  // Darker text-only variants of the above/below hues: the swatch fills stay
  // as-is (color, not type), but as text fill on white they sit at ~3:1 and
  // ~2.9:1 contrast, below the 4.5:1 body-text floor. These hit ~5:1+.
  const aboveText = "#1f7a6f";
  const belowText = "#c1440e";
  svg.appendChild(el("rect", { x: 494, y: 10, width: 8, height: 8, fill: above, rx: 2 }));
  svg.appendChild(
    el(
      "text",
      { x: 506, y: 17, "font-size": type.caption.size, "font-weight": type.caption.weight, fill: "#444444" },
      "Above baseline"
    )
  );
  svg.appendChild(el("rect", { x: 494, y: 24, width: 8, height: 8, fill: below, rx: 2 }));
  svg.appendChild(
    el(
      "text",
      { x: 506, y: 31, "font-size": type.caption.size, "font-weight": type.caption.weight, fill: "#444444" },
      "Below baseline"
    )
  );

  const plot = el("g", { transform: `translate(${margin.left}, ${margin.top})` });
  svg.appendChild(plot);

  // Gridlines + x-axis ticks (nice step)
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
        stroke: "#e8e8e8",
        "stroke-width": 1,
      })
    );
    plot.appendChild(
      el(
        "text",
        {
          x: tx,
          y: innerHeight + 18,
          "font-size": type.caption.size,
          "font-family": monoStack,
          "font-variant-numeric": "tabular-nums",
          fill: "#6b6b6b",
          "text-anchor": "middle",
        },
        String(t)
      )
    );
  });

  plot.appendChild(
    el(
      "text",
      {
        x: innerWidth,
        y: innerHeight + 32,
        "font-size": type.caption.size,
        fill: "#6b6b6b",
        "text-anchor": "end",
      },
      axisUnit
    )
  );

  plot.appendChild(
    el("line", {
      x1: 0,
      x2: innerWidth,
      y1: innerHeight,
      y2: innerHeight,
      stroke: "#cccccc",
      "stroke-width": 1,
    })
  );

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
        "font-size": type.caption.size,
        fill: "#666666",
        "text-anchor": "middle",
      },
      `baseline ${baseline.toFixed(2)}`
    )
  );

  // Bars
  rows.forEach((row, i) => {
    const rowY = i * rowHeight + (rowHeight - barHeight) / 2;
    const isAbove = row.value >= baseline;
    const valueX = x(row.value);
    const barX = Math.min(baseX, valueX);
    const barW = Math.max(Math.abs(valueX - baseX), 1);
    const color = isAbove ? above : below;
    const textColor = isAbove ? aboveText : belowText;

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
          "font-size": type.label.size,
          "font-weight": type.label.weight,
          fill: "#333333",
          "text-anchor": "end",
        },
        row.label
      )
    );

    const deltaSign = row.delta > 0 ? "+" : "";
    const labelX = isAbove ? valueX + 6 : valueX - 6;
    plot.appendChild(
      el(
        "text",
        {
          x: labelX,
          y: rowY + barHeight / 2 + 4,
          "font-size": type.data.size,
          "font-weight": type.data.weight,
          "font-family": monoStack,
          "font-variant-numeric": "tabular-nums",
          fill: textColor,
          "text-anchor": isAbove ? "start" : "end",
        },
        `${row.value.toFixed(2)} (${deltaSign}${row.delta.toFixed(2)})`
      )
    );
  });

  // Source footnote
  if (data.source) {
    const footnote =
      data.source.length > 92 ? data.source.slice(0, 89) + "..." : data.source;
    svg.appendChild(
      el(
        "text",
        {
          x: margin.left,
          y: height - 8,
          "font-size": type.footnote.size,
          "font-weight": type.footnote.weight,
          fill: "#737373",
        },
        `Source: ${footnote}`
      )
    );
  }
}
