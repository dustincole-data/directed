export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const NS = "http://www.w3.org/2000/svg";

  const width = meta.width;
  const height = meta.height;

  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("font-family", "Helvetica, Arial, sans-serif");

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  function el(tag, attrs, text) {
    const node = doc.createElementNS(NS, tag);
    if (attrs) {
      for (const key in attrs) {
        node.setAttribute(key, attrs[key]);
      }
    }
    if (text !== undefined && text !== null) {
      node.textContent = text;
    }
    return node;
  }

  const baseline = data.baseline;
  const rows = data.rows.slice().sort((a, b) => b.value - a.value);

  const layoutMargin = { top: 46, right: 64, bottom: 34, left: 150 };
  const plotW = width - layoutMargin.left - layoutMargin.right;
  const plotH = height - layoutMargin.top - layoutMargin.bottom;

  const maxValue = Math.max(baseline, ...rows.map((r) => r.value));
  const xMax = Math.ceil((maxValue * 1.06) / 5) * 5;
  const xMin = 0;

  function xScale(v) {
    return layoutMargin.left + ((v - xMin) / (xMax - xMin)) * plotW;
  }

  const barCount = rows.length;
  const bandH = plotH / barCount;
  const barH = bandH * 0.62;

  function yBand(i) {
    return layoutMargin.top + i * bandH;
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
      x: layoutMargin.left,
      y: 24,
      "font-size": 16,
      "font-weight": "600",
      fill: "#1f2937",
    },
    "Life expectancy at birth vs. world baseline"
  );
  svg.appendChild(title);

  const subtitle = el(
    "text",
    {
      x: layoutMargin.left,
      y: 40,
      "font-size": 11.5,
      fill: "#6b7280",
    },
    `12 countries, ${data.unit} — world baseline ${baseline.toFixed(2)} yrs`
  );
  svg.appendChild(subtitle);

  const gridGroup = el("g", { stroke: "#e5e7eb", "stroke-width": 1 });
  svg.appendChild(gridGroup);

  const tickStep = xMax <= 60 ? 10 : 20;
  for (let v = 0; v <= xMax; v += tickStep) {
    const gx = xScale(v);
    gridGroup.appendChild(
      el("line", {
        x1: gx,
        x2: gx,
        y1: layoutMargin.top - 8,
        y2: layoutMargin.top + plotH,
      })
    );
    svg.appendChild(
      el(
        "text",
        {
          x: gx,
          y: layoutMargin.top + plotH + 18,
          "font-size": 10,
          fill: "#6b7280",
          "text-anchor": "middle",
        },
        String(v)
      )
    );
  }

  // Restrained, committed duo (quieter + brand pass): muted teal / burnt
  // terracotta, pulled back from stock-swatch saturation so the above/below
  // read stays calm and legible rather than alarm-toned, while still owning
  // a distinct, deliberate palette rather than a default gray-and-accent one.
  const ACCENT_ABOVE = "#1f6f66";
  const ACCENT_BELOW = "#a3481f";

  const barsGroup = el("g");
  svg.appendChild(barsGroup);

  rows.forEach((row, i) => {
    const y = yBand(i) + (bandH - barH) / 2;
    const x0 = xScale(xMin);
    const x1 = xScale(row.value);
    const isAbove = row.delta >= 0;
    const color = isAbove ? ACCENT_ABOVE : ACCENT_BELOW;

    barsGroup.appendChild(
      el("rect", {
        x: x0,
        y,
        width: Math.max(0, x1 - x0),
        height: barH,
        fill: color,
        rx: 2,
      })
    );

    barsGroup.appendChild(
      el(
        "text",
        {
          x: layoutMargin.left - 10,
          y: y + barH / 2 + 4,
          "font-size": 12,
          fill: "#1f2937",
          "text-anchor": "end",
        },
        row.label
      )
    );

    const deltaLabel = `${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(2)}`;
    barsGroup.appendChild(
      el(
        "text",
        {
          x: x1 + 6,
          y: y + barH / 2 + 4,
          "font-size": 10.5,
          fill: color,
          "font-weight": "500",
        },
        `${row.value.toFixed(2)} (${deltaLabel})`
      )
    );
  });

  const baselineX = xScale(baseline);
  svg.appendChild(
    el("line", {
      x1: baselineX,
      x2: baselineX,
      y1: layoutMargin.top - 12,
      y2: layoutMargin.top + plotH,
      stroke: "#374151",
      "stroke-width": 1.25,
      "stroke-dasharray": "4 3",
    })
  );
  svg.appendChild(
    el(
      "text",
      {
        x: baselineX,
        y: layoutMargin.top - 16,
        "font-size": 10.5,
        fill: "#374151",
        "text-anchor": "middle",
        "font-weight": "500",
      },
      `baseline ${baseline.toFixed(2)}`
    )
  );

  const legendY = height - 8;
  const legendGroup = el("g");
  svg.appendChild(legendGroup);

  legendGroup.appendChild(
    el("rect", {
      x: layoutMargin.left,
      y: legendY - 9,
      width: 10,
      height: 10,
      fill: ACCENT_ABOVE,
      rx: 2,
    })
  );
  legendGroup.appendChild(
    el(
      "text",
      {
        x: layoutMargin.left + 15,
        y: legendY,
        "font-size": 10.5,
        fill: "#374151",
      },
      "above baseline"
    )
  );

  const belowLegendX = layoutMargin.left + 130;
  legendGroup.appendChild(
    el("rect", {
      x: belowLegendX,
      y: legendY - 9,
      width: 10,
      height: 10,
      fill: ACCENT_BELOW,
      rx: 2,
    })
  );
  legendGroup.appendChild(
    el(
      "text",
      {
        x: belowLegendX + 15,
        y: legendY,
        "font-size": 10.5,
        fill: "#374151",
      },
      "below baseline"
    )
  );
}
