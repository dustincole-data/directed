export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const svgNS = "http://www.w3.org/2000/svg";
  const FONT = "'Helvetica Neue', Arial, sans-serif";

  // Design tokens (dataviz skill: chart chrome & ink, light mode)
  const SURFACE = "#fcfcfb";
  const INK_PRIMARY = "#0b0b0b";
  const INK_SECONDARY = "#52514e";
  const INK_MUTED = "#898781";
  const GRIDLINE = "#e1e0d9";
  const BASELINE_AXIS = "#c3c2b7";

  // Diverging pair (job: polarity, above/below a baseline) — documented
  // palette hues, warm/cool poles that read as opposite.
  const POS_COLOR = "#2a78d6"; // blue — above baseline
  const NEG_COLOR = "#e34948"; // red — below baseline

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
  svg.appendChild(el("rect", { x: 0, y: 0, width, height, fill: SURFACE }));

  // Layout
  const margin = { top: 58, right: 74, bottom: 32, left: 132 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  // Title + subtitle
  svg.appendChild(
    el(
      "text",
      { x: margin.left, y: 22, "font-size": 16, "font-weight": 700, fill: INK_PRIMARY, "font-family": FONT },
      "Life Expectancy at Birth vs. World Baseline"
    )
  );
  svg.appendChild(
    el(
      "text",
      { x: margin.left, y: 39, "font-size": 11.5, fill: INK_SECONDARY, "font-family": FONT },
      `12 countries · baseline ${data.baseline.toFixed(2)} yrs · World Bank, fetched ${data.fetched}`
    )
  );

  // Legend (top-right) — a legend is always present for 2 series; the bars
  // are also direct-labeled below, so identity is never color-alone.
  const legendX = width - margin.right - 150;
  const legendY = 12;
  svg.appendChild(el("rect", { x: legendX, y: legendY, width: 10, height: 10, fill: POS_COLOR, rx: 2 }));
  svg.appendChild(
    el("text", { x: legendX + 14, y: legendY + 9, "font-size": 10, fill: INK_SECONDARY, "font-family": FONT }, "Above baseline")
  );
  svg.appendChild(el("rect", { x: legendX, y: legendY + 15, width: 10, height: 10, fill: NEG_COLOR, rx: 2 }));
  svg.appendChild(
    el("text", { x: legendX + 14, y: legendY + 24, "font-size": 10, fill: INK_SECONDARY, "font-family": FONT }, "Below baseline")
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

  // Gridlines + axis ticks — hairline, solid, recessive; the zero line
  // doubles as the baseline/axis token and reads as the neutral midpoint.
  const tickStep = 5;
  for (let t = domainMin; t <= domainMax + 0.001; t += tickStep) {
    const tx = xScale(t);
    chartG.appendChild(
      el("line", {
        x1: tx,
        x2: tx,
        y1: chartTop,
        y2: chartBottom,
        stroke: t === 0 ? BASELINE_AXIS : GRIDLINE,
        "stroke-width": t === 0 ? 1.25 : 1,
      })
    );
    chartG.appendChild(
      el(
        "text",
        { x: tx, y: chartBottom + 16, "font-size": 9.5, fill: INK_MUTED, "text-anchor": "middle", "font-family": FONT },
        (t > 0 ? "+" : "") + t
      )
    );
  }

  chartG.appendChild(
    el(
      "text",
      { x: zeroX, y: chartTop - 8, "font-size": 9.5, fill: INK_MUTED, "text-anchor": "middle", "font-family": FONT },
      "baseline"
    )
  );

  // Bars — capped thickness (well under the 24px ceiling), 4px rounded
  // data-end, square at the baseline edge each bar grows from.
  const rowH = chartH / rows.length;
  const barH = rowH * 0.58;
  const CORNER = 4;

  // Half-rounded rect path: rounds only the two corners on `roundSide`
  // (the data end), leaves the baseline edge square.
  function halfRoundedPath(x, y, w, h, r, roundSide) {
    const rad = Math.max(0, Math.min(r, w, h / 2));
    if (roundSide === "right") {
      return (
        `M${x},${y} H${x + w - rad} ` +
        `Q${x + w},${y} ${x + w},${y + rad} ` +
        `V${y + h - rad} Q${x + w},${y + h} ${x + w - rad},${y + h} ` +
        `H${x} Z`
      );
    }
    return (
      `M${x + rad},${y} H${x + w} V${y + h} H${x + rad} ` +
      `Q${x},${y + h} ${x},${y + h - rad} ` +
      `V${y + rad} Q${x},${y} ${x + rad},${y} Z`
    );
  }

  // Hover layer (default for a bar chart): one shared tooltip, positioned
  // per-mark. Hidden until a bar's hit target reports pointer or focus.
  const tooltip = el("g", { visibility: "hidden" });
  const tooltipBg = el("rect", { width: 116, height: 34, rx: 4, ry: 4, fill: INK_PRIMARY, opacity: 0.94 });
  const tooltipLabel = el("text", { "font-size": 10.5, fill: "#ffffff", "font-family": FONT });
  const tooltipValue = el("text", { "font-size": 11.5, "font-weight": 700, fill: "#ffffff", "font-family": FONT });
  tooltip.appendChild(tooltipBg);
  tooltip.appendChild(tooltipLabel);
  tooltip.appendChild(tooltipValue);

  const TOOLTIP_W = 116;
  const TOOLTIP_H = 34;

  rows.forEach((row, i) => {
    const rowY = chartTop + i * rowH;
    const barY = rowY + (rowH - barH) / 2;
    const vx = xScale(row.delta);
    const isPos = row.delta >= 0;
    const barX = Math.min(zeroX, vx);
    const barW = Math.max(Math.abs(vx - zeroX), 0.5);
    const color = isPos ? POS_COLOR : NEG_COLOR;
    const textY = barY + barH / 2 + 3.5;

    const bar = el("path", {
      d: halfRoundedPath(barX, barY, barW, barH, CORNER, isPos ? "right" : "left"),
      fill: color,
    });
    chartG.appendChild(bar);

    // Country label (left of chart) — a text token, never the series color.
    chartG.appendChild(
      el(
        "text",
        { x: margin.left - 10, y: textY, "font-size": 11, fill: INK_SECONDARY, "text-anchor": "end", "font-family": FONT },
        row.label
      )
    );

    // Delta value label at the outer end of the bar (bars label at the tip).
    const deltaText = (row.delta > 0 ? "+" : "") + row.delta.toFixed(2);
    const labelX = isPos ? vx + 6 : vx - 6;
    const anchor = isPos ? "start" : "end";

    chartG.appendChild(
      el(
        "text",
        {
          x: labelX,
          y: textY,
          "font-size": 10.5,
          fill: INK_PRIMARY,
          "text-anchor": anchor,
          "font-weight": 600,
          "font-family": FONT,
        },
        deltaText
      )
    );

    // Hit target: the full row band (bigger than the thin bar itself, and
    // already past the 24px minimum), with the same detail on hover and
    // keyboard focus. Labels are untrusted data, so use textContent only.
    const hit = el("rect", {
      x: margin.left,
      y: rowY,
      width: chartW,
      height: rowH,
      fill: "transparent",
      tabindex: 0,
      "aria-label": `${row.label}: ${deltaText} years vs. baseline`,
    });

    function showTooltip() {
      tooltipLabel.textContent = row.label;
      tooltipValue.textContent = `${deltaText} yrs`;
      let boxX = isPos ? vx + 10 : vx - 10 - TOOLTIP_W;
      boxX = Math.max(2, Math.min(boxX, width - TOOLTIP_W - 2));
      const boxY = Math.max(2, Math.min(rowY - 2, height - TOOLTIP_H - 2));
      tooltipBg.setAttribute("x", boxX);
      tooltipBg.setAttribute("y", boxY);
      tooltipLabel.setAttribute("x", boxX + 10);
      tooltipLabel.setAttribute("y", boxY + 14);
      tooltipValue.setAttribute("x", boxX + 10);
      tooltipValue.setAttribute("y", boxY + 27);
      bar.setAttribute("stroke", SURFACE);
      bar.setAttribute("stroke-width", 2);
      tooltip.setAttribute("visibility", "visible");
    }
    function hideTooltip() {
      bar.removeAttribute("stroke");
      bar.removeAttribute("stroke-width");
      tooltip.setAttribute("visibility", "hidden");
    }

    hit.addEventListener("pointerenter", showTooltip);
    hit.addEventListener("pointermove", showTooltip);
    hit.addEventListener("pointerleave", hideTooltip);
    hit.addEventListener("focus", showTooltip);
    hit.addEventListener("blur", hideTooltip);

    chartG.appendChild(hit);
  });

  svg.appendChild(tooltip);

  // Axis caption
  svg.appendChild(
    el(
      "text",
      { x: margin.left + chartW / 2, y: height - 4, "font-size": 10, fill: INK_MUTED, "text-anchor": "middle", "font-family": FONT },
      "Δ years from world baseline"
    )
  );
}
