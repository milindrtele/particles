import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), glsl()],
  server: {
    allowedHosts: true,
    //allowedHosts: ["10ea-103-182-221-244.ngrok-free.app"],
  },
});
