import type { Plugin, ResolvedConfig } from "vite";
import { build } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync, rmSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";

const RANDOM_SCRIPT = `<script>var r=document.querySelector("[data-random-paths]");if(r){var p=JSON.parse(r.dataset.randomPaths);r.href=p[Math.floor(Math.random()*p.length)]}</script>`;

export default function portalSSG(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "portal-ssg",
    apply: "build",
    configResolved(c) {
      config = c;
    },
    async closeBundle() {
      const { root } = config;
      const outDir = resolve(root, "dist");
      const ssgDir = resolve(outDir, ".ssg");

      // Compile App.tsx for Node
      await build({
        configFile: false,
        root,
        build: {
          ssr: "src/portal/App.tsx",
          outDir: ssgDir,
          emptyOutDir: true,
        },
        logLevel: "silent",
      });

      // Render to static markup
      const appUrl = pathToFileURL(resolve(ssgDir, "App.js")).href;
      const { default: App } = await import(appUrl);
      const markup = renderToStaticMarkup(createElement(App));

      // Rewrite dist/index.html
      const htmlPath = resolve(outDir, "index.html");
      let html = readFileSync(htmlPath, "utf-8");

      html = html
        // Inject static content
        .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
        // Strip all Vite-injected JS (no hydration needed)
        .replace(/\s*<script type="module" crossorigin[^>]*><\/script>/g, "")
        .replace(/\s*<link rel="modulepreload"[^>]*>/g, "")
        // Add random-game inline script
        .replace("</body>", `${RANDOM_SCRIPT}\n</body>`);

      writeFileSync(htmlPath, html);
      rmSync(ssgDir, { recursive: true, force: true });

      config.logger.info("\x1b[32m✓ Portal SSG: static HTML injected\x1b[0m");
    },
  };
}
