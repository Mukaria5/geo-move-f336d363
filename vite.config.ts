// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        strategies: "generateSW",
        filename: "sw.js",
        devOptions: { enabled: false },
        includeAssets: ["favicon.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png"],
        manifest: false,
        workbox: {
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/, /^\/__/],
          globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "html-cache", networkTimeoutSeconds: 3 },
            },
            {
              urlPattern: ({ url }) => url.origin === self.location.origin && /\.(?:js|css|woff2)$/.test(url.pathname),
              handler: "StaleWhileRevalidate",
              options: { cacheName: "asset-cache" },
            },
            {
              urlPattern: ({ url }) => /tile\.openstreetmap\.org/.test(url.hostname),
              handler: "CacheFirst",
              options: {
                cacheName: "osm-tiles",
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
