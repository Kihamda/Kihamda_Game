const assert=require('assert'),{createSession}=require('./series-five-test-api.cjs');
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
const store=storage();
for(const mode of ['easy','hard','oni','kiwami']){
  const a=createSession(store,mode,{random:()=>0}),b=createSession(store,mode,{random:()=>0});assert(a.load().ok);assert(b.load().ok);assert(a.hint().ok);assert.equal(b.answer(b.view().questions[0].answer).reason,'conflict');assert(b.load().ok);assert.equal(b.view().hints[0],true);
  for(let i=0;i<5;i++){assert(b.answer(b.view().questions[i].answer).ok);assert(b.advance().ok);}assert.equal(b.view().best,5);assert.equal(b.view().bestNoHint,null);assert(b.restart().ok);assert.equal(b.view().best,5);assert.equal(b.view().answers.length,0);for(let i=0;i<5;i++){b.answer(b.view().questions[i].answer+(i===0?100:0));b.advance();}assert.equal(b.view().best,5);assert.equal(b.view().bestNoHint,4);
  const resumed=createSession(store,mode,{random:()=>0.5});assert(resumed.load().ok);assert.equal(resumed.view().bestNoHint,4);assert.equal(resumed.view().answers.length,5);console.log(mode,'resume, conflict, optional hints, distinct best scores and restart passed');
}
const bad=storage();bad.setItem('kihamda-series-v1-easy','broken');const session=createSession(bad,'easy');assert.equal(session.load().warning,'unavailable');session.answer(session.view().questions[0].answer);assert.equal(bad.getItem('kihamda-series-v1-easy'),'broken');console.log('corrupt record is not overwritten');
