import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/fm1": { target: "http://localhost:9030", changeOrigin: true },
    },
  },
});
