import { describe, expect, it, beforeEach } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { writeCellManifest, sha256OfFile } from "./new-cell.mjs";

const DIR = "cells/_mtest/A";

beforeEach(async () => {
  await rm("cells/_mtest", { recursive: true, force: true });
  await mkdir(DIR, { recursive: true });
  await writeFile(`${DIR}/chart.js`, `export const meta={fixture:"table12"};export function render(){}`);
});

const BASE = {
  cellDir: DIR, row: "type-01-typeface", rowTitle: "Typeface", family: "type",
  arm: "A", mode: "refine",
  method: { kind: "default", name: "clean subagent", args: "", ranOn: null },
  prompt: "Here is a dataset. Make a chart of it.",
  fixture: "table12", runs: 3, shipped: "median", notes: "",
};

describe("writeCellManifest", () => {
  it("writes cell.json with a composite id", async () => {
    await writeCellManifest(BASE);
    const m = JSON.parse(await readFile(`${DIR}/cell.json`, "utf8"));
    expect(m.id).toBe("type-01-typeface.A");
  });

  it("records the sha256 of chart.js so later edits are detectable", async () => {
    await writeCellManifest(BASE);
    const m = JSON.parse(await readFile(`${DIR}/cell.json`, "utf8"));
    expect(m.codeSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(m.codeSha256).toBe(await sha256OfFile(`${DIR}/chart.js`));
  });

  it("hash changes when chart.js changes", async () => {
    const before = await sha256OfFile(`${DIR}/chart.js`);
    await writeFile(`${DIR}/chart.js`, `export const meta={fixture:"hero8"};export function render(){}`);
    expect(await sha256OfFile(`${DIR}/chart.js`)).not.toBe(before);
  });

  it("rejects an empty prompt", async () => {
    await expect(writeCellManifest({ ...BASE, prompt: "   " })).rejects.toThrow(/prompt/i);
  });

  it("forces runs=1 shipped=only for arms B and C", async () => {
    await writeCellManifest({
      ...BASE, arm: "B", runs: 3, shipped: "median",
      method: { kind: "skill", name: "/impeccable typeset", args: "", ranOn: "type-01-typeface.A" },
    });
    const m = JSON.parse(await readFile(`${DIR}/cell.json`, "utf8"));
    expect(m.runs).toBe(1);
    expect(m.shipped).toBe("only");
  });

  it("requires ranOn for a refine-mode non-A arm", async () => {
    await expect(writeCellManifest({
      ...BASE, arm: "B", mode: "refine",
      method: { kind: "skill", name: "/impeccable typeset", args: "", ranOn: null },
    })).rejects.toThrow(/ranOn/i);
  });

  it("rejects a mis-cased mode instead of silently bypassing the ranOn check", async () => {
    // Regression: "Refine" !== "refine", so the old code's `mode === "refine"`
    // guard fell through and let an arm-B cell write with ranOn: null — a cell
    // that claims refinement but records no baseline. Must fail loudly, not
    // coerce the case.
    await expect(writeCellManifest({
      ...BASE, arm: "B", mode: "Refine",
      method: { kind: "skill", name: "/impeccable typeset", args: "", ranOn: null },
    })).rejects.toThrow(/mode/i);
  });

  it("rejects an unknown method.kind", async () => {
    await expect(writeCellManifest({
      ...BASE, method: { kind: "magic", name: "wand", args: "", ranOn: null },
    })).rejects.toThrow(/method\.kind/i);
  });
});

describe("sha256OfFile", () => {
  it("hashes raw bytes: appending one byte changes the digest", async () => {
    const path = "cells/_mtest/A/chart.js";
    const before = await sha256OfFile(path);
    const buf = await readFile(path);
    await writeFile(path, Buffer.concat([buf, Buffer.from([0x2e])])); // append "."
    const after = await sha256OfFile(path);
    expect(after).not.toBe(before);
  });
});

// ---- CLI ---------------------------------------------------------------
//
// These spawn the real `node scripts/new-cell.mjs ...` process, because the
// exported-function tests above never exercise argument parsing, the
// prompt-file read, or the src/rows.ts lookup that the CLI is responsible for.

function runCli(args) {
  return spawnSync(process.execPath, ["scripts/new-cell.mjs", ...args], {
    encoding: "utf8",
    cwd: process.cwd(),
  });
}

describe("new-cell CLI", () => {
  it("writes a cell.json end-to-end, deriving rowTitle/family from src/rows.ts", async () => {
    const cellDir = "cells/_mtest/cli-A";
    await mkdir(cellDir, { recursive: true });
    await writeFile(`${cellDir}/chart.js`, `export const meta={fixture:"table12"};export function render(){}`);
    const promptPath = "cells/_mtest/prompt-a.txt";
    const promptText = "Here is a dataset.\nMake a chart of it.\nUse line 3 too.";
    await writeFile(promptPath, promptText);

    const res = runCli([
      "--row", "type-01-typeface",
      "--arm", "A",
      "--mode", "refine",
      "--method-kind", "default",
      "--method-name", "clean subagent, naive prompt",
      "--fixture", "table12",
      "--cell-dir", cellDir,
      "--prompt-file", promptPath,
    ]);

    expect(res.status).toBe(0);
    const m = JSON.parse(await readFile(`${cellDir}/cell.json`, "utf8"));
    expect(m.id).toBe("type-01-typeface.A");
    expect(m.rowTitle).toBe("Typeface");
    expect(m.family).toBe("type");
    expect(m.prompt).toBe(promptText);
    expect(m.runs).toBe(3);
    expect(m.shipped).toBe("median");
    expect(m.codeSha256).toBe(await sha256OfFile(`${cellDir}/chart.js`));
  });

  it("forces runs=1/shipped=only for arm B and requires --ran-on in refine mode", async () => {
    const cellDir = "cells/_mtest/cli-B";
    await mkdir(cellDir, { recursive: true });
    await writeFile(`${cellDir}/chart.js`, `export const meta={fixture:"table12"};export function render(){}`);
    const promptPath = "cells/_mtest/prompt-b.txt";
    await writeFile(promptPath, "Typeset this more deliberately.");

    const withoutRanOn = runCli([
      "--row", "type-01-typeface", "--arm", "B", "--mode", "refine",
      "--method-kind", "skill", "--method-name", "/impeccable typeset",
      "--fixture", "table12", "--cell-dir", cellDir, "--prompt-file", promptPath,
    ]);
    expect(withoutRanOn.status).not.toBe(0);
    expect(withoutRanOn.stderr).toMatch(/ranOn/i);

    const withRanOn = runCli([
      "--row", "type-01-typeface", "--arm", "B", "--mode", "refine",
      "--method-kind", "skill", "--method-name", "/impeccable typeset",
      "--ran-on", "type-01-typeface.A",
      "--fixture", "table12", "--cell-dir", cellDir, "--prompt-file", promptPath,
    ]);
    expect(withRanOn.status).toBe(0);
    const m = JSON.parse(await readFile(`${cellDir}/cell.json`, "utf8"));
    expect(m.runs).toBe(1);
    expect(m.shipped).toBe("only");
    expect(m.method.ranOn).toBe("type-01-typeface.A");
  });

  it("refuses --row-title/--family that contradict a row src/rows.json declares", async () => {
    const cellDir = "cells/_mtest/cli-override";
    await mkdir(cellDir, { recursive: true });
    await writeFile(`${cellDir}/chart.js`, `export const meta={fixture:"table12"};export function render(){}`);
    const promptPath = "cells/_mtest/prompt-override.txt";
    await writeFile(promptPath, "Here is a dataset. Make a chart of it.");

    // The runbook described this pair as a fallback for an undeclared row. It
    // actually took precedence over rows.json, so it silently relabelled a
    // declared row in the published manifest.
    const res = runCli([
      "--row", "type-01-typeface", "--arm", "A", "--mode", "refine",
      "--method-kind", "default", "--method-name", "clean subagent, naive prompt",
      "--fixture", "table12", "--cell-dir", cellDir, "--prompt-file", promptPath,
      "--row-title", "Numerals", "--family", "layout",
    ]);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/contradict src\/rows\.json/);
    expect(res.stderr).toMatch(/rows\.json is the authority/);
    // Nothing was written.
    await expect(readFile(`${cellDir}/cell.json`, "utf8")).rejects.toThrow();
  });

  it("accepts --row-title/--family that agree with src/rows.json", async () => {
    const cellDir = "cells/_mtest/cli-agree";
    await mkdir(cellDir, { recursive: true });
    await writeFile(`${cellDir}/chart.js`, `export const meta={fixture:"table12"};export function render(){}`);
    const promptPath = "cells/_mtest/prompt-agree.txt";
    await writeFile(promptPath, "Here is a dataset. Make a chart of it.");

    const res = runCli([
      "--row", "type-01-typeface", "--arm", "A", "--mode", "refine",
      "--method-kind", "default", "--method-name", "clean subagent, naive prompt",
      "--fixture", "table12", "--cell-dir", cellDir, "--prompt-file", promptPath,
      "--row-title", "Typeface", "--family", "type",
    ]);
    expect(res.status).toBe(0);
    const m = JSON.parse(await readFile(`${cellDir}/cell.json`, "utf8"));
    expect(m.rowTitle).toBe("Typeface");
    expect(m.family).toBe("type");
  });

  it("falls back to --row-title/--family when the row is not in src/rows.ts", async () => {
    const cellDir = "cells/_mtest/cli-fake";
    await mkdir(cellDir, { recursive: true });
    await writeFile(`${cellDir}/chart.js`, `export const meta={fixture:"table12"};export function render(){}`);
    const promptPath = "cells/_mtest/prompt-fake.txt";
    await writeFile(promptPath, "Scratch row for CLI override test.");

    const res = runCli([
      "--row", "test-99-fake", "--arm", "A", "--mode", "from-scratch",
      "--method-kind", "default", "--method-name", "clean subagent",
      "--fixture", "table12", "--cell-dir", cellDir, "--prompt-file", promptPath,
      "--row-title", "Fake Row For Testing", "--family", "test",
    ]);
    expect(res.status).toBe(0);
    const m = JSON.parse(await readFile(`${cellDir}/cell.json`, "utf8"));
    expect(m.rowTitle).toBe("Fake Row For Testing");
    expect(m.family).toBe("test");
  });

  it("errors with a usage message and non-zero exit when a required flag is missing", () => {
    const res = runCli([
      "--row", "type-01-typeface", "--arm", "A", "--mode", "refine",
      "--method-kind", "default", "--method-name", "clean subagent",
      // --fixture and --prompt-file omitted
    ]);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/--fixture/);
    expect(res.stderr).toMatch(/--prompt-file/);
  });

  it("rejects a mis-cased --mode instead of silently bypassing ranOn (CLI path)", async () => {
    // Reviewer-reproduced hole: `--mode Refine` (capital R) used to sail past
    // the `mode === "refine"` guard, writing an arm-B cell.json with
    // ranOn: null and no provenance to its baseline. Must now fail loudly.
    const cellDir = "cells/_mtest/cli-badmode";
    const promptPath = "cells/_mtest/prompt-badmode.txt";
    await writeFile(promptPath, "Typeset this more deliberately.");

    const res = runCli([
      "--row", "type-01-typeface", "--arm", "B", "--mode", "Refine",
      "--method-kind", "skill", "--method-name", "/impeccable typeset",
      "--fixture", "table12", "--cell-dir", cellDir, "--prompt-file", promptPath,
    ]);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/mode/i);
    await expect(readFile(`${cellDir}/cell.json`, "utf8")).rejects.toThrow();
  });

  it("rejects an unknown --method-kind (CLI path)", async () => {
    const cellDir = "cells/_mtest/cli-badkind";
    const promptPath = "cells/_mtest/prompt-badkind.txt";
    await writeFile(promptPath, "Whatever, use magic.");

    const res = runCli([
      "--row", "type-01-typeface", "--arm", "A", "--mode", "refine",
      "--method-kind", "magic", "--method-name", "wand",
      "--fixture", "table12", "--cell-dir", cellDir, "--prompt-file", promptPath,
    ]);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/method\.kind/i);
    await expect(readFile(`${cellDir}/cell.json`, "utf8")).rejects.toThrow();
  });
});
