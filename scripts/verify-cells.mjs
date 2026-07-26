import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sha256OfFile } from "./new-cell.mjs";
import { buildRegistry } from "./build-registry.mjs";

const PLACEHOLDER = /\b(TBD|TODO|FIXME|lorem ipsum)\b/i;

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function generatedDirs(cellsRoot) {
  const out = [];
  let rowEntries;
  try {
    rowEntries = await readdir(cellsRoot, { withFileTypes: true });
  } catch {
    return out; // cellsRoot doesn't exist yet (e.g. an untouched scratch root) — nothing generated
  }
  for (const rowDir of rowEntries) {
    if (!rowDir.isDirectory() || rowDir.name.startsWith("_")) continue;
    for (const armDir of await readdir(join(cellsRoot, rowDir.name), { withFileTypes: true })) {
      if (armDir.isDirectory()) out.push({ row: rowDir.name, arm: armDir.name });
    }
  }
  return out;
}

export async function verifyCells({ cellsDir = "cells" } = {}) {
  const CELLS = resolve(cellsDir);
  const failures = [];
  const reg = await buildRegistry({ cellsDir });
  const byId = new Map(reg.rows.map((r) => [r.id, r]));
  const fixtureNames = new Set(
    (await readdir(resolve("src/fixtures"))).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)),
  );

  // check 3a: every declared row has a mode and at least one arm
  for (const r of reg.rows) {
    if (!["refine", "from-scratch"].includes(r.mode)) failures.push(`${r.id}: bad mode "${r.mode}"`);
    if (!r.declaredArms?.length) failures.push(`${r.id}: declares no arms`);
    if (r.gap && (!r.gap.trim() || r.gap.trim().length < 20)) failures.push(`${r.id}: gap needs a stated reason`);
  }

  for (const { row, arm } of await generatedDirs(CELLS)) {
    const dir = join(CELLS, row, arm);
    const tag = `${row}.${arm}`;
    const decl = byId.get(row);

    // check 3b: cell dir for an undeclared row
    if (!decl) {
      failures.push(`${tag}: cell dir for undeclared row`);
      continue;
    }

    // check 7: a gap row must carry no generated B/C cell on disk. This is
    // checked before the declared-arms check below because a gap row may
    // still pre-declare an arm it hasn't shipped yet (e.g. mark-05-texture
    // declares B while gapped) — the violation is the cell existing on
    // disk, independent of whether rows.json happens to name that arm.
    if (decl.gap && arm !== "A") {
      failures.push(`${tag}: gap row "${row}" must not have a generated ${arm} cell on disk`);
      continue;
    }

    // check 3b: cell dir for an undeclared arm
    if (!decl.declaredArms.some((a) => a.arm === arm)) {
      failures.push(`${tag}: cell dir for undeclared arm`);
      continue;
    }

    // check 1
    for (const f of ["cell.json", "chart.js", "render.svg"]) {
      if (!(await exists(join(dir, f)))) failures.push(`${tag}: missing ${f}`);
    }
    if (!(await exists(join(dir, "cell.json")))) continue;

    const m = JSON.parse(await readFile(join(dir, "cell.json"), "utf8"));

    // check 2
    if (!m.prompt || !m.prompt.trim()) failures.push(`${tag}: empty prompt`);
    else if (PLACEHOLDER.test(m.prompt)) failures.push(`${tag}: placeholder text in prompt`);

    // check 4
    if (arm !== "A" && decl.mode === "refine") {
      const ranOn = m.method?.ranOn;
      if (!ranOn) {
        failures.push(`${tag}: refine arm missing method.ranOn`);
      } else if (!(await exists(join(CELLS, ranOn.split(".")[0], "A", "cell.json")))) {
        failures.push(`${tag}: method.ranOn "${ranOn}" does not resolve to a generated Arm A cell`);
      }
    }

    // check 5
    if (!fixtureNames.has(m.fixture)) failures.push(`${tag}: unknown fixture "${m.fixture}"`);

    // check 6
    if (await exists(join(dir, "chart.js"))) {
      const actual = await sha256OfFile(join(dir, "chart.js"));
      if (actual !== m.codeSha256) {
        failures.push(`${tag}: chart.js hash mismatch — code was edited after generation`);
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

if (process.argv[1] && process.argv[1].endsWith("verify-cells.mjs")) {
  const { ok, failures } = await verifyCells();
  for (const f of failures) console.error(`FAIL ${f}`);
  console.log(ok ? "verify-cells: OK" : `verify-cells: ${failures.length} failure(s)`);
  process.exit(ok ? 0 : 1);
}
