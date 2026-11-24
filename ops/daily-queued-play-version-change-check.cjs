const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const revisions = {circuit:'f7574a1', lights:'543fa8d', garden:'a014afd', path:'5b37aec', sort:'aae5968'};
const game = process.argv[2];
if (!revisions[game]) throw new Error('Specify circuit, lights, garden, path or sort');
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
async function play(page, mode, unsaved = false) {
  if (game === 'path') {
    const index = await page.evaluate(({mode,unsaved}) => { const p = generateFivePath(mode, '2026-11-08'); const saved=unsaved ? null : JSON.parse(localStorage.getItem(`kihamda-daily-path-${mode}-v2`) || 'null'); const steps=saved?.steps || []; return Array.from({length:(p.size || 5)**2}, (_, i) => i).find(i => validPathSteps(p, [...steps, p.portal?.includes(i) ? [i,p.portal[p.portal.indexOf(i)^1]] : [i]])); }, {mode,unsaved});
    assert.notEqual(index, undefined); await page.locator('#board button').nth(index).click();
  } else if (game === 'sort') {
    const move = await page.evaluate(mode => {
      const tubes = [...document.querySelectorAll('#board>button:not(.sort-undo)')].map(el => [...el.querySelectorAll('.sort-slot')].reverse().map(slot => slot.textContent).filter(Boolean));
      for (let from=0; from<tubes.length; from++) for (let to=0; to<tubes.length; to++) {
        const a=tubes[from], b=tubes[to]; if (from===to || !a.length || b.length===3 || (b.length && b.at(-1)!==a.at(-1))) continue;
        const next=tubes.map(t=>[...t]); next[to].push(next[from].pop());
        const won=['oni','kiwami'].includes(mode) ? next.every((t,i)=>i===3 ? !t.length : t.length===3 && t.every(c=>c===t[0])) : next.every(t=>!t.length || (t.length===3 && t.every(c=>c===t[0])));
        if (!won) return [from,to];
      }
    }, mode);
    assert.ok(move); for (const index of move) await page.locator('#board>button:not(.sort-undo)').nth(index).click();
  } else { const moves=await page.evaluate(()=>parseInt(document.querySelector('#status').textContent,10) || 0); await page.locator('#board button').nth(moves ? 1 : 0).click(); }
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    for (const mode of ['easy','normal','hard','oni','kiwami']) {
      const context = await browser.newContext();
      try {
        const page=await context.newPage(), older=await context.newPage(), blocker=await context.newPage(), errors=[];
        for (const p of [page,older,blocker]) p.on('pageerror', e=>errors.push(e.message));
        for (const [p,date] of [[page,'2026-11-08'],[older,'2026-11-07']]) await p.addInitScript(date=>{
          const NativeDate=Date, now=NativeDate.parse(`${date}T03:00:00Z`);
          window.Date=class extends NativeDate { constructor(...args){super(...(args.length ? args : [now]));} static now(){return now;} };
        },date);
        const version=game==='circuit' && mode==='normal' ? 3 : 2;
        const storageMode=game==='circuit' && mode==='hard' ? 'linked' : mode;
        const id=`${game}-${storageMode}-v${version}`, key=`kihamda-daily-${id}`;
        const base=`http://127.0.0.1:${server.address().port}`, query=`mode=daily&difficulty=${mode}&version=${version}`;
        await page.goto(fixed ? `${base}/play-${game}.html?${query}` : `${base}/game.html?game=${game}&${query}`);
        await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        await page.locator('#restart').click();
        await page.waitForFunction(()=>!document.querySelector('#restart').disabled);
        await page.evaluate(async id => {
          const db=await openDailyDatabase();
          await new Promise((resolve,reject)=>{const tx=db.transaction('games','readwrite');tx.objectStore('games').put({marker:'existing archive'},`multi-backup:${id}:existing`);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});
          db.close();
        },id);
        const before=await page.evaluate(async()=>{const db=await openDailyDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('games'),s=tx.objectStore('games'),keys=s.getAllKeys(),values=s.getAll();tx.oncomplete=()=>{db.close();resolve({keys:keys.result,values:values.result})};tx.onabort=()=>reject(tx.error)})});
        const legacy=await page.evaluate(key=>localStorage.getItem(key),key);
        await blocker.goto(fixed ? `${base}/play-${game}.html?${query}` : `${base}/game.html?game=${game}&${query}`);
        await blocker.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        await blocker.evaluate(async () => { const db=await openDailyDatabase(); db.onversionchange=()=>db.close(); window.releaseWrite=false; window.lockFinished=new Promise((resolve,reject)=>{ const tx=db.transaction('games','readwrite'), store=tx.objectStore('games'); tx.oncomplete=()=>{db.close();resolve()}; tx.onabort=()=>reject(tx.error); function keep(){const req=store.get('__interleaving_check__');req.onsuccess=()=>{window.lockHeld=true;if(!window.releaseWrite)keep()};} keep(); }); });
        await blocker.waitForFunction(()=>window.lockHeld===true);
        await page.evaluate(()=>{window.queuedWrites=0;const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(store,mode,...args){if(mode==='readwrite')window.queuedWrites++;return original.call(this,store,mode,...args)}});
        await play(page,mode);
        await page.waitForFunction(()=>window.queuedWrites>0);
        await blocker.evaluate(()=>{window.upgrade=new Promise((resolve,reject)=>{const request=indexedDB.open('kihamda-games-daily',2);request.onsuccess=()=>{request.result.close();resolve()};request.onerror=()=>reject(request.error)})});
        await page.getByText('記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.locator('#board button:enabled').count(), 0);
        await blocker.evaluate(()=>{window.releaseWrite=true});
        await blocker.evaluate(()=>Promise.all([window.lockFinished,window.upgrade]));
        const readAll = () => blocker.evaluate(() => new Promise((resolve,reject)=>{
          const request=indexedDB.open('kihamda-games-daily',2);
          request.onerror=()=>reject(request.error);
          request.onsuccess=()=>{const db=request.result,tx=db.transaction('games'),store=tx.objectStore('games'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>{db.close();resolve({keys:keys.result,values:values.result})};tx.onabort=()=>reject(tx.error)};
        }));
        const after = await readAll();
        assert.deepEqual(after, before);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        for (let attempt=0; attempt<2; attempt++) {
          await page.reload();
          await page.getByText('記録を読み込めないため、今回の進み具合は保存されないよ。').waitFor();
          await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
          const boardBefore=await page.locator('#board').innerHTML();
          await play(page,mode,true);
          assert.notEqual(await page.locator('#board').innerHTML(),boardBefore);
          assert.deepEqual(await readAll(),before);
          assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),legacy);
        }
        assert.deepEqual(errors, []);
        console.log(`${fixed?'fixed':'dynamic'} ${game} ${mode}: queued play save interrupted by database upgrade; records retained through reloads and unsaved play`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
