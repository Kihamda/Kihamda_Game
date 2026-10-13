import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../web/package.json', import.meta.url));
const { build } = require('esbuild');
const web = fileURLToPath(new URL('../web/', import.meta.url));
const compiled = await build({
  stdin: { contents: 'export {default as App} from "./games/minerush/src/App";', resolveDir: web },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], loader: { '.css': 'empty' },
  alias: { '@shared': `${web}src/shared` },
  plugins: [{ name: 'headless-effects', setup(builder) {
    builder.onLoad({ filter: /shared[\\/]index\.ts$/ }, () => ({ contents: 'export const useAudio=()=>({playTone:()=>{}}); export const useParticles=()=>({particles:[],sparkle:()=>{},confetti:()=>{},explosion:()=>{}}); export const ScorePopup=()=>null; export const ParticleLayer=()=>null;', loader: 'ts' }));
    builder.onLoad({ filter: /GameShell\.tsx$/ }, () => ({ contents: 'export const GameShell=()=>null;', loader: 'tsx' }));
  } }],
});
let slots = [], cursor = 0, timers = new Map(), id = 0;
const cleanups = [];
const react = {
  useRef(value) { const i = cursor++; if (!(i in slots)) slots[i] = {current:value}; return slots[i]; },
  useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => {slots[i] = typeof value === 'function' ? value(slots[i]) : value;}]; },
  useCallback: fn => fn,
  useEffect: fn => cleanups.push(fn()),
};
globalThis.window = {setTimeout(fn) {timers.set(++id, fn); return id;}};
globalThis.clearTimeout = key => timers.delete(key);
const module = {exports:{}};
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(name => name === 'react' ? react : name === 'react/jsx-runtime' ? {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})} : require(name), module, module.exports);
function render() {cursor=0; return module.exports.App();}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  return [node.props?.children].flat(Infinity).map(n=>find(n,predicate)).find(Boolean);
}
const cell = (r=1,c=1) => find(render(), n=>n.props?.['aria-label']?.startsWith(`セル ${r}-${c} `)).props;
const button = cls => find(render(), n=>n.props?.className === cls).props;
const click = {detail:1,preventDefault(){}};
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
cell(9,9).onTouchStart(touch); cleanups.forEach(fn=>fn?.()); assert.equal(timers.size,0,'unmount clears timer');
console.log('MineRush actual App input handlers: keyboard, flags, long press, drag/cancel, multitouch, reset, unmount passed');
