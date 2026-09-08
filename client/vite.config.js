import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Repo root env vars (VITE_API_BASE_URL lives in the shared root .env, next
// to the server's vars, not a client-local one) — point Vite's env loader
// there instead of its default of this package's own directory.
export default defineConfig({
  base: "/sen371-boardgame-store/",
  envDir: "..",
  plugins: [react(), tailwindcss()],
});
