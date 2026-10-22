import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../web/package.json', import.meta.url));
const { build } = require('esbuild');
const web = fileURLToPath(new URL('../web/', import.meta.url));
const compiled = await build({
  stdin: { contents: 'export {default as App} from "./games/minerush/src/App"; export * from "./games/minerush/src/lib/game";', resolveDir: web },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'minerush-test-effects'], loader: { '.css': 'empty' },
  alias: { '@shared': `${web}src/shared` },
  plugins: [{ name: 'headless-effects', setup(builder) {
    builder.onLoad({ filter: /shared[\\/]index\.ts$/ }, () => ({ contents: 'import {effects} from "minerush-test-effects"; export const useAudio=()=>({playTone:()=>{effects.tones++;}}); export const useParticles=()=>({particles:[],sparkle:()=>{},confetti:()=>{effects.confetti++;},explosion:()=>{effects.explosions++;},clear:()=>{effects.clears++;}}); export const ScorePopup=()=>null; export const ParticleLayer=()=>null;', loader: 'ts' }));
    builder.onLoad({ filter: /GameShell\.tsx$/ }, () => ({ contents: 'export const GameShell=()=>null;', loader: 'tsx' }));
  } }],
});
let slots = [], cursor = 0, timers = new Map(), id = 0;
const cleanups = new Map();
function unmount() {
  cleanups.forEach(effect => effect.cleanup?.());
  cleanups.clear();
}
const effects = { tones: 0, confetti: 0, explosions: 0, clears: 0 };
const react = {
  useRef(value) { const i = cursor++; if (!(i in slots)) slots[i] = {current:value}; return slots[i]; },
  useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => {slots[i] = typeof value === 'function' ? value(slots[i]) : value;}]; },
  useCallback(fn, deps) {
    const i = cursor++;
    const previous = slots[i];
    if (!previous || previous.deps.length !== deps.length ||
        !deps.every((value,index) => Object.is(value,previous.deps[index]))) {
      slots[i] = {value:fn,deps};
    }
    return slots[i].value;
  },
  useEffect(fn, deps) {
    const i = cursor++;
    const previous = cleanups.get(i);
    if (previous && deps?.length === previous.deps?.length &&
        deps?.every((value,index) => Object.is(value,previous.deps[index]))) return;
    previous?.cleanup?.();
    cleanups.set(i,{deps,cleanup:fn()});
  },
};
globalThis.window = new EventTarget();
window.setTimeout = fn => {timers.set(++id, fn); return id;};
globalThis.document = new EventTarget();
document.hidden = false;
globalThis.clearTimeout = key => timers.delete(key);
const module = {exports:{}};
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(name => name === 'react' ? react : name === 'minerush-test-effects' ? {effects} : name === 'react/jsx-runtime' ? {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})} : require(name), module, module.exports);
function render() {cursor=0; return module.exports.App();}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  return [node.props?.children].flat(Infinity).map(n=>find(n,predicate)).find(Boolean);
}
const cell = (r=1,c=1) => find(render(), n=>n.props?.['aria-label']?.startsWith(`セル ${r}-${c} `)).props;
const button = cls => find(render(), n=>n.props?.className === cls).props;
const click = {detail:1,nativeEvent:{},preventDefault(){}};
const key = k => ({key:k,repeat:false,preventDefault(){}});
const touch = {touches:[{}]};
function fireTimers() {const pending=[...timers.values()]; timers.clear(); pending.forEach(fn=>fn());}

cell().onKeyDown(key('f')); assert.match(cell()['aria-label'], /旗あり$/);
cell().onClick({...click,detail:0}); assert.match(cell()['aria-label'], /旗あり$/);
cell().onKeyDown(key('f')); assert.match(cell()['aria-label'], /未開封$/);
cell().onTouchStart(touch); fireTimers(); cell().onTouchEnd();
assert.match(cell()['aria-label'], /旗あり$/);
cell().onClick(click); assert.match(cell()['aria-label'], /旗あり$/, 'compatibility click must not toggle twice');
cell().onKeyDown(key('f')); assert.match(cell()['aria-label'], /未開封$/);
cell().onTouchStart(touch); cell().onTouchMove(); fireTimers(); cell().onClick(click);
assert.match(cell()['aria-label'], /未開封$/, 'drag must not flag or reveal');
cell().onTouchStart(touch); cell().onTouchCancel(); fireTimers(); cell().onClick(click);
assert.match(cell()['aria-label'], /未開封$/, 'cancelled touch must not reveal');
cell().onTouchStart(touch); cell().onTouchStart({touches:[{},{}]}); fireTimers();
assert.match(cell()['aria-label'], /未開封$/, 'multitouch cancels timer');
cell().onTouchStart(touch); button('minerush-reset-btn').onClick(); fireTimers();
assert.match(cell()['aria-label'], /未開封$/, 'reset cancels stale timer');
button('minerush-mode-btn').onClick(); cell().onClick(click); assert.match(cell()['aria-label'], /旗あり$/);
cell().onClick(click); assert.match(cell()['aria-label'], /未開封$/);
cell().onTouchStart(touch); fireTimers(); cell(1,2).onClick(click);
assert.match(cell(1,2)['aria-label'], /旗あり$/, 'long press must not swallow another cell click');
button('minerush-mode-btn').onClick(); cell(2,1).onClick({...click,detail:0});
assert.match(cell(2,1)['aria-label'], /開いたマス/, 'first open stays safe');
cell(9,9).onTouchStart(touch); unmount(); assert.equal(timers.size,0,'unmount clears timer');

// Reach terminal states through the real rules, then invoke the actual App handlers.
const { createGame, revealCell } = module.exports;
function loadGame(game) {
  unmount(); slots = []; cursor = 0; render();
  slots[0] = game;
}
function assertSafeProgress() {
  const game = slots[0];
  const safe = game.grid.flat().filter(cell => cell.isRevealed && !cell.isMine).length;
  assert(find(render(), node => node.props?.['aria-label'] === `開いた安全マス ${safe} / 71`),
    'progress must match revealed safe cells, excluding flags and exposed mines');
}
const touchMenu = {type:'contextmenu',nativeEvent:{pointerType:'touch'},preventDefault(){}};
const touchClick = {...click,nativeEvent:{pointerType:'touch'}};
loadGame(createGame(9,9,10));
cell().onTouchStart(touch); cell().onTouchCancel(); fireTimers(); cell().onClick(touchClick);
assert.match(cell()['aria-label'], /未開封$/, 'an explicit touch compatibility click after cancellation stays suppressed');
loadGame(createGame(9,9,10));
cell().onTouchStart(touch); fireTimers(); cell().onTouchEnd(); cell().onClick(touchClick);
assert.match(cell()['aria-label'], /旗あり$/, 'an explicit touch compatibility click after a long press must not reveal or toggle again');
loadGame(createGame(9,9,10));
cell().onTouchStart(touch); cell().onTouchCancel(); fireTimers();
cell().onContextMenu(touchMenu);
assert.match(cell()['aria-label'], /未開封$/, 'a native touch menu after cancellation must not flag');
cell().onContextMenu({type:'contextmenu',nativeEvent:{pointerType:'mouse'},preventDefault(){}});
assert.match(cell()['aria-label'], /旗あり$/, 'a cancelled touch must not swallow a later mouse context menu');
cell().onContextMenu({type:'contextmenu',nativeEvent:{pointerType:'mouse'},preventDefault(){}});
assert.match(cell()['aria-label'], /未開封$/, 'mouse flag removal after a cancelled touch still works');
cell().onClick({...click,nativeEvent:{pointerType:'mouse'}});
assert.match(cell()['aria-label'], /開いたマス/, 'a real mouse click after cancellation must not be mistaken for a touch compatibility click');
loadGame(createGame(9,9,10));
assertSafeProgress();
cell().onTouchStart(touch); fireTimers(); cell().onTouchEnd();
cell().onContextMenu(touchMenu); cell().onClick(click);
assert.match(cell()['aria-label'], /旗あり$/, 'native touch menu after long press must not toggle a second time');
assertSafeProgress();
cell().onContextMenu({type:'contextmenu',nativeEvent:{pointerType:'mouse'},preventDefault(){}});
assert.match(cell()['aria-label'], /未開封$/, 'a later mouse context menu still toggles normally');
cell().onTouchStart(touch); cell().onContextMenu(touchMenu); fireTimers(); cell().onTouchEnd(); cell().onClick(click);
assert.match(cell()['aria-label'], /旗あり$/, 'early native touch menu must flag only once and suppress compatibility click');
loadGame(createGame(9,9,10));
cell().onTouchStart(touch); cell().onTouchMove(); cell().onTouchEnd(); cell().onContextMenu(touchMenu); fireTimers();
assert.match(cell()['aria-label'], /未開封$/, 'native touch menu must not revive a cancelled gesture');
loadGame(createGame(9,9,10));
cell().onTouchStart(touch); cell(1,2).onTouchStart({touches:[{},{}]}); fireTimers();
cell().onTouchEnd(); cell(1,2).onTouchEnd();
cell().onClick(click); cell(1,2).onClick(click);
assert.match(cell()['aria-label'], /未開封$/, 'multitouch on different cells must suppress the original cell click');
assert.match(cell(1,2)['aria-label'], /未開封$/, 'multitouch on different cells must suppress the second cell click');
cell().onTouchStart(touch); fireTimers(); cell().onTouchEnd(); cell().onClick(click);
assert.match(cell()['aria-label'], /旗あり$/, 'a new single touch after multitouch still works');
const originalRandom = Math.random;
let initial;
try {
  Math.random = () => 0.5;
  initial = revealCell(createGame(9,9,10),4,4);
} finally {
  Math.random = originalRandom;
}
assert.equal(initial.status,'playing');
let mine;
for (let r=0;r<9;r++) for (let c=0;c<9;c++) if (initial.grid[r][c].isMine) mine=[r,c];
assert(mine);
loadGame(initial);
assertSafeProgress();
let before = {...effects};
cell(mine[0]+1,mine[1]+1).onClick(click);
assert.equal(slots[0].status,'lost');
assertSafeProgress();
assert.equal(effects.explosions,before.explosions+1,'losing transition has one explosion');
assert.equal(effects.tones,before.tones+1,'losing transition has one tone');
before = {...effects};
cell(mine[0]+1,mine[1]+1).onClick(click);
assert.deepEqual(effects,before,'clicking a revealed mine after losing must not replay effects');

let winning = initial, finalCell;
outer: for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
  if (winning.grid[r][c].isMine || winning.grid[r][c].isRevealed) continue;
  const next = revealCell(winning,r,c);
  if (next.status === 'won') { finalCell=[r,c]; break outer; }
  winning = next;
}
assert(finalCell);
loadGame(winning);
before = {...effects};
cell(finalCell[0]+1,finalCell[1]+1).onClick(click);
assert.equal(slots[0].status,'won');
assertSafeProgress();
assert.equal(effects.confetti,before.confetti+1,'winning transition has one celebration');
assert.equal(effects.tones,before.tones+1,'winning transition has one tone');
before = {...effects};
cell(finalCell[0]+1,finalCell[1]+1).onClick(click);
assert.deepEqual(effects,before,'clicking a revealed cell after winning must not replay effects');
button('minerush-reset-btn').onClick();
assertSafeProgress();
assert.equal(find(render(), n=>Object.hasOwn(n.props ?? {}, 'popupKey')).props.text,null,
  'reset must immediately remove the previous round popup');
assert.equal(effects.clears,before.clears+1,'reset must clear previous round particles');

for (const interruption of ['blur','hidden']) {
  loadGame(createGame(9,9,10));
  cell().onTouchStart(touch);
  cell();
  assert.equal(timers.size,1,'ordinary rerender must preserve an active gesture');
  assert.equal(getEventListeners(window,'blur').length,1,'rerender must not duplicate global handlers');
  if (interruption === 'blur') window.dispatchEvent(new Event('blur'));
  else { document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); }
  fireTimers();
  assert.match(cell()['aria-label'], /未開封$/, `${interruption} must cancel the pending flag`);
  cell().onTouchEnd();
  cell().onClick(click);
  assert.match(cell()['aria-label'], /未開封$/, `${interruption} must suppress the interrupted touch click`);
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  cell().onTouchStart(touch); fireTimers(); cell().onTouchEnd(); cell().onClick(click);
  assert.match(cell()['aria-label'], /旗あり$/, 'a fresh gesture after interruption still flags once');
  cell().onKeyDown(key('f'));
  cell().onClick({...click,detail:0});
  assert.match(cell()['aria-label'], /開いたマス/, 'keyboard activation remains available');
}
cell().onTouchStart(touch);
unmount();
assert.equal(timers.size,0,'unmount cancels the last pending gesture');
assert.equal(getEventListeners(window,'blur').length,0,'unmount removes blur listener');
assert.equal(getEventListeners(document,'visibilitychange').length,0,'unmount removes visibility listener');
console.log('MineRush actual App input handlers: keyboard, flags, long press, drag/cancel, multitouch, reset effects, blur/visibility interruption, unmount, single terminal effects passed');
