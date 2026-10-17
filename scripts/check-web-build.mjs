import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'web/dist');
const games = JSON.parse(readFileSync(resolve(root, 'web/src/portal/data/games.json'), 'utf8')).games;
const unityGames = JSON.parse(readFileSync(resolve(root, 'web/src/portal/data/works.json'), 'utf8')).games;
const portalPaths = ['index.html', 'about/index.html', 'contact/index.html', 'privacy-policy/index.html', ...unityGames.map(game => `${game.path.slice(1)}index.html`)];
for (const path of [...portalPaths, ...games.map(game => `games/${game.id}/index.html`)]) {
  const html = readFileSync(resolve(dist, path), 'utf8');
  assert(html.includes('<html'), `Missing HTML ${path}`);
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)/g)) {
    assert(statSync(resolve(dist, asset.slice(1))).isFile(), `Missing ${asset} in ${path}`);
  }
}
for (const path of portalPaths) {
  const html = readFileSync(resolve(dist, path), 'utf8');
  const pathname = path === 'index.html' ? '/' : `/${path.replace(/index\.html$/, '')}`;
  const canonical = `https://game.kihamda.net${pathname}`;
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  assert(title && html.includes(`property="og:title" content="${title}"`), `Title/OG mismatch ${path}`);
  assert(html.includes(`rel="canonical" href="${canonical}"`) && html.includes(`property="og:url" content="${canonical}"`), `Canonical/OG URL mismatch ${path}`);
  assert((html.match(/<h1(?:\s|>)/g) ?? []).length === 1, `Expected one main heading ${path}`);
  assert(html.includes('href="#main"') && html.includes('id="main"') && html.includes('tabindex="-1"'), `Missing keyboard main entry ${path}`);
  assert(html.includes('id="main"') && html.includes('フッター'), `Missing shared navigation ${path}`);
  assert(!/__TITLE__|__DESCRIPTION__|__URL__|12,450|SearchAction|flashreflex/.test(html), `Stale metadata ${path}`);
  assert(/<script type="module" crossorigin src="\/assets\//.test(html), `Interactive bundle absent ${path}`);
  for (const [, href] of html.matchAll(/href="(\/[^"?#]*)/g)) {
    const target = href.endsWith('/') ? `${href}index.html` : href;
    assert(statSync(resolve(dist, target.slice(1))).isFile(), `Broken local link ${href} in ${path}`);
  }
}
const detail = readFileSync(resolve(dist, 'games/ice-courier/index.html'), 'utf8');
const webDetail = readFileSync(resolve(dist, 'works/ntiktaktoe/index.html'), 'utf8');
assert(webDetail.includes('公開前の確認中') && webDetail.includes('行・列を指定して選択') && !webDetail.includes('作品を開始') && !webDetail.includes('<iframe'));
const iceDetail = readFileSync(resolve(dist, 'works/iceslide/index.html'), 'utf8');
assert(iceDetail.includes('全20ステージ') && iceDetail.includes('途中の盤面と手数は保存しません') && !iceDetail.includes('作品を開始'));
const mineDetail = readFileSync(resolve(dist, 'works/minerush/index.html'), 'utf8');
assert(mineDetail.includes('9×9マス') && mineDetail.includes('途中の盤面と旗を保存しません') && !mineDetail.includes('作品を開始'));
const minePlay = readFileSync(resolve(dist, 'games/minerush/index.html'), 'utf8');
assert(!minePlay.includes('id="guide-title"'), 'MineRush introduction must not replace play route');
const gravityDetail = readFileSync(resolve(dist, 'works/gravityball/index.html'), 'utf8');
assert(gravityDetail.includes('全5ステージ') && gravityDetail.includes('途中のステージや得点は保存しません') && !gravityDetail.includes('作品を開始'));
const gravityPlay = readFileSync(resolve(dist, 'games/gravityball/index.html'), 'utf8');
assert(!gravityPlay.includes('id="guide-title"'), 'GravityBall introduction must not replace play route');
const icePlay = readFileSync(resolve(dist, 'games/iceslide/index.html'), 'utf8');
assert(!icePlay.includes('id="guide-title"'), 'Ice Slide introduction must not replace play route');
const legacyPlay = readFileSync(resolve(dist, 'games/ntiktaktoe/index.html'), 'utf8');
assert(!legacyPlay.includes('id="guide-title"'), 'Work introduction must not replace legacy play route');
const sitemap = readFileSync(resolve(dist, 'sitemap.xml'), 'utf8');
for (const path of ['/games/ntiktaktoe/', '/works/ntiktaktoe/']) assert(sitemap.includes(`<loc>https://game.kihamda.net${path}</loc>`));
assert.equal((sitemap.match(/<loc>https:\/\/game\.kihamda\.net\/games\/ntiktaktoe\/<\/loc>/g) ?? []).length, 1);
for (const work of unityGames) {
  if (work.inspectionPreview) {
    const preview = work.inspectionPreview;
    const bytes = readFileSync(resolve(dist, preview.url.slice(1)));
    assert(createHash('sha256').update(bytes).digest('hex') === preview.imageSha256, `Inspection preview checksum mismatch: ${work.id}`);
    const page = readFileSync(resolve(dist, `${work.path.slice(1)}index.html`), 'utf8');
    assert(work.release ? !page.includes(preview.url) : page.includes(preview.url) && page.includes('公開前検査版の実画面'), `Inspection preview publication mismatch: ${work.id}`);
  }
  for (const shot of work.guide?.screenshots ?? []) {
    const screenshot = readFileSync(resolve(dist, shot.url.slice(1)));
    assert(createHash('sha256').update(screenshot).digest('hex') === shot.imageSha256, `Screenshot checksum mismatch: ${work.id}`);
  }
}
assert(detail.includes('制作停止・保全中') && !detail.includes('作品を開始') && !detail.includes('<iframe'), 'Unreleased game must not expose a fake player');
const version = { commit: process.env.GITHUB_SHA ?? 'local-uncommitted', gameCount: unityGames.length, legacyRouteCount: games.length, source: 'web', generatedAt: new Date().toISOString() };
writeFileSync(resolve(dist, 'build-version.json'), JSON.stringify(version, null, 2) + '\n');
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
const sums = files(dist).filter(path => !path.endsWith('SHA256SUMS')).sort().map(path => {
  assert(!/WebGL\.(?:wasm|data|loader\.js|framework\.js)$|runner\.html$|__local-unity/.test(path), `Local Unity preview leaked into publication artifact: ${path}`);
  const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
  return `${sha}  ${relative(dist, path).replaceAll('\\', '/')}`;
});
writeFileSync(resolve(dist, 'SHA256SUMS'), sums.join('\n') + '\n');
console.log(`Web artifact passed: ${games.length} legacy routes, ${sums.length} checksummed files. Browser interaction not tested.`);
