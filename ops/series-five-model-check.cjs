const assert=require('assert'),{candidates}=require('./series-five-test-api.cjs');
for(const mode of ['easy','hard','oni','kiwami']){
  const seen=new Map(),answers=new Set();
  for(const q of candidates(mode)){
    assert(q.terms.every(Number.isSafeInteger));assert(Number.isSafeInteger(q.answer));
    const key=q.terms.join(',');if(seen.has(key))assert.equal(seen.get(key),q.answer,'same clue has different answers');seen.set(key,q.answer);answers.add(q.answer);
    if(mode==='easy')assert.equal(q.answer-q.terms.at(-1),q.terms[1]-q.terms[0]);
    if(mode==='hard'){const d=q.terms.slice(1).map((v,i)=>v-q.terms[i]);assert(d.slice(1).every((x,i)=>x-d[i]===d[1]-d[0]));assert.equal(q.answer-q.terms.at(-1),d.at(-1)+d[1]-d[0]);}
    if(mode==='oni'){const odds=q.terms.filter((_,i)=>i%2===0),evens=q.terms.filter((_,i)=>i%2===1);assert.equal(q.answer-odds.at(-1),odds[1]-odds[0]);assert(evens.slice(1).every((v,i)=>v-evens[i]===evens[1]-evens[0]));}
    if(mode==='kiwami'){
      const values=[...q.terms,q.answer],diff=values.slice(1).map((v,i)=>(v-values[i]+7)%7);
      if(q.rule==='和')for(let i=2;i<values.length;i++)assert.equal(values[i],(values[i-2]+values[i-1])%7);
      if(q.rule==='増分')for(let i=1;i<diff.length;i++)assert.equal(diff[i],(diff[i-1]+1)%7);
      if(q.rule==='交互')for(let i=2;i<diff.length;i++)assert.equal(diff[i],diff[i-2]);
    }
  }
  assert(answers.size>=3);console.log(mode,seen.size,'distinct clues, one answer within the stated rule and',answers.size,'answers');
}
