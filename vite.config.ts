import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { readFileSync } from "node:fs";

// Rewrites `url` inside `*.asset.json` pointer files so that Lovable CDN
// paths (`/__l5e/assets-v1/...`) become absolute URLs. Needed because the
// app is deployed off-Lovable (Timeweb), where the `/__l5e/` path is not
// served. The CDN base defaults to the project's preview subdomain which
// serves the same immutable assets over public CORS.
function lovableAssetJsonRewrite(): Plugin {
  const CDN_BASE = (
    process.env.VITE_LOVABLE_ASSET_BASE ||
    "https://id-preview--684793f4-d120-461e-9357-79d82baeb567.lovable.app"
  ).replace(/\/$/, "");
  return {
    name: "lovable-asset-json-rewrite",
    enforce: "post",
    transform(code, id) {
      if (!id.endsWith(".asset.json")) return null;
      if (!code.includes("/__l5e/")) return null;
      return {
        code: code.replace(/"\/__l5e\//g, `"${CDN_BASE}/__l5e/`),
        map: null,
      };
    },
  };
}

// Plain Vite + React SPA. No SSR, no Cloudflare Worker.
// Build output: dist/index.html + dist/assets/*. Deploys as static frontend.
export default defineConfig({
  plugins: [
    lovableAssetJsonRewrite(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    host: true,
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 8080,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
