import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    // se quiser também permitir no dev:
    allowedHosts: ["cronosbrindes.com.br"],
  },
  preview: {
    host: true,
    // a porta aqui tanto faz, porque no servidor você está passando `--port $PORT`,
    // mas deixo uma default:
    port: 4173,
    allowedHosts: ["cronosbrindes.com.br"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
