# Cell generation runbook

Every cell is produced by actually running the method it claims. No cell is
hand-authored. No cell is hand-edited after generation — `verify-cells.mjs`
hash-checks `chart.js` against the manifest and fails the build.

`$SCRATCH` in the commands below is a placeholder for your own session's
scratch directory (e.g. the path a Claude Code session reports as its
scratchpad) — wherever the arm actually ran and where you saved its raw
output. It is not an environment variable this repo defines; substitute the
real path.

## The contract, given identically to every arm

```js
export const meta = { fixture: "table12" | "hero8" | "cycle12", width: 640, height: 400 };
export function render(svg, data) { /* mutate the passed <svg> element in place */ }
```

`data` is `{ name, source, fetched, baseline, unit, rows }`. No network, no
`Date.now()`, no `Math.random()`. This is a harness requirement about module
shape, never a design hint, and it is disclosed on `/method`. It is
reproduced here verbatim from `cells/_contract.md` — if the two ever
disagree, that file is the source of truth.

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

Arm A: three runs, keep the median-looking result, record `runs: 3`,
`shipped: "median"`. Working directory is `$SCRATCH`, **not** this repo, so
no *project* `CLAUDE.md` or its `.claude/` skills are in scope. This does
**not** isolate the arm from the *global* `~/.claude/CLAUDE.md` on the
generating machine, which applies regardless of working directory — read
`docs/method-draft.md` for what that means for Arm A's baseline status.

Prompt template — the only substitutions are the fixture JSON, the fixture's
one-line description from above, and the fixture name:

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
use svg.ownerDocument and createElementNS, or a d3 selection over it. No
network. No Date.now() or Math.random(). Return only the module code.
```

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

Keep the same module shape (meta + render(svg, data)) and the same data. Change
only what the skill's remit covers. Return only the module code.
```

For a `from-scratch` row, the skill runs against the same brief Arm A got —
the Arm A prompt template above, dataset and all — with the skill invocation
named explicitly at the top instead of omitted.

## Arm C — tool

Run **exactly once**. The tool loop is real, not simulated:

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

```bash
node scripts/render-cell.mjs cells/<row>/<arm>
node scripts/new-cell.mjs \
  --row <row> --arm <A|B|C> --prompt-file $SCRATCH/prompt.txt \
  --mode <refine|from-scratch> --method-kind <default|skill|tool> \
  --method-name "<exact invocation>" --fixture <table12|hero8|cycle12> \
  [--method-args "<text>"] [--ran-on <row>.A] [--notes "<text>"] \
  [--cell-dir <path>] [--row-title <title> --family <family>]
node scripts/verify-cells.mjs
```

Required flags on `new-cell.mjs`: `--row`, `--arm`, `--prompt-file`,
`--mode`, `--method-kind`, `--method-name`, `--fixture`. Optional:
`--method-args`, `--ran-on`, `--notes`, `--cell-dir` (defaults to
`cells/<row>/<arm>`), and the fallback pair `--row-title`/`--family` — only
needed together, and only if `<row>` is not yet declared in `src/rows.json`.

`--mode` and `--method-kind` are validated against closed, case-sensitive
sets — `refine`/`from-scratch` and `default`/`skill`/`tool` — with **no case
coercion**. `Skill`, `Refine`, or `DEFAULT` is rejected outright, not
corrected for you.

For a `refine`-mode row, arms B and C must pass `--ran-on` set to **exactly**
`<row>.A` — the row id, a literal period, and an uppercase `A`, nothing else.
`verify-cells.mjs` rejects a bare row id, a `.B`/`.C` suffix, and a lowercase
`.a` as malformed lineage.
