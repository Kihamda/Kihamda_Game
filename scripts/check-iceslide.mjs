import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../web/package.json', import.meta.url));
const { build } = require('esbuild');
const result = await build({
  stdin: {
    contents: 'export { STAGES } from "./games/iceslide/src/lib/constants.ts"; export * from "./games/iceslide/src/lib/iceslide.ts"; export * from "./games/iceslide/src/lib/storage.ts";',
    resolveDir: fileURLToPath(new URL('../web/', import.meta.url)),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const game = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const solutions = [];
for (const stage of game.STAGES) {
  const initial = game.createInitialState(stage);
  const queue = [[initial, []]];
  const seen = new Set();
  let solution;
  for (let index = 0; index < queue.length; index++) {
    const [state, path] = queue[index];
    const key = `${state.player.x},${state.player.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (game.isCleared(stage, state.player)) { solution = path; break; }
    for (const direction of ['up', 'down', 'left', 'right']) {
      const next = game.movePlayer(stage, state, direction);
      if (next) queue.push([next, [...path, direction]]);
    }
  }
  assert.ok(solution, `Stage ${stage.id} has no solution`);
  assert.ok(solution.length <= stage.par, `Stage ${stage.id} cannot earn three stars`);
  let state = initial;
  for (const direction of solution) state = game.movePlayer(stage, state, direction);
  assert.equal(game.isCleared(stage, state.player), true);
  assert.equal(state.moves, solution.length);
  while (state.history.length) state = game.undoMove(state);
  assert.deepEqual(state, initial, `Stage ${stage.id} undo does not restore initial state`);
  assert.equal(game.undoMove(initial), null);
  solutions.push({ id: stage.id, par: stage.par, minimum: solution.length, solution });
}
let stored = null;
globalThis.localStorage = {
  getItem: () => stored,
  setItem: (_key, value) => { stored = value; },
};
for (const invalid of ['null', '{}', '[]', '{', '{"cleared":null,"bestMoves":{}}', '{"cleared":[],"bestMoves":[]}']) {
  stored = invalid;
  assert.deepEqual(game.loadProgress(), { cleared: [], bestMoves: {} });
}
stored = JSON.stringify({ cleared: [1, 1, 0, 21, '2', 2], bestMoves: { 1: 2, 2: -1, 21: 1 } });
assert.deepEqual(game.loadProgress(), { cleared: [1, 2], bestMoves: { 1: 2 } });
stored = null;
assert.equal(game.updateProgress(1, 4).saved, true);
game.updateProgress(1, 2);
game.updateProgress(1, 3);
assert.deepEqual(game.loadProgress(), { cleared: [1], bestMoves: { 1: 2 } });
globalThis.localStorage.setItem = () => { throw new Error('Storage unavailable'); };
const unsaved = game.updateProgress(2, 2);
assert.equal(unsaved.saved, false);
assert.deepEqual(unsaved.progress.cleared, [1, 2]);
assert.deepEqual(game.loadProgress().cleared, [1]);
globalThis.localStorage.getItem = () => { throw new Error('Read denied'); };
assert.deepEqual(game.loadProgress(), { cleared: [], bestMoves: {} });
delete globalThis.localStorage;
console.log(JSON.stringify({ passed: true, storage: 'invalid shape, safe values, best score, read/write denial passed', stages: solutions }, null, 2));
