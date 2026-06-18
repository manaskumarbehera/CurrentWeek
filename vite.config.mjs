import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

// CRXJS reads manifest.json, bundles the popup, options page, and the
// (module) service worker, and emits a ready-to-load extension into dist/.
// build.sh zips dist/ into the per-store packages used by the release workflow.
export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Keep readable output; this is a tiny extension, not a perf-sensitive app.
    minify: false,
  },
});
