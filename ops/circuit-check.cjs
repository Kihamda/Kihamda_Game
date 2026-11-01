const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const element=()=>({classList:{remove(){}},style:{},replaceChildren(){},setAttribute(){},addEventListener(){}});
const elements=new Map(),context={URLSearchParams,location:{search:'?game=unknown'},document:{body:{dataset:{},classList:{remove(){}}},querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)}}};
vm.runInNewContext(fs.readFileSync('site/game.js','utf8'),context);
const boards=new Set();let previous='';
for(let n=0;n<3653;n++){
 const d=new Date(Date.UTC(2026,0,1)+n*86400000), args=[d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate()];
 const p=context.generateCircuitPuzzle(...args), again=context.generateCircuitPuzzle(...args);
 assert.equal(JSON.stringify(p),JSON.stringify(again));assert(context.circuitSolved(p.masks));
 const initial=p.masks.map((m,i)=>context.rotateCircuit(m,p.turns[i]));assert(!context.circuitSolved(initial));
 assert(p.masks.every(x=>[3,5,6,9,10,12].includes(x)));
 const key=initial.join(',');boards.add(key);assert.notEqual(key,previous);previous=key;
}
const solved=context.generateCircuitPuzzle(2026,10,28).masks;
const full=context.circuitTrace(solved);assert(full.won);assert.equal(full.reached.length,9);
const disconnected=[...solved];disconnected[0]=context.rotateCircuit(disconnected[0]);
assert.deepEqual(Array.from(context.circuitTrace(disconnected).reached),[]);
const second=full.reached[1],broken=[...solved];
while(context.circuitTrace(broken).reached.includes(second))broken[second]=context.rotateCircuit(broken[second]);
assert.deepEqual(Array.from(context.circuitTrace(broken).reached),[0]);
assert(boards.size>1000,`insufficient board variety: ${boards.size}`);
console.log(`Circuit: 3653 deterministic, solvable, unsolved initial puzzles; ${boards.size} boards`);
const easyBoards=new Set();let previousEasy='';
for(let n=0;n<3653;n++){
 const d=new Date(Date.UTC(2026,0,1)+n*86400000),args=[d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate()];
 const p=context.generateEasyCircuitPuzzle(...args),again=context.generateEasyCircuitPuzzle(...args);
 assert.equal(JSON.stringify(p),JSON.stringify(again));assert(context.circuitSolved(p.masks));
 const changed=Array.from(p.turns).flatMap((turn,i)=>turn?[i]:[]);assert(changed.length===1||changed.length===2);
 const initial=p.masks.map((mask,i)=>context.rotateCircuit(mask,p.turns[i]));assert(!context.circuitSolved(initial));
 const solved=[...initial];for(const index of changed)for(let i=0;i<3;i++)solved[index]=context.rotateCircuit(solved[index]);assert(context.circuitSolved(solved));
 const key=initial.join(',');assert.notEqual(key,previousEasy);previousEasy=key;easyBoards.add(key);
}
assert.equal(easyBoards.size,31);
console.log('Easy circuit: 3653 reproducible, solvable puzzles; 31 boards, no consecutive repeats');
