import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const SVG_NS = "http://www.w3.org/2000/svg";

export async function renderCell(cellDir) {
  const dir = resolve(cellDir);
  const modUrl = pathToFileURL(join(dir, "chart.js")).href;
  const mod = await import(modUrl);

  if (typeof mod.render !== "function") {
    throw new Error(`${cellDir}: chart.js must export a render(svg, data) function`);
  }
  const meta = mod.meta ?? {};
  const fixtureName = meta.fixture;
  if (!fixtureName) throw new Error(`${cellDir}: meta.fixture is required`);

  const fixture = JSON.parse(
    await readFile(resolve(`src/fixtures/${fixtureName}.json`), "utf8"),
  );

  const dom = new JSDOM(`<!doctype html><html><body></body></html>`);
  const doc = dom.window.document;
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("width", String(meta.width ?? 640));
  svg.setAttribute("height", String(meta.height ?? 400));
  doc.body.appendChild(svg);

  await mod.render(svg, fixture);

  const out = svg.outerHTML;
  await writeFile(join(dir, "render.svg"), out, "utf8");
  return out;
}

if (process.argv[1] && process.argv[1].endsWith("render-cell.mjs")) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node scripts/render-cell.mjs cells/<row>/<arm>");
    process.exit(2);
  }
  await renderCell(target);
  console.log(`rendered ${target}/render.svg`);
}
