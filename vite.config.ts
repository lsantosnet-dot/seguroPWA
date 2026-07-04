import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

// BASE_PATH permite publicar em subcaminho (GitHub Pages: /nome-do-repo/).
// Na Vercel deixe vazio (raiz "/").
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Apólice — Gestão de Seguros",
        short_name: "Apólice",
        description:
          "Gestão de seguros para corretores: clientes, apólices, cotações, parcelas, agenda, sinistros e backup. 100% offline.",
        lang: "pt-BR",
        display: "standalone",
        orientation: "any",
        start_url: ".",
        scope: ".",
        theme_color: "#0a0e0d",
        background_color: "#0a0e0d",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,wasm,woff2}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
});
