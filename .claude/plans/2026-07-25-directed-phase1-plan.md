# Directed — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the cell-factory machinery and gallery shell, then generate 9 element rows (24 cells) so the format can be judged before the remaining 83 cells exist.

**Architecture:** Generated chart code lives in `cells/` as immutable ESM modules conforming to a fixed `render(svg, data)` contract. A headless jsdom renderer freezes each cell to SVG. A registry builder collapses `cells/**/cell.json` into one JSON file, which is the only interface the Astro site reads. An integrity script hash-checks every cell so post-generation hand-editing cannot pass CI.

**Tech Stack:** Astro 5, Node 22, TypeScript (src) / ESM `.mjs` (scripts) / plain `.js` (generated cells), d3 v7, jsdom, vitest.

## Global Constraints

- Node 22, Astro 5. Self-hosted fonts only — no CDN, no external network at runtime.
- Generated cell code is **immutable**. Never hand-edit `cells/**/chart.js` after generation. Regenerate as `-v2`.
- The `render(svg, data)` contract is given to **every arm identically** in its generation prompt, and disclosed on `/method` as a uniform harness constraint.
- Arm A (`default`): 3 runs, median ships, `runs: 3`, `shipped: "median"`.
- Arms B and C: exactly 1 run, `runs: 1`, `shipped: "only"`. Never generate multiple directed attempts and ship the prettiest.
- Arm B always invokes its skill **explicitly by name**. Never rely on skill auto-activation.
- `cell.json.prompt` is verbatim, never summarised, never empty.
- No `Date.now()` in fixtures or cells — all values frozen at generation time.
- Every fixture file carries a `source` field with a URL and a `fetched` date.
- Never fabricate a data value. If a real value cannot be sourced, use the documented fallback fixture.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/fixtures/*.json` | The three frozen datasets. Data only, plus provenance fields. |
| `src/fixtures/index.ts` | Typed loader. Single place that knows fixture shapes. |
| `src/rows.ts` | Declares all 48 rows (id, title, family, mode, arms, phase, fixture, gap). Source of truth for what *should* exist. |
| `src/craft/gradient.ts` | `perDatumRadialGradient()` — one radialGradient per datum, off-centre highlight. |
| `src/craft/spectral.ts` | `spectralField()` — `userSpaceOnUse` shared ramp across marks. |
| `src/craft/annotation.ts` | `annotationAdjacency()` — label placement + leader lines. |
| `src/craft/index.ts` | Barrel export. |
| `scripts/render-cell.mjs` | jsdom → call `render` → serialise SVG. One cell per invocation. |
| `scripts/new-cell.mjs` | Scaffold a cell dir, write `cell.json`, compute `codeSha256`. |
| `scripts/build-registry.mjs` | `cells/**/cell.json` + `src/rows.ts` → `src/generated/registry.json`. |
| `scripts/verify-cells.mjs` | Seven integrity checks. Exit non-zero on any failure. |
| `src/components/Swatch.astro` | One cell: frozen SVG + arm label + method chip. |
| `src/components/RowStrip.astro` | One row: arms side by side + mode badge. |
| `src/components/Provenance.astro` | Verbatim prompt, method, diff vs Arm A. |
| `src/pages/index.astro` | Swatch grid grouped by family. |
| `src/pages/cell/[id].astro` | Per-cell provenance page. |
| `docs/factory.md` | The generation runbook. How each arm is actually produced, verbatim prompt templates, and the baseline-isolation disclosure. |
| `cells/<row>/<arm>/` | Generated, immutable. |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/pages/index.astro`
- Test: `src/scaffold.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a buildable Astro project; `npm test` runs vitest; `npm run build` emits `dist/`.

- [ ] **Step 1: Write the failing test**

```ts
// src/scaffold.test.ts
import { describe, expect, it } from "vitest";
import pkg from "../package.json";

describe("scaffold", () => {
  it("pins node 22 and astro 5", () => {
    expect(pkg.engines.node).toBe(">=22");
    expect(pkg.devDependencies.astro).toMatch(/^\^5\./);
  });

  it("declares the cell pipeline scripts", () => {
    for (const s of ["render:cell", "build:registry", "verify:cells", "test", "build"]) {
      expect(pkg.scripts[s], `missing script: ${s}`).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — no `package.json`, vitest not installed.

- [ ] **Step 3: Write minimal implementation**

```bash
cd C:/Users/dusti/Projects/Directed
npm init -y
npm i -D astro@^5 vitest@^2 typescript@^5 jsdom@^25
npm i d3@^7
```

```json
// package.json — merge these keys
{
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "astro dev",
    "build": "npm run build:registry && astro build",
    "test": "vitest run",
    "render:cell": "node scripts/render-cell.mjs",
    "build:registry": "node scripts/build-registry.mjs",
    "verify:cells": "node scripts/verify-cells.mjs"
  }
}
```

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
export default defineConfig({ site: "https://directed.dustincoledata.com" });
```

```json
// tsconfig.json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": { "resolveJsonModule": true, "allowImportingTsExtensions": false }
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"] } });
```

```
# .gitignore
node_modules/
dist/
.astro/
src/generated/
```

```astro
---
// src/pages/index.astro
---
<html lang="en"><head><meta charset="utf-8" /><title>Directed</title></head>
<body><h1>Directed</h1></body></html>
```

- [ ] **Step 4: Run tests and build**

Run: `npm test && npm run build`
Expected: tests PASS; `astro build` completes (the `build:registry` step will fail until Task 9 — until then run `npx astro build` directly to check the scaffold).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro 5 + vitest project"
```

---

## Task 2: Fixtures

**Files:**
- Create: `src/fixtures/hero8.json`, `src/fixtures/cycle12.json`, `src/fixtures/table12.json`, `src/fixtures/index.ts`
- Create: `scripts/fetch-table12.mjs`
- Test: `src/fixtures/fixtures.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `loadFixture(name: FixtureName): Fixture`
  - `type FixtureName = "table12" | "hero8" | "cycle12"`
  - `type Row12 = { label: string; value: number; delta: number }`
  - `type Hero8Row = { label: string; size: number; distance: number; color: string }`
  - `type Cycle12Point = { index: number; label: string; value: number; delta: number }`
  - `type Fixture = { name: FixtureName; source: string; fetched: string; baseline: number; unit: string; rows: Row12[] | Hero8Row[] | Cycle12Point[] }`

**Sourcing rule for this task:** never invent a number. `hero8` and `cycle12` are exactly derivable. `table12` is fetched live once and frozen; if the fetch fails, use the documented fallback and record that in `source`.

- [ ] **Step 1: Write the failing test**

```ts
// src/fixtures/fixtures.test.ts
import { describe, expect, it } from "vitest";
import { loadFixture } from "./index";

describe("fixtures", () => {
  it.each(["table12", "hero8", "cycle12"] as const)("%s carries provenance", (name) => {
    const f = loadFixture(name);
    expect(f.source).toMatch(/^https?:\/\/|^derived:/);
    expect(f.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(f.unit.length).toBeGreaterThan(0);
  });

  it("table12 has 12 rows and a real diverging baseline", () => {
    const f = loadFixture("table12");
    expect(f.rows).toHaveLength(12);
    const deltas = f.rows.map((r: any) => r.delta);
    expect(deltas.some((d) => d > 0)).toBe(true);
    expect(deltas.some((d) => d < 0)).toBe(true);
  });

  it("table12 delta equals value minus baseline for every row", () => {
    const f = loadFixture("table12");
    for (const r of f.rows as any[]) {
      expect(r.delta).toBeCloseTo(r.value - f.baseline, 6);
    }
  });

  it("hero8 has 8 rows with distinct labels and colors", () => {
    const f = loadFixture("hero8");
    expect(f.rows).toHaveLength(8);
    const labels = new Set(f.rows.map((r: any) => r.label));
    expect(labels.size).toBe(8);
    for (const r of f.rows as any[]) expect(r.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("cycle12 is periodic: first and last are adjacent in value", () => {
    const f = loadFixture("cycle12");
    expect(f.rows).toHaveLength(12);
    const vals = f.rows.map((r: any) => r.value);
    const wrapGap = Math.abs(vals[0] - vals[11]);
    const maxGap = Math.max(...vals) - Math.min(...vals);
    expect(wrapGap).toBeLessThan(maxGap);
  });

  it("no fixture contains a fabricated placeholder", () => {
    for (const name of ["table12", "hero8", "cycle12"] as const) {
      const raw = JSON.stringify(loadFixture(name));
      expect(raw).not.toMatch(/TBD|TODO|lorem|example\.com|0\.12345/i);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/fixtures`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Derive `hero8` and `cycle12` (exact, no sourcing needed)**

`hero8` — the eight planets. Published mean values; `size` = equatorial diameter in km, `distance` = mean distance from the Sun in AU. Colors are a designed 8-hue set, not data, and are labelled as such in the file.

```json
{
  "name": "hero8",
  "source": "https://science.nasa.gov/solar-system/planets/",
  "fetched": "2026-07-25",
  "baseline": 0,
  "unit": "km (diameter), AU (distance)",
  "colorNote": "colors are a designed 8-hue set for mark-craft demos, not an encoding of any measure",
  "rows": [
    { "label": "Mercury", "size": 4879,   "distance": 0.39, "color": "#8c7b6b" },
    { "label": "Venus",   "size": 12104,  "distance": 0.72, "color": "#d9a35b" },
    { "label": "Earth",   "size": 12756,  "distance": 1.00, "color": "#2c7bb6" },
    { "label": "Mars",    "size": 6792,   "distance": 1.52, "color": "#c1440e" },
    { "label": "Jupiter", "size": 142984, "distance": 5.20, "color": "#b07d52" },
    { "label": "Saturn",  "size": 120536, "distance": 9.58, "color": "#c9b47a" },
    { "label": "Uranus",  "size": 51118,  "distance": 19.20, "color": "#78c6d0" },
    { "label": "Neptune", "size": 49528,  "distance": 30.05, "color": "#3f5ea8" }
  ]
}
```

`cycle12` — monthly mean daylight hours at 40°N, computed from the standard sunrise-equation, not looked up. Write the derivation into the file's `source` as `derived:` plus the formula so a reader can reproduce it.

```js
// One-off derivation, run in node, then paste the result into cycle12.json.
// Daylight hours at latitude phi on day-of-year n (CBM sunrise equation):
//   decl = 0.4093 * sin(2*PI*(284 + n) / 365)
//   cosH = -tan(phi) * tan(decl)              // clamped to [-1, 1]
//   hours = 24 * acos(cosH) / PI
const phi = (40 * Math.PI) / 180;
const midMonthDay = [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const rows = midMonthDay.map((n, i) => {
  const decl = 0.4093 * Math.sin((2 * Math.PI * (284 + n)) / 365);
  const cosH = Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(decl)));
  const value = Number(((24 * Math.acos(cosH)) / Math.PI).toFixed(3));
  return { index: i, label: labels[i], value, delta: Number((value - 12).toFixed(3)) };
});
console.log(JSON.stringify(rows, null, 2));
```

Then write `src/fixtures/cycle12.json` with `"source": "derived:CBM sunrise equation at 40N, mid-month day-of-year; see plan Task 2"`, `"baseline": 12`, `"unit": "hours of daylight"`, and the computed rows.

- [ ] **Step 4: Fetch and freeze `table12`**

```js
// scripts/fetch-table12.mjs — run ONCE, then commit the frozen JSON.
// Lichess opening explorer is public and needs no key.
// Endpoint shape: https://explorer.lichess.ovh/lichess?variant=standard&speeds=blitz,rapid&ratings=1600,1800&play=
// The root call returns { white, draws, black, moves: [{ uci, san, white, draws, black, ... }] }.
const url = "https://explorer.lichess.ovh/lichess?variant=standard&speeds=blitz,rapid&ratings=1600,1800&play=";
const res = await fetch(url);
if (!res.ok) throw new Error(`lichess ${res.status}`);
const data = await res.json();
const rows = data.moves.slice(0, 12).map((m) => {
  const total = m.white + m.draws + m.black;
  const value = Number(((m.white / total) * 100).toFixed(2));
  return { label: m.san, value, delta: Number((value - 50).toFixed(2)) };
});
console.log(JSON.stringify({
  name: "table12",
  source: url,
  fetched: new Date().toISOString().slice(0, 10),
  baseline: 50,
  unit: "% white win rate",
  rows,
}, null, 2));
```

Run: `node scripts/fetch-table12.mjs > src/fixtures/table12.json`

Inspect the output before committing. Confirm 12 rows, `label` is a move like `e4`, values straddle 50.

**If the fetch fails or the response shape differs**, use the fallback and say so in `source`: World Bank life expectancy at birth, 12 countries, `baseline` = the world value, `delta` = country minus world. Endpoint: `https://api.worldbank.org/v2/country/USA;JPN;DEU;BRA;IND;NGA;CHN;MEX;ZAF;FRA;IDN;EGY/indicator/SP.DYN.LE00.IN?format=json&mrnev=1`. Do **not** hand-type values from memory.

- [ ] **Step 5: Write the loader**

```ts
// src/fixtures/index.ts
import table12 from "./table12.json";
import hero8 from "./hero8.json";
import cycle12 from "./cycle12.json";

export type FixtureName = "table12" | "hero8" | "cycle12";
export type Row12 = { label: string; value: number; delta: number };
export type Hero8Row = { label: string; size: number; distance: number; color: string };
export type Cycle12Point = { index: number; label: string; value: number; delta: number };

export type Fixture = {
  name: FixtureName;
  source: string;
  fetched: string;
  baseline: number;
  unit: string;
  rows: Row12[] | Hero8Row[] | Cycle12Point[];
};

const FIXTURES: Record<FixtureName, Fixture> = {
  table12: table12 as Fixture,
  hero8: hero8 as Fixture,
  cycle12: cycle12 as Fixture,
};

export function loadFixture(name: FixtureName): Fixture {
  const f = FIXTURES[name];
  if (!f) throw new Error(`unknown fixture: ${name}`);
  return f;
}

export const FIXTURE_NAMES = Object.keys(FIXTURES) as FixtureName[];
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/fixtures`
Expected: all 6 PASS.

- [ ] **Step 7: Commit**

```bash
git add src/fixtures scripts/fetch-table12.mjs
git commit -m "feat: add three frozen fixtures with provenance"
```

---

## Task 3: Row declarations

**Files:**
- Create: `src/rows.ts`
- Test: `src/rows.test.ts`

**Interfaces:**
- Consumes: `FixtureName` from Task 2.
- Produces:
  - `type Arm = "A" | "B" | "C"`
  - `type Mode = "refine" | "from-scratch"`
  - `type MethodKind = "default" | "skill" | "tool"`
  - `type RowDecl = { id: string; family: string; title: string; mode: Mode; fixture: FixtureName; phase: 1 | 2 | 3; arms: { arm: Arm; kind: MethodKind; method: string }[]; gap?: string }`
  - `ROWS: RowDecl[]` (all 48), `FAMILIES: string[]`, `rowsForPhase(p): RowDecl[]`, `getRow(id): RowDecl`

- [ ] **Step 1: Write the failing test**

```ts
// src/rows.test.ts
import { describe, expect, it } from "vitest";
import { ROWS, FAMILIES, rowsForPhase, getRow } from "./rows";
import { FIXTURE_NAMES } from "./fixtures";

describe("rows", () => {
  it("declares 48 rows across 12 families", () => {
    expect(ROWS).toHaveLength(48);
    expect(FAMILIES).toHaveLength(12);
  });

  it("declares 107 cells in total", () => {
    const cells = ROWS.reduce((n, r) => n + r.arms.length, 0);
    expect(cells).toBe(107);
  });

  it("phase 1 is exactly the 9 gate rows / 24 cells", () => {
    const p1 = rowsForPhase(1);
    expect(p1.map((r) => r.id).sort()).toEqual([
      "color-01-categorical", "color-03-diverging", "color-06-accent",
      "mark-01-glyph", "mark-02-gradient", "mark-07-overlap",
      "type-01-typeface", "type-02-scale", "type-04-numerals",
    ]);
    expect(p1.reduce((n, r) => n + r.arms.length, 0)).toBe(24);
  });

  it("every row id is unique and kebab-cased with a family prefix", () => {
    const ids = ROWS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of ROWS) {
      expect(r.id).toMatch(/^[a-z]+-\d{2}-[a-z0-9-]+$/);
      expect(r.id.startsWith(r.family + "-")).toBe(true);
    }
  });

  it("every row names a real fixture", () => {
    for (const r of ROWS) expect(FIXTURE_NAMES).toContain(r.fixture);
  });

  it("arm A is always the default arm and comes first", () => {
    for (const r of ROWS) {
      expect(r.arms[0].arm).toBe("A");
      expect(r.arms[0].kind).toBe("default");
    }
  });

  it("every non-A arm names a concrete method, never empty", () => {
    for (const r of ROWS) {
      for (const a of r.arms.filter((x) => x.arm !== "A")) {
        expect(a.method.trim().length, `${r.id}.${a.arm}`).toBeGreaterThan(0);
      }
    }
  });

  it("gap rows have only arm A plus a stated reason", () => {
    const gaps = ROWS.filter((r) => r.gap);
    expect(gaps.map((r) => r.id)).toContain("mark-04-glow");
    const glow = getRow("mark-04-glow");
    expect(glow.arms).toHaveLength(1);
    expect(glow.gap!.length).toBeGreaterThan(20);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/rows`
Expected: FAIL — `Cannot find module './rows'`.

- [ ] **Step 3: Write the implementation**

Transcribe spec §6 verbatim. Abbreviated here to the Phase 1 rows plus the gap row and one representative from each remaining family; **the implementer must enter all 48 from spec §6** — the tests above will fail until the counts match.

```ts
// src/rows.ts
import type { FixtureName } from "./fixtures";

export type Arm = "A" | "B" | "C";
export type Mode = "refine" | "from-scratch";
export type MethodKind = "default" | "skill" | "tool";

export type ArmDecl = { arm: Arm; kind: MethodKind; method: string };
export type RowDecl = {
  id: string;
  family: string;
  title: string;
  mode: Mode;
  fixture: FixtureName;
  phase: 1 | 2 | 3;
  arms: ArmDecl[];
  gap?: string;
};

const A: ArmDecl = { arm: "A", kind: "default", method: "clean subagent, naive prompt" };

export const ROWS: RowDecl[] = [
  // ---- Family 1: type ----
  {
    id: "type-01-typeface", family: "type", title: "Typeface", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "/impeccable typeset" },
      { arm: "C", kind: "tool", method: "reference-PNG + Chrome screenshot diff" }],
  },
  {
    id: "type-02-scale", family: "type", title: "Type scale and size hierarchy", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "/impeccable typeset" },
      { arm: "C", kind: "tool", method: "reference-PNG + Chrome screenshot diff" }],
  },
  {
    id: "type-03-weight", family: "type", title: "Weight and contrast", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable typeset" }],
  },
  {
    id: "type-04-numerals", family: "type", title: "Tabular vs proportional figures", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A, { arm: "B", kind: "skill", method: "dataviz" }],
  },
  {
    id: "type-05-casing", family: "type", title: "Casing, tracking, label wrapping", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable typeset" }],
  },

  // ---- Family 2: color ----
  {
    id: "color-01-categorical", family: "color", title: "Categorical palette", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "dataviz" },
      { arm: "C", kind: "skill", method: "/impeccable colorize" }],
  },
  {
    id: "color-02-sequential", family: "color", title: "Sequential ramp", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A,
      { arm: "B", kind: "skill", method: "dataviz" },
      { arm: "C", kind: "skill", method: "craft:spectralField 10-stop ramp" }],
  },
  {
    id: "color-03-diverging", family: "color", title: "Diverging scale, spectral within poles", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "dataviz" },
      { arm: "C", kind: "skill", method: "craft:spectralField" }],
  },
  {
    id: "color-04-ground", family: "color", title: "Light vs dark ground", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable brand" }],
  },
  {
    id: "color-05-cvd", family: "color", title: "Colour-vision-deficiency safety", mode: "refine",
    fixture: "table12", phase: 2,
    arms: [A,
      { arm: "B", kind: "skill", method: "dataviz palette validator" },
      { arm: "C", kind: "skill", method: "/impeccable audit" }],
  },
  {
    id: "color-06-accent", family: "color", title: "Accent vs neutral discipline", mode: "refine",
    fixture: "table12", phase: 1,
    arms: [A, { arm: "B", kind: "skill", method: "/impeccable quieter then /impeccable brand" }],
  },

  // ---- Family 3: mark ----
  {
    id: "mark-01-glyph", family: "mark", title: "Default rect/circle vs designed custom mark",
    mode: "from-scratch", fixture: "hero8", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "craft + explicit custom-mark brief" },
      { arm: "C", kind: "tool", method: "raw D3 / Observable Plot render mark" }],
  },
  {
    id: "mark-02-gradient", family: "mark", title: "Flat fill vs one radialGradient per datum",
    mode: "refine", fixture: "hero8", phase: 1,
    arms: [A, { arm: "B", kind: "skill", method: "craft:perDatumRadialGradient" }],
  },
  {
    id: "mark-03-halo", family: "mark", title: "Stroke/halo separation on overlap", mode: "refine",
    fixture: "hero8", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "craft + explicit halo brief" }],
  },
  {
    id: "mark-04-glow", family: "mark", title: "Glow / outer halo filter", mode: "refine",
    fixture: "hero8", phase: 2, arms: [A],
    gap: "The feGaussianBlur + feMerge recipe failed 3-vote verification during research (0-3). Published as an unanswered gap rather than a guessed cell. Closing it requires re-verification against the Visual Cinnamon 'SVGs beyond mere shapes' post and the hexagon playground filter demos.",
  },
  {
    id: "mark-05-texture", family: "mark", title: "Pattern / texture fill", mode: "refine",
    fixture: "hero8", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "craft + SVG pattern brief (needs sourcing)" }],
  },
  {
    id: "mark-06-size", family: "mark", title: "Size encoding honesty (area vs radius)", mode: "refine",
    fixture: "hero8", phase: 2,
    arms: [A, { arm: "B", kind: "skill", method: "dataviz" }],
  },
  {
    id: "mark-07-overlap", family: "mark", title: "Overplotting: opacity, jitter, ordering", mode: "refine",
    fixture: "hero8", phase: 1,
    arms: [A,
      { arm: "B", kind: "skill", method: "dataviz" },
      { arm: "C", kind: "skill", method: "/impeccable craft" }],
  },

  // ---- Families 4-12: enter all remaining rows from spec section 6 ----
  // axis-01-line .. axis-05-labeling      (5 rows, 10 cells, phase 2)
  // layout-01-ratio .. layout-05-radial   (5 rows, 12 cells, phase 2)
  // annot-01-headline .. annot-05-uncertainty (5 rows, 10 cells, phase 2)
  // legend-01-direct .. legend-03-art     (3 rows, 6 cells, phase 2)
  // motion-01-entrance, motion-02-scrub   (2 rows, 4 cells, phase 2)
  // inter-01-hover .. inter-03-a11y       (3 rows, 6 cells, phase 2)
  // medium-01-svg .. medium-03-share      (3 rows, 6 cells, phase 2)
  // num-01-units, num-02-format           (2 rows, 4 cells, phase 2)
  // lib-01-ceiling, lib-02-anchored       (2 rows, 6 cells, phase 3)
];

export const FAMILIES = [...new Set(ROWS.map((r) => r.family))];

export function rowsForPhase(phase: 1 | 2 | 3): RowDecl[] {
  return ROWS.filter((r) => r.phase === phase);
}

export function getRow(id: string): RowDecl {
  const r = ROWS.find((x) => x.id === id);
  if (!r) throw new Error(`unknown row: ${id}`);
  return r;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/rows`
Expected: all 8 PASS. The `48 rows` / `107 cells` / `12 families` assertions are the forcing function — they fail until every row from spec §6 is entered.

- [ ] **Step 5: Commit**

```bash
git add src/rows.ts src/rows.test.ts
git commit -m "feat: declare all 48 rows and 107 cells"
```

---

## Task 4: `craft/gradient.ts` — per-datum radial gradient

**Files:**
- Create: `src/craft/gradient.ts`
- Test: `src/craft/gradient.test.ts`

**Interfaces:**
- Consumes: nothing (takes a d3 selection).
- Produces: `perDatumRadialGradient<T>(defs, data, opts): (d: T, i: number) => string` — appends one `<radialGradient>` per datum to `defs` and returns a function mapping a datum to its `url(#id)` fill string.
  - `opts: { idPrefix: string; color: (d: T, i: number) => string; cx?: string; cy?: string; r?: string; brighten?: number; darken?: number }`
  - Defaults: `cx: "35%"`, `cy: "35%"`, `r: "60%"`, `brighten: 1`, `darken: 1.75`.

- [ ] **Step 1: Write the failing test**

```ts
// src/craft/gradient.test.ts
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { select } from "d3-selection";
import { perDatumRadialGradient } from "./gradient";

function defsFixture() {
  const dom = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg"><defs></defs></svg>`);
  return select(dom.window.document.querySelector("defs") as Element);
}

const DATA = [
  { label: "Earth", color: "#2c7bb6" },
  { label: "Mars", color: "#c1440e" },
];

describe("perDatumRadialGradient", () => {
  it("creates one gradient per datum, not one shared gradient", () => {
    const defs = defsFixture();
    perDatumRadialGradient(defs, DATA, { idPrefix: "g", color: (d) => d.color });
    expect(defs.selectAll("radialGradient").size()).toBe(2);
  });

  it("derives each gradient id from the datum so fills are distinct", () => {
    const defs = defsFixture();
    const fill = perDatumRadialGradient(defs, DATA, { idPrefix: "g", color: (d) => d.color });
    expect(fill(DATA[0], 0)).toBe("url(#g-0)");
    expect(fill(DATA[1], 1)).toBe("url(#g-1)");
    expect(fill(DATA[0], 0)).not.toBe(fill(DATA[1], 1));
  });

  it("places the highlight OFF-CENTRE — this is what reads as a sphere", () => {
    const defs = defsFixture();
    perDatumRadialGradient(defs, DATA, { idPrefix: "g", color: (d) => d.color });
    const g = defs.select("radialGradient");
    expect(g.attr("cx")).toBe("35%");
    expect(g.attr("cy")).toBe("35%");
    expect(g.attr("r")).toBe("60%");
    // A centred 50/50/50 gradient renders a symmetric bullseye, not a lit form.
    expect(g.attr("cx")).not.toBe("50%");
  });

  it("builds three stops brightened/darkened from that datum's own colour", () => {
    const defs = defsFixture();
    perDatumRadialGradient(defs, DATA, { idPrefix: "g", color: (d) => d.color });
    const stops = defs.select("radialGradient").selectAll("stop");
    expect(stops.size()).toBe(3);
    const offsets = stops.nodes().map((n) => (n as Element).getAttribute("offset"));
    expect(offsets).toEqual(["0%", "50%", "100%"]);
    const colors = stops.nodes().map((n) => (n as Element).getAttribute("stop-color"));
    expect(new Set(colors).size).toBe(3);
    expect(colors[1]!.toLowerCase()).toContain("44, 123, 182"); // mid stop is the datum colour
  });

  it("honours overridden geometry", () => {
    const defs = defsFixture();
    perDatumRadialGradient(defs, DATA, {
      idPrefix: "g", color: (d) => d.color, cx: "25%", cy: "25%", r: "65%",
    });
    expect(defs.select("radialGradient").attr("cx")).toBe("25%");
    expect(defs.select("radialGradient").attr("r")).toBe("65%");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/craft/gradient`
Expected: FAIL — `Cannot find module './gradient'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/craft/gradient.ts
// Technique: Visual Cinnamon, "Making a static SVG gradient data-based with D3"
//   https://www.visualcinnamon.com/2016/05/data-based-svg-gradient-d3/
// plus the shipped variant in the Observable hexagon playground:
//   https://observablehq.com/@nbremer/svg-gradient-filter-playground-hexagons
//
// PERF CEILING: N marks produce N gradient defs. Fine at tens (the source uses 8
// and 20). A documented hazard past a few hundred — SVG paint layers plus DOM
// node count. Do not reach for this on a scatter of thousands.
import { rgb } from "d3-color";
import type { Selection } from "d3-selection";

export type GradientOpts<T> = {
  idPrefix: string;
  color: (d: T, i: number) => string;
  cx?: string;
  cy?: string;
  r?: string;
  brighten?: number;
  darken?: number;
};

export function perDatumRadialGradient<T>(
  defs: Selection<any, unknown, any, unknown>,
  data: T[],
  opts: GradientOpts<T>,
): (d: T, i: number) => string {
  const { idPrefix, color } = opts;
  // Off-centre highlight is the whole effect. A 3D sphere is conventionally lit
  // diagonally from above; SVG's 50/50/50 default gives a bullseye instead.
  const cx = opts.cx ?? "35%";
  const cy = opts.cy ?? "35%";
  const r = opts.r ?? "60%";
  const brighten = opts.brighten ?? 1;
  const darken = opts.darken ?? 1.75;

  const grads = defs
    .selectAll(`radialGradient.${idPrefix}`)
    .data(data)
    .join("radialGradient")
    .attr("class", idPrefix)
    // The id must depend on the datum — that is what makes this per-datum
    // rather than one generic gradient reused everywhere.
    .attr("id", (_d: T, i: number) => `${idPrefix}-${i}`)
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", r);

  grads.each(function (d: T, i: number) {
    const base = rgb(color(d, i));
    const stops: [string, string][] = [
      ["0%", base.brighter(brighten).toString()],
      ["50%", base.toString()],
      ["100%", base.darker(darken).toString()],
    ];
    const g = (grads as any).filter((_: unknown, j: number) => j === i);
    g.selectAll("stop")
      .data(stops)
      .join("stop")
      .attr("offset", (s: [string, string]) => s[0])
      .attr("stop-color", (s: [string, string]) => s[1]);
  });

  return (_d: T, i: number) => `url(#${idPrefix}-${i})`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/craft/gradient`
Expected: all 5 PASS. If the `each`/`filter` pairing proves awkward under jsdom, restructure to build stops inside a plain loop over `grads.nodes()` — the tests, not the implementation shape, are the contract.

- [ ] **Step 5: Commit**

```bash
git add src/craft/gradient.ts src/craft/gradient.test.ts
git commit -m "feat(craft): per-datum radial gradient with off-centre highlight"
```

---

## Task 5: `craft/spectral.ts` — shared spectral field

**Files:**
- Create: `src/craft/spectral.ts`
- Test: `src/craft/spectral.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SPECTRAL_10: readonly string[]` — the verified 10-stop blue→red ramp.
  - `spectralField(defs, opts): string` — appends one `<linearGradient>` in user space and returns `url(#id)`.
    - `opts: { id: string; x1: number; x2: number; stops?: readonly string[] }`

- [ ] **Step 1: Write the failing test**

```ts
// src/craft/spectral.test.ts
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { select } from "d3-selection";
import { spectralField, SPECTRAL_10 } from "./spectral";

function defsFixture() {
  const dom = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg"><defs></defs></svg>`);
  return select(dom.window.document.querySelector("defs") as Element);
}

describe("spectralField", () => {
  it("uses userSpaceOnUse so marks do not restart the ramp per bounding box", () => {
    const defs = defsFixture();
    spectralField(defs, { id: "field", x1: -320, x2: 320 });
    const g = defs.select("linearGradient");
    expect(g.attr("gradientUnits")).toBe("userSpaceOnUse");
    // objectBoundingBox is the SVG default and makes x1/x2 fractions of EACH
    // referencing element's box — which is the failure mode this avoids.
    expect(g.attr("gradientUnits")).not.toBe("objectBoundingBox");
  });

  it("anchors x1/x2 to absolute layout coordinates, not 0..1 fractions", () => {
    const defs = defsFixture();
    spectralField(defs, { id: "field", x1: -320, x2: 320 });
    const g = defs.select("linearGradient");
    expect(g.attr("x1")).toBe("-320");
    expect(g.attr("x2")).toBe("320");
  });

  it("ships the verified 10-stop ramp, evenly offset blue to red", () => {
    expect(SPECTRAL_10).toHaveLength(10);
    expect(SPECTRAL_10[0]).toBe("#2c7bb6");
    expect(SPECTRAL_10[9]).toBe("#d7191c");
    const defs = defsFixture();
    spectralField(defs, { id: "field", x1: 0, x2: 100 });
    const stops = defs.select("linearGradient").selectAll("stop");
    expect(stops.size()).toBe(10);
    const offsets = stops.nodes().map((n) => (n as Element).getAttribute("offset"));
    expect(offsets[0]).toBe("0%");
    expect(offsets[9]).toBe("100%");
  });

  it("returns a url() reference usable as a fill", () => {
    const defs = defsFixture();
    expect(spectralField(defs, { id: "field", x1: 0, x2: 100 })).toBe("url(#field)");
  });

  it("accepts a custom stop list", () => {
    const defs = defsFixture();
    spectralField(defs, { id: "f2", x1: 0, x2: 10, stops: ["#000000", "#ffffff"] });
    expect(defs.select("#f2").selectAll("stop").size()).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/craft/spectral`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/craft/spectral.ts
// Technique: gradientUnits="userSpaceOnUse" so every mark samples ONE continuous
// ramp anchored to the layout, instead of restarting it inside its own bounding box.
//   https://observablehq.com/@nbremer/svg-gradient-filter-playground-hexagons
//   https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/gradientUnits
//   https://www.w3.org/TR/SVG11/pservers.html  (objectBoundingBox is the default)
//
// SIMPLER BASELINE: if you only need "marks coloured by position", a per-mark solid
// fill from a positional scale (d3.scaleSequential) needs zero gradient nodes. Reach
// for this when you need sub-mark colour variation on large marks, or a static field
// that MOVING marks traverse.
import type { Selection } from "d3-selection";

export const SPECTRAL_10 = [
  "#2c7bb6", "#00a1c3", "#00c4b8", "#70e29f", "#cff88c",
  "#fceb74", "#f5c049", "#ee9429", "#e56219", "#d7191c",
] as const;

export type SpectralOpts = {
  id: string;
  x1: number;
  x2: number;
  stops?: readonly string[];
};

export function spectralField(
  defs: Selection<any, unknown, any, unknown>,
  opts: SpectralOpts,
): string {
  const stops = opts.stops ?? SPECTRAL_10;
  const grad = defs
    .append("linearGradient")
    .attr("id", opts.id)
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", String(opts.x1))
    .attr("x2", String(opts.x2));

  stops.forEach((c, i) => {
    grad
      .append("stop")
      .attr("offset", `${Math.round((i / (stops.length - 1)) * 100)}%`)
      .attr("stop-color", c);
  });

  return `url(#${opts.id})`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/craft/spectral`
Expected: all 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/craft/spectral.ts src/craft/spectral.test.ts
git commit -m "feat(craft): userSpaceOnUse spectral field across marks"
```

---

## Task 6: `craft/annotation.ts` — annotation adjacency

**Files:**
- Create: `src/craft/annotation.ts`, `src/craft/index.ts`
- Test: `src/craft/annotation.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Anchor = { x: number; y: number; text: string; markRadius?: number }`
  - `placeAnnotations(anchors, opts): Placed[]` where `Placed = { text: string; x: number; y: number; anchor: "start"|"middle"|"end"; leader: null | { x1: number; y1: number; x2: number; y2: number } }`
  - `opts: { width: number; height: number; pad?: number; gap?: number }`
  - Rule: prefer direct adjacency (no leader). Emit a leader only when the adjacent position would leave the viewport or collide with an already-placed label. Leaders stay short (`<= opts.gap * 4`) and are never crossed.
  - `src/craft/index.ts` re-exports all three modules.

- [ ] **Step 1: Write the failing test**

```ts
// src/craft/annotation.test.ts
import { describe, expect, it } from "vitest";
import { placeAnnotations } from "./annotation";

const BOX = { width: 600, height: 400 };

describe("placeAnnotations", () => {
  it("places a label adjacent with no leader when there is room", () => {
    const [p] = placeAnnotations([{ x: 300, y: 200, text: "peak", markRadius: 6 }], BOX);
    expect(p.leader).toBeNull();
    const dist = Math.hypot(p.x - 300, p.y - 200);
    expect(dist).toBeLessThan(40);
  });

  it("flips the label inward instead of overflowing the right edge", () => {
    const [p] = placeAnnotations([{ x: 592, y: 200, text: "edge case", markRadius: 4 }], BOX);
    expect(p.x).toBeLessThanOrEqual(BOX.width);
    expect(p.anchor).toBe("end");
  });

  it("adds a leader only for the label that could not sit adjacent", () => {
    const placed = placeAnnotations([
      { x: 300, y: 200, text: "first" },
      { x: 302, y: 202, text: "second collides" },
    ], BOX);
    expect(placed.filter((p) => p.leader === null)).toHaveLength(1);
    expect(placed.filter((p) => p.leader !== null)).toHaveLength(1);
  });

  it("keeps leaders short", () => {
    const placed = placeAnnotations([
      { x: 300, y: 200, text: "first" },
      { x: 302, y: 202, text: "second collides" },
    ], { ...BOX, gap: 10 });
    for (const p of placed) {
      if (!p.leader) continue;
      const len = Math.hypot(p.leader.x2 - p.leader.x1, p.leader.y2 - p.leader.y1);
      expect(len).toBeLessThanOrEqual(40);
    }
  });

  it("never returns two labels at the same position", () => {
    const placed = placeAnnotations(
      Array.from({ length: 5 }, (_, i) => ({ x: 300 + i, y: 200, text: `n${i}` })),
      BOX,
    );
    const keys = placed.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("returns labels in input order", () => {
    const placed = placeAnnotations([
      { x: 100, y: 100, text: "a" },
      { x: 400, y: 300, text: "b" },
    ], BOX);
    expect(placed.map((p) => p.text)).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/craft/annotation`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/craft/annotation.ts
// Technique: annotation adjacency. Place text on or beside the mark it describes;
// short uncrossed leaders only when adjacency is impossible; legend last.
//   Rahman, Lange, Quadri, Rosen (2026) https://arxiv.org/html/2604.07691v1
//   "Nine practitioners prioritized placing annotation text adjacent to target
//    elements to reduce association effort."
//
// NOT a full label-placement solver. Deliberately small: greedy, first-fit,
// input order preserved, four candidate offsets per anchor.
export type Anchor = { x: number; y: number; text: string; markRadius?: number };

export type Placed = {
  text: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  leader: null | { x1: number; y1: number; x2: number; y2: number };
};

export type PlaceOpts = { width: number; height: number; pad?: number; gap?: number };

const CHAR_W = 6.2; // approximate advance width at the gallery's label size
const LINE_H = 12;

export function placeAnnotations(anchors: Anchor[], opts: PlaceOpts): Placed[] {
  const pad = opts.pad ?? 4;
  const gap = opts.gap ?? 10;
  const taken: { x: number; y: number; w: number; h: number }[] = [];
  const out: Placed[] = [];

  for (const a of anchors) {
    const r = (a.markRadius ?? 0) + gap;
    const w = a.text.length * CHAR_W;
    // Adjacent candidates first: right, left, above, below.
    const candidates: { x: number; y: number; anchor: Placed["anchor"] }[] = [
      { x: a.x + r, y: a.y + LINE_H / 3, anchor: "start" },
      { x: a.x - r, y: a.y + LINE_H / 3, anchor: "end" },
      { x: a.x, y: a.y - r, anchor: "middle" },
      { x: a.x, y: a.y + r + LINE_H, anchor: "middle" },
    ];

    let chosen: (typeof candidates)[number] | null = null;
    for (const c of candidates) {
      const left = c.anchor === "start" ? c.x : c.anchor === "end" ? c.x - w : c.x - w / 2;
      const box = { x: left, y: c.y - LINE_H, w, h: LINE_H };
      const inside =
        box.x >= pad && box.x + box.w <= opts.width - pad &&
        box.y >= pad && box.y + box.h <= opts.height - pad;
      const clear = !taken.some((t) => overlaps(t, box));
      if (inside && clear) {
        chosen = c;
        taken.push(box);
        break;
      }
    }

    if (chosen) {
      out.push({ text: a.text, x: chosen.x, y: chosen.y, anchor: chosen.anchor, leader: null });
      continue;
    }

    // Adjacency impossible: offset by one short leader, kept to <= gap * 4 and
    // aimed away from the crowded side so leaders do not cross.
    const dx = a.x < opts.width / 2 ? gap * 3 : -gap * 3;
    const dy = -gap * 2;
    const lx = clamp(a.x + dx, pad + w / 2, opts.width - pad - w / 2);
    const ly = clamp(a.y + dy, pad + LINE_H, opts.height - pad);
    taken.push({ x: lx - w / 2, y: ly - LINE_H, w, h: LINE_H });
    out.push({
      text: a.text,
      x: lx,
      y: ly,
      anchor: "middle",
      leader: { x1: a.x, y1: a.y, x2: lx, y2: ly + 2 },
    });
  }

  return out;
}

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
```

```ts
// src/craft/index.ts
export { perDatumRadialGradient } from "./gradient";
export type { GradientOpts } from "./gradient";
export { spectralField, SPECTRAL_10 } from "./spectral";
export type { SpectralOpts } from "./spectral";
export { placeAnnotations } from "./annotation";
export type { Anchor, Placed, PlaceOpts } from "./annotation";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/craft`
Expected: all gradient, spectral, and annotation tests PASS (16 total).

- [ ] **Step 5: Commit**

```bash
git add src/craft
git commit -m "feat(craft): annotation adjacency placement + barrel export"
```

---

## Task 7: Cell contract + headless renderer

**Files:**
- Create: `scripts/render-cell.mjs`, `cells/_contract.md`, `cells/_example/A/chart.js`
- Test: `scripts/render-cell.test.mjs`

**Interfaces:**
- Consumes: `cells/<row>/<arm>/chart.js`.
- Produces:
  - The cell contract, given verbatim to every arm's generation prompt:
    ```js
    export const meta = { fixture: "table12", width: 640, height: 400 };
    export function render(svg, data) { /* mutate svg in place */ }
    ```
  - `renderCell(cellDir): Promise<string>` — returns serialised SVG and writes `render.svg`.
  - CLI: `node scripts/render-cell.mjs cells/<row>/<arm>`

- [ ] **Step 1: Write the failing test**

```js
// scripts/render-cell.test.mjs
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
    await writeFile(`${DIR}/../B/chart.js`.replace("/../B", "/../B"), "").catch(() => {});
    await mkdir("cells/_test/B", { recursive: true });
    await writeFile("cells/_test/B/chart.js", `export const meta = { fixture: "table12" };`);
    await expect(renderCell("cells/_test/B")).rejects.toThrow(/render/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/render-cell`
Expected: FAIL — `Cannot find module './render-cell.mjs'`.

- [ ] **Step 3: Write the contract doc and the renderer**

```markdown
<!-- cells/_contract.md -->
# Cell contract

Every generated cell — Arm A, B, and C alike — is an ESM module exporting exactly:

```js
export const meta = { fixture: "table12" | "hero8" | "cycle12", width: number, height: number };
export function render(svg, data) { /* mutate the passed <svg> element in place */ }
```

- `data` is the fixture object: `{ name, source, fetched, baseline, unit, rows }`.
- `render` receives a real `SVGSVGElement` in a jsdom document. Use `svg.ownerDocument`
  and `createElementNS`, or a d3 selection over it. Do not call `document` globally.
- No network. No fonts loaded at render time — reference font families by name only.
- No `Date.now()`, no `Math.random()`. Renders must be byte-stable across runs.

This contract is a harness requirement, given identically to every arm and
disclosed on `/method`. It constrains the module shape, never the design.
```

```js
// scripts/render-cell.mjs
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const SVG_NS = "http://www.w3.org/2000/svg";

export async function renderCell(cellDir) {
  const dir = resolve(cellDir);
  const modUrl = pathToFileURL(join(dir, "chart.js")).href;
  const mod = await import(modUrl);

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
  await writeFile(join(dir, "render.svg"), out, "utf8");
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/render-cell`
Expected: all 5 PASS.

- [ ] **Step 5: Clean up the scratch cell and commit**

```bash
rm -rf cells/_test
git add scripts/render-cell.mjs scripts/render-cell.test.mjs cells/_contract.md
git commit -m "feat: cell contract + headless jsdom renderer"
```

---

## Task 8: Cell scaffolder with hash

**Files:**
- Create: `scripts/new-cell.mjs`
- Test: `scripts/new-cell.test.mjs`

**Interfaces:**
- Consumes: `ROWS` (read from `src/rows.ts` via a small JSON mirror written by Task 9 is *not* available yet, so this script parses nothing — it validates ids by regex only).
- Produces:
  - `writeCellManifest({ cellDir, row, rowTitle, family, arm, mode, method, prompt, fixture, runs, shipped, notes }): Promise<object>` — writes `cell.json` including `codeSha256` computed from the existing `chart.js`.
  - `sha256OfFile(path): Promise<string>`
  - CLI: `node scripts/new-cell.mjs --row type-01-typeface --arm A --prompt-file <path> ...`

- [ ] **Step 1: Write the failing test**

```js
// scripts/new-cell.test.mjs
import { describe, expect, it, beforeEach } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/new-cell`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// scripts/new-cell.mjs
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/new-cell`
Expected: all 6 PASS.

- [ ] **Step 5: Commit**

```bash
rm -rf cells/_mtest
git add scripts/new-cell.mjs scripts/new-cell.test.mjs
git commit -m "feat: cell manifest writer with code hash"
```

---

## Task 9: Registry builder

**Files:**
- Create: `scripts/build-registry.mjs`, `src/generated/.gitkeep`
- Test: `scripts/build-registry.test.mjs`

**Interfaces:**
- Consumes: `cells/**/cell.json`, `src/rows.ts`.
- Produces: `src/generated/registry.json`:
  ```json
  { "built": "2026-07-25",
    "families": [{ "family": "type", "rows": ["type-01-typeface"] }],
    "rows": [{ "id": "type-01-typeface", "title": "Typeface", "family": "type",
               "mode": "refine", "fixture": "table12", "phase": 1, "gap": null,
               "cells": [{ "id": "type-01-typeface.A", "arm": "A", "method": {},
                           "svg": "<svg…</svg>", "prompt": "…", "runs": 3,
                           "shipped": "median", "generated": "2026-07-25" }] }] }
  ```
  Rows declared but not yet generated appear with `cells: []`. The site renders those as "not generated yet", never as an error.

- [ ] **Step 1: Write the failing test**

```js
// scripts/build-registry.test.mjs
import { describe, expect, it, beforeAll } from "vitest";
import { buildRegistry } from "./build-registry.mjs";

let reg;
beforeAll(async () => { reg = await buildRegistry(); });

describe("buildRegistry", () => {
  it("includes every declared row, generated or not", () => {
    expect(reg.rows).toHaveLength(48);
  });

  it("groups rows under 12 families in declaration order", () => {
    expect(reg.families).toHaveLength(12);
    expect(reg.families[0].family).toBe("type");
  });

  it("inlines each generated cell's frozen SVG", () => {
    const withCells = reg.rows.filter((r) => r.cells.length > 0);
    for (const r of withCells) {
      for (const c of r.cells) expect(c.svg.startsWith("<svg")).toBe(true);
    }
  });

  it("orders cells A, B, C", () => {
    for (const r of reg.rows) {
      const arms = r.cells.map((c) => c.arm);
      expect(arms).toEqual([...arms].sort());
    }
  });

  it("carries the gap reason through for gap rows", () => {
    const glow = reg.rows.find((r) => r.id === "mark-04-glow");
    expect(glow.gap).toMatch(/verification/i);
  });

  it("never emits a cell whose prompt is missing", () => {
    for (const r of reg.rows) for (const c of r.cells) expect(c.prompt.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/build-registry`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// scripts/build-registry.mjs
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CELLS = resolve("cells");
const OUT = resolve("src/generated/registry.json");

async function loadRows() {
  // rows.ts is plain TS with no runtime deps beyond a type import, so strip the
  // type-only import and evaluate it as ESM via a data: URL.
  const src = await readFile(resolve("src/rows.ts"), "utf8");
  const js = src
    .replace(/^import type .*$/gm, "")
    .replace(/^export type .*?;$/gms, "")
    .replace(/:\s*RowDecl\[\]/g, "")
    .replace(/:\s*ArmDecl/g, "")
    .replace(/\bas const\b/g, "")
    .replace(/^export function (\w+)\([^)]*\)\s*:\s*[^{]+\{/gm, "export function $1(...a) {");
  const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
  return mod.ROWS;
}

async function readCell(rowId, arm) {
  const dir = join(CELLS, rowId, arm);
  try {
    await stat(dir);
  } catch {
    return null;
  }
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
}

export async function buildRegistry() {
  const rows = await loadRows();
  const outRows = [];
  for (const r of rows) {
    const cells = [];
    for (const a of r.arms) {
      const c = await readCell(r.id, a.arm);
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/build-registry && node scripts/build-registry.mjs`
Expected: 6 tests PASS; CLI prints `registry: 48 rows, 0 generated cells`.

If the `rows.ts` strip-and-eval proves brittle, replace it with a checked-in `src/rows.json` that `src/rows.ts` imports and re-exports typed — same data, no transform. Prefer that if the regexes need a third fix.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-registry.mjs scripts/build-registry.test.mjs src/generated/.gitkeep
git commit -m "feat: registry builder collapsing cells into one site interface"
```

---

## Task 10: Integrity gate

**Files:**
- Create: `scripts/verify-cells.mjs`
- Test: `scripts/verify-cells.test.mjs`

**Interfaces:**
- Consumes: `cells/**`, `src/rows.ts`, `src/fixtures/*.json`.
- Produces: `verifyCells(): Promise<{ ok: boolean; failures: string[] }>`; CLI exits 1 when `!ok`.

Seven checks, matching spec §8:
1. Each generated cell dir has `cell.json`, `chart.js`, `render.svg`.
2. `prompt` non-empty and placeholder-free.
3. Every row declares a mode and ≥1 arm; every generated dir maps to a declared arm.
4. `mode: refine` non-A cells name a `method.ranOn` that resolves to an existing Arm-A cell.
5. Every cell's fixture exists in `src/fixtures/`.
6. `codeSha256` matches the current `chart.js` — proves no hand-editing.
7. Gap rows carry a `gap` reason and have no B/C cells on disk.

- [ ] **Step 1: Write the failing test**

```js
// scripts/verify-cells.test.mjs
import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { verifyCells } from "./verify-cells.mjs";
import { writeCellManifest } from "./new-cell.mjs";
import { renderCell } from "./render-cell.mjs";

const ROW = "type-01-typeface";
const DIR = `cells/${ROW}/A`;
const CHART = `export const meta={fixture:"table12",width:200,height:100};
export function render(svg,data){const d=svg.ownerDocument;
for(const[i,r]of data.rows.entries()){const e=d.createElementNS("http://www.w3.org/2000/svg","rect");
e.setAttribute("x",String(i*16));e.setAttribute("height",String(r.value));svg.appendChild(e);}}`;

async function seedValidCell() {
  await rm(`cells/${ROW}`, { recursive: true, force: true });
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
afterAll(async () => { await rm(`cells/${ROW}`, { recursive: true, force: true }); });

describe("verifyCells", () => {
  it("passes on a well-formed cell", async () => {
    const { ok, failures } = await verifyCells();
    expect(failures).toEqual([]);
    expect(ok).toBe(true);
  });

  it("check 1: fails when render.svg is missing", async () => {
    await rm(`${DIR}/render.svg`);
    const { ok, failures } = await verifyCells();
    expect(ok).toBe(false);
    expect(failures.join()).toMatch(/render\.svg/);
  });

  it("check 2: fails on a placeholder prompt", async () => {
    const m = JSON.parse(await readFile(`${DIR}/cell.json`, "utf8"));
    m.prompt = "TODO";
    await writeFile(`${DIR}/cell.json`, JSON.stringify(m));
    const { failures } = await verifyCells();
    expect(failures.join()).toMatch(/prompt/i);
  });

  it("check 3: fails on a cell dir for an undeclared arm", async () => {
    await mkdir(`cells/${ROW}/D`, { recursive: true });
    await writeFile(`cells/${ROW}/D/chart.js`, CHART);
    const { failures } = await verifyCells();
    expect(failures.join()).toMatch(/undeclared|arm/i);
  });

  it("check 4: fails when a refine B cell has no resolvable ranOn", async () => {
    const bDir = `cells/${ROW}/B`;
    await mkdir(bDir, { recursive: true });
    await writeFile(`${bDir}/chart.js`, CHART);
    await renderCell(bDir);
    await writeCellManifest({
      cellDir: bDir, row: ROW, rowTitle: "Typeface", family: "type", arm: "B",
      mode: "refine",
      method: { kind: "skill", name: "/impeccable typeset", args: "", ranOn: "type-99-nope.A" },
      prompt: "Run /impeccable typeset on this chart.", fixture: "table12",
    });
    const { failures } = await verifyCells();
    expect(failures.join()).toMatch(/ranOn/i);
  });

  it("check 6: fails when chart.js is edited after generation", async () => {
    await writeFile(`${DIR}/chart.js`, CHART + "\n// hand-tweaked to look nicer\n");
    const { ok, failures } = await verifyCells();
    expect(ok).toBe(false);
    expect(failures.join()).toMatch(/hash|sha256|edited/i);
  });

  it("check 7: fails when a gap row has a B cell on disk", async () => {
    const gapDir = "cells/mark-04-glow/B";
    await mkdir(gapDir, { recursive: true });
    await writeFile(`${gapDir}/chart.js`, CHART);
    const { failures } = await verifyCells();
    expect(failures.join()).toMatch(/gap/i);
    await rm("cells/mark-04-glow", { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/verify-cells`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// scripts/verify-cells.mjs
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sha256OfFile } from "./new-cell.mjs";
import { buildRegistry } from "./build-registry.mjs";

const CELLS = resolve("cells");
const PLACEHOLDER = /\b(TBD|TODO|FIXME|lorem ipsum)\b/i;

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

async function generatedDirs() {
  const out = [];
  for (const rowDir of await readdir(CELLS, { withFileTypes: true })) {
    if (!rowDir.isDirectory() || rowDir.name.startsWith("_")) continue;
    for (const armDir of await readdir(join(CELLS, rowDir.name), { withFileTypes: true })) {
      if (armDir.isDirectory()) out.push({ row: rowDir.name, arm: armDir.name });
    }
  }
  return out;
}

export async function verifyCells() {
  const failures = [];
  const reg = await buildRegistry();
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

  for (const { row, arm } of await generatedDirs()) {
    const dir = join(CELLS, row, arm);
    const tag = `${row}.${arm}`;
    const decl = byId.get(row);

    // check 3b
    if (!decl) { failures.push(`${tag}: cell dir for undeclared row`); continue; }
    if (!decl.declaredArms.some((a) => a.arm === arm)) {
      failures.push(`${tag}: cell dir for undeclared arm`); continue;
    }
    // check 7
    if (decl.gap && arm !== "A") { failures.push(`${tag}: gap row must not have a ${arm} cell`); continue; }

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
      if (!ranOn) failures.push(`${tag}: refine arm missing method.ranOn`);
      else if (!(await exists(join(CELLS, ranOn.split(".")[0], "A", "cell.json")))) {
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/verify-cells`
Expected: all 7 PASS.

- [ ] **Step 5: Wire it into build and commit**

```json
// package.json — change the build script
{ "scripts": { "build": "npm run verify:cells && npm run build:registry && astro build" } }
```

```bash
git add scripts/verify-cells.mjs scripts/verify-cells.test.mjs package.json
git commit -m "feat: seven-check cell integrity gate wired into build"
```

---

## Task 11: Gallery components

**Files:**
- Create: `src/components/Swatch.astro`, `src/components/RowStrip.astro`, `src/components/GapPanel.astro`, `src/styles/gallery.css`
- Test: `src/components/components.test.ts`

**Interfaces:**
- Consumes: `registry.json` shape from Task 9.
- Produces:
  - `Swatch` props: `{ cell: RegistryCell }`
  - `RowStrip` props: `{ row: RegistryRow }`
  - `GapPanel` props: `{ reason: string }`
  - `src/lib/labels.ts`: `armLabel(arm): string`, `methodChip(method): string`, `modeBadge(mode): string`

Astro components are not unit-testable without a renderer, so the testable logic lives in `src/lib/labels.ts` and the components are thin.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/components.test.ts
import { describe, expect, it } from "vitest";
import { armLabel, methodChip, modeBadge } from "../lib/labels";

describe("labels", () => {
  it("names arms in reader language, not internal letters alone", () => {
    expect(armLabel("A")).toBe("A · Claude default");
    expect(armLabel("B")).toBe("B · with a skill");
    expect(armLabel("C")).toBe("C · with a tool");
  });

  it("chips a skill method with its exact invocation", () => {
    expect(methodChip({ kind: "skill", name: "/impeccable typeset", args: "" }))
      .toBe("/impeccable typeset");
  });

  it("chips a default method without pretending a tool was used", () => {
    expect(methodChip({ kind: "default", name: "clean subagent", args: "" }))
      .toBe("clean subagent");
  });

  it("appends args when present", () => {
    expect(methodChip({ kind: "skill", name: "dataviz", args: "diverging" }))
      .toBe("dataviz (diverging)");
  });

  it("explains the mode rather than just naming it", () => {
    expect(modeBadge("refine")).toMatch(/on the default/i);
    expect(modeBadge("from-scratch")).toMatch(/independently/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components`
Expected: FAIL — `Cannot find module '../lib/labels'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/labels.ts
export type Method = { kind: "default" | "skill" | "tool"; name: string; args?: string };

export function armLabel(arm: "A" | "B" | "C"): string {
  return { A: "A · Claude default", B: "B · with a skill", C: "C · with a tool" }[arm];
}

export function methodChip(m: Method): string {
  return m.args ? `${m.name} (${m.args})` : m.name;
}

export function modeBadge(mode: "refine" | "from-scratch"): string {
  return mode === "refine"
    ? "refine — the treated arms ran on the default arm's output, so the only difference is the lever"
    : "from-scratch — each arm generated independently from the same brief";
}
```

```astro
---
// src/components/Swatch.astro
import { armLabel, methodChip } from "../lib/labels";
const { cell } = Astro.props;
---
<figure class="swatch">
  <div class="swatch__render" set:html={cell.svg} />
  <figcaption>
    <span class="swatch__arm">{armLabel(cell.arm)}</span>
    <code class="swatch__method">{methodChip(cell.method)}</code>
    {cell.arm === "A" && <span class="swatch__runs">{cell.runs} runs · {cell.shipped}</span>}
    <a class="swatch__link" href={`/cell/${cell.id}`}>prompt &amp; code →</a>
  </figcaption>
</figure>
```

```astro
---
// src/components/GapPanel.astro
const { reason } = Astro.props;
---
<aside class="gap">
  <h4>Unanswered</h4>
  <p>{reason}</p>
</aside>
```

```astro
---
// src/components/RowStrip.astro
import Swatch from "./Swatch.astro";
import GapPanel from "./GapPanel.astro";
import { modeBadge } from "../lib/labels";
const { row } = Astro.props;
---
<section class="row" id={row.id}>
  <header class="row__head">
    <h3>{row.title}</h3>
    <p class="row__mode">{modeBadge(row.mode)}</p>
    <p class="row__meta">fixture: <code>{row.fixture}</code></p>
  </header>
  {row.cells.length === 0 && !row.gap && <p class="row__todo">Not generated yet.</p>}
  <div class="row__cells">
    {row.cells.map((cell) => <Swatch cell={cell} />)}
    {row.gap && <GapPanel reason={row.gap} />}
  </div>
</section>
```

```css
/* src/styles/gallery.css */
:root { --ink: #16161a; --muted: #6b6b73; --rule: #e4e4e8; --bg: #fdfdfc; }
body { margin: 0; background: var(--bg); color: var(--ink);
  font: 400 15px/1.5 Archivo, system-ui, sans-serif; }
.row { border-top: 1px solid var(--rule); padding: 2.5rem 0; }
.row__head h3 { margin: 0 0 .25rem; font-size: 1.0625rem; font-weight: 600; }
.row__mode, .row__meta { margin: 0; color: var(--muted); font-size: .8125rem; }
.row__cells { display: grid; gap: 1.25rem; margin-top: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.swatch { margin: 0; }
.swatch__render { background: #fff; border: 1px solid var(--rule); overflow-x: auto; }
.swatch__render svg { display: block; max-width: 100%; height: auto; }
.swatch figcaption { display: flex; flex-wrap: wrap; gap: .5rem; align-items: baseline;
  margin-top: .5rem; font-size: .75rem; color: var(--muted); }
.swatch__arm { font-weight: 600; color: var(--ink); }
.gap { border: 1px dashed var(--rule); padding: 1rem; font-size: .8125rem; color: var(--muted); }
.gap h4 { margin: 0 0 .5rem; color: var(--ink); }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components`
Expected: all 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components src/lib src/styles
git commit -m "feat: Swatch, RowStrip, GapPanel and label helpers"
```

---

## Task 12: Grid page and provenance page

**Files:**
- Create: `src/layouts/Base.astro`, `src/pages/cell/[id].astro`, `src/components/Provenance.astro`
- Modify: `src/pages/index.astro`
- Test: `src/pages/pages.test.ts`

**Interfaces:**
- Consumes: `src/generated/registry.json`, components from Task 11.
- Produces:
  - `src/lib/registry.ts`: `getRegistry()`, `allCells()`, `findCell(id)`, `diffAgainstBaseline(cell, row): { added: string[]; removed: string[] } | null`
  - Static routes: `/` and `/cell/<row>.<arm>` for every generated cell.

- [ ] **Step 1: Write the failing test**

```ts
// src/pages/pages.test.ts
import { describe, expect, it } from "vitest";
import { getRegistry, allCells, findCell, diffAgainstBaseline } from "../lib/registry";

describe("registry helpers", () => {
  it("reads the built registry", () => {
    expect(getRegistry().rows.length).toBe(48);
  });

  it("flattens every generated cell with its row attached", () => {
    for (const { cell, row } of allCells()) {
      expect(cell.id.startsWith(row.id)).toBe(true);
    }
  });

  it("finds a cell by composite id", () => {
    const first = allCells()[0];
    if (!first) return; // no cells generated yet
    expect(findCell(first.cell.id)?.cell.id).toBe(first.cell.id);
  });

  it("returns null diff for an arm A cell", () => {
    const a = allCells().find(({ cell }) => cell.arm === "A");
    if (!a) return;
    expect(diffAgainstBaseline(a.cell, a.row)).toBeNull();
  });

  it("diffs a treated cell's SVG against its baseline", () => {
    const b = allCells().find(({ cell }) => cell.arm !== "A");
    if (!b) return;
    const d = diffAgainstBaseline(b.cell, b.row);
    expect(d).not.toBeNull();
    expect(Array.isArray(d.added)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages`
Expected: FAIL — `Cannot find module '../lib/registry'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/registry.ts
import registry from "../generated/registry.json";

export type RegistryCell = {
  id: string; arm: "A" | "B" | "C";
  method: { kind: "default" | "skill" | "tool"; name: string; args?: string; ranOn?: string | null };
  prompt: string; runs: number; shipped: string; generated: string; svg: string;
};
export type RegistryRow = {
  id: string; title: string; family: string;
  mode: "refine" | "from-scratch"; fixture: string; phase: number;
  gap: string | null; cells: RegistryCell[];
};

export function getRegistry(): { built: string; families: { family: string; rows: string[] }[]; rows: RegistryRow[] } {
  return registry as any;
}

export function allCells(): { cell: RegistryCell; row: RegistryRow }[] {
  return getRegistry().rows.flatMap((row) => row.cells.map((cell) => ({ cell, row })));
}

export function findCell(id: string) {
  return allCells().find(({ cell }) => cell.id === id) ?? null;
}

/** Coarse structural diff: which SVG element types the treated arm added or dropped. */
export function diffAgainstBaseline(cell: RegistryCell, row: RegistryRow) {
  if (cell.arm === "A") return null;
  const base = row.cells.find((c) => c.arm === "A");
  if (!base) return null;
  const tags = (svg: string) => new Set((svg.match(/<([a-zA-Z]+)/g) ?? []).map((t) => t.slice(1)));
  const b = tags(base.svg);
  const t = tags(cell.svg);
  return {
    added: [...t].filter((x) => !b.has(x)).sort(),
    removed: [...b].filter((x) => !t.has(x)).sort(),
  };
}
```

```astro
---
// src/layouts/Base.astro
import "../styles/gallery.css";
const { title, description } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
  </head>
  <body><main style="max-width:78rem;margin:0 auto;padding:2rem 1.25rem"><slot /></main></body>
</html>
```

```astro
---
// src/pages/index.astro
import Base from "../layouts/Base.astro";
import RowStrip from "../components/RowStrip.astro";
import { getRegistry } from "../lib/registry";
const reg = getRegistry();
const generated = reg.rows.reduce((n, r) => n + r.cells.length, 0);
---
<Base title="Directed — Claude Code's default charts vs. directed ones"
      description="Every element of a data visualization, shown as Claude's default output next to output produced with a specific skill, prompt, or tool actually applied.">
  <h1>Directed</h1>
  <p>Every element of a chart, twice or three times over: what Claude Code produces
     unprompted, and what it produces when a named skill or tool is actually run on top.
     {generated} of 107 cells generated.</p>
  {reg.families.map((f) => (
    <div>
      <h2>{f.family}</h2>
      {f.rows.map((id) => <RowStrip row={reg.rows.find((r) => r.id === id)} />)}
    </div>
  ))}
</Base>
```

```astro
---
// src/components/Provenance.astro
import { methodChip, armLabel, modeBadge } from "../lib/labels";
import { diffAgainstBaseline } from "../lib/registry";
const { cell, row } = Astro.props;
const diff = diffAgainstBaseline(cell, row);
---
<dl class="prov">
  <dt>Arm</dt><dd>{armLabel(cell.arm)}</dd>
  <dt>Method</dt><dd><code>{methodChip(cell.method)}</code></dd>
  {cell.method.ranOn && <><dt>Ran on</dt><dd><a href={`/cell/${cell.method.ranOn}`}>{cell.method.ranOn}</a></dd></>}
  <dt>Mode</dt><dd>{modeBadge(row.mode)}</dd>
  <dt>Fixture</dt><dd><code>{row.fixture}</code></dd>
  <dt>Runs</dt><dd>{cell.runs} · shipped: {cell.shipped}</dd>
  <dt>Generated</dt><dd>{cell.generated}</dd>
</dl>
<h3>Verbatim prompt</h3>
<pre class="prov__prompt">{cell.prompt}</pre>
{diff && (
  <>
    <h3>Structural change vs the default arm</h3>
    <p>Added: {diff.added.length ? diff.added.join(", ") : "nothing"}.
       Removed: {diff.removed.length ? diff.removed.join(", ") : "nothing"}.</p>
  </>
)}
```

```astro
---
// src/pages/cell/[id].astro
import Base from "../../layouts/Base.astro";
import Provenance from "../../components/Provenance.astro";
import { allCells } from "../../lib/registry";

export function getStaticPaths() {
  return allCells().map(({ cell, row }) => ({ params: { id: cell.id }, props: { cell, row } }));
}
const { cell, row } = Astro.props;
---
<Base title={`${row.title} — ${cell.id} — Directed`}>
  <p><a href={`/#${row.id}`}>← {row.title}</a></p>
  <div class="swatch__render" set:html={cell.svg} />
  <Provenance cell={cell} row={row} />
</Base>
```

- [ ] **Step 4: Run tests and build**

Run: `npx vitest run src/pages && npm run build`
Expected: 5 tests PASS; verify + registry + `astro build` all succeed; `dist/index.html` exists.

- [ ] **Step 5: Commit**

```bash
git add src/layouts src/pages src/lib src/components/Provenance.astro
git commit -m "feat: swatch grid and per-cell provenance pages"
```

---

## Task 13: Generation runbook and the baseline-isolation disclosure

**Files:**
- Create: `docs/factory.md`, `docs/method-draft.md`
- Test: `docs/docs.test.ts`

**Interfaces:**
- Consumes: the cell contract (Task 7), `writeCellManifest` (Task 8).
- Produces: the verbatim prompt templates every later task uses, plus the disclosure text that `/method` will carry in Phase 2.

**This task exists because of a finding that changes a spec assumption.** The global `~/.claude/CLAUDE.md` routes all web and UI work to the Impeccable and Intent design skills. Any subagent spawned from this machine inherits it. So Arm A is **not** a stock Claude Code baseline — it is a baseline that has already been told to care about design. That must be measured and disclosed, not assumed away.

- [ ] **Step 1: Write the failing test**

```ts
// docs/docs.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const factory = readFileSync("docs/factory.md", "utf8");
const method = readFileSync("docs/method-draft.md", "utf8");

describe("factory runbook", () => {
  it("gives a verbatim prompt template for each arm", () => {
    for (const h of ["## Arm A", "## Arm B", "## Arm C"]) expect(factory).toContain(h);
  });
  it("states the three-run rule for arm A and one-run for B/C", () => {
    expect(factory).toMatch(/three runs/i);
    expect(factory).toMatch(/exactly once/i);
  });
  it("requires the skill be invoked explicitly by name", () => {
    expect(factory).toMatch(/explicitly by name/i);
  });
  it("embeds the cell contract so every arm gets the same one", () => {
    expect(factory).toContain("export function render(svg, data)");
  });
});

describe("method draft", () => {
  it("discloses the global CLAUDE.md contamination of the baseline", () => {
    expect(method).toMatch(/global CLAUDE\.md/i);
    expect(method).toMatch(/not a stock/i);
  });
  it("lists the permitted post-generation edits", () => {
    expect(method).toMatch(/permitted/i);
  });
  it("names the refuted claims so readers do not pick them up secondhand", () => {
    expect(method).toMatch(/glow/i);
    expect(method).toMatch(/three annotations/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run docs`
Expected: FAIL — `ENOENT docs/factory.md`.

- [ ] **Step 3: Write `docs/factory.md`**

````markdown
# Cell generation runbook

Every cell is produced by actually running the method it claims. No cell is
hand-authored. No cell is hand-edited after generation — `verify-cells.mjs`
hash-checks `chart.js` against the manifest and fails the build.

## The contract, given identically to every arm

```js
export const meta = { fixture: "table12" | "hero8" | "cycle12", width: 640, height: 400 };
export function render(svg, data) { /* mutate the passed <svg> element in place */ }
```

`data` is `{ name, source, fetched, baseline, unit, rows }`. No network, no
`Date.now()`, no `Math.random()`. This is a harness requirement about module
shape, never a design hint, and it is disclosed on `/method`.

## Arm A — default

Run **three times**; keep the median-looking result; record `runs: 3`,
`shipped: "median"`. Working directory is the session scratchpad, **not** this
repo, so no project `CLAUDE.md` is in scope. Read `docs/method-draft.md` for
what this still does not isolate.

Prompt template — the only substitutions are the fixture JSON, the fixture's
one-line description, and the chart ask:

```
Here is a dataset:

<FIXTURE JSON>

It is <ONE-LINE DESCRIPTION, e.g. "12 chess openings with white's win rate and its
difference from the 50% baseline">.

Write a chart of it as an ES module with exactly this shape:

export const meta = { fixture: "<NAME>", width: 640, height: 400 };
export function render(svg, data) { /* mutate the passed <svg> element in place */ }

`data` is the object above. You get a real <svg> element in a jsdom document —
use svg.ownerDocument and createElementNS, or d3 over it. No network. No
Date.now() or Math.random(). Return only the module code.
```

Nothing about quality, style, typography, colour, or references appears in an
Arm A prompt. That absence is the experiment.

## Arm B — skill

Invoke the skill **explicitly by name**; never rely on auto-activation, which is
model discretion and unreliable. Run **exactly once** — `runs: 1`,
`shipped: "only"`. Generating several directed attempts and shipping the
prettiest is the exact cherry-picking this gallery exists to disprove.

For a `refine` row, the skill runs on the Arm A module, and the manifest records
`method.ranOn: "<row>.A"`:

```
Here is a chart module. <SKILL INVOCATION, e.g. "Run /impeccable typeset on it.">

<ARM A chart.js VERBATIM>

Keep the same module shape (meta + render(svg, data)) and the same data. Change
only what the skill's remit covers. Return only the module code.
```

For a `from-scratch` row, the skill runs against the same brief Arm A got, with
the skill named.

## Arm C — tool

Run **exactly once**. The tool loop is real, not simulated:

- **Reference-PNG + screenshot diff:** save the reference image to the
  scratchpad, then use Anthropic's documented pattern verbatim — *"[paste
  screenshot] implement this design. take a screenshot of the result and compare
  it to the original. list differences and fix them."* Record the reference
  image's provenance in `notes`.
- **Figma MCP:** record the file key and the node id read.
- **Image model:** record the model, the generation prompt, and that the output
  was used as a target, not shipped as a cell.

## Finishing a cell

```bash
node scripts/render-cell.mjs cells/<row>/<arm>
node scripts/new-cell.mjs --row <row> --arm <arm> --prompt-file <scratch>/prompt.txt \
  --mode <refine|from-scratch> --method-kind <default|skill|tool> \
  --method-name "<exact invocation>" --ran-on <row>.A --fixture <name>
node scripts/verify-cells.mjs
```
````

- [ ] **Step 4: Write `docs/method-draft.md`**

```markdown
# Methodology (draft for /method, Phase 2)

## The baseline is not a stock Claude Code

The global `~/.claude/CLAUDE.md` on the machine that generated these cells
routes all website and frontend work to two design skills. Every subagent
spawned on this machine inherits that file. Arm A therefore represents *Claude
Code as configured by a developer who already cares about design*, not a fresh
install. It is naive about this project — no dataviz research, no craft module,
no reference images, no project conventions — but it is not naive about design
in general.

Two things follow. First, the gap this gallery shows is a **floor**, not a
ceiling: a stock install would likely start further back. Second, closing this
would require generating baselines through the Claude API with a bare system
prompt, which costs money and needs explicit approval. Until that happens, the
disclosure stands in for the isolation.

## Permitted post-generation edits

Generated code is immutable. Three edits are permitted, applied uniformly to
every arm and hash-recorded before they land:

1. Injecting the shared dataset import.
2. Injecting the shared mount point / container id.
3. Removing a hardcoded page background that would fight the gallery shell.

Anything else is a regeneration, versioned `-v2`, with the original kept.

## Run counts

Arm A runs three times and the median-looking result ships, because one
generation is not "the default". Arms B and C run exactly once. Shipping the
prettiest of several directed attempts would manufacture the result.

## Refine vs from-scratch

Each row declares one. `refine` rows run the treated arms *on the default arm's
output*, so the only difference is the lever. `from-scratch` rows generate
independently, because there the lever *is* the generation decision — library
choice, radial vs cartesian, glyph design.

## Gaps published as gaps

Three techniques are shown as unanswered rather than filled with a guess:
the **glow / halo** filter recipe (its `feGaussianBlur` + `feMerge` wiring
failed a three-vote verification, 0–3), **texture**, and **legend-as-art**.

## Claims that failed verification

Listed so no reader picks them up secondhand: the glow filter recipe; a
"three annotations, five maximum" density budget; D3 line-count figures; a
175-chart / 100%-flawed / 2.47-flaws-per-chart defect baseline; "conversational
refinement mostly fails"; "the requester's vocabulary is the binding
constraint"; "models cannot judge aesthetics"; "nine of ten practitioners
export to Illustrator"; and "the annotation layer is what defines editorial
graphics." Each failed a three-vote adversarial check. Failing is not proof of
falsehood — it means this project does not rely on them.

## Not a benchmark

No scores. No winner declared per row. Some rows will show almost no difference;
those ship too.
```

- [ ] **Step 5: Run tests, then commit**

Run: `npx vitest run docs`
Expected: all 7 PASS.

```bash
git add docs
git commit -m "docs: generation runbook + methodology draft with baseline disclosure"
```

---

## Task 14: Generate the 9 Arm A baselines

**Files:**
- Create: `cells/<row>/A/{chart.js,cell.json,render.svg}` for all 9 Phase 1 rows.

**Interfaces:**
- Consumes: `docs/factory.md` Arm A template, fixtures, `render-cell.mjs`, `new-cell.mjs`.
- Produces: 9 baseline cells. Every treated cell in Tasks 15–16 sets `method.ranOn` to one of these.

Rows: `type-01-typeface`, `type-02-scale`, `type-04-numerals` (fixture `table12`);
`color-01-categorical`, `color-03-diverging`, `color-06-accent` (`table12`);
`mark-01-glyph`, `mark-02-gradient`, `mark-07-overlap` (`hero8`).

- [ ] **Step 1: Set up an isolated generation directory**

```bash
mkdir -p "$SCRATCH/directed-gen"
cp src/fixtures/table12.json src/fixtures/hero8.json "$SCRATCH/directed-gen/"
```

`$SCRATCH` is the session scratchpad. Generation runs here so no project `CLAUDE.md` is in scope.

- [ ] **Step 2: Generate three runs for the first row**

Dispatch a subagent whose entire prompt is the Arm A template from `docs/factory.md` with `table12.json` inlined and the ask *"12 chess openings with white's win rate and its difference from the 50% baseline"*. Save each run to `$SCRATCH/directed-gen/type-01-typeface/run{1,2,3}.js`.

Do not add any guidance about quality, colour, type, or references. Do not react to a run being ugly — that is the measurement.

- [ ] **Step 3: Render all three runs and pick the median**

```bash
for r in 1 2 3; do
  mkdir -p cells/type-01-typeface/A
  cp "$SCRATCH/directed-gen/type-01-typeface/run$r.js" cells/type-01-typeface/A/chart.js
  node scripts/render-cell.mjs cells/type-01-typeface/A
  cp cells/type-01-typeface/A/render.svg "$SCRATCH/directed-gen/type-01-typeface/run$r.svg"
done
```

Open the three SVGs. "Median" means the middle one by apparent effort — not the best, not the worst. Record which and why in the manifest's `notes`. Copy the chosen run into place and re-render.

- [ ] **Step 4: Write the manifest**

```bash
node scripts/new-cell.mjs --row type-01-typeface --arm A \
  --prompt-file "$SCRATCH/directed-gen/type-01-typeface/prompt.txt" \
  --mode refine --method-kind default --method-name "clean subagent, naive prompt" \
  --fixture table12
node scripts/verify-cells.mjs
```

Expected: `verify-cells: OK`.

- [ ] **Step 5: Repeat steps 2–4 for the other 8 rows**

Same procedure, same template, no variation except the fixture and its one-line description. `mark-*` rows use `hero8` described as *"the eight planets with diameter in km and mean distance from the Sun in AU"*.

Note: an Arm A cell is shared by every arm in its row — `type-01-typeface.A` is the baseline for both B and C. Nine baselines, not twenty-four.

- [ ] **Step 6: Verify and commit**

Run: `node scripts/verify-cells.mjs && npm run build`
Expected: OK; `dist/` contains 9 cell pages.

```bash
git add cells docs
git commit -m "cells: generate 9 Arm A baselines (3 runs each, median shipped)"
```

---

## Task 15: Generate the Arm B skill cells

**Files:**
- Create: `cells/<row>/B/{chart.js,cell.json,render.svg}` for all 9 Phase 1 rows.

**Interfaces:**
- Consumes: Arm A cells from Task 14, `docs/factory.md` Arm B template.
- Produces: 9 skill-treated cells, each with `method.ranOn` set (except `mark-01-glyph`, which is `from-scratch`).

| Row | Arm B invocation | Mode |
|---|---|---|
| type-01-typeface | `/impeccable typeset` | refine |
| type-02-scale | `/impeccable typeset` | refine |
| type-04-numerals | `dataviz` | refine |
| color-01-categorical | `dataviz` | refine |
| color-03-diverging | `dataviz` | refine |
| color-06-accent | `/impeccable quieter` then `/impeccable brand` | refine |
| mark-01-glyph | `craft` + explicit custom-mark brief | **from-scratch** |
| mark-02-gradient | `craft:perDatumRadialGradient` | refine |
| mark-07-overlap | `dataviz` | refine |

- [ ] **Step 1: Run the first skill cell**

Invoke `/impeccable typeset` explicitly, passing the verbatim Arm A module and the refine template from `docs/factory.md`. One run only. Save the returned module to `cells/type-01-typeface/B/chart.js`.

If the skill returns prose instead of a module, re-issue the same prompt once with *"Return only the module code."* appended, and record that in `notes`. Do not hand-extract code from prose — that is authoring.

- [ ] **Step 2: Render, manifest, verify**

```bash
node scripts/render-cell.mjs cells/type-01-typeface/B
node scripts/new-cell.mjs --row type-01-typeface --arm B \
  --prompt-file "$SCRATCH/directed-gen/type-01-typeface/prompt-B.txt" \
  --mode refine --method-kind skill --method-name "/impeccable typeset" \
  --ran-on type-01-typeface.A --fixture table12
node scripts/verify-cells.mjs
```

Expected: `verify-cells: OK`. Check 4 will fail loudly if `--ran-on` is omitted.

- [ ] **Step 3: Repeat for the other 8 rows**

For `mark-02-gradient`, the Arm B prompt must name the craft helper and its signature so the skill wires the real technique rather than reinventing it:

```
Use the project's craft helper instead of writing your own gradient:

  import { perDatumRadialGradient } from "../../../src/craft/gradient";
  const fill = perDatumRadialGradient(defsSelection, data.rows, {
    idPrefix: "planet", color: (d) => d.color,
  });
  // then: .attr("fill", (d, i) => fill(d, i))

Its defaults place the highlight off-centre at cx/cy 35%, r 60%. Do not centre it.
```

For `mark-01-glyph` (from-scratch), Arm B gets the same brief Arm A got plus the custom-mark instruction. It has no `--ran-on`.

- [ ] **Step 4: Verify, build, review**

Run: `node scripts/verify-cells.mjs && npm run build && npx astro preview`
Expected: OK. Open `/` and confirm every Phase 1 row shows A and B side by side.

- [ ] **Step 5: Commit**

```bash
git add cells
git commit -m "cells: generate 9 Arm B skill cells (one run each)"
```

---

## Task 16: Generate the Arm C tool cells

**Files:**
- Create: `cells/<row>/C/{chart.js,cell.json,render.svg}` for the 6 Phase 1 rows that declare an arm C.

**Interfaces:**
- Consumes: Arm A cells, `docs/factory.md` Arm C template.
- Produces: 6 tool-treated cells. Total after this task: 9 A + 9 B + 6 C = **24 cells**.

| Row | Arm C method |
|---|---|
| type-01-typeface | reference-PNG + Chrome screenshot diff |
| type-02-scale | reference-PNG + Chrome screenshot diff |
| color-01-categorical | `/impeccable colorize` |
| color-03-diverging | `craft:spectralField` |
| mark-01-glyph | raw D3 / Observable Plot `render` mark |
| mark-07-overlap | `/impeccable craft` |

- [ ] **Step 1: Prepare the reference images**

For the two screenshot-diff rows, save one editorial reference PNG each to `$SCRATCH/directed-gen/refs/`. Record for each: where it came from, who made it, and that it is used as a **private generation target only** — reference images are never published in the gallery. Cells show only the generated result.

- [ ] **Step 2: Run the screenshot-diff loop for `type-01-typeface`**

Render the Arm A cell to a local page, open it with the Chrome tools, then issue Anthropic's documented pattern verbatim with the reference attached:

> `[paste screenshot] implement this design. take a screenshot of the result and compare it to the original. list differences and fix them`

Let the loop run to its own stopping point. Save the resulting module to `cells/type-01-typeface/C/chart.js`. Record the full loop — how many compare-and-fix iterations it took — in `notes`. That count is itself a finding.

- [ ] **Step 3: Render, manifest, verify**

```bash
node scripts/render-cell.mjs cells/type-01-typeface/C
node scripts/new-cell.mjs --row type-01-typeface --arm C \
  --prompt-file "$SCRATCH/directed-gen/type-01-typeface/prompt-C.txt" \
  --mode refine --method-kind tool \
  --method-name "reference-PNG + Chrome screenshot diff" \
  --ran-on type-01-typeface.A --fixture table12
node scripts/verify-cells.mjs
```

- [ ] **Step 4: Repeat for the other 5 arm-C rows**

For `color-03-diverging`, the Arm C prompt names the craft helper:

```
Use the project's spectral field helper:

  import { spectralField, SPECTRAL_10 } from "../../../src/craft/spectral";
  const fill = spectralField(defsSelection, { id: "field", x1: 0, x2: innerWidth });

It sets gradientUnits="userSpaceOnUse" so every mark samples one continuous ramp
instead of restarting it inside its own bounding box. Do not use the default
objectBoundingBox.
```

- [ ] **Step 5: Full verification**

Run: `npm test && node scripts/verify-cells.mjs && npm run build`
Expected: all unit tests PASS; `verify-cells: OK`; registry reports **24 generated cells**.

- [ ] **Step 6: Commit**

```bash
git add cells
git commit -m "cells: generate 6 Arm C tool cells — Phase 1 complete at 24 cells"
```

---

## Task 17: Phase 1 gate

**Files:**
- Create: `docs/phase1-review.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the review artifact Dustin reads before Phase 2 generates 83 more cells.

- [ ] **Step 1: Run the whole pipeline clean**

```bash
rm -rf src/generated dist
npm test
node scripts/verify-cells.mjs
npm run build
npx astro preview
```

Expected: tests PASS, verify OK, build succeeds, `/` renders 9 rows with 24 cells.

- [ ] **Step 2: Screenshot the gallery**

Capture `/` at 1440 wide and one `/cell/<id>` page. Save both to the scratchpad and link them in the review doc.

- [ ] **Step 3: Write `docs/phase1-review.md`**

Cover, in this order: the 9 rows with a one-line read of what each comparison actually shows; which arms produced almost no visible difference (null results are findings); the Arm-A median-selection notes; the screenshot-diff iteration counts from Task 16; anything that argues for cutting or adding rows before Phase 2; and the honest cost — tokens and wall-clock — of producing 24 cells, extrapolated to 83.

- [ ] **Step 4: Update the README**

State what the project is, the three commands (`npm test`, `npm run verify:cells`, `npm run build`), the immutability rule, and a pointer to `docs/factory.md` and the design spec.

- [ ] **Step 5: Commit and stop**

```bash
git add docs/phase1-review.md README.md
git commit -m "docs: Phase 1 review artifact for the look gate"
```

**Stop here.** Phase 2 does not begin until Dustin has reviewed the gallery and the review doc.

---

## Self-review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §3 cell / arms / refine-vs-from-scratch | 3, 8, 13 |
| §3.2 immutability + permitted edits | 8 (hash), 10 (check 6), 13 (disclosure) |
| §3.3 cell on disk + manifest shape | 8 |
| §4 architecture, file structure | 1, 4–12 |
| §4.1 data flow, pre-rendered SVG | 7, 9, 12 |
| §4.2 component boundaries | 11, 12 |
| §5 three fixtures with provenance | 2 |
| §6 48 rows | 3 |
| §7 craft module, glow excluded | 4, 5, 6; glow gap in 3 |
| §8 seven integrity checks | 10 |
| §9 methodology, run counts, refuted list | 8, 13 |
| §10 `/mine` | **Phase 2** — deliberately deferred |
| §11 `/build` | **Phase 3** — deliberately deferred |
| §12 Phase 1 scope + gate | 14–17 |
| §13 risks | 8 (run counts), 10 (hash), 13 (skill-by-name, disclosure) |

Gaps are intentional and named: `/mine` and `/build` are Phase 2 and 3 per spec §12.

**Placeholder scan:** the one deliberate ellipsis is Task 3's `ROWS` array, which carries an explicit instruction to transcribe all 48 rows from spec §6 and three failing assertions (48 rows / 107 cells / 12 families) that cannot pass until it is done. Task 2's `table12` has a real endpoint, a real fallback endpoint, and a rule against hand-typing values.

**Type consistency:** `loadFixture`/`FixtureName` (T2) are consumed by T3 and T7. `RowDecl`/`ArmDecl` (T3) are consumed by T9's registry and T10's checks. `sha256OfFile` (T8) is imported by T10. `buildRegistry` (T9) is imported by T10 and read via `src/lib/registry.ts` in T12. `perDatumRadialGradient` (T4), `spectralField` (T5), `placeAnnotations` (T6) are re-exported by `src/craft/index.ts` and named in the T15/T16 generation prompts with matching signatures. `Method` in `src/lib/labels.ts` (T11) is structurally compatible with `RegistryCell["method"]` (T12).

**Scope:** one plan, 17 tasks, one deliverable — a reviewable 24-cell gallery. Phases 2 and 3 get their own plans.
