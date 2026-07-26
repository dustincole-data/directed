import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildRegistry } from "./build-registry.mjs";

const OUT = resolve("src/generated/registry.json");

/**
 * Vite plugin: guarantees src/generated/registry.json exists before any
 * module resolves it.
 *
 * src/lib/registry.ts statically imports that gitignored, generated file.
 * `predev`/`pretest` and `npm run build`'s build:registry step keep it
 * fresh across ordinary use, but those are npm lifecycle hooks — they never
 * fire for a bare `npx vitest run`, `npx astro build/dev`, or any other
 * direct tool invocation, so on a genuinely clean checkout (file absent)
 * those commands crash on the missing import before this plugin ever gets
 * a say... unless the plugin is wired into the tool itself, which is what
 * this does: both astro.config.mjs and vitest.config.ts register it, so it
 * runs on every Vite-powered startup (dev server or build) regardless of
 * which npm/npx entry point the caller used.
 *
 * Deliberately only fills a *missing* file — it is a last-resort safety
 * net, not a substitute for predev/pretest/build:registry's unconditional
 * regeneration. An existing registry.json (even one stale relative to a
 * cell added since) is left untouched here; keeping it fresh during normal
 * development is still those explicit scripts' job.
 */
export function ensureRegistryPlugin() {
  return {
    name: "directed:ensure-registry",
    async buildStart() {
      try {
        await access(OUT);
      } catch {
        const reg = await buildRegistry();
        await mkdir(resolve("src/generated"), { recursive: true });
        await writeFile(OUT, JSON.stringify(reg, null, 2) + "\n", "utf8");
      }
    },
  };
}
