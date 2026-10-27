const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');

// Load the actual browser script with an unknown game, then call its generator.
const element = () => ({classList: {remove() {}}, style: {}, replaceChildren() {}, setAttribute() {}, addEventListener() {}});
const elements = new Map();
const context = {
  URLSearchParams,
  location: {search: '?game=unknown'},
  document: {
    body: {dataset: {}, classList: {remove() {}}},
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, element());
      return elements.get(selector);
    }
  }
};
vm.runInNewContext(fs.readFileSync('site/game.js', 'utf8'), context);
const results = [];
let previous;
for (let n = 0; n < 3653; n++) {
  const date = new Date(Date.UTC(2026, 0, 1) + n * 86400000);
  const args = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
  const puzzle = JSON.parse(JSON.stringify(context.generateSumPuzzle(...args)));
  assert.deepEqual(JSON.parse(JSON.stringify(context.generateSumPuzzle(...args))), puzzle);
  assert.equal(puzzle.values.length, 9);
  assert.equal(new Set(puzzle.values).size, 9);
  assert(puzzle.values.every(value => Number.isInteger(value) && value >= 1 && value <= 15));
  let solutions = 0;
  for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) for (let k = j + 1; k < 9; k++) {
    if (puzzle.values[i] + puzzle.values[j] + puzzle.values[k] === puzzle.target) solutions++;
  }
  assert(solutions >= 2 && solutions <= 5, `${date.toISOString()}: ${solutions} solutions`);
  if (previous) assert.notDeepEqual(puzzle, previous, `${date.toISOString()}: repeated puzzle`);
  previous = puzzle;
  results.push(puzzle);
}
// Captured from the deployed generator before extraction, for every date above.
assert.equal(crypto.createHash('sha256').update(JSON.stringify(results)).digest('hex'),
  '3c419a1ad6e8885f6804cc6758e189a7a8a17d64499818e0f0f712b3ed443edd');
console.log('Daily sum generator: 3653 dates, reproducibility, solutions and compatibility passed');
