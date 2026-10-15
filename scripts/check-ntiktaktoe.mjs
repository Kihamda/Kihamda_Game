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
let denyWrite=false,denyDelete=false,denyStreakRead=false,denyStreakWrite=false,reloads=0;
globalThis.localStorage={getItem:k=>{if(denyStreakRead&&k==='ntiktaktoe_streak_v1')throw new Error('streak read denial');return stored.get(k)??null;},setItem:(k,v)=>{if(denyWrite||(denyStreakWrite&&k==='ntiktaktoe_streak_v1'))throw new Error('injected write denial');stored.set(k,v);},removeItem:k=>{if(denyDelete)throw new Error('injected delete denial');stored.delete(k);}};
globalThis.window.location={reload:()=>reloads++};
globalThis.setTimeout=fn=>{timers.set(++id,fn);return id;};
globalThis.clearTimeout=i=>timers.delete(i);
const module={exports:{}};
new Function('require','module','exports',compiled.outputFiles[0].text)(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}:require(name),module,module.exports);
function render(){cursor=0;return module.exports.App();}
function view(){return render().props.children.props.children.find(x=>x&&x.props?.onReset||x&&x.props?.onStartNewGame)?.props;}
function deletion(){return render().props.children.props.children.find(x=>x&&x.props?.onConfirm&&x.props?.onCancel)?.props;}
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

// Exercise actual App callbacks with storage failures, not a mirrored reducer.
slots=[];cleanups.length=0;stored.clear();denyWrite=true;
view().onStartNewGame();view().onCellClick(0,0);fire();view();
assert.match(render().props.statusMessage,/進行を保存できません/);
assert.match(render().props.statusMessage,/設定を保存できません/);
assert.equal(view().board[0][0],'X');assert.equal(view().currentPlayerIndex,1);
denyWrite=false;view().onCellClick(0,1);fire();view();
assert.equal(render().props.statusMessage,undefined,'successful subsequent writes clear both failure notices');
view().onReset();
const prefsBeforeDelete=stored.get('extreme_tik_tok_toe_device_prefs');
stored.set('ntiktaktoe_streak_v1',JSON.stringify({count:1,configHash:'Player 1|Player 2'}));
const streakBeforeDelete=stored.get('ntiktaktoe_streak_v1');
denyDelete=true;view().onClearSave();
assert.equal(reloads,0,'opening confirmation never deletes progress');
assert.ok(stored.has('extreme_tik_tok_toe_save'));
deletion().onCancel();assert.equal(deletion(),undefined,'cancellation closes without deleting');
view().onClearSave();deletion().onConfirm();
assert.match(render().props.statusMessage,/削除できません/);assert.equal(reloads,0);
assert.ok(stored.has('extreme_tik_tok_toe_save'),'denied deletion keeps the save');
denyDelete=false;view().onClearSave();deletion().onConfirm();assert.equal(reloads,1);assert.equal(stored.has('extreme_tik_tok_toe_save'),false);
assert.equal(stored.get('extreme_tik_tok_toe_device_prefs'),prefsBeforeDelete,'progress deletion keeps preferences');
assert.equal(stored.get('ntiktaktoe_streak_v1'),streakBeforeDelete,'progress deletion keeps streak history');

// Streak failures must survive independent successful progress writes.
slots=[];cleanups.length=0;stored.clear();denyStreakRead=true;
assert.match(render().props.statusMessage,/連勝履歴を読み込めません/);
view().onStartNewGame();view().onCellClick(0,0);fire();view();
assert.match(render().props.statusMessage,/連勝履歴を読み込めません/);
assert.ok(stored.has('extreme_tik_tok_toe_save'));
denyStreakRead=false;
view().onReset();view().onNewGameSettingsChange({...view().newGameSettings,board:{width:3,height:3},winLength:3});view().onStartNewGame();
denyStreakWrite=true;
for(const [r,c] of [[0,0],[1,0],[0,1],[1,1]]){view().onCellClick(r,c);fire();}
view().onCellClick(0,2);fire();view();
assert.match(render().props.statusMessage,/連勝履歴を保存できません/);
assert.equal(JSON.parse(stored.get('extreme_tik_tok_toe_save')).appState,'after');
denyStreakWrite=false;view().onReset();view().onStartNewGame();
for(const [r,c] of [[0,0],[1,0],[0,1],[1,1]]){view().onCellClick(r,c);fire();}
view().onCellClick(0,2);fire();view();
assert.equal(render().props.statusMessage,undefined);
assert.equal(JSON.parse(stored.get('ntiktaktoe_streak_v1')).count,1);
slots=[];cleanups.length=0;view().onReset();view().onResumeGame();assert.equal(view().streak,1,'reloaded game restores valid streak');
view().onReset();view().onStartNewGame();denyStreakWrite=true;
for(const [r,c] of [[0,0],[0,1],[0,2],[1,1],[1,0],[1,2],[2,1],[2,0],[2,2]]){view().onCellClick(r,c);fire();}
assert.match(render().props.statusMessage,/連勝履歴を保存できません/);
assert.equal(JSON.parse(stored.get('ntiktaktoe_streak_v1')).count,1,'denied draw update leaves the old persisted count');
denyStreakWrite=false;view().onReset();view().onStartNewGame();
for(const [r,c] of [[0,0],[0,1],[0,2],[1,1],[1,0],[1,2],[2,1],[2,0],[2,2]]){view().onCellClick(r,c);fire();}
assert.equal(JSON.parse(stored.get('ntiktaktoe_streak_v1')).count,0,'successful draw resets history');
assert.equal(render().props.statusMessage,undefined);
for(const data of ['{','null','[]',JSON.stringify({count:-1,configHash:'Player 1|Player 2'}),JSON.stringify({count:1.5,configHash:'Player 1|Player 2'}),JSON.stringify({count:'2',configHash:'Player 1|Player 2'}),JSON.stringify({count:2,configHash:42}),JSON.stringify({count:1e30,configHash:'Player 1|Player 2'})]){
  stored.set('ntiktaktoe_streak_v1',data);slots=[];cleanups.length=0;
  assert.match(render().props.statusMessage,/連勝履歴の形式/);assert.equal(stored.get('ntiktaktoe_streak_v1'),data,'invalid history preserved until an explicit game outcome');
}
stored.set('ntiktaktoe_streak_v1',JSON.stringify({count:2,configHash:'other'}));slots=[];cleanups.length=0;view().onReset();view().onStartNewGame();assert.equal(view().streak,0);assert.equal(render().props.statusMessage,undefined);
console.log('nTic streak: key-specific read/write denial, independent progress success, successful recovery, reload, 8 invalid forms and mismatched configuration passed');

const storageBuild=await build({entryPoints:[`${web}games/ntiktaktoe/src/lib/storage.ts`],bundle:true,write:false,platform:'node',format:'cjs'});
const storageModule={exports:{}};
new Function('module','exports',storageBuild.outputFiles[0].text)(storageModule,storageModule.exports);
const storage=storageModule.exports;
const valid={appState:'in_progress',gameSettings:{board:{width:3,height:3},winLength:3,players:[{name:'A',mark:'X',color:'red'},{name:'B',mark:'O',color:'blue'}]},board:[['X',null,null],[null,null,null],[null,null,null]],currentPlayerIndex:1,winner:null};
assert.equal(storage.validateGameState(valid).gameSettings.gameMode,'classic','legacy saves missing gameMode survive');
for(const change of [
  s=>{s.appState='unknown'},s=>{s.appState=['in_progress']},s=>{s.board=[[null]]},
  s=>{s.board[0][0]='unknown'},s=>{s.currentPlayerIndex=-1},s=>{s.currentPlayerIndex=2},
  s=>{s.currentPlayerIndex=0.5},s=>{s.gameSettings.board.width=31},s=>{s.gameSettings.winLength=null},
  s=>{s.gameSettings.players=[null,null]},s=>{s.winner='unknown'},s=>{s.gameSettings.gameMode='unknown'},
]){const fixture=structuredClone(valid);change(fixture);assert.equal(storage.validateGameState(fixture),null);}
for(const fixture of [null,[],{},'text'])assert.equal(storage.validateGameState(fixture),null);
stored.set('extreme_tik_tok_toe_save',JSON.stringify({...valid,board:[[null]]}));
assert.equal(storage.readGameState().state,null);assert.match(storage.readGameState().message,/形式/);
assert.ok(stored.has('extreme_tik_tok_toe_save'),'invalid data is not silently deleted');
slots=[];cleanups.length=0;view();assert.match(render().props.statusMessage,/形式/);
assert.equal(view().savedState,null);view().onStartNewGame();view();assert.equal(render().props.statusMessage,undefined);
stored.set('extreme_tik_tok_toe_save','{');assert.equal(storage.loadGameState(),null);
globalThis.localStorage={getItem:()=>{throw new Error('injected read denial')},setItem:()=>{throw new Error('injected write denial')},removeItem:()=>{throw new Error('injected delete denial')}};
assert.match(storage.readGameState().message,/読み込めません/);assert.equal(storage.saveGameState(valid),false);assert.equal(storage.clearSavedGame(),false);
assert.equal(storage.saveDevicePreferences({}),false);assert.equal(storage.loadDevicePreferences().confirmationMode,false);
console.log('nTic storage: 16 malformed fixtures, legacy format, read/write/delete denial, actual App continued moves/recovery/deletion and invalid-save warning passed');
