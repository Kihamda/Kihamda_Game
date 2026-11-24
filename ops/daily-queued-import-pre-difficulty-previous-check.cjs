const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const revisions = {path:'95ebeca^', sum:'4a1bd05^'};
const game = process.argv[2];
if (!revisions[game]) throw new Error('Specify path or sum');
const oldScript = execFileSync('git', ['show', `${revisions[game]}:site/game.js`]);
const root = path.resolve(process.env.SITE_DIR || 'site'), oldRoot = path.resolve('site');
const fixed = process.env.RECOVERY_FIXED === '1';
const server = http.createServer((req, res) => {
  let name = new URL(req.url, 'http://localhost').pathname;
  if (name === '/old/game.js') return res.writeHead(200, {'Content-Type':'text/javascript'}).end(oldScript);
  const old = name.startsWith('/old/'); if (old) name = name.slice(4);
  const base = old ? oldRoot : root, file = path.resolve(base, '.' + name);
  if (!file.startsWith(base + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (error, data) => error ? res.writeHead(404).end() : res.writeHead(200, {'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(file)] || 'text/plain'}).end(data));
});
async function play(page, date) {
  const index = await page.evaluate(({game,date}) => {
    const key = `kihamda-daily-${game}`;
    const records = [localStorage.getItem(key), localStorage.getItem(key+'-previous')].map(raw => JSON.parse(raw || 'null'));
    const saved = records.find(item => item?.date === date);
    if (game === 'sum') return saved?.moves || 0;
    const [year,month,day] = date.split('-').map(Number);
    const puzzle = generatePathPuzzle(year,month,day);
    return puzzle.solution[(saved?.route || [puzzle.start]).length];
  }, {game,date});
  assert.notEqual(index, undefined);
  await page.locator('#board button').nth(index).click();
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    const context = await browser.newContext();
    try {
      const older = await context.newPage(), seed = await context.newPage(), blocker = await context.newPage(), page = await context.newPage(), errors = [];
      for (const [p,date] of [[older,'2026-11-07'],[seed,'2026-11-08'],[blocker,'2026-11-08'],[page,'2026-11-08']]) {
        p.on('pageerror', e => errors.push(e.message));
        await p.addInitScript(date => {const NativeDate=Date, now=NativeDate.parse(`${date}T03:00:00Z`); window.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:[now]))} static now(){return now}}}, date);
      }
      const id = `${game}-normal-v2`, key = `kihamda-daily-${game}`, previous = `${key}-previous`;
      const base = `http://127.0.0.1:${server.address().port}`, query = 'mode=daily&difficulty=normal&version=2';
      await older.goto(`${base}/old/game.html?game=${game}`);
      await older.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
      await play(older,'2026-11-07');
      await seed.goto(`${base}/old/game.html?game=${game}`);
      await seed.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
      await play(seed,'2026-11-08');
      const before = await seed.evaluate(({key,previous}) => [localStorage.getItem(key),localStorage.getItem(previous)], {key,previous});
      assert.equal(JSON.parse(before[0]).date,'2026-11-08');
      assert.equal(JSON.parse(before[1]).date,'2026-11-07');
      await blocker.goto(`${base}/index.html`);
      await blocker.evaluate(async id => {
        const db = await new Promise((resolve,reject) => {const req=indexedDB.open('kihamda-games-daily',1);req.onupgradeneeded=()=>req.result.createObjectStore('games');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
        db.onversionchange=()=>db.close();
        await new Promise((resolve,reject)=>{const tx=db.transaction('games','readwrite');tx.objectStore('games').put({marker:'existing archive'},`multi-backup:${id}:existing`);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});
        window.releaseWrite=false;
        window.lockFinished=new Promise((resolve,reject)=>{const tx=db.transaction('games','readwrite'),s=tx.objectStore('games');tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>reject(tx.error);function keep(){const req=s.get('__lock__');req.onsuccess=()=>{window.lockHeld=true;if(!window.releaseWrite)keep()}}keep()});
      },id);
      await blocker.waitForFunction(()=>window.lockHeld===true);
      await page.addInitScript(()=>{window.queuedWrites=0;const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(store,mode,...args){if(mode==='readwrite')window.queuedWrites++;return original.call(this,store,mode,...args)}});
      await page.goto(fixed?`${base}/play-${game}.html?${query}`:`${base}/game.html?game=${game}&${query}`);
      await page.waitForFunction(()=>window.queuedWrites>0);
      await play(older,'2026-11-07');
      await older.waitForFunction(({previous,old})=>localStorage.getItem(previous)!==old,{previous,old:before[1]});
      const updated = await older.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous});
      assert.equal(updated[0],before[0]);
      assert.equal(JSON.parse(updated[1]).moves,2);
      await page.getByText(game==='sum'?'以前の記録が変わったよ。画面を開き直してね。':'記録が変わったよ。画面を開き直してね。').waitFor();
      assert.equal(await page.locator('#board button:enabled').count(),0);
      await blocker.evaluate(()=>{window.releaseWrite=true});
      await blocker.evaluate(()=>window.lockFinished);
      const after=await blocker.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('kihamda-games-daily',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('games'),s=tx.objectStore('games'),keys=s.getAllKeys(),values=s.getAll();tx.oncomplete=()=>{db.close();resolve({keys:keys.result,values:values.result})};tx.onabort=()=>reject(tx.error)}}));
      assert.deepEqual(after,{keys:[`multi-backup:${id}:existing`],values:[{marker:'existing archive'}]});
      assert.deepEqual(await page.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous}),updated);
      await page.reload();
      await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
      const recovered=await page.evaluate(async id=>{
        const db=await openDailyDatabase();
        return new Promise((resolve,reject)=>{const tx=db.transaction('games'),store=tx.objectStore('games'),records=store.get(id),source=store.get(`source:${id}`),archive=store.get(`multi-backup:${id}:existing`);tx.oncomplete=()=>{db.close();resolve({records:records.result,source:source.result,archive:archive.result})};tx.onabort=()=>reject(tx.error)});
      },id);
      assert.deepEqual(recovered.records.map(record=>record.date),['2026-11-08','2026-11-07']);
      assert.deepEqual(recovered.records.map(record=>record.moves),[1,2]);
      for (let i=0;i<2;i++) {
        const old=JSON.parse(updated[i]);
        if (game==='path') assert.deepEqual(recovered.records[i].steps,old.route.slice(1).map(cell=>[cell]));
        else assert.deepEqual(recovered.records[i].owners,old.cells.map(cell=>cell?0:-1));
      }
      assert.deepEqual(recovered.source.legacySnapshot,updated);
      assert.deepEqual(recovered.archive,{marker:'existing archive'});
      assert.deepEqual(await page.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous}),updated);
      const readAll = () => page.evaluate(async()=>{
        const db=await openDailyDatabase();
        return new Promise((resolve,reject)=>{const tx=db.transaction('games'),store=tx.objectStore('games'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>{db.close();resolve(Object.fromEntries(keys.result.map((key,index)=>[key,values.result[index]])))};tx.onabort=()=>reject(tx.error)});
      });
      const beforeReload=await readAll();
      assert.deepEqual(beforeReload[id],recovered.records);
      assert.deepEqual(beforeReload[`source:${id}`],recovered.source);
      assert.deepEqual(beforeReload[`multi-backup:${id}:existing`],recovered.archive);
      await page.reload();
      await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
      assert.deepEqual(await readAll(),beforeReload);
      assert.deepEqual(await page.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous}),updated);
      assert.deepEqual(errors,[]);
      console.log(`${fixed?'fixed':'dynamic'} ${game}: queued import stopped after pre-difficulty previous-day update; both days and archive persisted across reloads`);
    } finally {await context.close()}
  } finally {await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
