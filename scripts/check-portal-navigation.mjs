import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from '../web/node_modules/esbuild/lib/main.js';

// Render the real portal with URL state, including hostile text, without a browser global.
const web = fileURLToPath(new URL('../web/', import.meta.url));
const result = await build({
  stdin: {
    contents: `import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import PortalApp from './src/portal/App';
      import { readCatalogState } from './src/portal/navigation';
      export { initialPortalReturnFocus, readPortalReturnFocus, rememberPortalReturnFocus, restorePortalReturnFocus } from './src/portal/history-focus';
      export function render(pathname, search) {
        return renderToStaticMarkup(React.createElement(PortalApp, { pathname, catalogState: readCatalogState(search) }));
      }`,
    resolveDir: web,
    loader: 'tsx',
  },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react-dom/server', 'react/jsx-runtime'], loader: { '.css': 'empty' },
});
const module = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(`${web}package.json`), module, module.exports);
const { render } = module.exports;
const mineRelease = JSON.parse(readFileSync(new URL('../web/src/portal/data/works.json', import.meta.url))).games.find(game => game.id === 'minerush').release;
const minePlayHref = `${mineRelease.url}?v=${mineRelease.sha256}`;
const home = render('/', '?q=Unity');
assert(home.includes('value="Unity"'));
assert(!home.includes('aria-label="Ice Courierの詳細"'), "Paused prototype is archived, not listed");
assert(render('/', '').includes('ゲームの棚'));
const detail = render('/games/ice-courier/', '?q=Unity&filter=released');
assert(detail.includes('href="/?q=Unity&amp;filter=released#works"'));
assert(!detail.includes('作品を開始') && !detail.includes('<iframe'));
const filtered = render('/', '?q=Unity&filter=released');
assert(filtered.includes('aria-pressed="true">公開中'));
assert(!filtered.includes('class="work-card"'));
assert(render('/', '?filter=unknown').includes('aria-pressed="true">すべて'));
assert(render('/games/ice-courier/', '').includes('href="/#works"'));
const hostile = '<img src=x onerror=alert(1)> & + " 配送';
const escaped = render('/', `?q=${encodeURIComponent(hostile)}`);
assert(!escaped.includes('<img src=x'));
assert(escaped.includes('&lt;img src=x onerror=alert(1)&gt;'));
assert(escaped.includes('条件に合う作品がありません'));
const webHome = render('/', '?q=Web');
assert(webHome.includes('href="/works/ntiktaktoe/?q=Web"'));
assert(!webHome.includes('href="/games/ntiktaktoe/"'), 'Unreleased catalog must not link to legacy play');
const webDetail = render('/works/ntiktaktoe/', '?q=Web');
assert(webDetail.includes('href="/?q=Web#works"') && webDetail.includes('公開前の確認中'));
assert(webDetail.includes('行・列を指定して選択') && webDetail.includes('設定と連勝履歴は残ります'));
assert(!webDetail.includes('作品を開始') && !webDetail.includes('<iframe'));
assert.equal((render('/', '?q=Web&filter=released').match(/class="work-card"/g) || []).length, 1);
console.log('Portal navigation SSR passed: state links, released filter, direct detail, unknown filter, escaped query, no fake start.');

const iceDetail = render('/works/iceslide/', '?q=アイス');
assert(iceDetail.includes('全20ステージ') && iceDetail.includes('途中の盤面と手数は保存しません'));
assert(iceDetail.includes('Command+Z') && iceDetail.includes('実端末での操作性は未確認'));
assert(!iceDetail.includes('作品を開始') && !iceDetail.includes('<iframe'));
assert(render('/', '?q=アイス').includes('href="/works/iceslide/?q='));
assert(!render('/', '?q=アイス&filter=released').includes('class="work-card"'));

const mineDetail = render('/works/minerush/', '?q=MineRush');
assert(mineDetail.includes('9×9マス') && mineDetail.includes('地雷は10個'));
assert(mineDetail.includes('途中の盤面と旗を保存しません') && mineDetail.includes('周囲8マス'));
assert(mineDetail.includes('F / 右クリック / 旗モード') && mineDetail.includes('実端末での操作性は未確認'));
assert(mineDetail.includes('作品を開始') && mineDetail.includes(`href="${minePlayHref}"`) && !mineDetail.includes('<iframe'));
assert(!mineDetail.includes('公開前検査版の実画面'));
assert(mineDetail.includes('href="/?q=MineRush#works"'));
assert(render('/', '?q=MineRush').includes('href="/works/minerush/?q=MineRush"'));
assert(render('/', '?q=MineRush&filter=released').includes('class="work-card"'));

const gravityDetail = render('/works/gravityball/', '?q=GravityBall');
assert(gravityDetail.includes('全5ステージ') && gravityDetail.includes('途中のステージや得点は保存しません'));
assert(gravityDetail.includes('ゲーム画面にフォーカス') && gravityDetail.includes('読み込みや保存に失敗'));
assert(!gravityDetail.includes('作品を開始') && !gravityDetail.includes('<iframe'));
assert(gravityDetail.includes('href="/?q=GravityBall#works"'));
assert(render('/', '?q=GravityBall').includes('href="/works/gravityball/?q=GravityBall"'));
assert(!render('/', '?q=GravityBall&filter=released').includes('class="work-card"'));

// Search the facts players can already read; never invent supported devices or release.
for (const [query, ids] of [
  ['1人用', ['iceslide', 'minerush', 'gravityball']],
  ['交代プレイ', ['ntiktaktoe']],
  ['全20ステージ', ['iceslide']],
  ['最高スコア', ['gravityball']],
  ['  wEb  ', ['ntiktaktoe', 'iceslide', 'minerush', 'gravityball']],
]) {
  const html = render('/', `?q=${encodeURIComponent(query)}`);
  assert.equal((html.match(/class="work-card"/g) || []).length, ids.length, query);
  for (const id of ids) assert(html.includes(`/${id}/?q=`), `${query}: ${id}`);
  assert(!html.includes('作品を開始'));
  assert.equal((render('/', `?q=${encodeURIComponent(query)}&filter=released`).match(/class="work-card"/g) || []).length, ids.includes('minerush') ? 1 : 0);
}
const factsDetail = render('/works/iceslide/', '?q=' + encodeURIComponent('全20ステージ'));
assert(factsDetail.includes('href="/?q=' + encodeURIComponent('全20ステージ') + '#works"'));
console.log('Catalog fact searches passed: solo, shared turn, stage count, high score, case/trim, released filter, return URL.');

// Conditions in separate visible fields must combine regardless of word order.
for (const [query, ids] of [
  ['Web 1人用', ['iceslide', 'minerush', 'gravityball']],
  ['1人用 Web', ['iceslide', 'minerush', 'gravityball']],
  ['  WEB　 1人用  ', ['iceslide', 'minerush', 'gravityball']],
  ['Web\t1人用\n全20ステージ', ['iceslide']],
  ['Unity 1人用', []],
  ['Web 交代プレイ', ['ntiktaktoe']],
  ['Web 見つからない単語', []],
  ['　 ', ['ntiktaktoe', 'iceslide', 'minerush', 'gravityball']],
]) {
  const search = '?q=' + encodeURIComponent(query);
  const html = render('/', search);
  assert.equal((html.match(/class="work-card"/g) || []).length, ids.length, query);
  for (const id of ids) assert(html.includes(`/${id}/?q=`), `${query}: ${id}`);
  assert(!html.includes('作品を開始'));
  assert.equal((render('/', search + '&filter=released').match(/class="work-card"/g) || []).length, ids.includes('minerush') ? 1 : 0);
}
assert(render('/', '').includes('aria-describedby="search-help"'));
assert(render('/', '').includes('すべての語を含む作品を探せます'));
const combinedDetail = render('/works/iceslide/', '?q=Web+1人用');
assert(combinedDetail.includes('href="/?q=Web+1%E4%BA%BA%E7%94%A8#works"'));
console.log('Combined search passed: AND, word order, full-width/repeated whitespace, case, negative terms, empty, filter and return URL.');

// Informational detours must retain the same catalog context as work details.
for (const pathname of ['/', '/about/', '/contact/', '/privacy-policy/', '/works/minerush/', '/games/ice-courier/']) {
  const html = render(pathname, '?q=Web+1人用&filter=released');
  for (const destination of ['/', '/about/', '/contact/', '/privacy-policy/']) {
    const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    const internal = links.filter(href => href.split(/[?#]/)[0] === destination);
    assert(internal.length > 0, `${pathname}: missing ${destination}`);
    assert(internal.every(href => href.includes('?q=Web+1%E4%BA%BA%E7%94%A8&amp;filter=released')),
      `${pathname}: ${destination} loses catalog context: ${internal.join(', ')}`);
  }
  assert(html.includes(`href="${minePlayHref}"`), 'Live game entry must retain its verified URL');
  assert(html.includes('href="mailto:contact@kihamda.net"') === (pathname === '/contact/'));
}
for (const [search, expected] of [
  ['', ''],
  ['?filter=released', '?filter=released'],
  ['?q=%3C%26%2B%22', '?q=%3C%26%2B%22'],
  ['?q=Web&filter=unknown', '?q=Web'],
  ['?q=%E3%81%82%E3%81%84%E3%81%86+%26+Web&filter=released', '?q=%E3%81%82%E3%81%84%E3%81%86+%26+Web&amp;filter=released'],
]) {
  const html = render('/privacy-policy/', search);
  assert(html.includes(`href="/contact/${expected}"`), search);
}
console.log('Informational navigation passed: every portal destination retains query/filter; verified live and mail URLs remain exact.');

// History entries can outlive a render or contain unrelated state. Restore the exact
// duplicate link, not an interpolated selector or the first link to the same work.
const { initialPortalReturnFocus, readPortalReturnFocus, rememberPortalReturnFocus, restorePortalReturnFocus } = module.exports;
for (const state of [null, undefined, 'old', 42, {}, { kihamdaPortalReturnFocus: null },
  { kihamdaPortalReturnFocus: { href: '', index: 0 } },
  { kihamdaPortalReturnFocus: { href: '/', index: -1 } },
  { kihamdaPortalReturnFocus: { href: '/', index: 0.5 } },
  { kihamdaPortalReturnFocus: { href: '/', index: Number.MAX_VALUE } },
  { kihamdaPortalReturnFocus: { href: '/', index: '0' } }]) {
  assert.equal(readPortalReturnFocus(state), null);
}
let links = [], replacements = 0;
const oldWindow = globalThis.window, oldDocument = globalThis.document;
try {
  const href = '/works/iceslide/?q=%22%5D%23&filter=released';
  const makeLink = (url, visible = true) => ({
    getAttribute(name) { assert.equal(name, 'href'); return url; },
    getClientRects() { return visible ? [{}] : []; },
    focus(options) { assert.deepEqual(options, { preventScroll: true }); document.activeElement = this; },
  });
  const first = makeLink(href), title = makeLink(href), guide = makeLink(href);
  const other = makeLink('/about/'), hidden = makeLink('/hidden/', false);
  links = [other, first, title, guide, hidden];
  globalThis.document = { querySelectorAll(selector) { assert.equal(selector, 'a[href]'); return links; }, activeElement: null };
  globalThis.window = { history: {
    state: { otherOwner: { retained: true } },
    replaceState(state, title, url) { assert.equal(title, ''); assert.equal(url, undefined); this.state = state; replacements++; },
  } };
  rememberPortalReturnFocus(guide);
  assert.equal(replacements, 1);
  assert.deepEqual(window.history.state.otherOwner, { retained: true });
  const saved = readPortalReturnFocus(window.history.state);
  assert.deepEqual(saved, { href, index: 2 });
  for (const navigation of [[], [{ type: 'navigate' }], [{ type: 'reload' }], [{}]]) {
    window.performance = { getEntriesByType(type) { assert.equal(type, 'navigation'); return navigation; } };
    assert.equal(initialPortalReturnFocus(), null);
  }
  window.performance = { getEntriesByType() { return [{ type: 'back_forward' }]; } };
  assert.deepEqual(initialPortalReturnFocus(), saved);
  assert.equal(restorePortalReturnFocus(saved), true);
  assert.equal(document.activeElement, guide);
  // Missing, hidden, stale, or unmounted links must not steal focus.
  for (const target of [{ href: '/missing/', index: 0 }, { href: '/hidden/', index: 0 }, { href, index: 3 }]) {
    assert.equal(restorePortalReturnFocus(target), false);
    assert.equal(document.activeElement, guide);
  }
  links = [];
  assert.equal(restorePortalReturnFocus(saved), false);
  rememberPortalReturnFocus(guide);
  assert.equal(replacements, 1);
} finally {
  if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
  if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
}
console.log('History focus boundaries passed: malformed state, duplicate link identity, escaped URL, unrelated state, missing/hidden/stale targets, no focus scroll.');

await import('./check-portal-history.mjs');
