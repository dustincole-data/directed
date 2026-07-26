import { describe, expect, it, beforeAll } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
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
});
