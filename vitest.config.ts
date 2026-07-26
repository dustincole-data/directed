import { defineConfig } from "vitest/config";
import { ensureRegistryPlugin } from "./scripts/ensure-registry-vite-plugin.mjs";
export default defineConfig({
  plugins: [ensureRegistryPlugin()],
  test: { environment: "node", include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"] },
});
