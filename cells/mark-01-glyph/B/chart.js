export const meta = { fixture: "hero8", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const NS = "http://www.w3.org/2000/svg";
  const W = meta.width;
  const H = meta.height;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));
  svg.setAttribute("font-family", "'Segoe UI', system-ui, -apple-system, Roboto, sans-serif");

  const el = (tag, attrs) => {
    const node = doc.createElementNS(NS, tag);
    if (attrs) {
      for (const key in attrs) node.setAttribute(key, String(attrs[key]));
    }
    return node;
  };

  const text = (x, y, str, attrs) => {
    const t = el("text", Object.assign({ x, y }, attrs));
    t.textContent = str;
    return t;
  };

  const rows = data.rows;

  // ---- palette ----
  const bgFill = "#0b0f1e";
  const gridStroke = "#2a3355";
  const titleFill = "#eef1f8";
  const subtitleFill = "#8b96b8";
  const labelFill = "#e8ecf5";
  const auFill = "#8892b0";
  const footerFill = "#5b6584";
  const sunFill = "#f4c869";

  // ---- background ----
  svg.appendChild(el("rect", { x: 0, y: 0, width: W, height: H, fill: bgFill }));

  // fixed starfield -- deterministic positions, no randomness
  const stars = [
    [24, 30], [58, 140], [92, 60], [150, 340], [210, 44], [300, 360],
    [360, 30], [430, 352], [500, 50], [560, 300], [610, 120], [36, 250],
    [112, 300], [260, 26], [470, 20], [600, 220], [20, 190], [330, 190],
    [400, 170], [520, 180]
  ];
  const starLayer = el("g", { opacity: 0.55 });
  stars.forEach(([sx, sy]) => {
    starLayer.appendChild(el("circle", { cx: sx, cy: sy, r: 1, fill: "#aab4d6" }));
  });
  svg.appendChild(starLayer);

  // ---- title / subtitle ----
  svg.appendChild(text(32, 34, "The Eight Planets", { "font-size": 19, "font-weight": 700, fill: titleFill }));
  svg.appendChild(text(32, 54, "Mark size ∝ equatorial diameter · position ∝ distance from the Sun (log AU)", {
    "font-size": 11.5, fill: subtitleFill
  }));

  // ---- layout / scales ----
  const marginX = 140;
  const rightEdge = 588;
  const markY = 236;
  const sunX = 56;
  const sunR = 13;

  const distances = rows.map((r) => r.distance);
  const minD = Math.min(...distances);
  const maxD = Math.max(...distances);
  const logMin = Math.log10(minD);
  const logMax = Math.log10(maxD);
  const xScale = (v) => marginX + ((Math.log10(v) - logMin) / (logMax - logMin)) * (rightEdge - marginX);

  const sqrtSizes = rows.map((r) => Math.sqrt(r.size));
  const minS = Math.min(...sqrtSizes);
  const maxS = Math.max(...sqrtSizes);
  const rMin = 5;
  const rMax = 26;
  const rScale = (v) => rMin + ((Math.sqrt(v) - minS) / (maxS - minS)) * (rMax - rMin);

  // ---- orbit baseline ----
  svg.appendChild(el("line", {
    x1: sunX + sunR + 6, y1: markY, x2: xScale(maxD), y2: markY,
    stroke: gridStroke, "stroke-width": 1, "stroke-dasharray": "2 5", opacity: 0.7
  }));

  // ---- sun glyph: core + halo ring + radiating rays ----
  const sunGroup = el("g");
  sunGroup.appendChild(el("circle", { cx: sunX, cy: markY, r: sunR + 5, fill: "none", stroke: sunFill, "stroke-width": 1, opacity: 0.3 }));
  [0, 45, 90, 135, 180, 225, 270, 315].forEach((deg) => {
    const rad = (deg * Math.PI) / 180;
    const x1 = sunX + Math.cos(rad) * (sunR + 3);
    const y1 = markY + Math.sin(rad) * (sunR + 3);
    const x2 = sunX + Math.cos(rad) * (sunR + 9);
    const y2 = markY + Math.sin(rad) * (sunR + 9);
    sunGroup.appendChild(el("line", { x1, y1, x2, y2, stroke: sunFill, "stroke-width": 1.4, "stroke-linecap": "round", opacity: 0.75 }));
  });
  sunGroup.appendChild(el("circle", { cx: sunX, cy: markY, r: sunR, fill: sunFill }));
  sunGroup.appendChild(text(sunX, markY + sunR + 22, "Sun", { "text-anchor": "middle", "font-size": 10, fill: auFill }));
  svg.appendChild(sunGroup);

  // ---- defs for clip paths used by the crescent-highlight mark ----
  const defs = el("defs");
  svg.appendChild(defs);

  // ---- one custom composite mark per planet ----
  rows.forEach((row) => {
    const cx = xScale(row.distance);
    const cy = markY;
    const r = rScale(row.size);
    const isRinged = row.label === "Saturn";
    const g = el("g");

    if (isRinged) {
      g.appendChild(el("ellipse", {
        cx, cy, rx: r + 11, ry: r * 0.36,
        fill: "none", stroke: row.color, "stroke-width": 2.2,
        opacity: 0.55, transform: `rotate(-18 ${cx} ${cy})`
      }));
    }

    // atmosphere halo
    g.appendChild(el("circle", { cx, cy, r: r + 3, fill: "none", stroke: row.color, "stroke-width": 1, opacity: 0.35 }));

    // planet body
    g.appendChild(el("circle", { cx, cy, r, fill: row.color, stroke: "#05070d", "stroke-width": 0.75 }));

    // clipped crescent highlight for a shaded-sphere feel
    const clipId = `mk01-clip-${row.label.toLowerCase()}`;
    const clip = el("clipPath", { id: clipId });
    clip.appendChild(el("circle", { cx, cy, r }));
    defs.appendChild(clip);
    g.appendChild(el("circle", {
      cx: cx - r * 0.32, cy: cy - r * 0.32, r: r * 0.85,
      fill: "#ffffff", opacity: 0.28, "clip-path": `url(#${clipId})`
    }));

    // label
    g.appendChild(text(cx, cy + r + 18, row.label, {
      "text-anchor": "middle", "font-size": 11.5, "font-weight": 600, fill: labelFill
    }));

    svg.appendChild(g);
  });

  // ---- distance reference ticks ----
  [1, 10].filter((v) => v > minD && v < maxD).forEach((v) => {
    const tx = xScale(v);
    svg.appendChild(el("line", { x1: tx, y1: 312, x2: tx, y2: 320, stroke: gridStroke, "stroke-width": 1 }));
    svg.appendChild(text(tx, 334, `${v} AU`, { "text-anchor": "middle", "font-size": 9.5, fill: auFill }));
  });

  // ---- footer captions ----
  svg.appendChild(text(32, H - 14,
    "Radius ∝ √diameter (km) · x-position ∝ log(distance, AU) · color is a designed palette, not measure-encoded",
    { "font-size": 9.5, fill: footerFill }));
  svg.appendChild(text(W - 16, H - 14, `Source: ${data.source || "science.nasa.gov"}`, {
    "text-anchor": "end", "font-size": 9.5, fill: footerFill
  }));
}
