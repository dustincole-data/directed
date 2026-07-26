import { describe, expect, it, beforeEach, afterEach, afterAll } from "vitest";
import { mkdir, writeFile, rm, readFile, copyFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { verifyCells, nullResultDeclFailures } from "./verify-cells.mjs";
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
// type-01-typeface declares premise "font-family", so a seeded cell has to
// render at least one labelled element for check 12 to have anything to read —
// a baseline with no text at all would probe identically to every treated arm.
const CHART = `export const meta={fixture:"table12",width:200,height:100};
export function render(svg,data){const d=svg.ownerDocument;
for(const[i,r]of data.rows.entries()){const e=d.createElementNS("http://www.w3.org/2000/svg","rect");
e.setAttribute("x",String(i*16));e.setAttribute("height",String(r.value));svg.appendChild(e);
const t=d.createElementNS("http://www.w3.org/2000/svg","text");
t.setAttribute("font-family","Helvetica, Arial, sans-serif");t.textContent=r.label;svg.appendChild(t);}}`;

/** A treated module that moves the declared premise (a different font stack). */
const CHART_TREATED = CHART.replace("Helvetica, Arial, sans-serif", "Georgia, serif");

/** A treated module that changes something real, but not the declared premise —
 *  the shape of every cell check 12 exists to catch. */
const CHART_OFF_PREMISE = CHART.replace(
  'e.setAttribute("x",String(i*16));',
  'e.setAttribute("x",String(i*16));e.setAttribute("fill","#d55181");',
);

// A visibly different module, used to prove that swapping one arm's render.svg
// for another arm's is caught.
const CHART_B = `export const meta={fixture:"table12",width:200,height:100};
export function render(svg,data){const d=svg.ownerDocument;
for(const[i,r]of data.rows.entries()){const e=d.createElementNS("http://www.w3.org/2000/svg","circle");
e.setAttribute("cx",String(i*16));e.setAttribute("r",String(r.value/10));svg.appendChild(e);}}`;

// The gate cross-checks a manifest's prompt against the artifact the runbook
// says that arm was sent: the fixture JSON verbatim for a baseline or a
// from-scratch arm, the baseline module verbatim for a refine-mode treated arm.
// Seeds therefore have to carry real prompts, not a one-line stand-in.
const TABLE12 = readFileSync("src/fixtures/table12.json", "utf8").trim();
const PROMPT_A = `Here is a dataset:\n\n${TABLE12}\n\nIt is 12 countries' life expectancy at birth in years.\n\nWrite a chart of it as an ES module.\n`;
const PROMPT_B = `Here is a chart module. Run /impeccable typeset on it.\n\n${CHART.trim()}\n\nKeep the same module shape and the same data.\n`;

async function seedValidCell() {
  await rm(`${ROOT}/${ROW}`, { recursive: true, force: true });
  await mkdir(DIR, { recursive: true });
  await writeFile(`${DIR}/chart.js`, CHART);
  await renderCell(DIR);
  await writeCellManifest({
    cellDir: DIR, row: ROW, rowTitle: "Typeface", family: "type", arm: "A",
    mode: "refine",
    // method.name is the exact string src/rows.json declares for this arm —
    // the gate now compares the two, so a seed cannot invent its own.
    method: { kind: "default", name: "clean subagent, naive prompt", args: "", ranOn: null },
    prompt: PROMPT_A,
    fixture: "table12",
  });
}

/** Read the seeded manifest, mutate it in place, write it back — how a forger
 *  would tamper with a cell that is otherwise completely intact. */
async function forgeManifest(cellDir, mutate) {
  const m = JSON.parse(await readFile(`${cellDir}/cell.json`, "utf8"));
  mutate(m);
  await writeFile(`${cellDir}/cell.json`, JSON.stringify(m, null, 2) + "\n");
  return m;
}

/** A fully valid refine-mode Arm B cell alongside the seeded baseline, with the
 *  lineage under test. Defaults to a module that genuinely moves the row's
 *  declared premise, because "fully valid" now includes clearing check 12. */
async function writeRefineB(ranOn, code = CHART_TREATED) {
  const bDir = `${ROOT}/${ROW}/B`;
  await mkdir(bDir, { recursive: true });
  await writeFile(`${bDir}/chart.js`, code);
  await renderCell(bDir);
  await writeCellManifest({
    cellDir: bDir, row: ROW, rowTitle: "Typeface", family: "type", arm: "B",
    mode: "refine",
    method: { kind: "skill", name: "/impeccable typeset", args: "", ranOn },
    prompt: PROMPT_B, fixture: "table12",
  });
  return bDir;
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
  await rm(`${ROOT}/type-04-numerals`, { recursive: true, force: true });
  await rm(`${ROOT}/type-03-weight`, { recursive: true, force: true });
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

  it("check 4: fails when a refine B cell's ranOn does not resolve to a generated Arm A cell", async () => {
    await writeRefineB(`${ROW}.A`);
    // The baseline it names stops being a registered cell.
    await rm(`${DIR}/cell.json`);
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain(`method.ranOn "${ROW}.A" does not resolve`);
  });

  // Fix round 1: check 4 used to split ranOn on "." and only ever look at the
  // row segment, so "<row>.C" or a bare "<row>" (no arm suffix at all) both
  // silently resolved as long as that row had a real Arm-A cell — a cell
  // could claim descent from one arm while the gate validated a different
  // one. These three tests pin the closed hole: the two bad shapes below
  // must now fail, and the well-formed shape must still pass.
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

// The gallery publishes render.svg, not chart.js. Hashing chart.js alone left
// the artifact a reader actually looks at completely unverified: both forgeries
// below passed the whole gate before check 11 existed.
describe("verifyCells check 11 — render.svg is re-rendered, not trusted", () => {
  it("fails when render.svg is hand-edited after generation", async () => {
    const svg = await readFile(`${DIR}/render.svg`, "utf8");
    // Recolour and relabel the published artifact; chart.js is untouched, so
    // its hash still matches and every other check still passes.
    await writeFile(`${DIR}/render.svg`, svg.replace("<rect", '<rect fill="#ff00ff"'));
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain(`${ROW}.A: render.svg is not what chart.js renders`);
  });

  it("fails when one arm's render.svg is substituted for another arm's", async () => {
    // Arm B renders circles, Arm A renders rects. Drop B's render over A's and
    // the baseline displays the treated arm's result — the exact substitution
    // that turns the gallery from evidence into decoration.
    const bDir = `${ROOT}/${ROW}/B`;
    await mkdir(bDir, { recursive: true });
    await writeFile(`${bDir}/chart.js`, CHART_B);
    await renderCell(bDir);
    await writeCellManifest({
      cellDir: bDir, row: ROW, rowTitle: "Typeface", family: "type", arm: "B",
      mode: "refine",
      method: { kind: "skill", name: "/impeccable typeset", args: "", ranOn: `${ROW}.A` },
      prompt: PROMPT_B, fixture: "table12",
    });
    const bSvg = await readFile(`${bDir}/render.svg`, "utf8");
    const aSvg = await readFile(`${DIR}/render.svg`, "utf8");
    expect(bSvg).not.toBe(aSvg); // the substitution is a real change
    await copyFile(`${bDir}/render.svg`, `${DIR}/render.svg`);
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain(`${ROW}.A: render.svg is not what chart.js renders`);
    // B, whose own render is genuine, is not implicated.
    expect(failures.join()).not.toContain(`${ROW}.B: render.svg`);
  });
});

// cell.json used to be the only witness to its own claims. Each case below is a
// forgery the reviewer ran against a copy of a real cell and watched pass.
describe("verifyCells check 8/9/10 — cell.json is cross-validated, not self-certified", () => {
  it("A3: fails when a baseline's prompt is rewritten to something never sent", async () => {
    await forgeManifest(DIR, (m) => {
      m.prompt = "Make a beautiful, editorial-grade chart. Use Helvetica.";
    });
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain("prompt does not contain the \"table12\" fixture JSON verbatim");
  });

  it("A3: fails when a refine arm's prompt no longer contains the baseline module it ran on", async () => {
    const bDir = await writeRefineB(`${ROW}.A`);
    await forgeManifest(bDir, (m) => {
      m.prompt = "Run /impeccable typeset on the chart from the last message.";
    });
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain(`${ROW}.B: prompt does not contain "${ROW}.A"'s chart.js verbatim`);
  });

  it("A4: fails when a baseline is relabelled as a skill cell", async () => {
    await forgeManifest(DIR, (m) => {
      m.method.kind = "skill";
      m.method.name = "/impeccable typeset";
    });
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain('manifest method.kind "skill" contradicts src/rows.json ("default")');
    expect(failures.join()).toContain("is not the method src/rows.json declares");
  });

  it("A5: fails on a method.kind outside the closed set", async () => {
    await forgeManifest(DIR, (m) => {
      m.method.kind = "wizardry";
    });
    const { failures } = await verifyCells({ cellsDir: ROOT });
    expect(failures.join()).toContain('bad method.kind "wizardry"');
  });

  it("A6: fails when the manifest claims an id and arm its directory contradicts", async () => {
    await forgeManifest(DIR, (m) => {
      m.id = `${ROW}.C`;
      m.arm = "C";
    });
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain(`manifest id "${ROW}.C" contradicts the directory`);
    expect(failures.join()).toContain('manifest arm "C" contradicts the directory');
  });

  it("A7: fails when a baseline erases the three-run methodology", async () => {
    await forgeManifest(DIR, (m) => {
      m.runs = 1;
      m.shipped = "only";
    });
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain("Arm A must record runs >= 3");
    expect(failures.join()).toContain('Arm A must record shipped "median"');
  });

  it("A7b: fails on an explicit cherry-pick admission in a treated arm", async () => {
    const bDir = await writeRefineB(`${ROW}.A`);
    await forgeManifest(bDir, (m) => {
      m.runs = 5;
      m.shipped = "prettiest of 5";
    });
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain("arm B must record runs 1");
    expect(failures.join()).toContain('arm B must record shipped "only"');
  });

  it("A8: fails when the manifest's fixture contradicts src/rows.json", async () => {
    await forgeManifest(DIR, (m) => {
      m.fixture = "cycle12";
    });
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain('manifest fixture "cycle12" contradicts src/rows.json ("table12")');
  });

  it("A8: fails when the manifest's fixture contradicts chart.js's own meta", async () => {
    // chart.js — the hash-verified file — says cycle12; the manifest says
    // table12, which is what rows.json declares, so only the meta check can
    // see the lie. The cell is otherwise completely intact: re-rendered,
    // re-hashed, registered through the real tool.
    await writeFile(`${DIR}/chart.js`, CHART.replace('fixture:"table12"', 'fixture:"cycle12"'));
    await renderCell(DIR);
    await writeCellManifest({
      cellDir: DIR, row: ROW, rowTitle: "Typeface", family: "type", arm: "A",
      mode: "refine",
      method: { kind: "default", name: "clean subagent, naive prompt", args: "", ranOn: null },
      prompt: PROMPT_A, fixture: "table12",
    });
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain(
      'chart.js meta.fixture "cycle12" contradicts cell.json fixture "table12"',
    );
  });

  it("A9: fails when a treated arm claims another row's baseline as its lineage", async () => {
    const bDir = await writeRefineB(`${ROW}.A`);
    await forgeManifest(bDir, (m) => {
      m.method.ranOn = "type-02-scale.A";
    });
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain('method.ranOn "type-02-scale.A" names another row\'s baseline');
  });

  it("A12: fails when a B cell is republished as an Arm C its row never declared", async () => {
    // type-04-numerals declares arms A and B only. Before check 8, the gate
    // validated the *directory*'s arm (B, declared → fine) while
    // build-registry published the *manifest*'s (C, undeclared) — so the
    // gallery gained an Arm C tool cell for a method nobody ran.
    const dir = `${ROOT}/type-04-numerals/B`;
    await mkdir(dir, { recursive: true });
    await writeFile(`${dir}/chart.js`, CHART);
    await renderCell(dir);
    await writeCellManifest({
      cellDir: dir, row: "type-04-numerals", rowTitle: "Tabular vs proportional figures",
      family: "type", arm: "C", mode: "refine",
      method: {
        kind: "tool", name: "reference-PNG + Chrome screenshot diff", args: "",
        ranOn: "type-04-numerals.A",
      },
      prompt: PROMPT_A, fixture: "table12",
    });
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain('manifest id "type-04-numerals.C" contradicts the directory');
    expect(failures.join()).toContain('manifest arm "C" contradicts the directory');
    await rm(`${ROOT}/type-04-numerals`, { recursive: true, force: true });
  });

  it("L63: fails when --row-title/--family override what src/rows.json declares", async () => {
    await forgeManifest(DIR, (m) => {
      m.rowTitle = "Numerals";
      m.family = "layout";
    });
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain('manifest rowTitle "Numerals" contradicts src/rows.json');
    expect(failures.join()).toContain('manifest family "layout" contradicts src/rows.json');
  });
});

// Every check above asks whether a cell is well-formed and honestly provenanced.
// None of them asks whether it is *about* what its row says it is about — so
// 3 of Phase 1's 15 treated cells shipped a lever that was never pulled
// (mark-07-overlap.B and .C, type-04-numerals.B) and passed the whole gate.
describe("verifyCells check 12 — a treated arm must move its row's declared premise", () => {
  it("fails when a treated arm's probe is identical to its baseline's", async () => {
    // Recolours the bars and touches nothing else: a real edit, a real hash
    // change, a real render change — and no engagement with "Typeface".
    await writeRefineB(`${ROW}.A`, CHART_OFF_PREMISE);
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain(`${ROW}.B: premise not engaged`);
    expect(failures.join()).toContain('"font-family" probe is identical');
  });

  it("passes when the treated arm moves the dimension the row declares", async () => {
    await writeRefineB(`${ROW}.A`, CHART_TREATED);
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(failures.join()).not.toMatch(/premise/i);
    expect(ok).toBe(true);
  });

  it("fails when a row carrying a treated cell declares no premise probe", async () => {
    // type-03-weight is a real declared row that has not been generated yet and
    // therefore names no premise. Generating into it must be blocked, not
    // silently unverified — this is what makes the check a Phase 2 gate rather
    // than a one-off audit of the rows that happen to declare a probe.
    const row = "type-03-weight";
    for (const [arm, code] of [["A", CHART], ["B", CHART_TREATED]]) {
      const d = `${ROOT}/${row}/${arm}`;
      await mkdir(d, { recursive: true });
      await writeFile(`${d}/chart.js`, code);
      await renderCell(d);
      await writeCellManifest({
        cellDir: d, row, rowTitle: "Weight and contrast", family: "type", arm,
        mode: "refine",
        method: arm === "A"
          ? { kind: "default", name: "clean subagent, naive prompt", args: "", ranOn: null }
          : { kind: "skill", name: "/impeccable typeset", args: "", ranOn: `${row}.A` },
        prompt: arm === "A" ? PROMPT_A : PROMPT_B, fixture: "table12",
      });
    }
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain(`${row}.B: src/rows.json declares no premise probe`);
    await rm(`${ROOT}/${row}`, { recursive: true, force: true });
  });

  it("names the two honest ways out, so the failure doesn't read as 'delete the cell'", async () => {
    await writeRefineB(`${ROW}.A`, CHART_OFF_PREMISE);
    const { failures } = await verifyCells({ cellsDir: ROOT });
    expect(failures.join()).toMatch(/nullResult/);
  });
});

// A probe-identical cell is a finding, not a defect in the harness: "the named
// skill, run exactly as its documentation says, did not touch this lever" is
// the most load-bearing thing this gallery can report. Check 12 must stop it
// being published as a *demonstration* without also pushing the next session
// toward deleting it, regenerating it under a lever-forcing prompt (which
// measures "skill plus an explicit brief" while still calling itself the
// skill), or relabelling the row to whatever the arm happened to change (which
// picks the hypothesis after seeing the data). The declared-nullResult path is
// the way through — and it is checked in both directions, so it cannot become a
// mute button.
describe("verifyCells check 12 — a declared null result ships, disclosed and cross-checked", () => {
  // type-04-numerals.B is the real one of these: `dataviz` cut 24 numeric
  // annotations to 2 and never touched numeral formatting. It declares a
  // nullResult in src/rows.json, so the row seeded here mirrors that shape —
  // real row, real declared method, real `numeric-format` premise.
  const NULL_ROW = "type-04-numerals";

  // That probe only reads text that actually contains digits, so a module
  // labelling bars with country names alone probes empty either way and would
  // make both tests below pass for the wrong reason. Put a number in the label.
  const NUM = CHART.replace("t.textContent=r.label;", 't.textContent=r.label+" "+r.value;');
  /** Moves the premise: a different stack on the digit-bearing text. */
  const NUM_TREATED = NUM.replace("Helvetica, Arial, sans-serif", "Georgia, serif");
  /** Doesn't: recolours the bars, numeral formatting untouched. */
  const NUM_OFF_PREMISE = NUM.replace(
    'e.setAttribute("x",String(i*16));',
    'e.setAttribute("x",String(i*16));e.setAttribute("fill","#d55181");',
  );
  const NUM_PROMPT_B = `Here is a chart module. Invoke the \`dataviz\` skill, then apply what it says.\n\n${NUM.trim()}\n\nKeep the same module shape and the same data.\n`;

  async function seedNullResultRow(bCode) {
    for (const [arm, code] of [["A", NUM], ["B", bCode]]) {
      const d = `${ROOT}/${NULL_ROW}/${arm}`;
      await mkdir(d, { recursive: true });
      await writeFile(`${d}/chart.js`, code);
      await renderCell(d);
      await writeCellManifest({
        cellDir: d, row: NULL_ROW, rowTitle: "Tabular vs proportional figures",
        family: "type", arm, mode: "refine",
        method: arm === "A"
          ? { kind: "default", name: "clean subagent, naive prompt", args: "", ranOn: null }
          : { kind: "skill", name: "dataviz", args: "", ranOn: `${NULL_ROW}.A` },
        prompt: arm === "A" ? PROMPT_A : NUM_PROMPT_B, fixture: "table12",
      });
    }
  }

  afterEach(async () => {
    await rm(`${ROOT}/${NULL_ROW}`, { recursive: true, force: true });
  });

  it("passes a probe-identical arm its row declares a nullResult for", async () => {
    // Same shape as the shipped cell: a real edit, a real hash change, and a
    // numeric-format probe identical to the baseline's.
    await seedNullResultRow(NUM_OFF_PREMISE);
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(failures.join()).not.toMatch(/premise not engaged/);
    expect(ok).toBe(true);
  });

  it("fails when a declared nullResult sits on an arm whose probe actually moved", async () => {
    // The stale-disclosure case, and the reason this is a two-way check rather
    // than a waiver: regenerate the cell so the lever does move, leave the
    // declaration behind, and the page tells a reader the premise is untested
    // when it isn't.
    await seedNullResultRow(NUM_TREATED);
    const { ok, failures } = await verifyCells({ cellsDir: ROOT });
    expect(ok).toBe(false);
    expect(failures.join()).toContain(`${NULL_ROW}.B: src/rows.json declares a nullResult`);
    expect(failures.join()).toMatch(/the disclosure is stale/);
  });
});

// check 3c guards the declaration itself. Exercised directly against the pure
// helper rather than through verifyCells(), because the inventory it validates
// is src/rows.json — which is real, checked in, and currently valid, so there
// is no way to seed a malformed declaration through the gate's front door.
describe("nullResultDeclFailures — check 3c", () => {
  const REASON = "dataviz cut 24 numeric annotations to 2 and never touched numeral formatting.";
  const row = (arms) => ({ id: "null-01-probe", declaredArms: arms });

  it("accepts a treated arm with a stated reason", () => {
    const out = nullResultDeclFailures(row([
      { arm: "A", kind: "default", method: "clean subagent, naive prompt" },
      { arm: "B", kind: "skill", method: "dataviz", nullResult: REASON },
    ]));
    expect(out).toEqual([]);
  });

  it("says nothing about an arm that declares no null result at all", () => {
    expect(nullResultDeclFailures(row([{ arm: "B", kind: "skill", method: "dataviz" }]))).toEqual([]);
  });

  it("rejects a reason too short to say what moved instead", () => {
    const out = nullResultDeclFailures(row([{ arm: "B", kind: "skill", method: "dataviz", nullResult: "n/a" }]));
    expect(out.join()).toContain("null-01-probe.B: nullResult needs a stated reason");
  });

  it("rejects a bare truthy flag — the disclosure is the whole point", () => {
    const out = nullResultDeclFailures(row([{ arm: "B", kind: "skill", method: "dataviz", nullResult: true }]));
    expect(out.join()).toContain("nullResult needs a stated reason");
  });

  it("rejects the baseline declaring itself null — it is what a null is measured against", () => {
    const out = nullResultDeclFailures(row([
      { arm: "A", kind: "default", method: "clean subagent, naive prompt", nullResult: REASON },
    ]));
    expect(out.join()).toContain("null-01-probe.A: only a treated arm can declare a nullResult");
  });
});
