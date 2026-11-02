const assert=require('assert'),fs=require('fs'),vm=require('vm'); const source=fs.readFileSync('site/game.js','utf8'); const start=source.indexOf('function recallAnswer('),end=source.indexOf('function timingCreateSession',start); if(start<0||end<0)throw Error('missing recall implementation'); const answer=vm.runInNewContext(source.slice(start,end)+'; recallAnswer');
for(const [mode,input,expected] of [
 ['easy',[0,1],[1,0]],['normal',[0,1,2],[2,1,0]],['hard',[0,1,3],[0,2,1]],
 ['oni',[0,1,2,3,0,1],[1,3,1,0,2,0]],['kiwami',[0,1,0,2,1,3],[0,2,3,1]]
])assert.deepEqual(Array.from(answer(mode,input)),expected);
let count=0;
for(let n=0;n<4096;n++){
 let x=n,sequence=[];for(let i=0;i<6;i++){sequence.push(x%4);x=Math.floor(x/4)}
 if(new Set(sequence).size!==4)continue;
 const latest=Array(4).fill(-1);sequence.forEach((v,i)=>latest[v]=i);
 const independent=[0,1,2,3].sort((a,b)=>latest[b]-latest[a]).map(v=>(v+1)%4);
 assert.deepEqual(Array.from(answer('kiwami',sequence)),independent);assert.equal(new Set(independent).size,4);count++;
}
for(let length=2;length<=8;length++)for(let n=0;n<4**length;n++){
 let x=n,sequence=[];for(let i=0;i<length;i++){sequence.push(x%4);x=Math.floor(x/4)}
 const reversed=[];for(let i=length-1;i>=0;i--)reversed.push(sequence[i]);
 assert.deepEqual(Array.from(answer('normal',sequence)),reversed);
 assert.deepEqual(Array.from(answer('hard',sequence)),reversed.map(x=>(x+1)%4));
 const even=[],odd=[];for(let i=length-1;i>=0;i--)((i+1)%2?odd:even).push(sequence[i]);assert.deepEqual(Array.from(answer('oni',sequence)),even.concat(odd));
 const distinct=[];for(let i=length-1;i>=0;i--)if(!distinct.includes(sequence[i]))distinct.push(sequence[i]);assert.deepEqual(Array.from(answer('kiwami',sequence)),distinct.map(x=>(x+1)%4));
}
console.log(`${count} extreme six-shape candidates, all sequences of lengths 2–8, and five representative answers passed`);
