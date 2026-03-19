import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { fileURLToPath } from "url";
import portalSSG from "./plugins/portal-ssg";
import gamePagesGenerator from "./plugins/game-pages-generator";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react(), portalSSG(), gamePagesGenerator()],
  root: resolve(__dirname),
  publicDir: resolve(__dirname, "public"),
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
