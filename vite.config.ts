import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
    VitePWA({
      // "prompt": a versão em cache continua funcionando offline e, quando há
      // internet, a nova versão é baixada em segundo plano e só é aplicada
      // quando o jogador aceitar (pode continuar na versão antiga se quiser).
      registerType: "prompt",
      injectRegister: "auto",
      // O Vite em dev não gera os arquivos finais, então não há o que precachear.
      // Offline deve ser testado com o build de produção: npm run build && npm run preview
      devOptions: {
        enabled: false,
      },
      workbox: {
        // Tudo que é gerado pelo Vite entra no precache: o app abre 100% offline.
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,mp3,webp,woff,woff2,ttf,eot,json,wav,webmanifest}",
        ],
        navigateFallback: "/index.html",
        // Nunca servir o index.html no lugar de requisições de rede do jogo.
        navigateFallbackDenylist: [/^\/socket\.io\//, /^\/health$/],
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        // Nada do app depende de recursos externos no boot.
        runtimeCaching: [],
      },

      manifest: {
        id: "/",
        name: "Buraco Resenha",
        short_name: "Buraco Resenha",
        description: "O melhor jogo de Buraco online e offline.",
        lang: "pt-BR",
        theme_color: "#0f2e1a",
        background_color: "#0f2e1a",
        display: "fullscreen",
        display_override: ["fullscreen", "standalone", "minimal-ui"],
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        categories: ["games", "entertainment"],
        icons: [
          {
            src: "icon192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
});
