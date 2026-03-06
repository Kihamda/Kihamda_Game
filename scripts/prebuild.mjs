import { readFileSync, writeFileSync } from "fs";

const SITE = "https://game.kihamda.net";

const data = JSON.parse(readFileSync("src/portal/data/games.json", "utf-8"));
const games = data.games;

// sitemap.xml
const latestDate = games.reduce(
  (max, g) => (g.publishedAt > max ? g.publishedAt : max),
  games[0]?.publishedAt ?? new Date().toISOString().slice(0, 10),
);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${latestDate}</lastmod>
    <priority>1.0</priority>
  </url>
${games
  .map(
    (g) => `  <url>
    <loc>${SITE}/games/${g.id}/</loc>
    <lastmod>${g.publishedAt}</lastmod>
    <priority>0.7</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

writeFileSync("public/sitemap.xml", sitemap);

// _redirects (SPA fallback per game)
const redirects = games
  .map((g) => `/games/${g.id}/*  /games/${g.id}/index.html  200`)
  .join("\n");

writeFileSync("public/_redirects", redirects);

console.log(`Generated sitemap.xml (${games.length + 1} URLs) + _redirects`);
