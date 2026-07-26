export const meta = { fixture: "hero8", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const NS = "http://www.w3.org/2000/svg";
  const W = meta.width;
  const H = meta.height;

  function el(tag, attrs, text) {
    const node = doc.createElementNS(NS, tag);
    for (const key in attrs) {
      node.setAttribute(key, attrs[key]);
    }
    if (text != null) node.textContent = text;
    return node;
  }

  // Reset
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));
  svg.setAttribute(
    "font-family",
    "'Segoe UI', -apple-system, Helvetica, Arial, sans-serif"
  );

  const rows = data.rows;

  // Background
  svg.appendChild(el("rect", { x: 0, y: 0, width: W, height: H, fill: "#fbfbf9" }));

  // Title + subtitle
  svg.appendChild(
    el(
      "text",
      { x: W / 2, y: 26, "text-anchor": "middle", "font-size": 18, "font-weight": 700, fill: "#1a1a1a" },
      "The Eight Planets"
    )
  );
  svg.appendChild(
    el(
      "text",
      { x: W / 2, y: 44, "text-anchor": "middle", "font-size": 11.5, fill: "#6b6b66" },
      "Bubble size → equatorial diameter  ·  position → distance from the Sun (log scale)"
    )
  );

  // --- Scales -----------------------------------------------------------
  const plotLeft = 54;
  const plotRight = W - 40; // 600
  const plotWidth = plotRight - plotLeft;

  const logDistances = rows.map((r) => Math.log10(r.distance));
  const logMin = Math.min.apply(null, logDistances);
  const logMax = Math.max.apply(null, logDistances);
  const logPad = (logMax - logMin) * 0.12 || 0.2;
  const domainMin = logMin - logPad;
  const domainMax = logMax + logPad;

  function xScale(distance) {
    const l = Math.log10(distance);
    return plotLeft + ((l - domainMin) / (domainMax - domainMin)) * plotWidth;
  }

  const sqrtSizes = rows.map((r) => Math.sqrt(r.size));
  const sqrtMin = Math.min.apply(null, sqrtSizes);
  const sqrtMax = Math.max.apply(null, sqrtSizes);
  const rMin = 7;
  const rMax = 36;

  function rScale(size) {
    const sq = Math.sqrt(size);
    if (sqrtMax === sqrtMin) return (rMin + rMax) / 2;
    return rMin + ((sq - sqrtMin) / (sqrtMax - sqrtMin)) * (rMax - rMin);
  }

  const cy = 178;
  const axisY = 322;

  // Axis line + caption
  svg.appendChild(
    el("line", { x1: plotLeft, y1: axisY, x2: plotRight, y2: axisY, stroke: "#c9c9c2", "stroke-width": 1 })
  );
  svg.appendChild(
    el(
      "text",
      { x: (plotLeft + plotRight) / 2, y: 354, "text-anchor": "middle", "font-size": 11, fill: "#8a8a82" },
      "Distance from Sun (AU, log scale) →"
    )
  );

  // --- Marks --------------------------------------------------------------
  rows.forEach(function (row, i) {
    const x = xScale(row.distance);
    const r = rScale(row.size);
    const above = i % 2 === 0;

    // Tick + distance label on the axis
    svg.appendChild(
      el("line", { x1: x, y1: axisY - 4, x2: x, y2: axisY + 4, stroke: "#9a9a90", "stroke-width": 1 })
    );
    svg.appendChild(
      el(
        "text",
        { x: x, y: axisY + 17, "text-anchor": "middle", "font-size": 10, fill: "#8a8a82" },
        row.distance + " AU"
      )
    );

    // Dashed stem linking bubble to axis
    const stemStart = above ? cy + r : cy - r;
    svg.appendChild(
      el("line", {
        x1: x,
        y1: stemStart,
        x2: x,
        y2: axisY,
        stroke: "#dcdcd4",
        "stroke-width": 1,
        "stroke-dasharray": "2,2",
      })
    );

    // Bubble (glyph)
    svg.appendChild(
      el("circle", {
        cx: x,
        cy: cy,
        r: r,
        fill: row.color,
        "fill-opacity": 0.88,
        stroke: "#26261f",
        "stroke-width": 0.75,
      })
    );

    // Name label
    const labelY = above ? cy - r - 10 : cy + r + 16;
    svg.appendChild(
      el(
        "text",
        { x: x, y: labelY, "text-anchor": "middle", "font-size": 12, "font-weight": 600, fill: "#1a1a1a" },
        row.label
      )
    );

    // Diameter figure
    const sizeLabelY = above ? labelY - 12 : labelY + 12;
    svg.appendChild(
      el(
        "text",
        { x: x, y: sizeLabelY, "text-anchor": "middle", "font-size": 9, fill: "#6b6b66" },
        row.size.toLocaleString("en-US") + " km"
      )
    );
  });

  // Footer / provenance
  svg.appendChild(
    el(
      "text",
      { x: W / 2, y: 386, "text-anchor": "middle", "font-size": 9.5, fill: "#9a9a90" },
      "Colors are a designed palette, not a data encoding · Source: NASA (fetched " + data.fetched + ")"
    )
  );
}
