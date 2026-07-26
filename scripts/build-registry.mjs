import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const OUT = resolve("src/generated/registry.json");

async function loadRows() {
  // Row data is checked-in JSON (src/rows.json, re-exported typed from
  // src/rows.ts) — read it directly. No TS stripping, no data: URL eval.
  const raw = await readFile(resolve("src/rows.json"), "utf8");
  return JSON.parse(raw);
}

async function readCell(cellsRoot, rowId, arm) {
  // Every candidate directory here is <cellsRoot>/<rowId>/<arm>, built from a
  // declared row id and arm letter — never from a directory listing — so
  // the "_"-prefixed scratch/contract entries under cells/ (cells/_contract.md,
  // cells/_test/, cells/_mtest/, cells/_vtest/) are never touched.
  //
  // Any read failure here (dir absent, cell.json missing/malformed,
  // render.svg missing) is treated as "not generated yet" rather than a
  // crash — a half-written cell just doesn't appear in the registry. It is
  // verify-cells.mjs's job (check 1) to complain loudly about a cell dir
  // that exists but is incomplete; buildRegistry only needs to stay usable
  // while that state is inspected.
  const dir = join(cellsRoot, rowId, arm);
  try {
    const manifest = JSON.parse(await readFile(join(dir, "cell.json"), "utf8"));
    const svg = await readFile(join(dir, "render.svg"), "utf8");
    return {
      id: manifest.id,
      arm: manifest.arm,
      method: manifest.method,
      prompt: manifest.prompt,
      runs: manifest.runs,
      shipped: manifest.shipped,
      generated: manifest.generated,
      svg,
    };
  } catch {
    return null;
  }
}

export async function buildRegistry({ cellsDir = "cells" } = {}) {
  const CELLS = resolve(cellsDir);
  const rows = await loadRows();
  const outRows = [];
  for (const r of rows) {
    const cells = [];
    for (const a of r.arms) {
      const c = await readCell(CELLS, r.id, a.arm);
      if (c) cells.push(c);
    }
    cells.sort((x, y) => x.arm.localeCompare(y.arm));
    outRows.push({
      id: r.id, title: r.title, family: r.family, mode: r.mode,
      fixture: r.fixture, phase: r.phase, gap: r.gap ?? null,
      declaredArms: r.arms, cells,
    });
  }

  const families = [];
  for (const r of outRows) {
    let f = families.find((x) => x.family === r.family);
    if (!f) families.push((f = { family: r.family, rows: [] }));
    f.rows.push(r.id);
  }

  return { built: new Date().toISOString().slice(0, 10), families, rows: outRows };
}

if (process.argv[1] && process.argv[1].endsWith("build-registry.mjs")) {
  const reg = await buildRegistry();
  await mkdir(resolve("src/generated"), { recursive: true });
  await writeFile(OUT, JSON.stringify(reg, null, 2) + "\n", "utf8");
  const n = reg.rows.reduce((a, r) => a + r.cells.length, 0);
  console.log(`registry: ${reg.rows.length} rows, ${n} generated cells`);
}
