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

Arm A runs three times and the median-looking result ships, because one
generation is not "the default". Arms B and C run exactly once. Shipping the
prettiest of several directed attempts would manufacture the result.

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

## Not a benchmark

No scores. No winner declared per row. Some rows will show almost no
difference; those ship too.
