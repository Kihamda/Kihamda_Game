import { readFileSync, writeFileSync } from "fs";

const SITE = "https://game.kihamda.net";

const data = JSON.parse(readFileSync("src/portal/data/games.json", "utf-8"));
const games = data.games;
const unityGames = JSON.parse(readFileSync("src/portal/data/works.json", "utf-8")).games;
const staticPages = ["/about/", "/privacy-policy/", "/contact/"];

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
${staticPages
  .map(
    (path) => `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${latestDate}</lastmod>
    <priority>0.6</priority>
  </url>`,
  )
  .join("\n")}
${[...games, ...unityGames]
  .map(
    (g) => `  <url>
    <loc>${SITE}${g.path}</loc>
${g.publishedAt ? `    <lastmod>${g.publishedAt}</lastmod>\n` : ""}    <priority>0.7</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

writeFileSync("public/sitemap.xml", sitemap);

// _redirects (SPA fallback per game)
const redirects = [...games, ...unityGames]
  .flatMap((g) => [
    `${g.path.replace(/\/$/, "")}  ${g.path}  301`,
    `${g.path}index.html  ${g.path}  301`,
  ])
  .join("\n");

writeFileSync("public/_redirects", redirects);

console.log(
  `Generated sitemap.xml (${games.length + unityGames.length + staticPages.length + 1} URLs) + canonical redirects`,
);
