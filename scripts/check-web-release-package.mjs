import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = resolve(process.argv[2] ?? 'artifacts/web-release');
const tool = resolve('scripts/web-release-package.mjs');
const temporary = mkdtempSync(resolve(tmpdir(), 'kihamda-package-'));
function verify(path) {
  return spawnSync(process.execPath, [tool, 'verify', path], { encoding: 'utf8' });
}
// Keep integrity metadata consistent so semantic failures reach the release gate.
function editSite(root, changes) {
  const manifestPath = resolve(root, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath));
  for (const [path, transform] of Object.entries(changes)) {
    const file = resolve(root, 'site', path);
    writeFileSync(file, transform(readFileSync(file, 'utf8')));
  }
  const sha = body => createHash('sha256').update(body).digest('hex');
  for (const entry of manifest.files.filter(item => item.path !== 'SHA256SUMS')) {
    const body = readFileSync(resolve(root, 'site', entry.path));
    entry.size = body.length;
    entry.sha256 = sha(body);
  }
  const sums = manifest.files.filter(item => item.path !== 'SHA256SUMS').map(item => `${item.sha256}  ${item.path}`).join('\n') + '\n';
  writeFileSync(resolve(root, 'site/SHA256SUMS'), sums);
  const sumEntry = manifest.files.find(item => item.path === 'SHA256SUMS');
  sumEntry.size = Buffer.byteLength(sums);
  sumEntry.sha256 = sha(sums);
  manifest.version = JSON.parse(readFileSync(resolve(root, 'site/build-version.json')));
  writeFileSync(manifestPath, JSON.stringify(manifest));
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
  const manifest = JSON.parse(readFileSync(resolve(source, 'manifest.json')));
  const release = manifest.version.releases?.[0];
  if (release) {
    const detail = `${release.path.slice(1)}index.html`;
    const start = /<a\b[^>]*>作品を開始<\/a>/;
    const editReleases = transform => root => editSite(root, {
      'build-version.json': text => {
        const version = JSON.parse(text);
        transform(version);
        return JSON.stringify(version);
      },
    });
    cases.push(
      ['wrong-start', root => editSite(root, { [detail]: html => html.replace(start, '<a href="/games/other/">作品を開始</a>') }), 'Start link destination mismatch'],
      ['external-start', root => editSite(root, { [detail]: html => html.replace(start, '<a href="https://example.com/">作品を開始</a>') }), 'Start link destination mismatch'],
      ['missing-start', root => editSite(root, { [detail]: html => html.replace(start, '') }), 'Start link registration mismatch'],
      ['duplicate-start', root => editSite(root, { [detail]: html => html.replace(start, value => value + value) }), 'Start link registration mismatch'],
      ['unregistered-start', root => editSite(root, { 'about/index.html': html => html.replace('</main>', '<a href="/games/minerush/">作品を開始</a></main>') }), 'Start link registration mismatch'],
      ['release-iframe', root => editSite(root, { [detail]: html => html.replace('</main>', '<iframe src="/games/minerush/"></iframe></main>') }), 'Unpublished player'],
      ['removed-registration', editReleases(version => { delete version.releases; }), 'Start link registration mismatch'],
      ['duplicate-registration', editReleases(version => { version.releases.push(version.releases[0]); }), 'Invalid packaged release registration'],
      ['unknown-registration', editReleases(version => { version.releases[0].path = '/works/unknown/'; }), 'Invalid packaged release registration'],
      ['external-registration', editReleases(version => { version.releases[0].url = 'https://example.com/'; }), 'Invalid packaged release registration'],
      ['invalid-release-digest', editReleases(version => { version.releases[0].sha256 = 'invalid'; }), 'Invalid packaged release registration'],
    );
    const legacy = resolve(temporary, 'legacy-without-releases');
    cpSync(source, legacy, { recursive: true });
    editSite(legacy, {
      [detail]: html => html.replace(start, ''),
      'build-version.json': text => {
        const version = JSON.parse(text);
        delete version.releases;
        return JSON.stringify(version);
      },
    });
    assert.equal(verify(legacy).status, 0, 'Historical package without releases rejected');
  }
  for (const [name, change, message] of cases) {
    const root = resolve(temporary, name);
    cpSync(source, root, { recursive: true });
    change(root);
    const result = verify(root);
    assert.notEqual(result.status, 0, `Invalid package accepted: ${name}`);
    assert(result.stderr.includes(message), `Unexpected rejection: ${name}: ${result.stderr}`);
  }
  console.log(`Web release package passed: valid restoration, ${cases.length} corruption/registration rejections, historical no-release compatibility.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
