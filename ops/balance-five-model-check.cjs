const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('site/game.js','utf8');
const first=source.slice(0,source.indexOf('let balanceDifficulty='));
const storage=source.slice(source.indexOf('function createSession('),source.indexOf('function makeValidator('));
const api=vm.runInThisContext(storage+'\n'+first.replace('return makeSession;','return {makeSession,configs,dailyPuzzle,compare,validate};')+'\nmakeBalanceSession');
const assert=require('assert'),{configs,dailyPuzzle,compare,validate}=api;
for(const mode of Object.keys(configs)){
 const seen=new Set();for(let i=0;i<3653;i++){
  const date=new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10),p=dailyPuzzle(date,mode),config=configs[mode];assert.deepStrictEqual(p,dailyPuzzle(date,mode));assert(validate(p,{history:[],count:0,answer:[],finished:false}));seen.add(p.order.join(','));
  const history=[];let count=0;for(let j=0;j<(config.limit??12);j++){const a=j%config.size,b=(a+1)%config.size,item=compare(p,history,a,b);if(config.limit!==null||!history.some(x=>x.a===a&&x.b===b||x.a===b&&x.b===a))history.push(item);count++;assert(validate(p,{history,count,answer:[],finished:false}))}
  const corrupt=history.map(x=>({...x}));corrupt[0].lighter=corrupt[0].lighter===corrupt[0].a?corrupt[0].b:corrupt[0].a;assert(!validate(p,{history:corrupt,count,answer:[],finished:false}));if(config.limit!==null)assert.throws(()=>compare(p,history,0,1));assert(!validate(p,{history:[],count:0,answer:[0,0],finished:false}));assert(!validate(p,{history:[],count:0,answer:[0],finished:true}));
 }console.log(mode,'3653 deterministic, valid, replayable days;',seen.size,'orders');
}
