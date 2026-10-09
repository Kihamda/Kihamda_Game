import type { Plugin, ResolvedConfig } from "vite";
import { build } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import { portalPaths, portalPages } from "../src/portal/routes";

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

      // Rewrite dist/index.html
      const htmlPath = resolve(outDir, "index.html");
      const template = readFileSync(htmlPath, "utf-8");
      for (const pathname of portalPaths as string[]) {
        const markup = renderToStaticMarkup(createElement(App, { pathname }));
        const title = `${portalPages[pathname].title} | Kihamda.NET`;
        const html = template
          .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
          .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
          .replace(/content="__TITLE__"/g, `content="${title}"`)
          .replace(/content="__DESCRIPTION__"/g, `content="${portalPages[pathname].description}"`)
          .replaceAll("__URL__", `https://game.kihamda.net${pathname}`);
        const directory = resolve(outDir, pathname.slice(1));
        mkdirSync(directory, { recursive: true });
        writeFileSync(resolve(directory, "index.html"), html);
      }
      rmSync(ssgDir, { recursive: true, force: true });

      config.logger.info(`✓ Portal SSG: ${portalPaths.length} shared pages generated`);
    },
  };
}
