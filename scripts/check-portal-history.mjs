import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from '../web/node_modules/esbuild/lib/main.js';

// Exercise the real router and history-focus integration. The rendered children
// are stubbed; browser layout, scrolling, and full-page navigation need real QA.
const web = fileURLToPath(new URL('../web/', import.meta.url));
const compiled = await build({
  entryPoints: [`${web}src/App.tsx`], bundle: true, write: false,
  platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], loader: { '.css': 'empty' },
  plugins: [{ name: 'router-children', setup(builder) {
    builder.onLoad({ filter: /portal[\\/]App\.tsx$/ }, () => ({ contents: 'export default function PortalApp() { return null; }', loader: 'js' }));
    builder.onLoad({ filter: /games[\\/]registry\.ts$/ }, () => ({ contents: 'export const gameComponents = {}; export const hasGameComponent = () => false;', loader: 'js' }));
  } }],
});
let slots = [], cursor = 0, pending = [];
const effects = new Map();
const react = {
  Suspense: () => null,
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useMemo(callback) { cursor++; return callback(); },
  useEffect(callback, dependencies) {
    const index = cursor++, previous = effects.get(index);
    if (previous && dependencies.every((value, i) => Object.is(value, previous.dependencies[i]))) return;
    pending.push(() => {
      previous?.cleanup?.();
      effects.set(index, { dependencies, cleanup: callback() });
    });
  },
};
const module = { exports: {} }, require = createRequire(`${web}package.json`);
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(name => {
  if (name === 'react') return react;
  if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  return require(name);
}, module, module.exports);

const original = Object.fromEntries(['window', 'document', 'Element', 'HTMLAnchorElement'].map(key => [key, globalThis[key]]));
const listeners = new Map(), windows = new Map();
let links = [], navigationType = 'navigate', pushes = 0, remembered;
class TestElement {}
class TestAnchor extends TestElement {
  constructor(href, attributes = {}) { super(); this.relativeHref = href; this.attributes = attributes; this.target = attributes.target ?? ''; }
  get href() { return new URL(this.relativeHref, window.location.origin).href; }
  getAttribute(name) { return name === 'href' ? this.relativeHref : this.attributes[name] ?? null; }
  hasAttribute(name) { return name in this.attributes; }
  closest() { return this; }
  getClientRects() { return [{}]; }
  focus(options) { assert.deepEqual(options, { preventScroll: true }); document.activeElement = this; }
}
function setURL(url) {
  const parsed = new URL(url, 'https://game.kihamda.net');
  window.location = { pathname: parsed.pathname, search: parsed.search, hash: parsed.hash, origin: parsed.origin };
}
function render() { cursor = 0; const tree = module.exports.default(); const queue = pending; pending = []; queue.forEach(callback => callback()); return tree; }
function unmount() { effects.forEach(effect => effect.cleanup?.()); effects.clear(); slots = []; pending = []; }
function click(anchor, extras = {}) {
  const event = { target: anchor, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extras };
  listeners.get('click')(event);
  return event;
}
try {
  globalThis.Element = TestElement; globalThis.HTMLAnchorElement = TestAnchor;
  globalThis.window = {
    performance: { getEntriesByType: () => [{ type: navigationType }] },
    history: { state: { unrelated: 'retained' },
      replaceState(state) { this.state = state; },
      pushState(state, title, url) { remembered = this.state; this.state = state; pushes++; setURL(url); },
    },
    addEventListener(name, listener) { windows.set(name, listener); },
    removeEventListener(name) { windows.delete(name); }, scrollTo() {},
  };
  const main = { focus() { document.activeElement = this; }, scrollIntoView() {} };
  globalThis.document = {
    body: { classList: { toggle() {}, remove() {} } },
    querySelector: () => null, querySelectorAll: () => links,
    getElementById: () => main,
    addEventListener(name, listener) { listeners.set(name, listener); }, removeEventListener(name) { listeners.delete(name); },
  };
  const home = '/?q=Web+1%E4%BA%BA%E7%94%A8&filter=released';
  const detailHref = '/works/minerush/?q=Web+1%E4%BA%BA%E7%94%A8&filter=released';
  const art = new TestAnchor(detailHref), title = new TestAnchor(detailHref);
  const play = new TestAnchor('/games/minerush/', { 'data-live-game': 'true' });
  links = [art, title, play]; setURL(home); render();
  assert.equal(click(title).defaultPrevented, true);
  assert.equal(pushes, 1); assert.equal(window.location.pathname, '/works/minerush/');
  assert.equal(remembered.unrelated, 'retained'); render();
  setURL(home); window.history.state = remembered; windows.get('popstate')(); render();
  assert.equal(document.activeElement, title, 'Back must restore the exact duplicate link');
  assert.equal(document.title, '小さな発見を楽しむゲーム | Kihamda.NET');
  const stateBeforeIgnoredClick = window.history.state;
  for (const [anchor, extras] of [[art, { ctrlKey: true }], [art, { button: 1 }],
    [new TestAnchor('https://example.org/'), {}], [new TestAnchor(detailHref, { target: '_blank' }), {}],
    [new TestAnchor(detailHref, { download: '' }), {}]]) {
    assert.equal(click(anchor, extras).defaultPrevented, false);
    assert.equal(window.history.state, stateBeforeIgnoredClick);
  }
  assert.equal(click(play).defaultPrevented, false, 'Verified game URL must remain a native navigation');
  assert.equal(pushes, 1, 'Starting a game must not add a router entry');
  assert.equal(window.history.state.kihamdaPortalReturnFocus.href, '/games/minerush/');
  unmount(); navigationType = 'back_forward'; render();
  assert.equal(document.activeElement, play, 'A new document after Back must restore the native start link');
  unmount(); navigationType = 'reload'; render();
  assert.equal(document.activeElement, main, 'Reload keeps normal initial focus');
  unmount(); assert.equal(listeners.size, 0); assert.equal(windows.size, 0);
  console.log('Actual portal router passed: duplicate link Back, native game Back, metadata, reload, modified/external/download/new-tab clicks and listener cleanup.');
} finally {
  unmount();
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  }
}
