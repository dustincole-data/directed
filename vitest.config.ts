import { defineConfig } from "vitest/config";
import { ensureRegistryPlugin } from "./scripts/ensure-registry-vite-plugin.mjs";
export default defineConfig({
  plugins: [ensureRegistryPlugin()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs", "docs/**/*.test.ts"],
    // The machinery suites render cells through jsdom and spawn real node
    // processes. Warm, every test is well under a second; from a cold module
    // cache the first jsdom load alone took ~10s, which tripped vitest's 5s
    // default and failed a clean-checkout `npm test` on intact code.
    testTimeout: 30_000,
  },
});
