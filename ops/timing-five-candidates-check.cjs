const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('site/game.js','utf8');
const code=source.slice(source.indexOf('let timingDifficulty='),source.indexOf("let dodgeDifficulty="));
const api=vm.runInNewContext(`${code};({infer:timingInferIntervals,evaluate:timingEvaluate,pools:timingChallengePools})`);
const cluesSeen=new Set();let count=0;
for(let a=1000;a<=3000;a+=500)for(let b=1000;b<=3000;b+=500)for(let c=1000;c<=3000;c+=500)for(let d=1000;d<=3000;d+=500)for(let e=1000;e<=3000;e+=500){
 const values=[a,b,c,d,e],clues=values.map((v,i)=>v+values[(i+1)%5]),key=clues.join(',');
 assert(!cluesSeen.has(key),`ambiguous ${key}`);cluesSeen.add(key);
 assert.deepEqual(Array.from(api.infer(clues)),values);assert.equal(api.evaluate('kiwami',values,clues).totalError,0);count++;
}
for(let a=1000;a<=3000;a+=1000)for(let b=1000;b<=3000;b+=1000)for(let c=1000;c<=3000;c+=1000)for(let d=1000;d<=3000;d+=1000){const sequence=[a,b,c,d];assert.equal(api.evaluate('oni',[d,c,b,a],sequence).totalError,0)}
const pools=api.pools();assert.equal(pools.oni.length,72);assert.equal(pools.kiwami.length,1690);
for(const values of pools.oni)assert(values[0]!==values[3]||values[1]!==values[2]);
for(const values of pools.kiwami){assert(new Set(values).size>=3);assert(new Set(values.map((v,i)=>v+values[(i+1)%5])).size>=4)}
console.log(`${count} unique clue sets, 81 reverse sequences, and filtered pools of 1690 extreme and 72 reverse challenges passed`);
