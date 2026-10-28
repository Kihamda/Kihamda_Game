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
assert(boards.size>1000,`insufficient board variety: ${boards.size}`);
console.log(`Circuit: 3653 deterministic, solvable, unsolved initial puzzles; ${boards.size} boards`);
