# Methodology (draft for /method, Phase 2)

## The baseline is not a stock Claude Code

The global CLAUDE.md (`~/.claude/CLAUDE.md`) on the machine that generated
these cells routes all website and frontend work to two design skills. Every
subagent spawned on this machine inherits that file, regardless of its
working directory — running Arm A from a scratch directory keeps *project*
`CLAUDE.md` files and their skills out of scope, but it does not touch the
global one. Arm A therefore represents *Claude Code as configured by a
developer who already cares about design*, not a fresh install: it is naive
about this project specifically — no dataviz research, no craft module, no
reference images, no project conventions — but it is not a stock Claude Code
baseline, and it is not naive about design in general.

Two things follow. First, the gap this gallery shows is a **floor**, not a
ceiling: a stock install would likely start further back. Second, closing
this would require generating baselines through the Claude API with a bare
system prompt, which costs money and needs explicit approval. Until that
happens, the disclosure stands in for the isolation.

## Permitted post-generation edits

Generated code is immutable. Three edits are permitted, applied uniformly to
every arm and hash-recorded before they land:

1. Injecting the shared dataset import.
2. Injecting the shared mount point / container id.
3. Removing a hardcoded page background that would fight the gallery shell.

Anything else is a regeneration, versioned `-v2`, with the original kept.

## Run counts

Arm A runs three times and the median result ships, because one generation is
not "the default". "Median" is a mechanical rule, not a judgment call: all three
runs are rendered, the run with the **median total SVG element count** ships, and
a tie is broken by the smaller `chart.js`. Anyone holding the three runs can
re-derive the same choice. That is the point — a subjective "median-looking" pick
would let the prettiest baseline ship, which is exactly what this gallery claims
not to do. The discarded runs are not committed, so the selection is
reproducible from the runs, not from the repository.

Arms B and C run exactly once. Shipping the prettiest of several directed
attempts would manufacture the result.

## A Phase 1 / Phase 2 prompt difference

`cells/_contract.md` states four constraints. Phase 1's prompt templates
transmitted only some of them: no arm that generated the first 24 cells was told
"do not call `document` globally", "no fonts loaded at render time", or "renders
must be byte-stable across runs". All 24 shipped cells satisfy all three anyway
— verified by re-rendering every cell byte-identically and by checking that none
loads a font — but that was luck, not instruction.

The templates in `docs/factory.md` now state all four, so **Phase 2's prompts are
not byte-identical to Phase 1's**. The addition is a harness constraint, never a
design hint, and it is stated here rather than slipped in because Arm A's prompt
is the experiment's control. Byte-stability in particular is now enforced: the
integrity gate re-renders each cell and byte-compares against the committed
`render.svg`.

## Refine vs from-scratch

Each row declares one. `refine` rows run the treated arms *on the default
arm's output*, so the only difference is the lever. `from-scratch` rows
generate independently, because there the lever *is* the generation
decision — library choice, radial vs cartesian, glyph design.

## A second contamination source: the contract names a library

`cells/_contract.md` — handed identically to every arm, Arm A included —
says: *"Use `svg.ownerDocument` and `createElementNS`, or a d3 selection over
it."* That sentence names a specific library to the naive baseline generator
before it has written a line of code.

This is harmless for Phase 1: none of the nine Phase 1 rows is about library
choice. It is not harmless for `lib-01-ceiling` (`src/rows.json`, currently
declared phase 3) — preset chart library vs. Observable Plot's function-mark
escape hatch vs. raw D3/SVG, all on the same brief — where library choice is
the entire subject of the row. A contract that pre-names d3 to that row's Arm
A puts a thumb on exactly the scale it is meant to measure. Before that row
is generated, it needs either a contract variant that describes the DOM
access pattern (a real `<svg>` element in a jsdom document) without naming a
library, or an explicit caveat attached to that row's comparison disclosing
that Arm A was told about d3 and its competitors were not. This is disclosed
here so it is caught before the row ships, not after.

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

## Three cells whose premise was never engaged

Every treated cell in Phase 1 differs from its baseline. Three of the fifteen
do not differ *in the dimension their row's title names*, which is a weaker
result than the row claims:

- **`mark-07-overlap.B`** and **`mark-07-overlap.C`** — the row is "Overplotting:
  opacity, jitter, ordering". Both treated arms leave every circle's `cx`, `cy`,
  `r` and `fill-opacity` byte-identical to Arm A. B recolours the marks and
  thickens their stroke; C collapses five secondary text greys into one. Both
  are real edits. Neither is an overplotting edit, and the row misses its stated
  premise on both of its treated arms.
- **`type-04-numerals.B`** — the row is "Tabular vs proportional figures".
  Neither arm uses `font-variant-numeric` or a tabular-figure font; both use the
  same Helvetica stack. The real change is a cut from 24 numeric annotations to
  2 — an annotation-density result wearing a numerals label.

These passed the Phase 1 gate: every check it ran asked whether a cell was
well-formed and honestly provenanced, and none asked whether it engaged the
lever its row exists to demonstrate. The gate now runs a **premise probe**
(check 12) that compares each treated arm against its baseline on exactly that
dimension, and fails when the two are identical. Run against the committed
Phase 1 tree it flags these three cells and no others.

A probe can only prove a lever moved — never that it moved well. It is a floor
under the claim these pages make, not a judgement of the design.

### All three still ship, labelled

The probe found them; it did not get to delete them. Each is published with
**"Premise not engaged"** under its render and the reason on its provenance
page, declared as a `nullResult` in `src/rows.json` and enforced in both
directions — a cell whose lever *did* move is not allowed to carry the
disclosure, so it cannot go stale.

Two available fixes were rejected, and naming them is part of the disclosure:

- **Regenerating the three under lever-forcing prompts.** That measures the
  skill *plus an explicit brief* while the published method still reads
  `dataviz` or `/impeccable craft`. The whole question these rows ask is what a
  named skill does when it is simply run — telling it the answer first and
  publishing the result under the same label would manufacture the finding.
- **Relabelling `type-04-numerals` as an annotation-density row.** Its Arm B
  edit is real and would fit that title. But choosing the hypothesis after
  seeing the result is exactly the move this project exists to argue against,
  and it would quietly retire "tabular vs proportional figures" — a lever
  nothing has yet tested — from the 48-row inventory. The row keeps its title
  and keeps its null.

### Three more, from Phase 2

- **`num-01-units.B`** — the row is "Units and rounding", the method is a bare
  `dataviz` invocation. The skill replaced the entire palette, added twelve
  `path` elements and moved the mark geometry: a large, genuine edit. It also
  wrote every number exactly as the baseline did — same rounding, same units,
  same separators — so both arms reduce to an identical `numeric-text` probe.
- **`axis-03-grid.B`** — the row is "Gridlines: whether, how faint, which
  direction", the method is a bare `/impeccable distill`. It deleted all twelve
  delta labels and shortened the baseline annotation, cutting the chart from 46
  text elements to 34, and left every one of the six gridlines byte-identical —
  same positions, same 1px weight, same grey — along with the dashed baseline
  rule and the axis line. It read the chart's clutter as annotation density
  rather than as grid.
- **`medium-02-theme.B`** — the row is "Dark / light theming of the same
  chart", the method is a bare `/impeccable adapt`. The skill read *adapt* as
  responsive sizing: it added `preserveAspectRatio` and a fluid-width inline
  style, and changed not one of the 41 fills and strokes, white ground included.
  A different sense of the same word, and the theming lever stays untested.

All three ship declared, like the first three.

That makes six nulls, and **every one of them is a named skill invoked with no
brief** — three `dataviz` (`type-04-numerals.B`, `mark-07-overlap.B`,
`num-01-units.B`) and three `/impeccable` (`mark-07-overlap.C` craft,
`axis-03-grid.B` distill, `medium-02-theme.B` adapt). The pattern worth stating,
and worth holding loosely at n=6: a named skill invoked with no brief reliably
changes *something* — usually palette, annotation density and layout, the things
a chart skill reaches for first — and does not reliably change the specific lever
a row was built to isolate. `medium-02-theme.B` adds a second mechanism next to
that one: a skill's remit may simply not be the thing the row's title assumed it
was. Both are claims about how these skills behave unprompted, which is exactly
what the default-versus-directed comparison exists to measure; neither is
evidence that the skills are bad at the lever when asked.

`mark-07-overlap` has a further, more interesting cause, found while deciding
this and not previously recorded: **the baseline does not overplot.** Its eight
bubbles sit on one row at `cy=210`, and measured from the committed
`render.svg`, every pair is disjoint — the tightest clearance, Jupiter to
Saturn, is about 7px. Arm A had also already sorted its marks by descending
radius and set `fill-opacity` before any skill ran. So neither treated arm
declined to fix overplotting; there was no overplotting in front of it. That is
a defect in the *row*, not in the skills: testing "opacity, jitter, ordering"
needs a fixture that actually overplots, which `hero8` at 640×400 is not. The
row is kept, with both nulls published, rather than being quietly re-run against
a chart that never had the problem.

## Not a benchmark

No scores. No winner declared per row. Some rows will show almost no
difference; those ship too.
