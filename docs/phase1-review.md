# Phase 1 review — the look gate

Decision this document supports: **build 83 more cells, or stop.**

Branch `phase-1`, 24 committed cells (9 Arm A baselines, 9 Arm B skill cells, 6 Arm C tool cells) across 9 of the 48 declared rows. 91 tests green, `verify-cells` clean, static build produces 25 pages. Every figure below was either measured directly against the committed `cells/**` files during this review or is cited from `.superpowers/sdd/2026-07-25-directed-phase1-plan/progress.md` (marked as such) — see the companion task report for which is which.

## 1. Verdict

- **Worth continuing, with one process fix.** When a row's stated lever is actually exercised, the difference is large, exact, and independently verifiable down to the hex code — this is not a subjective "looks nicer" gallery, it's a measurement instrument.
- **But 2 of 9 rows didn't test what they claim to.** `mark-07-overlap` (opacity, jitter, ordering) came back with *byte-identical* circle positions and opacity values across all three arms — the row's whole premise didn't move. `type-04-numerals` (tabular vs. proportional figures) never touched numeral formatting in either arm; the only real change was annotation density. Both still "pass" the integrity gate because the gate checks structure, not whether the row's claim was tested.
- **The machinery is real and enforced.** Immutability + hash-check held under adversarial review (Task 8, 10). The craft module techniques (per-datum gradient, spectral field) are verifiably wired, not decorative. The one from-scratch row (`mark-01-glyph`) shows three genuinely different construction strategies, not just three color choices.
- **The Arm C screenshot-diff loop over-delivered.** Both screenshot-diff rows independently found and fixed a real label-collision bug in the Arm A baseline — evidence the loop does more than cosmetic conformance.
- **The gallery shell has no visual design pass yet.** `src/styles/gallery.css` is 38 lines; the page is default system-ui black-on-white with no layout craft. That's in-scope for Phase 1 per the spec (shell design isn't a Phase 1 deliverable), but expect the screenshots below to read as a spreadsheet, not a gallery, until that pass happens.

**Screenshots** (1440px wide, captured from `npx astro preview`):
- [Full gallery, `/`](screenshots/index-full.png) — all 9 populated rows plus the 39 not-yet-generated ones below them.
- [`mark-02-gradient` row, close crop](screenshots/mark-02-gradient-row.png) — A vs B side by side, the per-datum gradient row.
- [`type-01-typeface.C` provenance page](screenshots/cell-type-01-typeface-C.png) — the screenshot-diff cell: render, method, verbatim prompt (including the embedded Arm A source), and the structural diff panel.

## 2. The 9 rows

| Row | What the comparison actually shows | Cells |
|---|---|---|
| [type-01-typeface](/cell/type-01-typeface.A) | Real: Arm A ships a legend + Helvetica/Arial stack; `/impeccable typeset` (B) adds a monospace figure stack but keeps the primary sans; the screenshot-diff (C) drops the legend for direct end-of-bar labels *and independently fixes a genuine Nigeria label/country-name collision in the baseline* (verified in the SVG geometry, not just claimed). | [A](/cell/type-01-typeface.A) · [B](/cell/type-01-typeface.B) · [C](/cell/type-01-typeface.C) |
| [type-02-scale](/cell/type-02-scale.A) | Real: `/impeccable typeset` (B) swaps the font stack and collapses 6 size tiers to 5. The screenshot-diff (C) independently finds and fixes the *same* Nigeria label-collision pattern as type-01 — this baseline never had a legend to drop, so "legend removal" doesn't apply here, only the collision fix does. | [A](/cell/type-02-scale.A) · [B](/cell/type-02-scale.B) · [C](/cell/type-02-scale.C) |
| [type-04-numerals](/cell/type-04-numerals.A) | **Underwhelming — doesn't test its own premise.** Neither arm uses `font-variant-numeric` or a tabular-figure font; both use the same Helvetica stack. `dataviz` (B) instead cuts delta annotations from every country but the first and last (46→26 text nodes). Real edit, wrong lever — this is an annotation-density row wearing a numerals-row label. | [A](/cell/type-04-numerals.A) · [B](/cell/type-04-numerals.B) |
| [color-01-categorical](/cell/color-01-categorical.A) | Strong. `dataviz` (B) replaces all 8 colors used in the SVG, zero shared with A. `/impeccable colorize` (C) goes further structurally: it re-specifies the entire palette in OKLCH instead of hex — a qualitatively different, perceptually-uniform approach, not just new hue picks. | [A](/cell/color-01-categorical.A) · [B](/cell/color-01-categorical.B) · [C](/cell/color-01-categorical.C) |
| [color-03-diverging](/cell/color-03-diverging.A) | Strong, two different levers. `dataviz` (B) rewrites the whole diverging ramp (17 colors dropped, 15 new). `spectralField` (C) is the project's own craft helper: verified `gradientUnits="userSpaceOnUse"` with two gradients spanning the real layout extent and the 10-stop blue→red ramp, replacing per-bar-restarting gradients with one continuous field. | [A](/cell/color-03-diverging.A) · [B](/cell/color-03-diverging.B) · [C](/cell/color-03-diverging.C) |
| [color-06-accent](/cell/color-06-accent.A) | Strong and surgical. `/impeccable quieter` + `brand` (B) changes exactly 2 of 7 colors in the SVG — and both are the accent hues (teal, orange), desaturated; all 5 neutrals are untouched. Precisely on-remit for "accent vs. neutral discipline." | [A](/cell/color-06-accent.A) · [B](/cell/color-06-accent.B) |
| [mark-01-glyph](/cell/mark-01-glyph.A) | Strong, from-scratch mode working as intended. A ships plain circles. Craft (B) builds a genuinely more elaborate glyph (clip-paths, grouped layers, ~2x the SVG elements). Raw D3/Plot (C) takes a different strategy again — gradient fill + `feDropShadow` filter. Three real, distinct answers to the same brief. | [A](/cell/mark-01-glyph.A) · [B](/cell/mark-01-glyph.B) · [C](/cell/mark-01-glyph.C) |
| [mark-02-gradient](/cell/mark-02-gradient.A) | Real but softer than the row title implies — see §4. Craft's `perDatumRadialGradient` (B) is confirmed: 8 gradients, one per planet, `cx=35% cy=35% r=60%` exactly matching the documented spec. But Arm A's own baseline *also* shipped 8 off-centre per-datum gradients (`cx=38% cy=32% r=72%`) unprompted — so this isn't "flat fill vs. gradient," it's two different gradient treatments. | [A](/cell/mark-02-gradient.A) · [B](/cell/mark-02-gradient.B) |
| [mark-07-overlap](/cell/mark-07-overlap.A) | **Null result — see §4.** Circle positions and opacity values are byte-identical across A, B, and C. `dataviz` (B) drops 8 secondary annotation labels (same decluttering pattern as type-04); `/impeccable craft` (C) changes one gray hex value by a few percent and nothing else. | [A](/cell/mark-07-overlap.A) · [B](/cell/mark-07-overlap.B) · [C](/cell/mark-07-overlap.C) |

## 3. Measured findings

All re-derived directly against the committed `render.svg`/`chart.js` files during this review unless marked "ledger only."

| Finding | Measurement |
|---|---|
| `color-01-categorical` palette replacement | A uses 8 distinct fill/stroke colors, B uses 8, **0 shared**. |
| `color-06-accent` surgical accent-only edit | A and B each use 7 colors; **5 identical** (all neutrals), **2 changed** — both are the teal/orange accents, desaturated. |
| `color-03-diverging` ramp rewrite | 25 colors in A, 23 in B; **17 dropped, 15 new** — the 8 shared are all UI chrome (background, gridlines, axis text), zero shared data colors. |
| `color-03-diverging` `spectralField` wiring | C's SVG has two `<linearGradient>` elements, both `gradientUnits="userSpaceOnUse"`, spanning real layout coordinates (e.g. `x1="0" x2="460"`); 10 stops each at offsets 0/11/22/33/44/56/67/78/89/100 — matches `src/craft/spectral.ts`'s `SPECTRAL_10` exactly. |
| `mark-02-gradient` per-datum gradients | B's SVG has 9 `radialGradient`s: `planet-0`..`planet-7` all `cx=35% cy=35% r=60%` (matches the craft module's documented off-centre spec exactly), plus one `hero8-sun` background gradient correctly excluded from the per-datum count. |
| Screenshot-diff Nigeria collision fix | In A, Nigeria's value label (`text-anchor="end"`, ending near x≈28) and its country-name label (`text-anchor="end"`, ending at x=-10) sit in the same ~50px band — genuinely overlapping given "54.63 (-18.85)" at that font size. In C, the value label moves inside the bar (`text-anchor="start"`, white fill, positioned past the bar's left edge) — the collision is structurally gone, not just visually adjusted. Confirmed in both `type-01-typeface` and `type-02-scale`. |
| Screenshot-diff legend drop | `type-01-typeface` A ships a 2-swatch "Above baseline / Below baseline" legend (2 extra `<rect>`s, 2 extra `<text>`s); C has neither. `type-02-scale` A never had a legend to begin with, so C's legend-free state there is convergence, not removal — worth not conflating the two rows. |
| No cell is code-identical to its baseline | Checked all 15 treated cells (9 Arm B + 6 Arm C) against their Arm A `chart.js` byte-for-byte: **zero matches**. Every lever changed something, including the two weak rows in §4. |
| Arm A run-to-run variance | **Ledger only** (Task 14) — discarded runs aren't committed, only the shipped median is. Reported range: `type-04-numerals` 43–83 SVG elements across 3 runs, `mark-07-overlap` 43–113. Sanity check: the shipped/median counts (81 and 76 respectively) fall inside both ranges. |
| Model | Every cell's manifest records `claude-sonnet` as the generator for every arm — confirmed by reading all 24 `cell.json` files directly, not sampled. |

## 4. Null and inconvenient results

- **No row came back identical to its baseline** (see table above) — but "different" isn't the same as "on-topic." Two rows changed something real while leaving their own stated lever untouched:
  - `mark-07-overlap` — opacity and jitter/position values are **byte-identical** across all three arms. The only measurable differences are B dropping 8 annotation labels and C nudging one gray value (`#8b93a7`→`#838aa0`). If this row shipped as-is in a public gallery, a careful reader would notice the "opacity, jitter, ordering" claim isn't demonstrated at all.
  - `type-04-numerals` — neither arm sets `font-variant-numeric` or switches to a tabular-figure font; both use plain Helvetica for every number. B's actual change is dropping delta annotations for 10 of 12 countries, not numeral formatting.
- **`mark-02-gradient`'s baseline used gradients unprompted, in the shipped run.** Arm A's median run already ships 8 off-centre per-datum radial gradients (`cx=38% cy=32% r=72%`) — a `hero8-sun` sun gradient and 8 planet gradients, each with its own 3-stop color ramp, each circle correctly referencing its own gradient via `fill="url(#...)"`. This is not a flat-fill baseline. The row's honest framing is "naive gradient parameters vs. the craft module's specified parameters," not "no gradient vs. gradient." (Whether all 3 discarded Arm A runs did this, not just the shipped one, is a ledger-only claim — not independently checkable from committed artifacts.)
- **The integrity gate does not catch either weak row.** `verify-cells.mjs`'s 7 checks are structural (files exist, hashes match, provenance resolves) — none of them ask "did this cell change what the row claims to test." That's a process gap, not a tooling bug (see §7).

## 5. Honesty ledger

- **`mark-02-gradient` Arm B took 3 generation attempts.** Attempts 1–2 failed on harness/brief defects (an unresolvable extensionless import path, then a raw DOM element passed where the craft helper needed a d3 selection) — not on aesthetic grounds, and no attempt was compared against another to pick a favorite. Disclosed verbatim in the cell's `notes`.
- **`color-03-diverging` Arm C's notes originally carried a false claim** ("not borrowed from this project") when its entire lever *is* this project's `src/craft/spectral.ts`. Caught and corrected during Task 16 review; current notes are accurate.
- **Model: `claude-sonnet` for every arm, every cell** — confirmed above. The comparison isolates *method* (default prompt vs. named skill vs. tool loop), not model.
- Standing disclosures — global-CLAUDE.md baseline contamination (Arm A is naive about *this project*, not naive about design in general), the permitted post-generation edits, refine-vs-from-scratch, gap rows, and the nine refuted research claims — are all in `docs/method-draft.md` and are not repeated here. Nothing in this document contradicts that file.

## 6. Cost, extrapolated

**Measured for Phase 1** (from `progress.md`, cross-checked against the commit history): 9 rows, 24 shipped cells required **44 generation-agent invocations** —
- Arm A: 27 (9 rows × 3 runs each, the fixed methodology, not a retry count)
- Arm B: 11 (9 rows × 1 run, plus 2 extra attempts on `mark-02-gradient`'s harness-defect retries)
- Arm C: 6 (9 rows × 1 run; 2 of those ran internal screenshot-compare-fix loops of 27 and 31 tool calls each, but that's tool-call cost *inside* one agent invocation, not extra agents)

**Phase 2 is 39 more rows, 83 more cells** (39 Arm A, 38 Arm B, 6 Arm C — confirmed from `src/rows.json` via the registry, exactly matching the spec's 107-cell/48-row total). Applying Phase 1's fixed methodology mechanically: 39×3 (A) + 38×1 (B) + 6×1 (C) = **161 generation-agent invocations minimum**, before any retries. Phase 1 saw one row need 2 extra retries out of 9 Arm B rows (~22%); if that rate holds, expect Phase 2 to land closer to **180–190 invocations**. This is an **estimate**, not a measurement — the ledger records tool-call counts and agent counts, not wall-clock time or token spend, so no dollar or time figure is given here; inventing one would violate the "don't invent numbers" constraint on this task. The "proven machinery" only removes *wiring* overhead (render/register/verify), not generation-agent count — each cell still needs its own real run.

## 7. Recommendations before Phase 2

1. Add a per-row verification step that checks the shipped cells actually vary the row's *stated lever* (not just "the code differs") — `mark-07-overlap` and `type-04-numerals` both passed every existing gate while missing their own premise.
2. Fix `cells/_contract.md`'s line 12 ("or a d3 selection over it") before generating `lib-01-ceiling` — it names d3 to the naive Arm A baseline in the one row where library choice is the entire subject, contaminating the exact thing that row measures (already flagged in `docs/method-draft.md`).
3. Add a typecheck gate: `npx tsc --noEmit` currently fails with ~15 errors (missing `@types` for `d3-color`/`d3-selection`/`jsdom`, a `rows.ts` readonly/mutable mismatch, an untyped test index signature) — none block the build today, but 83 more cells' worth of new code will compound silently without a gate.
4. Extend the gap-row test coverage (currently only exercises `mark-04-glow`) to `mark-05-texture` and `legend-03-art` before Phase 2 ships them as gap rows — same code path, untested for 2 of the 3 cases that will actually use it.
5. Fix `render-cell.mjs`'s silent 640×400 fallback when `meta.width`/`meta.height` is omitted, and add cell-directory context to its error output — with 83 more renders queued, a silently-wrong-sized cell is easy to miss.
6. Document the row-id regex `new-cell.mjs` enforces, and correct `docs/factory.md`'s implication that `--row-title`/`--family` are fallback-only (they override `rows.json` even for already-declared rows) — whoever runs this script 83 more times needs both accurate.
7. Run `npm audit` on the pinned `astro@^5.18.2` — 7 transitive vulnerabilities were deferred at Task 1 with no non-breaking fix available at the time; re-check before a larger content push in case that's changed.
8. Budget a visual design pass on `src/styles/gallery.css` (currently 38 lines, default system-ui styling) before this ships publicly — it's correctly out of scope for Phase 1's machinery-first goal, but the gallery currently reads as an unstyled data table, not a showcase.
