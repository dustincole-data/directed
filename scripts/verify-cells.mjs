import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sha256OfFile } from "./new-cell.mjs";
import { buildRegistry } from "./build-registry.mjs";
import { renderCell, loadCellModule } from "./render-cell.mjs";

const PLACEHOLDER = /\b(TBD|TODO|FIXME|lorem ipsum)\b/i;
const METHOD_KINDS = new Set(["default", "skill", "tool"]);

// Check 10 compares a recorded prompt against files on disk. A checkout can
// legitimately rewrite line endings — `core.autocrlf=true` is this machine's
// setting, and `.gitattributes` pins LF only under `cells/`, so a fresh clone
// hands us CRLF fixtures against an LF-recorded prompt. That is a checkout
// artifact, not tampering, so both sides are normalised before comparing. (The
// hash check and the render comparison are deliberately byte-exact; those files
// *are* pinned to LF.)
const lf = (s) => s.replace(/\r\n/g, "\n");

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
      } else if (ranOn.split(".")[0] !== row) {
        // A treated arm descends from *its own* row's baseline. Without this,
        // a cell could name another row's Arm A — the gate would happily
        // resolve it (that cell exists) and the provenance page would link a
        // lineage the cell never actually ran on.
        failures.push(
          `${tag}: method.ranOn "${ranOn}" names another row's baseline — a treated arm must run on "${row}.A"`,
        );
      } else {
        // ranOn must be exactly "<row>.A" — a bare split-on-"." that only
        // checks the row segment would let a cell claim ranOn: "<row>.C" (or
        // "<row>" with no arm at all) and still resolve, as long as that row
        // happens to have a real Arm-A cell. That's a lineage forgery: the
        // cell can say it descends from one arm while the gate silently
        // validates against another. Require the id to parse as exactly two
        // "."-separated, non-empty segments with the arm segment literally "A".
        const parts = ranOn.split(".");
        const [ranOnRow, ranOnArm] = parts;
        const malformed = parts.length !== 2 || !ranOnRow || ranOnArm !== "A";
        if (malformed) {
          failures.push(`${tag}: method.ranOn "${ranOn}" is not a well-formed "<row>.A" id`);
        } else if (!(await exists(join(CELLS, ranOnRow, "A", "cell.json")))) {
          failures.push(`${tag}: method.ranOn "${ranOn}" does not resolve to a generated Arm A cell`);
        }
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

    // ---- check 8: cell.json is cross-validated, never self-certified -------
    //
    // Every field below is compared against a source that can contradict it:
    // the directory the cell lives at (git-visible, and what `generatedDirs`
    // walked to get here), `src/rows.json` (the row inventory, written before
    // any cell was generated), or the mechanical run-count rule in
    // docs/factory.md. Before these checks the manifest was the only witness
    // to its own claims — the gate validated the *directory*'s arm while
    // build-registry published the *manifest*'s, so a cell could be
    // republished as an arm its row never declared, carrying a method that was
    // never run, and pass.
    const declArm = decl.declaredArms.find((a) => a.arm === arm);

    if (m.id !== tag) failures.push(`${tag}: manifest id "${m.id}" contradicts the directory the cell lives at`);
    if (m.arm !== arm) failures.push(`${tag}: manifest arm "${m.arm}" contradicts the directory the cell lives at`);
    if (m.row !== row) failures.push(`${tag}: manifest row "${m.row}" contradicts the directory the cell lives at`);
    if (m.mode !== decl.mode) failures.push(`${tag}: manifest mode "${m.mode}" contradicts src/rows.json ("${decl.mode}")`);
    if (m.rowTitle !== decl.title) failures.push(`${tag}: manifest rowTitle "${m.rowTitle}" contradicts src/rows.json ("${decl.title}")`);
    if (m.family !== decl.family) failures.push(`${tag}: manifest family "${m.family}" contradicts src/rows.json ("${decl.family}")`);

    if (!METHOD_KINDS.has(m.method?.kind)) {
      // new-cell.mjs rejects an off-list kind at write time; nothing re-checked
      // it afterwards, so a hand-written manifest could claim any kind at all.
      failures.push(`${tag}: bad method.kind "${m.method?.kind}" — not one of default/skill/tool`);
    } else if (m.method.kind !== declArm.kind) {
      failures.push(`${tag}: manifest method.kind "${m.method.kind}" contradicts src/rows.json ("${declArm.kind}")`);
    }
    if (m.method?.name !== declArm.method) {
      failures.push(
        `${tag}: manifest method.name "${m.method?.name}" is not the method src/rows.json declares ("${declArm.method}")`,
      );
    }
    if (m.fixture !== decl.fixture) {
      failures.push(`${tag}: manifest fixture "${m.fixture}" contradicts src/rows.json ("${decl.fixture}")`);
    }

    // The run-count rule is the anti-cherry-picking guarantee: Arm A runs at
    // least three times and ships the mechanical median, arms B and C run once
    // so no directed attempt can be the prettiest of several.
    if (arm === "A") {
      if (!(Number.isInteger(m.runs) && m.runs >= 3)) failures.push(`${tag}: Arm A must record runs >= 3, got ${m.runs}`);
      if (m.shipped !== "median") failures.push(`${tag}: Arm A must record shipped "median", got "${m.shipped}"`);
    } else {
      if (m.runs !== 1) failures.push(`${tag}: arm ${arm} must record runs 1 (one directed attempt), got ${m.runs}`);
      if (m.shipped !== "only") failures.push(`${tag}: arm ${arm} must record shipped "only", got "${m.shipped}"`);
    }

    if (!(await exists(join(dir, "chart.js")))) continue;

    // ---- check 9: chart.js's own meta must agree with the manifest ---------
    // chart.js is the hash-verified file, so its `meta.fixture` is the one
    // fixture claim in a cell that cannot be edited without detection.
    let mod;
    try {
      mod = await loadCellModule(dir);
    } catch (err) {
      failures.push(`${tag}: chart.js could not be imported — ${err.message}`);
    }
    if (mod && mod.meta?.fixture !== m.fixture) {
      failures.push(
        `${tag}: chart.js meta.fixture "${mod.meta?.fixture}" contradicts cell.json fixture "${m.fixture}"`,
      );
    }

    // ---- check 10: the published prompt must contain what it ran on -------
    //
    // `prompt` lives in the same file that records the code hash, so nothing
    // else in the cell can contradict it — and the spec calls it "verbatim and
    // non-negotiable — it is what makes the comparison checkable by a reader".
    // The runbook's templates give it exactly one checkable property: a
    // refine-mode treated arm is sent its baseline's module verbatim, and every
    // other arm is sent the fixture JSON verbatim. Both of those are files the
    // gate can read, so a prompt rewritten after the fact no longer matches.
    const prompt = lf(String(m.prompt ?? "")); // check 2 already reports it empty
    if (arm !== "A" && decl.mode === "refine") {
      const basePath = join(CELLS, row, "A", "chart.js");
      if (await exists(basePath)) {
        const baseCode = lf(await readFile(basePath, "utf8")).trim();
        if (!prompt.includes(baseCode)) {
          failures.push(
            `${tag}: prompt does not contain "${row}.A"'s chart.js verbatim — a refine arm is sent its baseline module, so the recorded prompt is not the prompt that was run`,
          );
        }
      }
    } else {
      const fixturePath = resolve(`src/fixtures/${decl.fixture}.json`);
      if (await exists(fixturePath)) {
        const fixtureText = lf(await readFile(fixturePath, "utf8")).trim();
        if (!prompt.includes(fixtureText)) {
          failures.push(
            `${tag}: prompt does not contain the "${decl.fixture}" fixture JSON verbatim — every non-refine arm is sent the dataset inline, so the recorded prompt is not the prompt that was run`,
          );
        }
      }
    }

    // ---- check 11: render.svg must be the output of this chart.js ----------
    //
    // The gallery publishes render.svg, not chart.js: Swatch.astro and
    // cell/[id].astro inline it verbatim with set:html, and
    // diffAgainstBaseline() computes the published "structural change vs the
    // default arm" from it. Hashing chart.js alone left the artifact a reader
    // actually looks at unverified — a recoloured, relabelled, or wholesale
    // substituted SVG (e.g. the treated arm's render dropped over the
    // baseline's) shipped and passed every check. Re-rendering is strictly
    // stronger than recording a renderSha256, because a hash in the manifest
    // can be re-recorded and a fresh render cannot. cells/_contract.md's
    // "renders must be byte-stable across runs" is what makes it possible.
    if (mod && (await exists(join(dir, "render.svg")))) {
      let fresh;
      try {
        fresh = await renderCell(dir, { write: false });
      } catch (err) {
        failures.push(`${tag}: chart.js failed to re-render — ${err.message}`);
      }
      if (fresh !== undefined) {
        const committed = await readFile(join(dir, "render.svg"), "utf8");
        if (fresh !== committed) {
          failures.push(
            `${tag}: render.svg is not what chart.js renders — the published SVG was hand-edited or substituted`,
          );
        }
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
