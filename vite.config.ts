import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["app-background.png", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Мої задачі",
        short_name: "11 хвилин",
        start_url: "/",
        scope: "/",
        display: "standalone",
        lang: "uk",
        background_color: "#050607",
        theme_color: "#42FFF4",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{css,html,ico,js,png,svg,webmanifest,woff,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === "https://api.hatosfera-crm.pp.ua",
            handler: "NetworkOnly",
            options: {
              cacheName: "day-planner-api-network-only",
            },
          },
        ],
      },
    }),
  ],
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "https://api.hatosfera-crm.pp.ua",
        changeOrigin: true,
      },
    },
  },
});
