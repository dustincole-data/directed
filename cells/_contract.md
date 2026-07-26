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
