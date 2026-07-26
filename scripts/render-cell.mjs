import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { sha256OfFile } from "./new-cell.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Import a cell's `chart.js` as an ES module.
 *
 * The import URL is keyed on the file's own sha256 because Node's ESM loader
 * caches by URL: without the key, a second import of the same path in one
 * process silently returns the first module. verify-cells re-renders every cell
 * in the same process (check 8), and the test suites rewrite a scratch
 * `chart.js` in place between cases — both need the module the bytes on disk
 * currently describe. Keying on content means identical bytes reuse the cache
 * (so the re-render check costs one import per cell, not two) while edited
 * bytes always load fresh.
 */
export async function loadCellModule(cellDir) {
  const chart = join(resolve(cellDir), "chart.js");
  return import(`${pathToFileURL(chart).href}?sha256=${await sha256OfFile(chart)}`);
}

/**
 * Render a cell to SVG. Writes `render.svg` next to `chart.js` unless
 * `{ write: false }` — the integrity gate renders without writing so it can
 * byte-compare a fresh render against the committed artifact.
 */
export async function renderCell(cellDir, { write = true } = {}) {
  const dir = resolve(cellDir);
  const mod = await loadCellModule(dir);

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
  if (write) await writeFile(join(dir, "render.svg"), out, "utf8");
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
