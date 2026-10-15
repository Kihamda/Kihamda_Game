import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../web/package.json', import.meta.url));
const { build } = require('esbuild');
const web = fileURLToPath(new URL('../web/', import.meta.url));
const compiled = await build({
  stdin: { contents: 'export { default as App } from "./games/gravityball/src/App"; export { STAGES } from "./games/gravityball/src/stages"; export { useHighScore } from "./src/shared/hooks/useHighScore";', resolveDir: web },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], loader: { '.css': 'empty' },
  alias: { '@shared': `${web}src/shared` },
  plugins: [{ name: 'headless-effects', setup(builder) {
    builder.onLoad({ filter: /shared[\\/]index\.ts$/ }, () => ({ contents: 'export {useHighScore} from "./hooks/useHighScore"; export const useAudio=()=>({playTone:()=>{}}); export const useParticles=()=>({particles:[],sparkle:()=>{},confetti:()=>{},explosion:()=>{}}); export const ScorePopup=()=>null; export const ParticleLayer=()=>null;', loader: 'ts', resolveDir: `${web}src/shared` }));
    builder.onLoad({ filter: /GameShell\.tsx$/ }, () => ({ contents: 'export const GameShell=()=>null;', loader: 'tsx' }));
  } }],
});

let slots, cursor, effects, refs, stored, denied, timers, frame;
const react = {
  useRef(value) { const index = cursor++; if (!slots[index]) slots[index] = { current: value }; refs.push(slots[index]); return slots[index]; },
  useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
  useCallback: fn => fn,
  useEffect: fn => effects.push(fn),
};
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) } : require(name), module, module.exports);
const { App, STAGES, useHighScore } = module.exports;

function hasRoute(stage) {
  const blocked = (x, y) => stage.obstacles.some(o => {
    const dx = x - Math.max(o.x, Math.min(x, o.x + o.width));
    const dy = y - Math.max(o.y, Math.min(y, o.y + o.height));
    return dx * dx + dy * dy < 12 * 12;
  });
  const queue = [[stage.ball.x, stage.ball.y]], seen = new Set();
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index];
    if (Math.hypot(x - stage.goal.x, y - stage.goal.y) < 37) return true;
    for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (nx < 12 || nx > 488 || ny < 12 || ny > 588 || seen.has(key) || blocked(nx, ny)) continue;
      seen.add(key); queue.push([nx, ny]);
    }
  }
  return false;
}
assert.equal(hasRoute({ ...STAGES[3], obstacles: STAGES[3].obstacles.map((o, i) => i === 4 ? { ...o, height: 220 } : o) }), false, 'Original stage 4 must reproduce blocked route');
for (const [index, stage] of STAGES.entries()) assert(hasRoute(stage), `Stage ${index + 1} has no radius-aware route`);

function setup(value = null) {
  slots = []; cursor = 0; effects = []; refs = []; stored = value; denied = false; timers = new Map(); frame = null;
  globalThis.localStorage = { getItem: () => stored, setItem: (_key, value) => { if (denied) throw Error('denied'); stored = value; }, removeItem: () => { if (denied) throw Error('denied'); stored = null; } };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.requestAnimationFrame = fn => { frame = fn; return 1; };
  globalThis.cancelAnimationFrame = () => { frame = null; };
  globalThis.setTimeout = (fn, delay) => { const id = timers.size + 1; timers.set(id, { fn, delay }); return id; };
  globalThis.clearTimeout = id => timers.delete(id);
}
function renderHook() { cursor = 0; refs = []; return useHighScore('gravityball'); }
function startApp() {
  setup(); const tree = App();
  const ctx = new Proxy({}, { get: () => () => {} });
  refs[0].current = { getContext: () => ctx };
  refs[1].current = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 600 }) };
  const cleanup = effects.map(fn => fn());
  return { state: refs.find(ref => ref.current?.ballPos), container: [tree.props.children].flat().find(child => child?.props?.className === 'gravityball-container'), cleanup };
}
const preserved = Object.fromEntries(['localStorage', 'window', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'].map(key => [key, globalThis[key]]));
try {
  for (const invalid of ['NaN', 'Infinity', '-1', '1.5', 'garbage', '9007199254740992']) { setup(invalid); assert.equal(renderHook().best, 0); }
  for (const invalid of ['', ' ', '{}', 'NaN', '-1']) {
    setup(invalid); assert.equal(renderHook().readError,'invalid');
    assert.equal(stored,invalid,'read must preserve invalid history');
    assert.equal(renderHook().retry(),false); assert.equal(stored,invalid);
  }
  setup('500'); const originalRead=localStorage.getItem;
  localStorage.getItem=()=>{throw Error('read denied')};
  assert.equal(renderHook().readError,'unavailable');
  assert.equal(renderHook().update(100),false,'unread history cannot confirm a new record'); assert.equal(renderHook().saveError,true); assert.equal(stored,'500','unknown maximum must not be overwritten');
  assert.equal(renderHook().retry(),false);
  localStorage.getItem=originalRead;
  assert.equal(renderHook().retry(),true); assert.equal(renderHook().best,500);
  assert.equal(stored,'500'); assert.equal(renderHook().readError,null);
  setup('bad'); renderHook(); stored='80'; assert.equal(renderHook().retry(),true);
  assert.equal(renderHook().best,80); assert.equal(renderHook().readError,null);
  setup(); assert.equal(renderHook().readError,null); assert.equal(renderHook().best,0);
  setup('100'); let hook = renderHook(); assert.equal(hook.best, 100);
  assert.equal(hook.update(200), true); assert.equal(hook.update(150), false); assert.equal(stored, '200');
  assert.equal(hook.update(NaN), false); denied = true; assert.equal(hook.update(300), true); assert.equal(renderHook().saveError, true); assert.equal(stored, '200');
  assert.equal(renderHook().retry(),false);assert.equal(stored,'200');
  denied=false;assert.equal(renderHook().update(300),false,'equal score retry is not a new record');
  assert.equal(stored,'300');assert.equal(renderHook().saveError,false);
  denied=true;renderHook().update(350);assert.equal(renderHook().best,350);
  denied=false;assert.equal(renderHook().retry(),true);assert.equal(stored,'350');
  assert.equal(renderHook().best,350);assert.equal(renderHook().saveError,false);
  denied=true;renderHook().reset();assert.equal(stored,'350');assert.equal(renderHook().saveError,true);
  denied=false;renderHook().retry();assert.equal(stored,null,'failed reset retries deletion rather than writing zero');
  denied = false; hook = renderHook(); hook.update(400); assert.equal(renderHook().saveError, false); assert.equal(stored, '400');
  setup(); const app = startApp(); const state = app.state.current;
  let prevented = 0;
  app.container.props.onKeyDown({key:'Enter',preventDefault(){prevented++;}});
  assert.equal(state.phase,'playing');
  const strength = Math.hypot(state.gravity.x,state.gravity.y);
  for (const [key, x, y] of [['ArrowLeft',-1,0],['ArrowRight',1,0],['ArrowUp',0,-1],['ArrowDown',0,1]]) {
    app.container.props.onKeyDown({key,preventDefault(){prevented++;}});
    assert.equal(Math.sign(state.gravity.x),x); assert.equal(Math.sign(state.gravity.y),y);
    assert.equal(Math.hypot(state.gravity.x,state.gravity.y),strength);
  }
  assert.equal(prevented,5,'keyboard controls prevent page scroll');
  app.container.props.onTouchMove({touches:[{clientX:500,clientY:300}]});
  assert.equal(state.gravity.x,strength); assert.equal(state.gravity.y,0);
  app.container.props.onTouchMove({touches:[{clientX:0,clientY:300},{clientX:500,clientY:300}]});
  assert.equal(state.gravity.x,strength,'multi-touch must not steer using arbitrary first finger');
  state.phase='transition'; const priorGravity={...state.gravity};
  app.container.props.onKeyDown({key:'ArrowUp',preventDefault(){}}); assert.deepEqual(state.gravity,priorGravity,'transition ignores steering');
  state.phase='gameover'; app.container.props.onKeyDown({key:' ',preventDefault(){}}); assert.equal(state.phase,'playing');
  state.phase = 'playing'; state.ballPos = { ...STAGES[0].goal }; state.gravity = { x: 0, y: 0 }; state.stageStartTime = Date.now();
  frame(); assert.equal(state.phase, 'transition'); const score = state.score; frame(); assert.equal(state.score, score);
  await app.container.props.onClick(); assert.equal(state.phase, 'transition', 'Click during transition must not restart cleared stage');
  const transition = [...timers.values()].find(timer => timer.delay === 1500); transition.fn(); assert.equal(app.state.current.stageIndex, 1); assert.equal(app.state.current.score, score);
  Object.assign(app.state.current, { phase: 'playing', stageIndex: 4, ballPos: { ...STAGES[4].goal }, ballVel: { x: 0, y: 0 }, gravity: { x: 0, y: 0 }, stageStartTime: Date.now() });
  frame(); assert.equal(app.state.current.phase, 'cleared'); assert.equal(Number(stored), app.state.current.score); const final = stored; frame(); assert.equal(stored, final);
  await app.container.props.onClick(); assert.equal(app.state.current.phase, 'start'); assert.equal(app.state.current.stageIndex, 0); assert.equal(app.state.current.score, 0);
  Object.assign(app.state.current, { phase: 'playing', stageIndex: 2, ballPos: { x: 250, y: 510 }, ballVel: { x: 0, y: 0 } }); frame(); assert.equal(app.state.current.phase, 'gameover');
  await app.container.props.onClick(); assert.equal(app.state.current.phase, 'playing'); assert.deepEqual(app.state.current.ballPos, STAGES[2].ball); assert.equal(app.state.current.stageIndex, 2);
  const second = startApp(); second.state.current.phase = 'playing'; second.state.current.ballPos = { ...STAGES[0].goal }; second.state.current.gravity = { x: 0, y: 0 }; frame();
  assert([...timers.values()].some(timer => timer.delay === 1500)); for (const cleanup of second.cleanup) cleanup?.(); assert(![...timers.values()].some(timer => timer.delay === 1500), 'Unmount must cancel transition');
} finally { for (const [key, value] of Object.entries(preserved)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } }
console.log('GravityBall: 5 geometric routes, original stage4 failure, score validation/denial, transition click/double score/unmount, final save/restart and spike retry passed. Physics steering and touch require separate browser evidence.');
