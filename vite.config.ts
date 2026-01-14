import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,mp3}"],
      },
      manifest: {
        name: "Baralho Resenha",
        short_name: "Baralho",
        description: "Baralho da resenha.",
        theme_color: "#0f2e1a",
        background_color: "#0f2e1a",
        display: "fullscreen",
        orientation: "portrait",
        icons: [
          {
            src: "icon192.png",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "icon512.png",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
});
