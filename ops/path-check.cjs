const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const element = () => ({classList:{remove(){}},style:{},replaceChildren(){},setAttribute(){},addEventListener(){}});
const elements = new Map();
const context = {URLSearchParams,location:{search:'?game=unknown'},document:{body:{dataset:{},classList:{remove(){}}},querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)}}};
vm.runInNewContext(fs.readFileSync('site/game.js','utf8'),context);
let previous;
for(let n=0;n<3653;n++){
  const d=new Date(Date.UTC(2026,0,1)+n*86400000),args=[d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate()];
  const puzzle=JSON.parse(JSON.stringify(context.generatePathPuzzle(...args)));
  assert.deepEqual(JSON.parse(JSON.stringify(context.generatePathPuzzle(...args))),puzzle);
  assert.equal(new Set(puzzle.solution).size,16);
  assert(puzzle.solution.every(i=>Number.isInteger(i)&&i>=0&&i<16));
  for(let i=1;i<16;i++)assert(context.pathNeighbors(puzzle.solution[i-1]).includes(puzzle.solution[i]));
  assert.equal(puzzle.start,puzzle.solution[0]);
  assert.deepEqual(puzzle.checkpoints,[puzzle.solution[4],puzzle.solution[8],puzzle.solution[12]]);
  assert.equal(puzzle.goal,puzzle.solution[15]);
  let solutions=0;
  function countSolutions(cell,visited,nextCheckpoint){
    if(cell===puzzle.goal){if(visited===0xffff&&nextCheckpoint===3)solutions++;return;}
    for(const next of context.pathNeighbors(cell)){
      if(visited&(1<<next))continue;
      const checkpoint=puzzle.checkpoints.indexOf(next);
      if(checkpoint>=0&&checkpoint!==nextCheckpoint)continue;
      countSolutions(next,visited|(1<<next),nextCheckpoint+(checkpoint>=0?1:0));
    }
  }
  countSolutions(puzzle.start,1<<puzzle.start,0);
  assert(solutions>=1&&solutions<=6,`${d.toISOString()}: ${solutions} solutions`);
  if(previous)assert.notDeepEqual([puzzle.start,puzzle.checkpoints,puzzle.goal],previous);
  previous=[puzzle.start,puzzle.checkpoints,puzzle.goal];
}
console.log('Daily path: 3653 deterministic puzzles, 1-6 solutions and distinct consecutive boards passed');
