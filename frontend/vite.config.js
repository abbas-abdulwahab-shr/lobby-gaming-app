import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "https://lobby-gaming-app.onrender.com",
        changeOrigin: true,
      },
    },
  },
  plugins: [TanStackRouterVite(), react()],
  test: {
    globals: true,
    environment: "jsdom",
  },
});
