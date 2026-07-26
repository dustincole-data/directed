import { describe, expect, it, beforeAll } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { renderCell } from "./render-cell.mjs";

const DIR = "cells/_test/A";

beforeAll(async () => {
  await rm("cells/_test", { recursive: true, force: true });
  await mkdir(DIR, { recursive: true });
  await writeFile(`${DIR}/chart.js`, `
export const meta = { fixture: "table12", width: 200, height: 100 };
export function render(svg, data) {
  svg.setAttribute("viewBox", "0 0 200 100");
  const doc = svg.ownerDocument;
  for (const [i, r] of data.rows.entries()) {
    const el = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
    el.setAttribute("x", String(i * 16));
    el.setAttribute("y", "0");
    el.setAttribute("width", "12");
    el.setAttribute("height", String(r.value));
    svg.appendChild(el);
  }
}
`);
});

describe("renderCell", () => {
  it("returns serialised SVG with the root svg element", async () => {
    const svg = await renderCell(DIR);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("passes the fixture named in meta to render", async () => {
    const svg = await renderCell(DIR);
    expect(svg).toContain("<rect");
    expect((svg.match(/<rect/g) ?? []).length).toBe(12);
  });

  it("sets width and height from meta", async () => {
    const svg = await renderCell(DIR);
    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="100"');
  });

  it("writes render.svg next to chart.js", async () => {
    await renderCell(DIR);
    const onDisk = await readFile(`${DIR}/render.svg`, "utf8");
    expect(onDisk.startsWith("<svg")).toBe(true);
  });

  it("throws a clear error when chart.js has no render export", async () => {
    await mkdir("cells/_test/B", { recursive: true });
    await writeFile("cells/_test/B/chart.js", `export const meta = { fixture: "table12" };`);
    await expect(renderCell("cells/_test/B")).rejects.toThrow(/render/i);
  });

  // The craft barrel had zero importers and could not have had one: bare Node
  // ESM (what this renderer runs a cell under) cannot resolve extensionless
  // re-exports, so `src/craft/index.ts` threw ERR_MODULE_NOT_FOUND from a cell.
  // That is the defect that cost mark-02-gradient.B two generation attempts, and
  // ~10 craft:* rows are queued.
  //
  // This has to run through a real `node` process: under vitest, Vite resolves
  // the dynamic import for us and an extensionless re-export loads fine, so an
  // in-process renderCell() call cannot see the defect at all.
  // `cells/_test/craft-barrel/` is three directories deep, exactly like
  // `cells/<row>/<arm>/`, so the specifier below is the one a real cell writes.
  it("lets a cell at real cell depth import the craft barrel under bare Node", async () => {
    const dir = "cells/_test/craft-barrel";
    await mkdir(dir, { recursive: true });
    await writeFile(
      `${dir}/chart.js`,
      `import { select } from "d3-selection";
import { perDatumRadialGradient, SPECTRAL_10 } from "../../../src/craft/index.ts";
export const meta = { fixture: "hero8", width: 200, height: 100 };
export function render(svg, data) {
  const doc = svg.ownerDocument;
  const defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.appendChild(defs);
  const fill = perDatumRadialGradient(select(defs), data.rows, {
    idPrefix: "probe",
    color: (_d, i) => SPECTRAL_10[i % SPECTRAL_10.length],
  });
  data.rows.forEach((r, i) => {
    const c = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", String(i * 20));
    c.setAttribute("r", "6");
    c.setAttribute("fill", fill(r, i));
    svg.appendChild(c);
  });
}
`,
    );
    const res = spawnSync(process.execPath, ["scripts/render-cell.mjs", dir], { encoding: "utf8" });
    expect(res.stderr).not.toMatch(/ERR_MODULE_NOT_FOUND/);
    expect(res.status).toBe(0);
    const svg = await readFile(`${dir}/render.svg`, "utf8");
    expect((svg.match(/<radialGradient/g) ?? []).length).toBe(8);
    expect(svg).toContain('fill="url(#probe-0)"');
    // Generous timeout: the spawned process loads jsdom and d3 from disk, which
    // took 5.7s from a cold cache — over vitest's 5s default.
  }, 30_000);
});
