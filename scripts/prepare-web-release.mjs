import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
assert.equal(process.argv.length, 3, 'Usage: npm run release:prepare -- artifacts/<new-directory>');
const output = resolve(root, process.argv[2]);
const artifactPath = relative(resolve(root, 'artifacts'), output);
assert(artifactPath && artifactPath !== '..' && !artifactPath.startsWith('..' + '/') &&
  !artifactPath.startsWith('..' + '\\') && !isAbsolute(artifactPath), 'Output must be inside artifacts/');
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
run(['scripts/web-release-package.mjs', 'create', 'web/dist', output, commit]);
run(['scripts/web-release-package.mjs', 'verify', output]);
cleanSources();
assert.equal(git(['rev-parse', 'HEAD']), commit, 'HEAD changed during verification');
console.log(`Prepared verified Web retention package ${output} from ${commit}. No deployment.`);
