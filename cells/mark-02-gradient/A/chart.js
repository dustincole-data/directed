export const meta = { fixture: "hero8", width: 640, height: 400 };

export function render(svg, data) {
  const doc = svg.ownerDocument;
  const NS = "http://www.w3.org/2000/svg";

  const width = meta.width;
  const height = meta.height;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("font-family", "'Segoe UI', Helvetica, Arial, sans-serif");

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  function el(name, attrs) {
    const node = doc.createElementNS(NS, name);
    if (attrs) {
      for (const key in attrs) {
        node.setAttribute(key, String(attrs[key]));
      }
    }
    return node;
  }

  function clamp01(t) {
    return Math.max(0, Math.min(1, t));
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const full = clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function toHex(v) {
    return Math.round(clamp01(v / 255) * 255).toString(16).padStart(2, "0");
  }

  function mix(hex, target, amount) {
    const { r, g, b } = hexToRgb(hex);
    const t = clamp01(amount);
    return `#${toHex(r + (target.r - r) * t)}${toHex(g + (target.g - g) * t)}${toHex(b + (target.b - b) * t)}`;
  }

  function lighten(hex, amount) {
    return mix(hex, { r: 255, g: 255, b: 255 }, amount);
  }

  function darken(hex, amount) {
    return mix(hex, { r: 0, g: 0, b: 0 }, amount);
  }

  function formatAU(v) {
    return v >= 10 ? v.toFixed(1) : v.toFixed(2);
  }

  const rows = data.rows;
  const margin = { top: 96, right: 44, bottom: 60, left: 44 };
  const plotLeft = margin.left;
  const plotRight = width - margin.right;
  const plotWidth = plotRight - plotLeft;
  const baselineY = margin.top + (height - margin.top - margin.bottom) * 0.5;

  const distances = rows.map((d) => d.distance);
  const sizes = rows.map((d) => d.size);

  const logMin = Math.log10(Math.min(...distances) * 0.72);
  const logMax = Math.log10(Math.max(...distances) * 1.18);
  const logRange = logMax - logMin;

  function xForDistance(auValue) {
    const t = (Math.log10(auValue) - logMin) / logRange;
    return plotLeft + t * plotWidth;
  }

  const sqrtMin = Math.sqrt(Math.min(...sizes));
  const sqrtMax = Math.sqrt(Math.max(...sizes));
  const rMin = 6;
  const rMax = 32;

  function rForSize(size) {
    const t = (Math.sqrt(size) - sqrtMin) / (sqrtMax - sqrtMin);
    return rMin + t * (rMax - rMin);
  }

  // ---- defs + background ----
  const defs = el("defs");
  svg.appendChild(defs);

  const bgGrad = el("linearGradient", { id: "hero8-bg", x1: "0", y1: "0", x2: "0", y2: "1" });
  bgGrad.appendChild(el("stop", { offset: "0%", "stop-color": "#0d1330" }));
  bgGrad.appendChild(el("stop", { offset: "100%", "stop-color": "#05060f" }));
  defs.appendChild(bgGrad);

  const bg = el("rect", { x: 0, y: 0, width, height, fill: "url(#hero8-bg)" });
  svg.appendChild(bg);

  // ---- title ----
  const title = el("text", {
    x: margin.left,
    y: 34,
    fill: "#f4f6fb",
    "font-size": 22,
    "font-weight": "700"
  });
  title.textContent = "The Eight Planets";
  svg.appendChild(title);

  const subtitle = el("text", {
    x: margin.left,
    y: 56,
    fill: "#8b96bd",
    "font-size": 12
  });
  subtitle.textContent = "Circle size = equatorial diameter (sqrt-scaled)   ·   position = mean distance from the Sun, AU (log scale)";
  svg.appendChild(subtitle);

  // ---- orbital baseline ----
  const axis = el("line", {
    x1: plotLeft,
    x2: plotRight,
    y1: baselineY,
    y2: baselineY,
    stroke: "#232a4d",
    "stroke-width": 1.5
  });
  svg.appendChild(axis);

  // ---- sun marker ----
  const sunGrad = el("radialGradient", { id: "hero8-sun", cx: "35%", cy: "32%", r: "65%" });
  sunGrad.appendChild(el("stop", { offset: "0%", "stop-color": "#fff8df" }));
  sunGrad.appendChild(el("stop", { offset: "100%", "stop-color": "#ffb703" }));
  defs.appendChild(sunGrad);

  const sun = el("circle", { cx: plotLeft, cy: baselineY, r: 9, fill: "url(#hero8-sun)" });
  svg.appendChild(sun);

  const sunLabel = el("text", {
    x: plotLeft,
    y: baselineY + 24,
    fill: "#5c6890",
    "font-size": 10,
    "text-anchor": "middle"
  });
  sunLabel.textContent = "Sun";
  svg.appendChild(sunLabel);

  // ---- planets ----
  rows.forEach((row, i) => {
    const cx = xForDistance(row.distance);
    const r = rForSize(row.size);
    const gradId = `hero8-planet-${i}`;

    const grad = el("radialGradient", { id: gradId, cx: "38%", cy: "32%", r: "72%" });
    grad.appendChild(el("stop", { offset: "0%", "stop-color": lighten(row.color, 0.6) }));
    grad.appendChild(el("stop", { offset: "50%", "stop-color": row.color }));
    grad.appendChild(el("stop", { offset: "100%", "stop-color": darken(row.color, 0.4) }));
    defs.appendChild(grad);

    const circle = el("circle", {
      cx,
      cy: baselineY,
      r,
      fill: `url(#${gradId})`,
      stroke: darken(row.color, 0.5),
      "stroke-width": 1
    });
    svg.appendChild(circle);

    const above = i % 2 === 0;
    const auY = above ? baselineY - r - 10 : baselineY + r + 22;
    const nameY = above ? baselineY - r - 26 : baselineY + r + 38;

    const nameLabel = el("text", {
      x: cx,
      y: nameY,
      fill: "#eef1fb",
      "font-size": 12.5,
      "font-weight": "600",
      "text-anchor": "middle"
    });
    nameLabel.textContent = row.label;
    svg.appendChild(nameLabel);

    const auLabel = el("text", {
      x: cx,
      y: auY,
      fill: "#7c88b3",
      "font-size": 10,
      "text-anchor": "middle"
    });
    auLabel.textContent = `${formatAU(row.distance)} AU`;
    svg.appendChild(auLabel);
  });
}
