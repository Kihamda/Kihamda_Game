import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

// Package only the checked Web build. Never copy the repository or local evidence.
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(path);
function inventory(root) {
  return readdirSync(root).sort().flatMap(name => {
    const path = resolve(root, name);
    const stat = lstatSync(path);
    assert(!stat.isSymbolicLink(), `Symbolic link refused: ${path}`);
    return stat.isDirectory() ? inventory(path) : [{ path, size: stat.size, sha256: sha(read(path)) }];
  });
}
function checkedSite(site, commit) {
  assert(/^[a-f0-9]{40}$/.test(commit), 'A full source commit is required');
  const files = inventory(site);
  const entries = files.map(file => ({ path: relative(site, file.path).replaceAll('\\', '/'), size: file.size, sha256: file.sha256 }));
  for (const file of entries) {
    assert(/^(?:assets\/[a-zA-Z0-9_.-]+|media\/inspection\/[a-z0-9-]+\.jpg|(?:icons|thumbnails|work-evidence)\/[a-zA-Z0-9_./-]+\.(?:svg|png|jpg|webp)|(?:(?:games|works)\/[a-zA-Z0-9-]+\/)?index\.html|(?:about|contact|privacy-policy)\/index\.html|robots\.txt|sitemap\.xml|_headers|_redirects|adsense-readiness\.html|manifest\.webmanifest|sw\.js|build-version\.json|SHA256SUMS)$/.test(file.path), `Unexpected publication file: ${file.path}`);
    assert(!/WebGL|__local-unity|runner\.html|\.map$/.test(file.path), `Local artifact refused: ${file.path}`);
  }
  const sums = read(resolve(site, 'SHA256SUMS')).toString('utf8').trim().split('\n').map(line => {
    const match = line.match(/^([a-f0-9]{64})  ([a-zA-Z0-9_./-]+)\r?$/);
    assert(match, 'Malformed checksum line');
    return { path: match[2], sha256: match[1] };
  });
  assert.deepEqual(sums.map(x => x.path).sort(), entries.filter(x => x.path !== 'SHA256SUMS').map(x => x.path).sort(), 'Missing, duplicate or extra checksummed files');
  for (const sum of sums) assert.equal(entries.find(x => x.path === sum.path).sha256, sum.sha256, `Checksum mismatch: ${sum.path}`);
  const version = JSON.parse(read(resolve(site, 'build-version.json')));
  assert.equal(version.commit, commit, 'Build source commit mismatch');
  assert.equal(version.source, 'web');
  const portalFiles = entries.filter(file => file.path.endsWith('index.html') && read(resolve(site, file.path)).toString('utf8').includes('id="main"')).map(file => file.path);
  assert.equal(portalFiles.length, version.gameCount + 4, 'Portal page count differs from checked catalog');
  const requiredPages = ['index.html', 'about/index.html', 'contact/index.html', 'privacy-policy/index.html', 'games/ice-courier/index.html'];
  for (const required of requiredPages) assert(portalFiles.includes(required), `Missing portal page: ${required}`);
  const pages = [...requiredPages, ...portalFiles.filter(path => !requiredPages.includes(path))].map(path => {
    const html = read(resolve(site, path)).toString('utf8');
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    const pathname = path === 'index.html' ? '/' : `/${path.replace(/index\.html$/, '')}`;
    const canonical = `https://game.kihamda.net${pathname}`;
    assert(title && html.includes(`property="og:title" content="${title}"`), `Title/OG mismatch: ${path}`);
    assert(html.includes(`rel="canonical" href="${canonical}"`) && html.includes(`property="og:url" content="${canonical}"`), `Canonical mismatch: ${path}`);
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `Heading mismatch: ${path}`);
    assert(html.includes('id="main"'), `Missing main: ${path}`);
    assert(!html.includes('作品を開始') && !html.includes('<iframe'), `Unpublished player: ${path}`);
    return { path, title, canonical };
  });
  return { files: entries, pages, version };
}

const [action, input, output, commit] = process.argv.slice(2);
assert(input && (action === 'create' || action === 'verify'), 'Usage: node scripts/web-release-package.mjs create DIST OUTPUT FULL_COMMIT | verify PACKAGE');
if (action === 'create') {
  assert(output && !existsSync(resolve(output)), 'Output must be a new directory');
  const checked = checkedSite(resolve(input), commit);
  mkdirSync(resolve(output), { recursive: true });
  cpSync(resolve(input), resolve(output, 'site'), { recursive: true });
  const manifest = { schema: 1, sourceCommit: commit, publication: 'prepared-not-deployed', ...checked };
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Prepared ${checked.files.length} files from ${commit}. No deployment.`);
} else {
  const root = resolve(input);
  assert.deepEqual(readdirSync(root).sort(), ['manifest.json', 'site'], 'Unexpected package content');
  assert(!lstatSync(resolve(root, 'manifest.json')).isSymbolicLink() && !lstatSync(resolve(root, 'site')).isSymbolicLink(), 'Package links refused');
  const manifest = JSON.parse(read(resolve(root, 'manifest.json')));
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.publication, 'prepared-not-deployed');
  const checked = checkedSite(resolve(root, 'site'), manifest.sourceCommit);
  assert.deepEqual(checked.files, manifest.files, 'Manifest files differ');
  assert.deepEqual(checked.pages, manifest.pages, 'Manifest pages differ');
  assert.deepEqual(checked.version, manifest.version, 'Manifest version differs');
  console.log(`Verified ${checked.files.length} files and ${checked.pages.length} portal pages from ${manifest.sourceCommit}. No deployment.`);
}
