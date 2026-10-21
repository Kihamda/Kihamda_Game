import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run the actual coordinator in isolated Git repositories. Child tools are fixtures
// so failures and concurrent source changes can be exercised without rebuilding.
const source = fileURLToPath(new URL('./prepare-web-release.mjs', import.meta.url));
const temporary = mkdtempSync(resolve(tmpdir(), 'kihamda-prepare-'));
let passed = 0;
function fixture(name) {
  const root = resolve(temporary, name);
  mkdirSync(resolve(root, 'scripts'), { recursive: true });
  mkdirSync(resolve(root, 'web'), { recursive: true });
  mkdirSync(resolve(root, 'artifacts'));
  cpSync(source, resolve(root, 'scripts/prepare-web-release.mjs'));
  writeFileSync(resolve(root, '.gitignore'), 'artifacts/\n.fixture-calls\n');
  writeFileSync(resolve(root, 'package.json'), '{}\n');
  writeFileSync(resolve(root, 'web/source.txt'), 'original\n');
  const common = `import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const record = stage => { appendFileSync('.fixture-calls', stage + ':' + process.env.GITHUB_SHA + '\\n');
if (process.env.FIXTURE_FAIL === stage) process.exit(7); };
`;
  writeFileSync(resolve(root, 'scripts/npm-fixture.mjs'), common + `
const stage = process.argv[3]; record(stage);
if (stage === 'build' && process.env.FIXTURE_MUTATE === 'source') writeFileSync('web/source.txt', 'changed');
if (stage === 'build' && process.env.FIXTURE_MUTATE === 'head') execFileSync('git', ['commit', '--allow-empty', '-m', 'concurrent'], { stdio: 'pipe' });
if (stage === 'build' && process.env.FIXTURE_MUTATE === 'parent') {
  const { symlinkSync } = await import('node:fs');
  symlinkSync(process.env.FIXTURE_OUTSIDE, 'artifacts/late-link', process.platform === 'win32' ? 'junction' : 'dir');
}
`);
  writeFileSync(resolve(root, 'scripts/check-web-build.mjs'), common + `record('checksums');`);
  writeFileSync(resolve(root, 'scripts/web-release-package.mjs'), common + `
const action = process.argv[2]; record(action);
if (action === 'create') { mkdirSync(process.argv[4], { recursive: true }); writeFileSync(process.argv[4] + '/fixture', process.argv[5]); }
if (action === 'verify' && process.env.FIXTURE_MUTATE === 'verify-source') writeFileSync('web/source.txt', 'changed after packaging');
if (action === 'verify' && process.env.FIXTURE_MUTATE === 'verify-head') execFileSync('git', ['commit', '--allow-empty', '-m', 'concurrent verification'], { stdio: 'pipe' });
if (action === 'verify' && process.env.FIXTURE_MUTATE === 'existing-output') {
  mkdirSync('artifacts/release'); writeFileSync('artifacts/release/keep', 'concurrent output');
}
if (action === 'verify' && process.env.FIXTURE_MUTATE === 'verify-parent') {
  const { symlinkSync } = await import('node:fs');
  symlinkSync(process.env.FIXTURE_OUTSIDE, 'artifacts/late-link', process.platform === 'win32' ? 'junction' : 'dir');
}
`);
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init', '--quiet']);
  git(['config', 'user.name', 'Release fixture']);
  git(['config', 'user.email', 'fixture@example.invalid']);
  git(['add', '.']);
  git(['commit', '--quiet', '-m', 'fixture']);
  return { root, commit: git(['rev-parse', 'HEAD']) };
}
function run(f, argument = 'artifacts/release', extra = {}) {
  const result = spawnSync(process.execPath, ['scripts/prepare-web-release.mjs', ...(argument === null ? [] : [argument])], {
    cwd: f.root, encoding: 'utf8', env: { ...process.env, npm_execpath: resolve(f.root, 'scripts/npm-fixture.mjs'), GITHUB_SHA: 'stale-parent-value', ...extra },
  });
  const calls = existsSync(resolve(f.root, '.fixture-calls')) ? readFileSync(resolve(f.root, '.fixture-calls'), 'utf8').trim().split('\n') : [];
  return { ...result, calls, text: result.stdout + result.stderr };
}
function rejected(result, message, stages = []) {
  assert.notEqual(result.status, 0, 'Unexpected preparation success');
  assert(result.text.includes(message), result.text);
  assert.deepEqual(result.calls.map(line => line.split(':')[0]), stages);
  passed++;
}
try {
  const valid = fixture('valid');
  const success = run(valid, 'artifacts/nested/release');
  assert.equal(success.status, 0, success.text);
  assert.deepEqual(success.calls, ['check', 'build', 'checksums', 'create', 'verify'].map(stage => `${stage}:${valid.commit}`));
  assert.equal(readFileSync(resolve(valid.root, 'artifacts/nested/release/fixture'), 'utf8'), valid.commit);
  passed++;
  rejected(run(fixture('missing'), null), 'Usage:');
  rejected(run(fixture('outside'), '../outside'), 'Output must be inside artifacts/');
  rejected(run(fixture('sibling'), 'artifacts-sibling/release'), 'Output must be inside artifacts/');
  rejected(run(fixture('root'), 'artifacts'), 'Output must be inside artifacts/');
  rejected(run(fixture('npm-missing'), undefined, { npm_execpath: '' }), 'Run through npm run release:prepare');
  const existing = fixture('existing');
  mkdirSync(resolve(existing.root, 'artifacts/release'));
  writeFileSync(resolve(existing.root, 'artifacts/release/keep'), 'retained');
  rejected(run(existing), 'Use a new output directory');
  assert.equal(readFileSync(resolve(existing.root, 'artifacts/release/keep'), 'utf8'), 'retained');
  const dirty = fixture('dirty');
  writeFileSync(resolve(dirty.root, 'web/source.txt'), 'uncommitted');
  rejected(run(dirty), 'Commit Web, script and package sources');
  const untracked = fixture('untracked');
  writeFileSync(resolve(untracked.root, 'web/new.txt'), 'untracked');
  rejected(run(untracked), 'Commit Web, script and package sources');
  const stages = ['check', 'build', 'checksums', 'create', 'verify'];
  for (const stage of stages) {
    const failed = fixture(`fail-${stage}`);
    rejected(run(failed, undefined, { FIXTURE_FAIL: stage }), 'Command failed', stages.slice(0, stages.indexOf(stage) + 1));
    assert(!existsSync(resolve(failed.root, 'artifacts/release')), 'Failed run exposed a final package');
    assert(!readdirSync(resolve(failed.root, 'artifacts')).some(name => name.startsWith('.release-prepare-')), 'Failed run left staging files');
  }
  rejected(run(fixture('source-change'), undefined, { FIXTURE_MUTATE: 'source' }), 'Commit Web, script and package sources', ['check', 'build']);
  rejected(run(fixture('head-change'), undefined, { FIXTURE_MUTATE: 'head' }), 'HEAD changed during preparation', ['check', 'build']);
  for (const [mutation, message] of [['verify-source', 'Commit Web, script and package sources'], ['verify-head', 'HEAD changed during verification']]) {
    const changed = fixture(mutation);
    rejected(run(changed, undefined, { FIXTURE_MUTATE: mutation }), message, stages);
    assert(!existsSync(resolve(changed.root, 'artifacts/release')), 'Unbound package exposed at final path');
    assert(!readdirSync(resolve(changed.root, 'artifacts')).some(name => name.startsWith('.release-prepare-')), 'Unbound staging files remain');
  }
  const collision = fixture('late-existing-output');
  rejected(run(collision, undefined, { FIXTURE_MUTATE: 'existing-output' }), 'Use a new output directory', stages);
  assert.equal(readFileSync(resolve(collision.root, 'artifacts/release/keep'), 'utf8'), 'concurrent output');
  const escaped = fixture('linked-parent');
  const outside = resolve(temporary, 'outside-target');
  mkdirSync(outside);
  symlinkSync(outside, resolve(escaped.root, 'artifacts/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  rejected(run(escaped, 'artifacts/linked/release'), 'Output resolves outside artifacts/');
  assert(!existsSync(resolve(outside, 'release')), 'Escaped output was created');
  const changedParent = fixture('changed-parent');
  rejected(run(changedParent, 'artifacts/late-link/release', { FIXTURE_MUTATE: 'parent', FIXTURE_OUTSIDE: outside }),
    'Output resolves outside artifacts/', ['check', 'build', 'checksums']);
  assert(!existsSync(resolve(outside, 'release')), 'Changed parent escaped the output boundary');
  rejected(run(fixture('verify-parent'), 'artifacts/late-link/release', { FIXTURE_MUTATE: 'verify-parent', FIXTURE_OUTSIDE: outside }),
    'Output resolves outside artifacts/', stages);
  assert(!existsSync(resolve(outside, 'release')), 'Final path check allowed escaped output');
  const linkedRoot = fixture('linked-artifacts');
  rmSync(resolve(linkedRoot.root, 'artifacts'), { recursive: true });
  symlinkSync(outside, resolve(linkedRoot.root, 'artifacts'), process.platform === 'win32' ? 'junction' : 'dir');
  rejected(run(linkedRoot), 'Output resolves outside artifacts/');
  const internal = fixture('internal-link');
  mkdirSync(resolve(internal.root, 'artifacts/retained'));
  symlinkSync(resolve(internal.root, 'artifacts/retained'), resolve(internal.root, 'artifacts/alias'), process.platform === 'win32' ? 'junction' : 'dir');
  const internalResult = run(internal, 'artifacts/alias/release');
  assert.equal(internalResult.status, 0, internalResult.text);
  assert.equal(readFileSync(resolve(internal.root, 'artifacts/retained/release/fixture'), 'utf8'), internal.commit);
  passed++;
  const fresh = fixture('no-artifacts');
  rmSync(resolve(fresh.root, 'artifacts'), { recursive: true });
  const freshResult = run(fresh);
  assert.equal(freshResult.status, 0, freshResult.text);
  passed++;
  console.log(`Release preparation: ${passed} isolated coordinator cases passed.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
