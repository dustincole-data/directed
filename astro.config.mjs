import { defineConfig } from "astro/config";
import { ensureRegistryPlugin } from "./scripts/ensure-registry-vite-plugin.mjs";
export default defineConfig({
  site: "https://directed.dustincoledata.com",
  vite: { plugins: [ensureRegistryPlugin()] },
});
