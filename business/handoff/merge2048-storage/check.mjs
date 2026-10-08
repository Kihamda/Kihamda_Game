// Reproduce failures before applying the review patch; no network/deployment.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here=dirname(fileURLToPath(import.meta.url));
const index=process.argv.indexOf('--source-root');
if(index<0 || !process.argv[index+1]) throw Error('--source-root with pinned game repository required');
const root=resolve(process.argv[index+1]);
const patchIndex=process.argv.indexOf('--patched-root');
if(patchIndex<0 || !process.argv[patchIndex+1])throw Error('--patched-root after git apply required');
const patchedRoot=resolve(process.argv[patchIndex+1]);
const require=createRequire(join(root,'package.json'));
const ts=require('typescript');
const rel='games/merge2048/src/lib/game.ts';
const before=readFileSync(join(root,rel),'utf8');
const baseline=JSON.parse(readFileSync(join(here,'baseline.json'),'utf8'));
assert.equal(createHash('sha256').update(before).digest('hex'),baseline.game_ts_sha256,'wrong source version; review patch before applying');
const temp=mkdtempSync(join(tmpdir(),'income-2048-regression-'));
const passed=[];
const test=(name,fn)=>{fn();passed.push(name);};
const storage=(value=null,readError=false,writeError=false)=>{
  const writes=[];
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:()=>{if(readError)throw Error('storage read denied');return value;},
    setItem:(key,v)=>{if(writeError)throw Error('quota exceeded');writes.push([key,v]);}
  }});
  return writes;
};
const state=()=>({tiles:[{id:1,value:2,row:0,col:0},{id:2,value:2,row:0,col:1}],score:0,bestScore:0,gameOver:false,won:false,nextId:3});
const compile=(text,name)=>{
  const result=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
  assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  writeFileSync(join(temp,name),result.outputText);
  return require(join(temp,name));
};
try{
  const original=compile(before,'original.cjs');
  test('before: storage read denial crashes init',()=>{storage(null,true);assert.throws(()=>original.initGame());});
  test('before: quota failure crashes scoring move',()=>{storage(null,false,true);assert.throws(()=>original.moveWithResult(state(),'left'));});
  test('before: malformed score becomes NaN',()=>{storage('broken');assert.ok(Number.isNaN(original.initGame().bestScore));});
  const storageSource=readFileSync(join(patchedRoot,'games/merge2048/src/lib/storage.ts'),'utf8');
  assert.equal(storageSource,readFileSync(join(here,'storage.ts'),'utf8'),'patch storage differs from reviewed implementation');
  compile(storageSource,'storage.js');
  const game=compile(readFileSync(join(patchedRoot,rel),'utf8'),'fixed.cjs');
  test('after: denied read starts playable game',()=>{storage(null,true);assert.equal(game.initGame().bestScore,0);assert.equal(game.initGame().tiles.length,2);});
  test('after: unavailable global storage starts game',()=>{delete globalThis.localStorage;assert.equal(game.initGame().bestScore,0);});
  test('after: throwing storage getter starts game',()=>{Object.defineProperty(globalThis,'localStorage',{configurable:true,get:()=>{throw Error('SecurityError');}});assert.equal(game.initGame().bestScore,0);});
  test('after: malformed and unsafe scores are rejected',()=>{for(const raw of ['broken','12px','-3','1.5','Infinity','9007199254740992','']){storage(raw);assert.equal(game.initGame().bestScore,0,raw);}});
  test('after: valid persisted score restored',()=>{storage('42');assert.equal(game.initGame().bestScore,42);});
  test('after: denied write preserves move and session best',()=>{storage(null,false,true);const r=game.moveWithResult(state(),'left');assert.equal(r.state.score,4);assert.equal(r.state.bestScore,4);assert.equal(r.moved,true);assert.equal(r.state.tiles.length,2);});
  test('after: valid write uses existing key and value',()=>{const writes=storage();game.moveWithResult(state(),'left');assert.deepEqual(writes,[['merge2048-best','4']]);});
  const report={result:'PASS',baseline_commit:baseline.commit,patch_sha256:createHash('sha256').update(readFileSync(join(here,'fix.patch'))).digest('hex'),checks:passed,not_verified:['mobile browser interaction','production deployment','actual traffic and revenue'],external_actions:[]};
  writeFileSync(join(here,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{
  delete globalThis.localStorage;rmSync(temp,{recursive:true,force:true});
}
