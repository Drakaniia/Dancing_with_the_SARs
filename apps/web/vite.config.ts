import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { type HtmlTagDescriptor, loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";

// 1x1 transparent PNG (68 bytes) served when MapLibre requests an empty/ocean tile inside the AOI
const EMPTY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

function transparentTileFallback(): Plugin {
  return {
    name: "nisar-transparent-tile-fallback",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (url.startsWith("/tiles/") && url.endsWith(".png")) {
          const diskPath = path.join(__dirname, "public", url);
          if (!fs.existsSync(diskPath)) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "public, max-age=3600");
            res.end(EMPTY_PNG);
            return;
          }
        }
        next();
      });
    },
  };
}

interface BasemapStyle {
  glyphs?: string;
  sources: Record<string, { tiles?: string[] }>;
  layers: { source?: string; layout?: { visibility?: string } }[];
}

/** Hosts the basemap style loads from at startup: visible layers, the 3D terrain DEM, glyphs. */
function basemapOrigins(): string[] {
  const file = path.join(__dirname, "public/styles/basemap.json");
  const style = JSON.parse(fs.readFileSync(file, "utf8")) as BasemapStyle;
  const used = new Set(["terrain-dem"]); // 3D terrain is on by default
  for (const layer of style.layers) {
    if (layer.source && layer.layout?.visibility !== "none") {
      used.add(layer.source);
    }
  }
  const urls = [...used].flatMap((id) => style.sources[id]?.tiles ?? []);
  if (style.glyphs) urls.push(style.glyphs);
  return urls.flatMap((url) => {
    try {
      return [new URL(url).origin];
    } catch {
      return [];
    }
  });
}

/**
 * The map only asks for its style and tiles once the app script has run. Open the connections to
 * the tile hosts (TLS included) and fetch the basemap style while that script downloads.
 */
function resourceHints(tileBaseUrl: string | undefined): Plugin {
  let base = "/";
  return {
    name: "nisar-resource-hints",
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml() {
      const origins = new Set(basemapOrigins());
      if (tileBaseUrl?.trim()) {
        try {
          origins.add(new URL(tileBaseUrl).origin);
        } catch {
          // Not a URL: tiles come from public/tiles/ on the same origin.
        }
      }
      // MapLibre fetches everything in CORS mode, so the hints must be crossorigin to be reused.
      const tags: HtmlTagDescriptor[] = [...origins].map((href) => ({
        tag: "link",
        attrs: { rel: "preconnect", href, crossorigin: "anonymous" },
        injectTo: "head-prepend",
      }));
      tags.push({
        tag: "link",
        attrs: {
          rel: "preload",
          href: `${base}styles/basemap.json`,
          as: "fetch",
          crossorigin: "anonymous",
        },
        injectTo: "head-prepend",
      });
      return tags;
    },
  };
}

/**
 * Vendor code in its own chunks: it downloads in parallel with the app code and stays cached
 * across releases, since an app change no longer renames the 1 MB MapLibre file.
 */
function vendorChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  if (/[\\/]maplibre-gl[\\/]/.test(id)) return "maplibre";
  if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
  if (/[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) {
    return "motion";
  }
  return undefined;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "VITE_");
  return {
    plugins: [
      react(),
      transparentTileFallback(),
      resourceHints(env.VITE_TILE_BASE_URL),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    worker: {
      format: "es",
    },
    build: {
      // MapLibre alone is ~1.1 MB minified; it is split out and cached on its own.
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: vendorChunk,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
    },
  };
});
