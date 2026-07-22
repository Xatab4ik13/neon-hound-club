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
  const CDN_BASE =
    process.env.VITE_LOVABLE_ASSET_BASE ||
    "https://id-preview--684793f4-d120-461e-9357-79d82baeb567.lovable.app";
  return {
    name: "lovable-asset-json-rewrite",
    enforce: "pre",
    transform(_code, id) {
      if (!id.endsWith(".asset.json")) return null;
      const raw = readFileSync(id.split("?")[0], "utf-8");
      const data = JSON.parse(raw);
      if (typeof data.url === "string" && data.url.startsWith("/__l5e/")) {
        data.url = CDN_BASE.replace(/\/$/, "") + data.url;
      }
      return {
        code: `export default ${JSON.stringify(data)};`,
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
