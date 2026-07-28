import { describe, expect, it } from "vitest";
import pkg from "../package.json";

describe("scaffold", () => {
  it("pins node 22 and astro 5", () => {
    expect(pkg.engines.node).toBe(">=22");
    expect(pkg.devDependencies.astro).toMatch(/^\^5\./);
  });

  it("declares the cell pipeline scripts", () => {
    for (const s of ["render:cell", "build:registry", "verify:cells", "typecheck", "test", "build"] as const) {
      expect(pkg.scripts[s], `missing script: ${s}`).toBeTruthy();
    }
  });

  it("runs the integrity gate and the typecheck as part of the build", () => {
    // Astro and Vite never typecheck, and nothing else runs verify:cells, so
    // the build script is the only enforcement point this repo has until it
    // gets a git remote and a CI workflow.
    expect(pkg.scripts.build).toContain("verify:cells");
    expect(pkg.scripts.build).toContain("typecheck");
  });

  // src/generated/ is gitignored, so a fresh clone has no registry.json until
  // build:registry writes it. Vite has ensureRegistryPlugin for dev and test,
  // but tsc has no such hook: with typecheck first, every clean checkout — the
  // deploy build included — failed on "Cannot find module registry.json".
  it("generates the registry before anything that imports it", () => {
    const build = pkg.scripts.build;
    expect(build.indexOf("build:registry")).toBeLessThan(build.indexOf("typecheck"));
    expect(build.indexOf("build:registry")).toBeLessThan(build.indexOf("astro build"));
  });
});
