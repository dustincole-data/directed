import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { verifyCells } from "./verify-cells.mjs";
import { writeCellManifest } from "./new-cell.mjs";
import { renderCell } from "./render-cell.mjs";

// Scratch cells root, gitignored (cells/_vtest/) and dedicated to this file so
// it can never collide with the wholesale `rm(root, {recursive:true})` calls
// in render-cell.test.mjs (cells/_test/) and new-cell.test.mjs (cells/_mtest/),
// which run in their own vitest workers and could otherwise race with this
// file's scratch state. verifyCells() is called with { cellsDir: ROOT } in
// every test below — the real cells/ tree is never read, written, or deleted
// by this suite.
const ROOT = "cells/_vtest";
const ROW = "type-01-typeface"; // a real declared Phase-1 row — needed to exercise
// check 3/4/5 against real row/fixture declarations — but its generated
// artifacts here live only under the scratch ROOT, never under cells/type-01-typeface.
const DIR = `${ROOT}/${ROW}/A`;
const CHART = `export const meta={fixture:"table12",width:200,height:100};
export function render(svg,data){const d=svg.ownerDocument;
for(const[i,r]of data.rows.entries()){const e=d.createElementNS("http://www.w3.org/2000/svg","rect");
e.setAttribute("x",String(i*16));e.setAttribute("height",String(r.value));svg.appendChild(e);}}`;

async function seedValidCell() {
  await rm(`${ROOT}/${ROW}`, { recursive: true, force: true });
  await mkdir(DIR, { recursive: true });
  await writeFile(`${DIR}/chart.js`, CHART);
  await renderCell(DIR);
  await writeCellManifest({
    cellDir: DIR, row: ROW, rowTitle: "Typeface", family: "type", arm: "A",
    mode: "refine",
    method: { kind: "default", name: "clean subagent", args: "", ranOn: null },
    prompt: "Here is a dataset of 12 chess openings. Make a chart of it.",
    fixture: "table12",
  });
}

beforeEach(seedValidCell);
// Scoped to exactly what this suite creates (ROOT/ROW, plus the check-7 gap
// dir some tests add under ROOT/mark-04-glow and already clean up
// themselves) — never the whole ROOT. `cells/_vtest/` is a shared scratch
// root; other things can legitimately live there, and a wholesale
// `rm(ROOT, ...)` has twice destroyed content this suite doesn't own.
afterAll(async () => {
  await rm(`${ROOT}/${ROW}`, { recursive: true, force: true });
  await rm(`${ROOT}/mark-04-glow`, { recursive: true, force: true });
});

describe("verifyCells", () => {
  it("passes on a well-formed cell", async () => {
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(failures).toEqual([]);
    expect(ok).toBe(true);
  });

  it("check 1: fails when render.svg is missing", async () => {
    await rm(`${DIR}/render.svg`);
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toMatch(/render\.svg/);
  });

  it("check 2: fails on a placeholder prompt", async () => {
    const m = JSON.parse(await readFile(`${DIR}/cell.json`, "utf8"));
    m.prompt = "TODO";
    await writeFile(`${DIR}/cell.json`, JSON.stringify(m));
    const { failures } = await verifyCells({ cellsDir: ROOT });
    expect(failures.join()).toMatch(/prompt/i);
  });

  it("check 3: fails on a cell dir for an undeclared arm", async () => {
    await mkdir(`${ROOT}/${ROW}/D`, { recursive: true });
    await writeFile(`${ROOT}/${ROW}/D/chart.js`, CHART);
    const { failures } = await verifyCells({ cellsDir: ROOT });
    expect(failures.join()).toMatch(/undeclared|arm/i);
  });

  it("check 4: fails when a refine B cell has no resolvable ranOn", async () => {
    const bDir = `${ROOT}/${ROW}/B`;
    await mkdir(bDir, { recursive: true });
    await writeFile(`${bDir}/chart.js`, CHART);
    await renderCell(bDir);
    await writeCellManifest({
      cellDir: bDir, row: ROW, rowTitle: "Typeface", family: "type", arm: "B",
      mode: "refine",
      method: { kind: "skill", name: "/impeccable typeset", args: "", ranOn: "type-99-nope.A" },
      prompt: "Run /impeccable typeset on this chart.", fixture: "table12",
    });
    const { failures } = await verifyCells({ cellsDir: ROOT });
    expect(failures.join()).toMatch(/ranOn/i);
  });

  // Fix round 1: check 4 used to split ranOn on "." and only ever look at the
  // row segment, so "<row>.C" or a bare "<row>" (no arm suffix at all) both
  // silently resolved as long as that row had a real Arm-A cell — a cell
  // could claim descent from one arm while the gate validated a different
  // one. These three tests pin the closed hole: the two bad shapes below
  // must now fail, and the well-formed shape must still pass.
  async function writeRefineB(ranOn) {
    const bDir = `${ROOT}/${ROW}/B`;
    await mkdir(bDir, { recursive: true });
    await writeFile(`${bDir}/chart.js`, CHART);
    await renderCell(bDir);
    await writeCellManifest({
      cellDir: bDir, row: ROW, rowTitle: "Typeface", family: "type", arm: "B",
      mode: "refine",
      method: { kind: "skill", name: "/impeccable typeset", args: "", ranOn },
      prompt: "Run /impeccable typeset on this chart.", fixture: "table12",
    });
    return bDir;
  }

  it("check 4: fails when ranOn names a real row but the wrong arm suffix (the old hole)", async () => {
    // type-01-typeface/A is a real, valid, generated Arm-A cell (seeded by
    // beforeEach) — before the fix, ranOn: "type-01-typeface.C" resolved
    // against that A cell and passed silently, even though it claims
    // descent from a C cell that doesn't exist.
    await writeRefineB(`${ROW}.C`);
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain(`method.ranOn "${ROW}.C"`);
    expect(failures.join()).toMatch(/well-formed/i);
  });

  it("check 4: fails when ranOn has no arm suffix at all", async () => {
    await writeRefineB(ROW);
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain(`method.ranOn "${ROW}"`);
    expect(failures.join()).toMatch(/well-formed/i);
  });

  it("check 4: still passes a well-formed ranOn that resolves to a real Arm-A cell", async () => {
    await writeRefineB(`${ROW}.A`);
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(failures.join()).not.toMatch(/ranOn/i);
    expect(ok).toBe(true);
  });

  it("check 6: fails when chart.js is edited after generation", async () => {
    await writeFile(`${DIR}/chart.js`, CHART + "\n// hand-tweaked to look nicer\n");
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toMatch(/hash|sha256|edited/i);
  });

  it("check 7: fails when a gap row has a B cell on disk", async () => {
    const gapDir = `${ROOT}/mark-04-glow/B`;
    await mkdir(gapDir, { recursive: true });
    await writeFile(`${gapDir}/chart.js`, CHART);
    const { failures } = await verifyCells({ cellsDir: ROOT });
    expect(failures.join()).toMatch(/gap/i);
    await rm(`${ROOT}/mark-04-glow`, { recursive: true, force: true });
  });
});
