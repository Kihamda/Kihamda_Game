import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const inside = path => path && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
assert.equal(process.argv.length, 3, 'Usage: npm run release:prepare -- artifacts/<new-directory>');
const output = resolve(root, process.argv[2]);
const artifactPath = relative(resolve(root, 'artifacts'), output);
assert(inside(artifactPath), 'Output must be inside artifacts/');
// Resolve existing parents too: a lexically confined path can cross a junction.
const checkedOutput = () => {
  let parent = output;
  const missing = [];
  while (!existsSync(parent)) {
    missing.unshift(basename(parent));
    const next = dirname(parent);
    assert.notEqual(next, parent, 'Cannot resolve output parent');
    parent = next;
  }
  const physical = resolve(realpathSync(parent), ...missing);
  assert(inside(relative(resolve(realpathSync(root), 'artifacts'), physical)),
    'Output resolves outside artifacts/');
};
checkedOutput();
assert(!existsSync(output), 'Use a new output directory; retained packages must survive');
assert(process.env.npm_execpath && existsSync(process.env.npm_execpath),
  'Run through npm run release:prepare to use the current npm CLI');

const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourcePaths = ['web', 'scripts', 'package.json', 'package-lock.json'];
const cleanSources = () => assert.equal(git(['status', '--porcelain', '--', ...sourcePaths]), '',
  'Commit Web, script and package sources before preparing a versioned release');
cleanSources();
const commit = git(['rev-parse', 'HEAD']);
const env = { ...process.env, GITHUB_SHA: commit };
const run = args => execFileSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });

run([process.env.npm_execpath, 'run', 'check']);
run([process.env.npm_execpath, 'run', 'build']);
cleanSources();
assert.equal(git(['rev-parse', 'HEAD']), commit, 'HEAD changed during preparation');
run(['scripts/check-web-build.mjs']);
checkedOutput();
run(['scripts/web-release-package.mjs', 'create', 'web/dist', output, commit]);
run(['scripts/web-release-package.mjs', 'verify', output]);
cleanSources();
assert.equal(git(['rev-parse', 'HEAD']), commit, 'HEAD changed during verification');
console.log(`Prepared verified Web retention package ${output} from ${commit}. No deployment.`);
