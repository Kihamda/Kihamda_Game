const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const element=()=>({classList:{remove(){}},style:{},replaceChildren(){},setAttribute(){},addEventListener(){}}),elements=new Map();
const context={URLSearchParams,location:{search:'?game=unknown'},document:{body:{dataset:{},classList:{remove(){}}},querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)}}};
vm.runInNewContext(fs.readFileSync('site/game.js','utf8'),context);
const fixtures=JSON.parse(fs.readFileSync('ops/circuit-fixtures.json','utf8'));
for(const mode of ['normal','hard','4','5']) {
 const size=mode==='4'?4:mode==='5'?5:3, seen=new Set();let previous='';
 for(let day=0;day<3653;day++) {
  const date=new Date(Date.UTC(2026,0,1)+day*86400000),args=[date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate()],dayNumber=Math.floor(date.getTime()/86400000);
  const generate=()=>mode==='normal'?context.generateNormalCircuitPuzzle(...args):mode==='hard'?context.generateHardCircuitPuzzle(...args):context.generateHighCircuitPuzzle(...args,size);
  const p=generate();assert.equal(JSON.stringify(p),JSON.stringify(generate()));
  const board=Array.from(p.masks,(m,i)=>context.rotateCircuit(m,p.turns[i])),start=p.start??0,end=p.end??8;
  assert(!context.circuitSolved(board,size,start,end));const key=`${start}:${end}:${board.join(',')}`;assert.notEqual(key,previous);previous=key;seen.add(key);
  const index=((dayNumber+73*Math.floor(dayNumber/256))%256+256)%256,sample=fixtures[mode][index];
  assert.equal(sample.presses.length,size*size);assert.equal(sample.presses.reduce((a,b)=>a+b,0),sample.distance);
  for(let i=0;i<size*size;i++)for(let k=0;k<sample.presses[i];k++){
   const targets=mode==='normal'?[i,...(i%size<size-1?[i+1]:[])]:[i,...[-size,size,...(i%size?[-1]:[]),...(i%size<size-1?[1]:[])].map(d=>i+d).filter(j=>j>=0&&j<size*size)];
   for(const j of targets)board[j]=context.rotateCircuit(board[j]);
  }
  assert(context.circuitSolved(board,size,start,end),`${mode} ${date.toISOString()}`);
 }
 assert.equal(seen.size,256);console.log(`${mode}: 3653 deterministic dates, 256 boards and all solutions passed`);
}
