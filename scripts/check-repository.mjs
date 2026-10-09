import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const games = JSON.parse(read('web/src/portal/data/games.json')).games;
const previous = JSON.parse(read('docs/legacy-recovery/games-current-before.json')).games;
const previousSources = JSON.parse(read('docs/legacy-recovery/game-source-paths-before.json'));
assert.deepEqual(games, previous, 'Migration changed legacy game IDs, URLs or metadata');
assert.equal(new Set(games.map(g => g.id)).size, games.length, 'Duplicate IDs');
for (const game of games) {
  const source = `games/${game.id}/src/App.tsx`;
  assert.equal(existsSync(resolve(root, `web/${source}`)), previousSources.includes(source), `Source availability changed: ${game.id}`);
  assert.equal(game.path, `/games/${game.id}/`);
}
const guids = new Map();
function assets(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.name.endsWith('.meta')) {
      assert(existsSync(path.slice(0, -5)), `Orphan meta ${path}`);
      const guid = readFileSync(path, 'utf8').match(/^guid: ([a-f0-9]{32})$/m)?.[1];
      assert(guid, `Invalid GUID ${path}`);
      assert(!guids.has(guid), `Duplicate GUID ${path} / ${guids.get(guid)}`);
      guids.set(guid, path);
      continue;
    }
    assert(existsSync(`${path}.meta`), `Missing meta ${relative(root, path)}`);
    if (entry.isDirectory()) assets(path);
  }
}
for (const entry of readdirSync(resolve(root, 'unity'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const project = `unity/${entry.name}`;
  assert(read(`${project}/ProjectSettings/ProjectVersion.txt`).includes('6000.3.23f1'));
  const packages = JSON.parse(read(`${project}/Packages/manifest.json`)).dependencies;
  for (const [name, version] of Object.entries(packages)) {
    assert(/^\d+\.\d+\.\d+$/.test(version), `Unpinned ${name}`);
  }
  assets(resolve(root, project, 'Assets'));
}
for (const required of ['天啓.md', 'STATE.md', 'AGENTS.md', 'business/ops/ledger.json']) {
  assert(existsSync(resolve(root, required)), `Missing ${required}`);
}
const missing = games.filter(game => !previousSources.includes(`games/${game.id}/src/App.tsx`)).map(game => game.id);
console.log(`Repository contract passed: ${games.length} preserved catalog entries, ${guids.size} unique Unity GUIDs. Pre-existing missing sources: ${missing.join(', ')}.`);
