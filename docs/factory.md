# Cell generation runbook

Every cell is produced by actually running the method it claims. No cell is
hand-authored. No cell is hand-edited after generation, and `verify-cells.mjs`
now checks all three of a cell's files, not just one: it hash-checks `chart.js`
against the manifest, re-renders `chart.js` and byte-compares the result against
the committed `render.svg`, and cross-validates every field of `cell.json`
against `src/rows.json`, the directory the cell lives at, and `chart.js`'s own
`meta`. Any of those failing fails the build.

What that does **not** prove: the hash says "unedited since it was registered",
not "produced by a machine". A cell hand-authored *before* `new-cell.mjs` ran
would hash cleanly. Git history is the only witness to that, so review the diff
that introduces a cell, not just the gate's exit code.

`$SCRATCH` in the commands below is a placeholder for your own session's
scratch directory (e.g. the path a Claude Code session reports as its
scratchpad) — wherever the arm actually ran and where you saved its raw
output. It is not an environment variable this repo defines; substitute the
real path.

## The contract, given identically to every arm

Reproduced verbatim from `cells/_contract.md` — if the two ever disagree, that
file is the source of truth:

```js
export const meta = { fixture: "table12" | "hero8" | "cycle12", width: number, height: number };
export function render(svg, data) { /* mutate the passed <svg> element in place */ }
```

- `data` is the fixture object: `{ name, source, fetched, baseline, unit, rows }`.
- `render` receives a real `SVGSVGElement` in a jsdom document. Use `svg.ownerDocument`
  and `createElementNS`, or a d3 selection over it. Do not call `document` globally.
- No network. No fonts loaded at render time — reference font families by name only.
- No `Date.now()`, no `Math.random()`. Renders must be byte-stable across runs.

This is a harness requirement about module shape, never a design hint, and it is
disclosed on `/method`.

An arm is never handed the contract file itself — it is handed a prompt template
from this document, which has to carry the same constraints. Phase 1's Arm A
template dropped three of them ("do not call `document` globally", "no fonts
loaded at render time", "renders must be byte-stable"). All 24 shipped cells
satisfy all three anyway — verified — but the templates below now state them, so
**Phase 2's prompts differ from Phase 1's in exactly that way**, disclosed as a
methodology change in `docs/method-draft.md`.

Byte-stability is load-bearing, not decorative: the integrity gate re-renders
every cell and byte-compares the result against the committed `render.svg`, so a
cell whose render is not reproducible fails the build.

## Importing a craft helper from a cell

A cell runs under **bare Node ESM** — `scripts/render-cell.mjs` imports
`chart.js` directly — and bare Node does not resolve extensionless specifiers.
Every import of project code from a cell therefore carries an explicit `.ts`
extension. Both forms below work from `cells/<row>/<arm>/chart.js`:

```js
import { perDatumRadialGradient, spectralField } from "../../../src/craft/index.ts";
import { perDatumRadialGradient } from "../../../src/craft/gradient.ts";
```

Two failure modes to put in any brief you hand a craft arm, because they cost
`mark-02-gradient.B` two of its three generation attempts:

- Extensionless (`"../../../src/craft/gradient"`) fails with
  `ERR_MODULE_NOT_FOUND`, from the barrel as well as from a module.
- The helpers take a **d3 selection**, not a raw DOM element —
  `perDatumRadialGradient(select(defs), …)`, not
  `perDatumRadialGradient(defs, …)`, which fails with
  `defs.selectAll is not a function`.

## Dataset one-liners

The only per-row substitutions into the Arm A template are the fixture JSON
itself, one of these one-line descriptions, and the fixture name. Each is a
neutral statement of what the columns are — nothing about how to chart them.

- **table12** — "12 countries' life expectancy at birth in years, and each
  country's difference from the World Bank world baseline of 73.48 years."
- **hero8** — "the eight planets, with equatorial diameter in km and mean
  distance from the Sun in AU."
- **cycle12** — "12 months of daylight hours at 40°N latitude, and each
  month's difference from the 12-hour equinox baseline." Not used by any of
  Phase 1's nine rows.

## Arm A — default

Arm A: three runs, and the median ships — **mechanically, not by eye**. Render
all three and ship the run with the **median total SVG element count**; break a
tie with the smaller `chart.js`. Record `runs: 3`,
`shipped: "median"`, and put the three counts in the task record so the choice is
reproducible by anyone holding the discarded runs. That reproducibility is the
whole point: a "median-looking" judgement call would let the prettiest baseline
ship, which is the claim this gallery exists to disprove. (The gate enforces the
recorded numbers, not the selection: `runs >= 3` and `shipped: "median"` for
Arm A, `runs: 1` and `shipped: "only"` for B and C.)

Working directory is `$SCRATCH`, **not** this repo, so
no *project* `CLAUDE.md` or its `.claude/` skills are in scope. This does
**not** isolate the arm from the *global* `~/.claude/CLAUDE.md` on the
generating machine, which applies regardless of working directory — read
`docs/method-draft.md` for what that means for Arm A's baseline status.

Prompt template — the only substitutions are the fixture JSON, the fixture's
one-line description from above, and the fixture name. **The fixture JSON goes in
verbatim**; the gate reads the committed prompt back and fails a baseline whose
recorded prompt does not contain it:

```
Here is a dataset:

<FIXTURE JSON>

It is <ONE-LINE DESCRIPTION, e.g. "12 countries' life expectancy at birth in
years, and each country's difference from the World Bank world baseline of
73.48 years">.

Write a chart of it as an ES module with exactly this shape:

export const meta = { fixture: "<NAME>", width: 640, height: 400 };
export function render(svg, data) { /* mutate the passed <svg> element in place */ }

`data` is the object above. You get a real <svg> element in a jsdom document —
use svg.ownerDocument and createElementNS, or a d3 selection over it. Do not
call document globally. No network. No fonts loaded at render time — reference
font families by name only. No Date.now() or Math.random(); the render must be
byte-stable across runs. Return only the module code.
```

The last three constraints ("do not call document globally", the fonts sentence,
"byte-stable") are the Phase 2 addition described under the contract above.
Phase 1's nine Arm A prompts, stored verbatim in their manifests, end at "No
Date.now() or Math.random(). Return only the module code."

Nothing about quality, style, typography, colour, or references appears in an
Arm A prompt. That absence is the experiment.

## Arm B — skill

Invoke the skill **explicitly by name**; never rely on auto-activation, which
is model discretion and unreliable. Run **exactly once** — `runs: 1`,
`shipped: "only"`. Generating several directed attempts and shipping the
prettiest is the exact cherry-picking this gallery exists to disprove.

For a `refine` row, the skill runs on the Arm A module, and the manifest
records `method.ranOn: "<row>.A"` (see "Finishing a cell" below for the exact
required form):

```
Here is a chart module. <SKILL INVOCATION, e.g. "Run /impeccable typeset on it.">

<ARM A chart.js VERBATIM>

Keep the same module shape (meta + render(svg, data)) and the same data, and the
same harness constraints: no network, no fonts loaded at render time, no
Date.now() or Math.random(), and a byte-stable render. Change only what the
skill's remit covers. Return only the module code.
```

**`<ARM A chart.js VERBATIM>` means verbatim.** The gate reads the committed
prompt back and fails a refine-mode B or C cell whose recorded prompt does not
contain its baseline's `chart.js` byte-for-byte — that is the only independent
handle there is on a published prompt.

For a `from-scratch` row, the skill runs against the same brief Arm A got —
the Arm A prompt template above, dataset and all — with the skill invocation
named explicitly at the top instead of omitted. The fixture JSON is what the
gate checks for in that case.

## Arm C — tool

Run **exactly once**. The tool loop is real, not simulated. The cell contract
applies to whatever the loop produces — no fonts at render time, no
`Date.now()`/`Math.random()`, byte-stable render — and for a `refine` row the
prompt still has to carry the Arm A module verbatim:

- **Reference-PNG + screenshot diff:** save the reference image to
  `$SCRATCH`, then use Anthropic's documented pattern verbatim — *"[paste
  screenshot] implement this design. take a screenshot of the result and
  compare it to the original. list differences and fix them."* Record the
  reference image's provenance in `notes`.
- **Figma MCP:** record the file key and the node id read.
- **Image model:** record the model, the generation prompt, and that the
  output was used as a target, not shipped as a cell.

## Finishing a cell

1. Save the generated module to `cells/<row>/<arm>/chart.js` (create the
   directory if it doesn't exist) and the exact, verbatim prompt text sent to
   the arm to `$SCRATCH/prompt.txt`.
2. Render, register, and verify, in this order — `new-cell.mjs` hashes
   whatever `chart.js` contains at the moment it runs, so render first:

**Git Bash / MSYS on Windows will silently mangle a `--method-name` that
starts with `/`** (e.g. `/impeccable typeset`) into a filesystem path (e.g.
`C:/Program Files/Git/impeccable typeset`) — every `/impeccable …` method
name in `src/rows.json` is at risk. Always export `MSYS_NO_PATHCONV=1` first
and re-check the printed `method.name` in the command output.

**`MSYS_NO_PATHCONV=1` has a second-order effect: it also stops MSYS from
translating any other Unix-style path on the same command line** — including
`--prompt-file`. Give `--prompt-file` in Windows form (`C:/Users/...`,
forward slashes are fine) whenever `MSYS_NO_PATHCONV=1` is set; a
`$SCRATCH`-relative Unix-style path (`/c/Users/...`) will resolve wrong and
`new-cell.mjs` will fail with `ENOENT`:

```bash
node scripts/render-cell.mjs cells/<row>/<arm>
MSYS_NO_PATHCONV=1 node scripts/new-cell.mjs \
  --row <row> --arm <A|B|C> --prompt-file C:/Users/you/path/to/prompt.txt \
  --mode <refine|from-scratch> --method-kind <default|skill|tool> \
  --method-name "<exact invocation>" --fixture <table12|hero8|cycle12> \
  [--method-args "<text>"] [--ran-on <row>.A] [--notes "<text>"] \
  [--cell-dir <path>] [--row-title <title> --family <family>]
node scripts/verify-cells.mjs
```

Required flags on `new-cell.mjs`: `--row`, `--arm`, `--prompt-file`,
`--mode`, `--method-kind`, `--method-name`, `--fixture`. Optional:
`--method-args`, `--ran-on`, `--notes`, `--cell-dir` (defaults to
`cells/<row>/<arm>`), and the pair `--row-title`/`--family`.

`--row` must match `/^[a-z]+-\d{2}-[a-z0-9-]+$/` — lowercase family, a
two-digit number, a lowercase-and-hyphens slug (`type-01-typeface`,
`color-06-accent`). Anything else exits 2 with `bad row id: <row>` before
writing.

`--row-title`/`--family` are for a row **not yet declared in `src/rows.json`**,
and only work as a pair. For a row that *is* declared, `rows.json` is the
authority: the script uses its `title`/`family` and **rejects** flags that
contradict them, because the pair used to take precedence and would silently
relabel a declared row's published manifest. If a declared row's title or
family is wrong, change `src/rows.json` — the integrity gate (check 8) compares
every manifest's `rowTitle` and `family` against it.

`--mode` and `--method-kind` are validated against closed, case-sensitive
sets — `refine`/`from-scratch` and `default`/`skill`/`tool` — with **no case
coercion**. `Skill`, `Refine`, or `DEFAULT` is rejected outright, not
corrected for you.

For a `refine`-mode row, arms B and C must pass `--ran-on` set to **exactly**
`<row>.A` — the row id, a literal period, and an uppercase `A`, nothing else.
`verify-cells.mjs` rejects a bare row id, a `.B`/`.C` suffix, and a lowercase
`.a` as malformed lineage.
