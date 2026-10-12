import assert from 'node:assert/strict';
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
const home = render('/', '?q=Unity');
assert(home.includes('value="Unity"'));
assert(home.includes('href="/games/ice-courier/?q=Unity"'));
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
console.log('Portal navigation SSR passed: state links, released filter, direct detail, unknown filter, escaped query, no fake start.');
