// Four shapes x four labels, each combination once. Alternate matching labels and shapes.
const assert=require('assert'),cards=Array.from({length:16},(_,i)=>({shape:Math.floor(i/4),label:i%4}));
function options(mask,phase){const result=[];for(let i=0;i<16;i++)if(mask&(1<<i))for(let j=i+1;j<16;j++)if((mask&(1<<j))&&(phase===0?cards[i].label===cards[j].label:cards[i].shape===cards[j].shape))result.push([i,j]);return result}
const memo=new Map();
function canComplete(mask,phase){const key=mask*2+phase;if(memo.has(key))return memo.get(key);if(mask===0)return true;const ok=options(mask,phase).some(([a,b])=>canComplete(mask^(1<<a)^(1<<b),phase^1));memo.set(key,ok);return ok}
const queue=[{mask:65535,phase:0}],seen=new Set(['65535:0']),parents=new Map();let terminalLoss=0,wrongChoice=0;const levels={};let witness=null;
for(let k=0;k<queue.length;k++){
  const {mask,phase}=queue[k],count=mask.toString(2).replaceAll('0','').length;
  levels[count]??={states:0,solvable:0};levels[count].states++;if(canComplete(mask,phase))levels[count].solvable++;
  const pairs=options(mask,phase);if(mask&&pairs.length===0)terminalLoss++;
  const unsafe=pairs.find(([a,b])=>!canComplete(mask^(1<<a)^(1<<b),phase^1));
  if(canComplete(mask,phase)&&unsafe){wrongChoice++;if(count===8&&!witness)witness={mask,phase,unsafe,safe:pairs.find(([a,b])=>canComplete(mask^(1<<a)^(1<<b),phase^1))}}
  for(const [a,b] of pairs){const m=mask^(1<<a)^(1<<b),p=phase^1,key=`${m}:${p}`;if(!seen.has(key)){seen.add(key);parents.set(key,{key:`${mask}:${phase}`,pair:[a,b]});queue.push({mask:m,phase:p})}}
}
let mask=65535,phase=0,route=[];
while(mask){const pair=options(mask,phase).find(([a,b])=>canComplete(mask^(1<<a)^(1<<b),phase^1));if(!pair)throw Error('no route');route.push({rule:phase?'shape':'label',pair:pair.map(i=>cards[i])});mask^=(1<<pair[0])|(1<<pair[1]);phase^=1}
let key=`${witness.mask}:${witness.phase}`,prefix=[];while(parents.has(key)){const item=parents.get(key);prefix.push(item.pair);key=item.key}prefix.reverse();
assert.equal(seen.size,22084);assert.equal(terminalLoss,352);assert.equal(wrongChoice,11832);assert.equal(route.length,8);
console.log(JSON.stringify({reachableStates:seen.size,terminalLoss,statesWithWrongChoice:wrongChoice,levels,route,witness:{prefix,unsafe:witness.unsafe,safe:witness.safe}},null,2));
