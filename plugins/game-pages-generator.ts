import type { Plugin, ResolvedConfig } from "vite";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

interface Game {
  id: string;
  title: string;
  description: string;
  path: string;
  thumbnail: string;
  tags: string[];
  publishedAt: string;
  featured: boolean;
}

interface GamesData {
  games: Game[];
}

const BASE_URL = "https://game.kihamda.net";

function generateGameHTML(game: Game, scriptSrc: string): string {
  const gameUrl = `${BASE_URL}/games/${game.id}/`;
  const ogImage = `${BASE_URL}/thumbnails/${game.id}.svg`;

  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${game.title} | game.kihamda.net</title>
    <meta name="description" content="${game.description}" />
    <meta property="og:title" content="${game.title} | game.kihamda.net" />
    <meta property="og:description" content="${game.description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${gameUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="game.kihamda.net" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${game.title} | game.kihamda.net" />
    <meta name="twitter:description" content="${game.description}" />
    <meta name="twitter:image" content="${ogImage}" />
    <link rel="canonical" href="${gameUrl}" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "name": "${game.title}",
        "description": "${game.description}",
        "url": "${gameUrl}",
        "image": "${ogImage}",
        "datePublished": "${game.publishedAt}",
        "genre": ${JSON.stringify(game.tags)},
        "gamePlatform": "Web Browser",
        "applicationCategory": "Game",
        "operatingSystem": "Any",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "JPY"
        },
        "publisher": {
          "@type": "Organization",
          "name": "game.kihamda.net"
        }
      }
    </script>
    <link rel="manifest" href="/manifest.webmanifest" />
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-L7TY3RFZB7"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() { dataLayer.push(arguments); }
      gtag("js", new Date());
      gtag("config", "G-L7TY3RFZB7");
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${scriptSrc}"></script>
    <script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("/sw.js").catch(() => {});
        });
      }
    </script>
  </body>
</html>
`;
}

export default function gamePagesGenerator(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "game-pages-generator",
    apply: "build",
    configResolved(c) {
      config = c;
    },
    closeBundle() {
      const { root } = config;
      const outDir = resolve(root, "dist");

      // Read games.json
      const gamesJsonPath = resolve(root, "src/portal/data/games.json");
      const gamesData: GamesData = JSON.parse(
        readFileSync(gamesJsonPath, "utf-8")
      );

      // Find the main JS bundle from dist/index.html
      const mainHtmlPath = resolve(outDir, "index.html");
      const mainHtml = readFileSync(mainHtmlPath, "utf-8");
      const scriptMatch = mainHtml.match(
        /<script type="module" crossorigin src="(\/assets\/index-[^"]+\.js)"/
      );

      if (!scriptMatch) {
        config.logger.warn(
          "\x1b[33m⚠ Game Pages Generator: Could not find main JS bundle\x1b[0m"
        );
        return;
      }

      const scriptSrc = scriptMatch[1];
      let generatedCount = 0;

      // Generate index.html for each game
      for (const game of gamesData.games) {
        const gameDir = resolve(outDir, "games", game.id);

        // Create directory if not exists
        if (!existsSync(gameDir)) {
          mkdirSync(gameDir, { recursive: true });
        }

        const gameHtmlPath = resolve(gameDir, "index.html");
        const html = generateGameHTML(game, scriptSrc);
        writeFileSync(gameHtmlPath, html);
        generatedCount++;
      }

      config.logger.info(
        `\x1b[32m✓ Game Pages Generator: ${generatedCount} game pages created\x1b[0m`
      );
    },
  };
}
