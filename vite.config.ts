import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import portalSSG from "./plugins/portal-ssg";
import { resolve } from "path";
import { readdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const gamesDir = resolve(__dirname, "games");

const gameEntries = Object.fromEntries(
  readdirSync(gamesDir)
    .filter((name) => !name.startsWith("_"))
    .filter((name) => existsSync(resolve(gamesDir, name, "index.html")))
    .map((name) => [name, resolve(gamesDir, name, "index.html")]),
);

export default defineConfig({
  plugins: [react(), portalSSG()],
  root: resolve(__dirname),
  publicDir: resolve(__dirname, "public"),
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        portal: resolve(__dirname, "index.html"),
        ...gameEntries,
      },
    },
  },
});
