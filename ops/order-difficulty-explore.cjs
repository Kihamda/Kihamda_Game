const assert=require('assert');
const levels={
  easy:[1,2,3,4],
  normal:Array.from({length:16},(_,i)=>i+1),
  hard:Array.from({length:16},(_,i)=>i%2===0?i/2+1:16-Math.floor(i/2)),
  oni:Array.from({length:16},(_,i)=>i%2===0?i+1:17-i),
  kiwami:Array.from({length:16},(_,i)=>{let value=1;for(let n=0;n<i;n++)value=value*3%17;return value}),
};
for(const [mode,route] of Object.entries(levels)){assert.equal(new Set(route).size,route.length);assert.deepEqual([...route].sort((a,b)=>a-b),Array.from({length:route.length},(_,i)=>i+1));console.log(`${mode}: ${route.join(' ')}`)}
