export const meta = { fixture: "table12", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const width = meta.width;
  const height = meta.height;

  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("font-family", "Helvetica, Arial, sans-serif");

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  function el(name, attrs, text) {
    const node = doc.createElementNS(SVG_NS, name);
    if (attrs) {
      for (const key of Object.keys(attrs)) {
        node.setAttribute(key, String(attrs[key]));
      }
    }
    if (text !== undefined && text !== null) {
      node.textContent = text;
    }
    return node;
  }

  // Chart chrome & ink (dataviz skill reference palette, light mode)
  const SURFACE = "#fcfcfb";
  const INK_PRIMARY = "#0b0b0b";
  const INK_SECONDARY = "#52514e";
  const INK_MUTED = "#898781";
  const GRIDLINE = "#e1e0d9";
  const AXIS = "#c3c2b7";
  const BORDER = "rgba(11,11,11,0.10)";
  // This is a polarity encoding (above/below a baseline) -> the diverging
  // job: two poles that read as opposite. Blue/red, documented pair.
  const POSITIVE = "#2a78d6";
  const NEGATIVE = "#e34948";

  const margin = { top: 62, right: 24, bottom: 96, left: 48 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const baseline = data.baseline;
  const rows = data.rows.slice().sort((a, b) => b.value - a.value);

  const maxValue = Math.max(baseline, ...rows.map((r) => r.value));
  const yMax = Math.ceil((maxValue + 4) / 10) * 10;
  const yMin = 0;

  function yScale(v) {
    return margin.top + chartHeight * (1 - (v - yMin) / (yMax - yMin));
  }

  const n = rows.length;
  const bandWidth = chartWidth / n;
  const barPadding = bandWidth * 0.28;
  const barWidth = bandWidth - barPadding * 2;
  // Mark spec: bars cap at 24px thick — never fill the slot, keep the leftover as air.
  const barRenderWidth = Math.min(barWidth, 24);
  const barInset = (barWidth - barRenderWidth) / 2;

  // Background
  svg.appendChild(el("rect", { x: 0, y: 0, width, height, fill: SURFACE }));

  // Title / subtitle
  svg.appendChild(
    el(
      "text",
      { x: margin.left, y: 24, "font-size": 16, "font-weight": 700, fill: INK_PRIMARY },
      "Life Expectancy at Birth, 12 Countries"
    )
  );
  svg.appendChild(
    el(
      "text",
      { x: margin.left, y: 42, "font-size": 11.5, fill: INK_SECONDARY },
      `${data.unit} · dashed line = World Bank world baseline (${baseline.toFixed(2)})`
    )
  );

  // Y gridlines + ticks — hairline, solid, recessive
  const yTickStep = 20;
  for (let v = 0; v <= yMax; v += yTickStep) {
    const y = yScale(v);
    svg.appendChild(
      el("line", {
        x1: margin.left,
        x2: margin.left + chartWidth,
        y1: y,
        y2: y,
        stroke: GRIDLINE,
        "stroke-width": 1,
      })
    );
    svg.appendChild(
      el(
        "text",
        {
          x: margin.left - 8,
          y: y + 4,
          "font-size": 10,
          fill: INK_MUTED,
          "text-anchor": "end",
        },
        String(v)
      )
    );
  }

  // Axis line (x-axis at y=0)
  const y0 = yScale(0);
  svg.appendChild(
    el("line", {
      x1: margin.left,
      x2: margin.left + chartWidth,
      y1: y0,
      y2: y0,
      stroke: AXIS,
      "stroke-width": 1,
    })
  );

  // Baseline line — a threshold annotation, not a grid, so the dash stays
  const yBaseline = yScale(baseline);
  svg.appendChild(
    el("line", {
      x1: margin.left,
      x2: margin.left + chartWidth,
      y1: yBaseline,
      y2: yBaseline,
      stroke: INK_SECONDARY,
      "stroke-width": 1.25,
      "stroke-dasharray": "5,4",
    })
  );
  svg.appendChild(
    el(
      "text",
      {
        x: margin.left + chartWidth,
        y: yBaseline - 5,
        "font-size": 10,
        fill: INK_SECONDARY,
        "text-anchor": "end",
      },
      `baseline ${baseline.toFixed(2)}`
    )
  );

  // Hover/focus tooltip layer — drawn last so it sits above every mark.
  // Bars get a per-mark tooltip (no crosshair); it enhances, it never gates:
  // every value is also reachable via the aria-label on each hit target.
  const tooltip = el("g", { opacity: 0, "pointer-events": "none" });
  const tooltipBg = el("rect", {
    width: 128,
    height: 40,
    rx: 4,
    fill: SURFACE,
    stroke: BORDER,
    "stroke-width": 1,
  });
  const tooltipKey = el("rect", { x: 10, y: 11, width: 10, height: 2 });
  const tooltipValue = el("text", {
    x: 10,
    y: 17,
    "font-size": 11,
    "font-weight": 700,
    fill: INK_PRIMARY,
  });
  const tooltipLabel = el("text", { x: 10, y: 31, "font-size": 9.5, fill: INK_SECONDARY });
  tooltip.appendChild(tooltipBg);
  tooltip.appendChild(tooltipKey);
  tooltip.appendChild(tooltipValue);
  tooltip.appendChild(tooltipLabel);

  function showTooltip(row, color, cx, topY) {
    const sign = row.delta >= 0 ? "+" : "";
    tooltipValue.textContent = `${row.value.toFixed(2)} yrs`;
    tooltipLabel.textContent = `${row.label} · ${sign}${row.delta.toFixed(2)} vs baseline`;
    tooltipKey.setAttribute("fill", color);
    const tx = Math.min(Math.max(cx - 64, margin.left), margin.left + chartWidth - 128);
    const ty = Math.max(topY - 48, 4);
    tooltip.setAttribute("transform", `translate(${tx},${ty})`);
    tooltip.setAttribute("opacity", 1);
  }
  function hideTooltip() {
    tooltip.setAttribute("opacity", 0);
  }

  rows.forEach((row, i) => {
    const bx = margin.left + i * bandWidth + barPadding + barInset;
    const barTopY = yScale(row.value);
    const barHeight = Math.max(0, y0 - barTopY);
    const color = row.delta >= 0 ? POSITIVE : NEGATIVE;
    const cx = bx + barRenderWidth / 2;
    const deltaSign = row.delta >= 0 ? "+" : "";

    // Mark spec: 4px rounded data-end, square at the baseline.
    const r = Math.max(0, Math.min(4, barHeight, barRenderWidth / 2));
    const d =
      r === 0
        ? `M${bx},${barTopY} h${barRenderWidth} v${barHeight} h${-barRenderWidth} Z`
        : [
            `M${bx},${barTopY + barHeight}`,
            `L${bx},${barTopY + r}`,
            `Q${bx},${barTopY} ${bx + r},${barTopY}`,
            `L${bx + barRenderWidth - r},${barTopY}`,
            `Q${bx + barRenderWidth},${barTopY} ${bx + barRenderWidth},${barTopY + r}`,
            `L${bx + barRenderWidth},${barTopY + barHeight}`,
            "Z",
          ].join(" ");

    const bar = el("path", { d, fill: color });
    svg.appendChild(bar);

    // Hit target: bigger than the painted mark, covers the whole band column.
    const hitTop = Math.max(margin.top, barTopY - 8);
    const hit = el("rect", {
      x: margin.left + i * bandWidth,
      y: hitTop,
      width: bandWidth,
      height: y0 - hitTop,
      fill: "transparent",
      "pointer-events": "all",
      tabindex: 0,
      role: "img",
      "aria-label": `${row.label}: ${row.value.toFixed(2)} yrs (${deltaSign}${row.delta.toFixed(2)} vs baseline)`,
    });
    const onEnter = () => {
      bar.style.filter = "brightness(1.12)";
      showTooltip(row, color, cx, barTopY);
    };
    const onLeave = () => {
      bar.style.filter = "";
      hideTooltip();
    };
    hit.addEventListener("pointerenter", onEnter);
    hit.addEventListener("pointerleave", onLeave);
    hit.addEventListener("focus", onEnter);
    hit.addEventListener("blur", onLeave);
    svg.appendChild(hit);

    // Direct labels are selective — the extremes only; the y-axis ticks and
    // the tooltip carry the rest (never a number on every point).
    if (i === 0 || i === n - 1) {
      svg.appendChild(
        el(
          "text",
          {
            x: cx,
            y: barTopY - 5,
            "font-size": 9.5,
            fill: INK_PRIMARY,
            "text-anchor": "middle",
          },
          row.value.toFixed(1)
        )
      );
    }

    // Country label, rotated
    const labelX = bx + barRenderWidth / 2;
    const labelY = y0 + 30;
    const label = el("text", {
      x: 0,
      y: 0,
      "font-size": 10,
      fill: INK_MUTED,
      "text-anchor": "end",
      transform: `translate(${labelX},${labelY}) rotate(-40)`,
    });
    label.textContent = row.label;
    svg.appendChild(label);
  });

  svg.appendChild(tooltip);

  // Legend — the dependable identity channel, never color-matching alone
  const legendY = height - 14;
  svg.appendChild(el("rect", { x: margin.left, y: legendY - 9, width: 10, height: 10, fill: POSITIVE }));
  svg.appendChild(
    el("text", { x: margin.left + 14, y: legendY, "font-size": 10, fill: INK_SECONDARY }, "above baseline")
  );
  svg.appendChild(
    el("rect", { x: margin.left + 110, y: legendY - 9, width: 10, height: 10, fill: NEGATIVE })
  );
  svg.appendChild(
    el("text", { x: margin.left + 124, y: legendY, "font-size": 10, fill: INK_SECONDARY }, "below baseline")
  );
}
