import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = resolve(process.argv[2] ?? 'artifacts/web-release');
const tool = resolve('scripts/web-release-package.mjs');
const temporary = mkdtempSync(resolve(tmpdir(), 'kihamda-package-'));
function verify(path) {
  return spawnSync(process.execPath, [tool, 'verify', path], { encoding: 'utf8' });
}
try {
  assert.equal(verify(source).status, 0, 'Valid package rejected');
  const cases = [
    ['modified', root => writeFileSync(resolve(root, 'site/index.html'), 'modified'), 'Checksum mismatch'],
    ['missing', root => rmSync(resolve(root, 'site/index.html')), 'Missing, duplicate or extra'],
    ['extra', root => writeFileSync(resolve(root, 'site/private.txt'), 'must not publish'), 'Unexpected publication file'],
    ['version', root => {
      const path = resolve(root, 'manifest.json');
      const manifest = JSON.parse(readFileSync(path));
      manifest.sourceCommit = '0'.repeat(40);
      writeFileSync(path, JSON.stringify(manifest));
    }, 'Build source commit mismatch'],
    ['manifest', root => {
      const path = resolve(root, 'manifest.json');
      const manifest = JSON.parse(readFileSync(path));
      manifest.files[0].sha256 = '0'.repeat(64);
      writeFileSync(path, JSON.stringify(manifest));
    }, 'Manifest files differ'],
  ];
  for (const [name, change, message] of cases) {
    const root = resolve(temporary, name);
    cpSync(source, root, { recursive: true });
    change(root);
    const result = verify(root);
    assert.notEqual(result.status, 0, `Invalid package accepted: ${name}`);
    assert(result.stderr.includes(message), `Unexpected rejection: ${name}: ${result.stderr}`);
  }
  console.log('Web release package passed: valid restoration, modified/missing/extra/version/manifest rejection.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
