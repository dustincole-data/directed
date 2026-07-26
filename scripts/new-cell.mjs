import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function sha256OfFile(path) {
  const buf = await readFile(resolve(path));
  return createHash("sha256").update(buf).digest("hex");
}

export async function writeCellManifest(input) {
  const {
    cellDir, row, rowTitle, family, arm, mode, method, prompt, fixture, notes = "",
  } = input;

  if (!prompt || !prompt.trim()) throw new Error("cell.prompt must be verbatim and non-empty");
  if (!/^[a-z]+-\d{2}-[a-z0-9-]+$/.test(row)) throw new Error(`bad row id: ${row}`);
  if (!["A", "B", "C"].includes(arm)) throw new Error(`bad arm: ${arm}`);
  if (!["refine", "from-scratch"].includes(mode)) throw new Error(`bad mode: ${mode}`);
  if (!["default", "skill", "tool"].includes(method?.kind)) throw new Error(`bad method.kind: ${method?.kind}`);
  if (arm !== "A" && mode === "refine" && !method?.ranOn) {
    throw new Error(`${row}.${arm}: refine-mode arms must name method.ranOn`);
  }

  // Arm A manages run-to-run variance; directed arms run exactly once so the
  // gallery cannot be accused of shipping the prettiest of several attempts.
  const runs = arm === "A" ? (input.runs ?? 3) : 1;
  const shipped = arm === "A" ? (input.shipped ?? "median") : "only";

  const manifest = {
    id: `${row}.${arm}`,
    family,
    row,
    rowTitle,
    arm,
    mode,
    method,
    prompt,
    fixture,
    generated: input.generated ?? new Date().toISOString().slice(0, 10),
    runs,
    shipped,
    codeSha256: await sha256OfFile(join(cellDir, "chart.js")),
    notes,
  };

  await writeFile(join(cellDir, "cell.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest;
}

// ---- CLI -------------------------------------------------------------
//
// node scripts/new-cell.mjs \
//   --row type-01-typeface --arm A --mode refine \
//   --method-kind default --method-name "clean subagent" \
//   --prompt-file <path> --fixture table12
//
// Registers a cell.json for a chart.js that was already generated at
// --cell-dir (default cells/<row>/<arm>). --prompt-file exists because
// prompts are multi-line and must survive unmangled by shell quoting.

const USAGE = `usage: node scripts/new-cell.mjs
  --row <row-id> --arm <A|B|C> --prompt-file <path>
  --mode <refine|from-scratch> --method-kind <default|skill|tool>
  --method-name "<exact invocation>"
  [--method-args "<text>"] [--ran-on <row>.A] --fixture <name>
  [--notes "<text>"] [--cell-dir <path>]
  [--row-title <title> --family <family>]  (fallback if src/rows.ts lookup fails)`;

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith("--")) {
      throw new Error(`unexpected argument: ${tok}`);
    }
    const key = tok.slice(2);
    const val = argv[i + 1];
    if (val === undefined || val.startsWith("--")) {
      throw new Error(`missing value for --${key}`);
    }
    flags[key] = val;
    i++;
  }
  return flags;
}

async function deriveRowMeta(row, flags) {
  if (flags["row-title"] && flags.family) {
    return { rowTitle: flags["row-title"], family: flags.family };
  }
  try {
    const rowsUrl = pathToFileURL(resolve("src/rows.ts")).href;
    const { getRow } = await import(rowsUrl);
    const decl = getRow(row);
    return { rowTitle: decl.title, family: decl.family };
  } catch (err) {
    throw new Error(
      `could not derive rowTitle/family for "${row}" from src/rows.ts (${err.message}); ` +
        `pass --row-title and --family explicitly`,
    );
  }
}

export async function runCli(argv) {
  const REQUIRED = ["row", "arm", "prompt-file", "mode", "method-kind", "method-name", "fixture"];
  const flags = parseArgs(argv);
  const missing = REQUIRED.filter((k) => !(k in flags));
  if (missing.length) {
    throw new Error(`missing required flag(s): ${missing.map((k) => `--${k}`).join(", ")}\n${USAGE}`);
  }

  const prompt = await readFile(resolve(flags["prompt-file"]), "utf8");
  const { rowTitle, family } = await deriveRowMeta(flags.row, flags);
  const cellDir = flags["cell-dir"] ?? join("cells", flags.row, flags.arm);

  const manifest = await writeCellManifest({
    cellDir,
    row: flags.row,
    rowTitle,
    family,
    arm: flags.arm,
    mode: flags.mode,
    method: {
      kind: flags["method-kind"],
      name: flags["method-name"],
      args: flags["method-args"] ?? "",
      ranOn: flags["ran-on"] ?? null,
    },
    prompt,
    fixture: flags.fixture,
    notes: flags.notes ?? "",
  });

  return { manifest, cellDir };
}

if (process.argv[1] && process.argv[1].endsWith("new-cell.mjs")) {
  try {
    const { manifest, cellDir } = await runCli(process.argv.slice(2));
    console.log(`wrote ${cellDir}/cell.json`);
    console.log(JSON.stringify(manifest, null, 2));
  } catch (err) {
    console.error(err.message ?? String(err));
    if (!process.argv.slice(2).length) console.error(USAGE);
    process.exit(2);
  }
}
