const assert=require('assert');
const tested=require('child_process').execFileSync(process.execPath,[require('path').join(__dirname,'order-difficulty-explore.cjs')],{encoding:'utf8'});
const paths=Object.fromEntries(tested.trim().split('\n').map(line=>{const [mode,values]=line.split(': ');return [mode,values.split(' ').map(Number)]}));
let low=1,high=16;for(const [i,value] of paths.hard.entries()){assert.equal(value,i%2?high--:low++)}
let odd=1,even=16;for(const [i,value] of paths.oni.entries()){if(i%2){assert.equal(value,even);even-=2}else{assert.equal(value,odd);odd+=2}}
let value=1;const seen=new Set();for(const n of paths.kiwami){assert.equal(n,value);assert(!seen.has(value));seen.add(value);value*=3;while(value>=17)value-=17}assert.equal(value,1);assert.equal(seen.size,16);
console.log('Independent checks: alternating extremes, parity rules, and complete 3-times modulo 17 cycle passed');
