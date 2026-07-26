// Barrel for the craft layer.
//
// Re-exports carry an explicit `.ts` extension because a generated cell imports
// this file under **bare Node ESM** (`scripts/render-cell.mjs` does a plain
// `import()` of `cells/<row>/<arm>/chart.js`, and Node strips types rather than
// resolving TypeScript's extensionless specifiers). Extensionless re-exports
// here throw ERR_MODULE_NOT_FOUND at cell depth — the defect that cost
// `mark-02-gradient.B` two generation attempts. `tsconfig.json` therefore keeps
// Astro's default `allowImportingTsExtensions: true`, which is legal because the
// project only ever typechecks with `--noEmit`.
//
// The working import form from a cell (see docs/factory.md):
//   import { perDatumRadialGradient } from "../../../src/craft/index.ts";
export { perDatumRadialGradient } from "./gradient.ts";
export type { GradientOpts } from "./gradient.ts";
export { spectralField, SPECTRAL_10 } from "./spectral.ts";
export type { SpectralOpts } from "./spectral.ts";
export { placeAnnotations } from "./annotation.ts";
export type { Anchor, Placed, PlaceOpts } from "./annotation.ts";
