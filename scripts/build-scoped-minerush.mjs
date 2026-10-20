import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../web/package.json', import.meta.url));
const { build } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react-swc')).href);
const output = resolve(process.argv[2] ?? 'artifacts/scoped-minerush');
assert(!existsSync(output), 'Use a new output directory; previous recovery packages must survive');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sourcePaths = ['web/scoped/minerush', 'web/src/standalone', 'web/games/minerush',
  'web/src/shared', 'web/src/games/metadata.ts', 'web/src/portal/data/games.json',
  'web/package.json', 'web/package-lock.json', 'scripts/build-scoped-minerush.mjs'];
assert.equal(execFileSync('git', ['status', '--porcelain', '--', ...sourcePaths],
  { cwd: root, encoding: 'utf8' }).trim(), '', 'Commit scoped build sources before binding a release to HEAD');
const site = resolve(output, 'site/games/minerush');
await build({ configFile: false, root: resolve(root, 'web/scoped/minerush'), publicDir: false,
  base: '/games/minerush/', plugins: [react()],
  resolve: { alias: { '@shared': resolve(root, 'web/src/shared') } },
  build: { outDir: site, emptyOutDir: false },
});
writeFileSync(resolve(site, 'build-version.json'), JSON.stringify({ commit, game: 'minerush', scope: '/games/minerush/' }) + '\n');
const files = [];
function walk(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = prefix + entry.name;
    assert(!entry.isSymbolicLink(), 'Symlink refused');
    if (entry.isDirectory()) walk(resolve(dir, entry.name), path + '/');
    else files.push({ path: 'games/minerush/' + path, sha256: createHash('sha256').update(readFileSync(resolve(dir, entry.name))).digest('hex') });
  }
}
walk(site);
files.sort((a, b) => a.path.localeCompare(b.path));
const html = readFileSync(resolve(site, 'index.html'), 'utf8');
assert(html.includes('src="/games/minerush/assets/') && !html.includes('serviceWorker'), 'Isolated entry required');
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify({ schema: 1, commit, scope: 'games/minerush/', publication: 'prepared-not-deployed', files }, null, 2) + '\n');
console.log(`Prepared ${files.length} files, confined to games/minerush/. No deployment.`);
