import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from '../web/node_modules/esbuild/lib/main.js';

const web = fileURLToPath(new URL('../web/', import.meta.url));
const proof = { version: 'test-v1', artifactSha256: 'a'.repeat(64), verification: 'in-memory-test-only' };
const guide = {
  controls: [{ input: 'Space', action: 'テスト固有のジャンプ' }],
  saving: { status: 'verified', description: 'テスト固有の保存条件', evidence: proof },
  environments: [{ ...proof, name: 'Test browser', input: 'Keyboard' }],
  screenshots: [{ ...proof, url: '/media/test-only.png', alt: '検査データの実画面', imageSha256: 'b'.repeat(64) }],
};
for (const technology of ['web', 'unity']) for (const released of [false, true]) for (const withGuide of [false, true]) {
  const work = { id: 'test-only', title: 'インメモリ検査作品', path: technology === 'web' ? '/works/test-only/' : '/games/test-only/', description: '登録しない検査データ',
    tags: [], facts: [], technology, origin: technology === 'web' ? 'studio-web' : 'owner-finished', status: 'verification',
    release: released ? { url: '/play/test-only/', version: proof.version, platform: 'Test', sha256: proof.artifactSha256,
      verification: 'test-only', distributionPermission: 'test-only', recovery: 'test-only' } : null,
    ...(withGuide ? { guide } : {}),
  };
  const result = await build({
    stdin: { contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server';
      import PortalApp from './src/portal/App'; import { parseCatalog } from './src/portal/catalog';
      export { parseCatalog }; export function render(pathname) { return renderToStaticMarkup(React.createElement(PortalApp, {pathname})); }`,
      resolveDir: web, loader: 'tsx' },
    plugins: [{ name: 'in-memory-catalog', setup(builder) {
      builder.onLoad({ filter: /works\.json$/ }, () => ({ contents: JSON.stringify({ games: [work] }), loader: 'json' }));
    } }],
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    external: ['react', 'react-dom/server', 'react/jsx-runtime'], loader: { '.css': 'empty' },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(`${web}package.json`), module, module.exports);
  const { render, parseCatalog } = module.exports;
  const detail = render(work.path), home = render('/');
  assert.equal(detail.includes('作品を開始'), released);
  assert(!home.includes('<iframe') && !detail.includes('<iframe') && !home.includes('<audio'));
  assert(!detail.includes('C</dt>') && !detail.includes('UNDO'));
  if (withGuide) {
    assert(detail.includes('テスト固有のジャンプ') && detail.includes('Test browser'));
    assert(detail.includes('src="/media/test-only.png"') && detail.includes('実画面 · test-v1'));
    const missing = structuredClone(work); delete missing.guide.screenshots[0].imageSha256;
    assert.throws(() => parseCatalog({ games: [missing] }));
    const unsafe = structuredClone(work); unsafe.guide.screenshots[0].url = '//example.com/test.png';
    assert.throws(() => parseCatalog({ games: [unsafe] }));
    const unproven = structuredClone(work); delete unproven.guide.saving.evidence;
    assert.throws(() => parseCatalog({ games: [unproven] }));
    if (released) {
      const wrong = structuredClone(work); wrong.guide.environments[0].version = 'other-version';
      assert.throws(() => parseCatalog({ games: [wrong] }));
    }
  } else {
    assert(detail.includes('操作方法は確認中') && detail.includes('保存・再開の対応は未確認'));
    assert(!detail.includes('<img'));
  }
}
console.log('Work guides passed: 8 in-memory Web/owner-Unity released/unreleased/present/absent SSR cases; mismatched and incomplete evidence rejected.');
