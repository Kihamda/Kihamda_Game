const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const values=new Map(), localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const element=()=>({classList:{remove(){}},style:{},replaceChildren(){},setAttribute(){},addEventListener(){}}),elements=new Map();
const context={URLSearchParams,window:{localStorage},location:{search:'?game=unknown'},document:{body:{dataset:{},classList:{remove(){}}},querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)}}};
vm.runInNewContext(fs.readFileSync('site/game.js','utf8'),context);
const storage=date=>context.dailyStorage('test',date), get=name=>JSON.parse(values.get('kihamda-daily-test'+name));
values.set('kihamda-daily-test',JSON.stringify({date:'2026-10-27',moves:5}));
assert.equal(storage('2026-10-27').load().moves,5); // Existing data is still readable.
storage('2026-10-28').save({moves:1});assert.equal(get('').date,'2026-10-28');assert.equal(get('-previous').moves,5);
storage('2026-10-27').save({moves:6});assert.equal(get('').moves,1);assert.equal(get('-previous').moves,6);
storage('2026-10-29').save({moves:2});assert.equal(get('').date,'2026-10-29');assert.equal(get('-previous').date,'2026-10-28');
storage('2026-10-27').save({moves:7});assert.equal(get('-previous').date,'2026-10-28');
storage('2026-10-27').clear();assert.equal(get('').date,'2026-10-29');assert.equal(get('-previous').date,'2026-10-28');
storage('2026-10-29').clear();assert.equal(get('-previous').date,'2026-10-28');
storage('2026-10-27').save({moves:8});assert.equal(get('').date,'2026-10-28');assert.equal(get('-previous').date,'2026-10-27');
storage('2026-10-30').save({moves:9});assert.equal(get('-previous').date,'2026-10-28');
values.set('kihamda-daily-test','bad json');storage('2026-10-29').save({moves:3});assert.equal(get('').moves,3);
assert(values.size<=2);console.log('Daily storage: legacy data, older tab, bounded records, date-specific reset and corrupt data passed');
