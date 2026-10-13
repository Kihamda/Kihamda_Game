import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../web/package.json', import.meta.url));
const {build} = require('esbuild');
const web = fileURLToPath(new URL('../web/', import.meta.url));
const compiled = await build({
  stdin:{contents:'export {default as App} from "./games/ntiktaktoe/src/App";',resolveDir:web},
  bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',
  external:['react','react/jsx-runtime'],loader:{'.css':'empty'},alias:{'@shared':`${web}src/shared`},
  plugins:[{name:'headless-effects',setup(builder){
    builder.onLoad({filter:/shared[\\/]index\.ts$/},()=>({contents:'export const useAudio=()=>({playClick:()=>{},playFanfare:()=>{},playArpeggio:()=>{}}); export const useParticles=()=>({particles:[],clear:()=>{},sparkle:()=>{},confetti:()=>{},burst:()=>{}}); export const ParticleLayer=()=>null; export const GameShell=()=>null;',loader:'ts'}));
    builder.onLoad({filter:/ntiktaktoe[\\/]src[\\/]components[\\/](StartScreen|GameView|ResultScreen)\.tsx$/},()=>({contents:'export default function View(){return null}',loader:'tsx'}));
  }}],
});
let slots=[],cursor=0,id=0;
const timers=new Map(),cleanups=[],stored=new Map();
const react={
  useRef(value){const i=cursor++;if(!(i in slots))slots[i]={current:value};return slots[i];},
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
  useMemo:fn=>fn(),useCallback:fn=>fn,useEffect:fn=>{cleanups.push(fn());},
};
globalThis.window={innerWidth:390,innerHeight:844};
globalThis.localStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)};
globalThis.setTimeout=fn=>{timers.set(++id,fn);return id;};
globalThis.clearTimeout=i=>timers.delete(i);
const module={exports:{}};
new Function('require','module','exports',compiled.outputFiles[0].text)(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}:require(name),module,module.exports);
function render(){cursor=0;return module.exports.App();}
function view(){return render().props.children.props.children.find(x=>x&&x.props?.onReset||x&&x.props?.onStartNewGame)?.props;}
function fire(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());}
let start=view();start.onNewGameSettingsChange({...start.newGameSettings,board:{width:3,height:3},winLength:3});view().onStartNewGame();
view().onCellClick(0,0);assert.equal(view().isTransitioning,true);assert.equal(timers.size,1);
view().onReset();view().onStartNewGame();fire();
assert.equal(view().currentPlayerIndex,0,'old turn timer must not change new game');
assert.equal(view().isTransitioning,false);assert.equal(view().board[0][0],null);
for(const [r,c] of [[0,0],[1,0],[0,1],[1,1]]){view().onCellClick(r,c);fire();}
view().onCellClick(0,2);assert.equal(view().isWinAnimation,true);assert.equal(timers.size,2);
view().onReset();view().onStartNewGame();fire();
assert.equal(view().isWinAnimation,false);assert.equal(view().board[0][0],null);
assert.equal(view().currentPlayerIndex,0,'old victory must not finish new game');
view().onCellClick(0,0);cleanups.forEach(fn=>fn?.());assert.equal(timers.size,0,'unmount clears transition');
console.log('nTicTacToe actual App: turn/victory reset-new-game and unmount stale timers passed; dialog needs browser acceptance');
