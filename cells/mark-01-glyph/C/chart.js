import { select } from "d3-selection";
import { scaleLog, scaleSqrt } from "d3-scale";
import { max } from "d3-array";

export const meta = { fixture: "hero8", width: 640, height: 400 };

export function render(svg, data) {
  const { width, height } = meta;
  const rows = data.rows;

  const plotLeft = 64;
  const plotRight = width - 40;
  const orbitY = 148;
  const axisY = 256;
  const maxRadius = 32;

  const xScale = scaleLog().domain([0.35, 33]).range([plotLeft, plotRight]);

  const rScale = scaleSqrt()
    .domain([0, max(rows, (d) => d.size)])
    .range([4, maxRadius]);

  const root = select(svg);
  root.selectAll("*").remove();
  root
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height)
    .attr(
      "font-family",
      "'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif"
    );

  // ---- background ----
  root
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#fbfaf7");

  // ---- defs: sun gradient + soft shadow for the planet marks ----
  const defs = root.append("defs");

  const sunGradient = defs
    .append("radialGradient")
    .attr("id", "sunGradient")
    .attr("cx", "35%")
    .attr("cy", "35%")
    .attr("r", "65%");
  sunGradient.append("stop").attr("offset", "0%").attr("stop-color", "#fff6d8");
  sunGradient
    .append("stop")
    .attr("offset", "55%")
    .attr("stop-color", "#ffcf4d");
  sunGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#f2932b");

  const shadow = defs
    .append("filter")
    .attr("id", "markShadow")
    .attr("x", "-60%")
    .attr("y", "-60%")
    .attr("width", "220%")
    .attr("height", "220%");
  shadow
    .append("feDropShadow")
    .attr("dx", 0)
    .attr("dy", 1.5)
    .attr("stdDeviation", 1.4)
    .attr("flood-color", "#1a1a1a")
    .attr("flood-opacity", 0.28);

  // ---- title + encoding legend ----
  root
    .append("text")
    .attr("x", plotLeft)
    .attr("y", 30)
    .attr("font-size", 20)
    .attr("font-weight", 700)
    .attr("fill", "#1a1a1a")
    .text("The Eight Planets");

  root
    .append("text")
    .attr("x", plotLeft)
    .attr("y", 50)
    .attr("font-size", 11.5)
    .attr("fill", "#767267")
    .text(
      "circle area ∝ equatorial diameter (km) · position ∝ distance from the Sun (AU, log scale)"
    );

  // ---- orbit baseline, running from the sun through the outer planets ----
  const sunX = plotLeft - 26;
  root
    .append("line")
    .attr("x1", sunX)
    .attr("y1", orbitY)
    .attr("x2", plotRight + 6)
    .attr("y2", orbitY)
    .attr("stroke", "#d8d2c2")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "1,4")
    .attr("stroke-linecap", "round");

  // ---- sun glyph ----
  const sunGroup = root
    .append("g")
    .attr("transform", `translate(${sunX}, ${orbitY})`);
  const sunRadius = 11;
  const rayInner = 13;
  const rayOuter = 19;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    sunGroup
      .append("line")
      .attr("x1", Math.cos(angle) * rayInner)
      .attr("y1", Math.sin(angle) * rayInner)
      .attr("x2", Math.cos(angle) * rayOuter)
      .attr("y2", Math.sin(angle) * rayOuter)
      .attr("stroke", "#f2b23c")
      .attr("stroke-width", 1.2)
      .attr("stroke-linecap", "round")
      .attr("opacity", 0.7);
  }
  sunGroup
    .append("circle")
    .attr("r", sunRadius)
    .attr("fill", "url(#sunGradient)")
    .attr("stroke", "#e08a1f")
    .attr("stroke-width", 1);
  sunGroup
    .append("text")
    .attr("y", 27)
    .attr("text-anchor", "middle")
    .attr("font-size", 9.5)
    .attr("fill", "#8a7a55")
    .text("Sun");

  // ---- distance axis: log-scale AU ticks along the baseline ----
  const auTicks = [0.5, 1, 2, 5, 10, 20, 30];
  const axisGroup = root.append("g");
  axisGroup
    .append("line")
    .attr("x1", plotLeft)
    .attr("x2", plotRight)
    .attr("y1", axisY)
    .attr("y2", axisY)
    .attr("stroke", "#cfc9b8")
    .attr("stroke-width", 1);

  auTicks.forEach((t) => {
    const tx = xScale(t);
    axisGroup
      .append("line")
      .attr("x1", tx)
      .attr("x2", tx)
      .attr("y1", axisY)
      .attr("y2", axisY + 5)
      .attr("stroke", "#b5ae9a")
      .attr("stroke-width", 1);
    axisGroup
      .append("text")
      .attr("x", tx)
      .attr("y", axisY + 17)
      .attr("text-anchor", "middle")
      .attr("font-size", 9.5)
      .attr("fill", "#8a8577")
      .text(`${t} AU`);
  });

  // ---- per-planet marks: stem, circle, and labels ----
  const planetGroups = root
    .selectAll("g.planet")
    .data(rows)
    .join("g")
    .attr("class", "planet");

  planetGroups.each(function (d) {
    const g = select(this);
    const x = xScale(d.distance);
    const r = rScale(d.size);

    g.append("line")
      .attr("x1", x)
      .attr("x2", x)
      .attr("y1", orbitY + r)
      .attr("y2", axisY)
      .attr("stroke", "#c9c3b2")
      .attr("stroke-width", 1)
      .attr("opacity", 0.7);

    g.append("circle")
      .attr("cx", x)
      .attr("cy", orbitY)
      .attr("r", r)
      .attr("fill", d.color)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.4)
      .attr("filter", "url(#markShadow)");

    g.append("text")
      .attr("x", x)
      .attr("y", axisY + 34)
      .attr("text-anchor", "middle")
      .attr("font-size", 11.5)
      .attr("font-weight", 600)
      .attr("fill", "#2c2a24")
      .text(d.label);

    g.append("text")
      .attr("x", x)
      .attr("y", axisY + 47)
      .attr("text-anchor", "middle")
      .attr("font-size", 9.5)
      .attr("fill", "#8a8577")
      .text(`${formatThousands(d.size)} km`);
  });

  // ---- axis title ----
  root
    .append("text")
    .attr("x", (plotLeft + plotRight) / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .attr("font-size", 10.5)
    .attr("fill", "#a39d8c")
    .text("distance from Sun, AU (log scale) →");
}

function formatThousands(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
