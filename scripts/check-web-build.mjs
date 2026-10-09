import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'web/dist');
const games = JSON.parse(readFileSync(resolve(root, 'web/src/portal/data/games.json'), 'utf8')).games;
for (const path of ['index.html', ...games.map(game => `games/${game.id}/index.html`)]) {
  const html = readFileSync(resolve(dist, path), 'utf8');
  assert(html.includes('<html'), `Missing HTML ${path}`);
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)/g)) {
    assert(statSync(resolve(dist, asset.slice(1))).isFile(), `Missing ${asset} in ${path}`);
  }
}
const version = { commit: process.env.GITHUB_SHA ?? 'local-uncommitted', gameCount: games.length, source: 'web', generatedAt: new Date().toISOString() };
writeFileSync(resolve(dist, 'build-version.json'), JSON.stringify(version, null, 2) + '\n');
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
const sums = files(dist).filter(path => !path.endsWith('SHA256SUMS')).sort().map(path => {
  const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
  return `${sha}  ${relative(dist, path).replaceAll('\\', '/')}`;
});
writeFileSync(resolve(dist, 'SHA256SUMS'), sums.join('\n') + '\n');
console.log(`Web artifact passed: ${games.length} legacy routes, ${sums.length} checksummed files. Browser interaction not tested.`);
