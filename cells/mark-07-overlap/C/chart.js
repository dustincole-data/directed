export const meta = { fixture: "hero8", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const NS = "http://www.w3.org/2000/svg";
  const W = meta.width;
  const H = meta.height;
  const rows = data.rows;

  // Deliberate, minimal palette: two text tones instead of five ad hoc grays.
  // `muted` replaces the previous #8b93a7 / #7a8296 / #6b7386 / #54596b / #4b5164
  // mix — those last three sat below 4.5:1 against `bg` (as low as 2.4:1 for the
  // footer), which fails body-text contrast even at caption sizes. One AA-safe
  // muted tone (~5.6:1) now carries every secondary/tertiary label consistently.
  const COLORS = {
    bg: "#0b0f19",
    ink: "#f2f4f8",
    inkLabel: "#e7eaf1",
    muted: "#838aa0",
    gridLine: "#2a3245",
    tickLine: "#3a4258",
    stemLine: "#2a3245",
    leaderLine: "#3a4258",
    bubbleStroke: "#0b0f19",
  };

  function el(tag, attrs, text) {
    const node = doc.createElementNS(NS, tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v !== undefined && v !== null) node.setAttribute(k, String(v));
      }
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function formatInt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatAU(t) {
    if (t >= 1) return String(t);
    return t.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  // reset the svg and set up the canvas
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute("xmlns", NS);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));
  svg.setAttribute("font-family", "Helvetica, Arial, sans-serif");

  svg.appendChild(el("rect", { x: 0, y: 0, width: W, height: H, fill: COLORS.bg }));

  svg.appendChild(
    el(
      "text",
      { x: 32, y: 32, "font-size": 19, "font-weight": 700, fill: COLORS.ink },
      "The Eight Planets"
    )
  );
  svg.appendChild(
    el(
      "text",
      { x: 32, y: 50, "font-size": 12, fill: COLORS.muted },
      "Bubble area ∝ equatorial diameter · position = mean distance from the Sun (log scale, AU)"
    )
  );

  // --- scales ---
  const padL = 44;
  const padR = 44;
  const xMin = padL;
  const xMax = W - padR;

  const distances = rows.map((r) => r.distance);
  const dMin = Math.min(...distances) * 0.82;
  const dMax = Math.max(...distances) * 1.12;
  const logMin = Math.log10(dMin);
  const logMax = Math.log10(dMax);
  const logSpan = logMax - logMin || 1;

  function xScale(d) {
    const t = (Math.log10(d) - logMin) / logSpan;
    return xMin + t * (xMax - xMin);
  }

  const rootSizes = rows.map((r) => Math.sqrt(r.size));
  const sMin = Math.min(...rootSizes);
  const sMax = Math.max(...rootSizes);
  const sSpan = sMax - sMin || 1;
  const rMin = 7;
  const rMax = 34;

  function rScale(size) {
    const v = Math.sqrt(size);
    const t = (v - sMin) / sSpan;
    return rMin + t * (rMax - rMin);
  }

  // --- distance axis ---
  const axisY = 92;
  svg.appendChild(
    el("line", { x1: xMin, y1: axisY, x2: xMax, y2: axisY, stroke: COLORS.gridLine, "stroke-width": 1 })
  );

  const tickCandidates = [0.3, 0.5, 1, 2, 3, 5, 10, 20, 30, 50, 100];
  const ticks = tickCandidates.filter((t) => t >= dMin && t <= dMax);
  const axisLayer = el("g");
  ticks.forEach((t) => {
    const x = xScale(t);
    axisLayer.appendChild(
      el("line", { x1: x, y1: axisY - 4, x2: x, y2: axisY + 4, stroke: COLORS.tickLine, "stroke-width": 1 })
    );
    axisLayer.appendChild(
      el(
        "text",
        { x, y: axisY - 10, "font-size": 10, fill: COLORS.muted, "text-anchor": "middle" },
        formatAU(t)
      )
    );
  });
  svg.appendChild(axisLayer);
  svg.appendChild(
    el(
      "text",
      { x: xMax, y: axisY - 24, "font-size": 10, fill: COLORS.muted, "text-anchor": "end" },
      "distance from Sun (AU) →"
    )
  );

  // --- bubble row ---
  const bubbleY = 210;
  const bubbles = rows.map((r) => ({ row: r, cx: xScale(r.distance), r: rScale(r.size) }));

  const stemLayer = el("g");
  bubbles.forEach((b) => {
    stemLayer.appendChild(
      el("line", {
        x1: b.cx,
        y1: axisY + 6,
        x2: b.cx,
        y2: bubbleY - b.r - 4,
        stroke: COLORS.stemLine,
        "stroke-width": 1,
        "stroke-dasharray": "2,2",
      })
    );
  });
  svg.appendChild(stemLayer);

  // draw the largest bubbles first so smaller ones stay legible if they crowd together
  const byDescRadius = [...bubbles].sort((a, b) => b.r - a.r);
  const bubbleLayer = el("g");
  byDescRadius.forEach((b) => {
    bubbleLayer.appendChild(
      el("circle", {
        cx: b.cx,
        cy: bubbleY,
        r: b.r,
        fill: b.row.color,
        "fill-opacity": 0.92,
        stroke: COLORS.bubbleStroke,
        "stroke-width": 1.5,
      })
    );
  });
  svg.appendChild(bubbleLayer);

  // --- fan the labels out to evenly spaced slots so tightly packed bubbles ---
  // --- (inner planets, Jupiter/Saturn) never produce colliding text ---
  const n = rows.length;
  const labelXs = rows.map((_, i) => xMin + (n === 1 ? 0 : (i * (xMax - xMin)) / (n - 1)));
  const labelY = 352;

  const leaderLayer = el("g");
  const labelLayer = el("g");
  bubbles.forEach((b, i) => {
    const startY = bubbleY + b.r + 6;
    const midY = labelY - 30;
    const lx = labelXs[i];
    const dotY = labelY - 14;
    const path = `M ${b.cx} ${startY} C ${b.cx} ${midY}, ${lx} ${midY}, ${lx} ${dotY}`;

    leaderLayer.appendChild(el("path", { d: path, fill: "none", stroke: COLORS.leaderLine, "stroke-width": 1 }));
    leaderLayer.appendChild(el("circle", { cx: lx, cy: dotY, r: 2, fill: b.row.color }));

    labelLayer.appendChild(
      el(
        "text",
        { x: lx, y: labelY, "font-size": 12, "font-weight": 600, fill: COLORS.inkLabel, "text-anchor": "middle" },
        b.row.label
      )
    );
    labelLayer.appendChild(
      el(
        "text",
        { x: lx, y: labelY + 15, "font-size": 9.5, fill: COLORS.muted, "text-anchor": "middle" },
        `${b.row.distance} AU · ${formatInt(b.row.size)} km`
      )
    );
  });
  svg.appendChild(leaderLayer);
  svg.appendChild(labelLayer);

  // --- footer ---
  svg.appendChild(
    el(
      "text",
      { x: W - 12, y: H - 10, "font-size": 8.5, fill: COLORS.muted, "text-anchor": "end" },
      `source: NASA · fetched ${data.fetched}`
    )
  );
}
