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
