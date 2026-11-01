// Does the nearest 8-7-6 checkpoint also minimize the total journey?
const assert=require('assert'),data=require('./slide-five-candidates.json'),goal='123456780';
const adjacent=i=>[i-3,i+3,...(i%3?[i-1]:[]),...(i%3<2?[i+1]:[])].filter(j=>j>=0&&j<9);
const swap=(b,i,j)=>{const a=b.split('');[a[i],a[j]]=[a[j],a[i]];return a.join('')};
function fromGoal(){const q=[goal],d=new Map([[goal,0]]);for(let k=0;k<q.length;k++){const b=q[k],z=b.indexOf('0');for(const j of adjacent(z)){const n=swap(b,z,j);if(!d.has(n)){d.set(n,d.get(b)+1);q.push(n)}}}return d}
const distance=fromGoal();
function evaluate(start){
  const q=[start],d=new Map([[start,0]]);let nearest=Infinity,bestReturn=Infinity;
  for(let k=0;k<q.length;k++){const b=q[k],steps=d.get(b);if(steps>nearest)break;
    if(b.startsWith('876')){nearest=steps;bestReturn=Math.min(bestReturn,distance.get(b));continue}
    const z=b.indexOf('0');for(const j of adjacent(z)){const n=swap(b,z,j);if(!d.has(n)){d.set(n,steps+1);q.push(n)}}
  }return {nearest,nearestCost:nearest+bestReturn};
}
for(const mode of ['oni','kiwami']){
  const stats={nearestIsOptimal:0,requiresLongerFirstStage:0,requiresLongerThanCap:0},examples=[];
  for(const item of data[mode]){const x=evaluate(item.board),optimal=item.moves.length;if(x.nearestCost===optimal)stats.nearestIsOptimal++;else{stats.requiresLongerFirstStage++;if(x.nearestCost>(item.limit??Infinity))stats.requiresLongerThanCap++;if(examples.length<5)examples.push({board:item.board,optimal,limit:item.limit??null,...x})}}
  if(mode==='kiwami')assert.equal(stats.requiresLongerThanCap,data.kiwami.length,'extreme candidates must require a non-shortest first stage');
  console.log(JSON.stringify({mode,stats,examples}));
}
