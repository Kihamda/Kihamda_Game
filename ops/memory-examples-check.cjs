// Independent list-based search for the documented examples.
const assert=require('assert');
function removePair(cards,a,b){assert.notEqual(a,b);const next=[...cards],i=next.indexOf(a);assert(i>=0);next.splice(i,1);const j=next.indexOf(b);assert(j>=0);next.splice(j,1);return next}
function checkPartition(cards,pairs,match){let rest=[...cards];for(const [a,b] of pairs){assert(match(a,b));rest=removePair(rest,a,b)}assert.equal(rest.length,0)}
checkPartition(['A','B','B','A'].map((s,i)=>`${s}${i}`),[['A0','A3'],['B1','B2']],(a,b)=>a[0]===b[0]);
const normal=['A','B','C','D','E','F','G','H','C','A','D','B','H','G','F','E'].map((s,i)=>`${s}${i}`);
checkPartition(normal,[['A0','A9'],['B1','B11'],['C2','C8'],['D3','D10'],['E4','E15'],['F5','F14'],['G6','G13'],['H7','H12']],(a,b)=>a[0]===b[0]);
checkPartition(Array.from({length:16},(_,i)=>i+1),Array.from({length:8},(_,i)=>[i*2+1,i*2+2]),(a,b)=>a%2===1&&b===a+1);
const cards=Array.from({length:16},(_,i)=>i),shape=n=>Math.floor(n/4),number=n=>n%4;
checkPartition(cards,Array.from({length:4},(_,i)=>[[i*4,i*4+3],[i*4+1,i*4+2]]).flat(),(a,b)=>shape(a)===shape(b)&&number(a)+number(b)===3);
function canComplete(rest,round,memo=new Map()){
  if(!rest.length)return [];
  const key=rest.join(',')+':'+round%2;if(memo.has(key))return null;
  for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++){
    const a=rest[i],b=rest[j],matches=round%2===0?number(a)===number(b):shape(a)===shape(b);
    if(matches){const next=rest.filter((_,k)=>k!==i&&k!==j),tail=canComplete(next,round+1,memo);if(tail)return [[a,b],...tail]}
  }memo.set(key,true);return null;
}
const prefix=[[0,4],[1,2],[3,7],[8,9]];let rest=cards;for(const [a,b] of prefix)rest=removePair(rest,a,b);
assert.equal(canComplete(removePair(rest,6,10),5),null,'documented matching-number choice must be a dead end');
const safe=canComplete(removePair(rest,5,13),5);assert(safe,'documented alternative must allow completion');
const initial=canComplete(cards,0);assert(initial&&initial.length===8);checkPartition(cards,initial,()=>true);
const documented=[[0,4],[1,2],[3,7],[5,6],[8,12],[9,10],[11,15],[13,14]];let phase=0;
checkPartition(cards,documented,(a,b)=>phase++%2===0?number(a)===number(b):shape(a)===shape(b));
console.log(JSON.stringify({easy:'valid',normal:'valid',hard:'valid',oni:'valid',extreme:'valid',deadEnd:[6,10],alternative:[5,13],remainingSafeRoute:safe}));
