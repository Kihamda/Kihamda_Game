const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const game = 'sum';
const oldScript = execFileSync('git', ['show', 'cbbcf05:site/game.js']);
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
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    for (const mode of ['easy','normal','hard','oni','kiwami']) {
      const context = await browser.newContext();
      try {
        const page=await context.newPage(), older=await context.newPage(), blocker=await context.newPage(), errors=[];
        for (const [p,date] of [[page,'2026-11-08'],[older,'2026-11-07'],[blocker,'2026-11-08']]) {
          p.on('pageerror', e=>errors.push(e.message));
          await p.addInitScript(date=>{const NativeDate=Date, now=NativeDate.parse(`${date}T03:00:00Z`); window.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:[now]));} static now(){return now;}};},date);
        }
        const version=2, id=`sum-${mode}-v${version}`, key=`kihamda-daily-${id}`;
        const base=`http://127.0.0.1:${server.address().port}`, query=`mode=daily&difficulty=${mode}&version=${version}`;
        await page.goto(fixed ? `${base}/play-${game}.html?${query}` : `${base}/game.html?game=${game}&${query}`);
        await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        await older.goto(`${base}/old/game.html?game=${game}&${query}`);
        await older.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        await blocker.goto(fixed ? `${base}/play-${game}.html?${query}` : `${base}/game.html?game=${game}&${query}`);
        await blocker.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const read=()=>page.evaluate(async id=>{const db=await openDailyDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('games'), store=tx.objectStore('games'), records=store.get(id), meta=store.get(`source:${id}`);tx.oncomplete=()=>{db.close();resolve({records:records.result,meta:meta.result})};tx.onabort=()=>reject(tx.error)});},id);
        await page.locator('#board button').first().click();
        await page.waitForFunction(async id=>{const db=await openDailyDatabase();return new Promise(resolve=>{const tx=db.transaction('games'), req=tx.objectStore('games').get(id);tx.oncomplete=()=>{db.close();resolve(req.result?.some(r=>r.date==='2026-11-08' && r.moves===1))}})},id);
        const before=await read();
        await blocker.evaluate(async ()=>{const db=await openDailyDatabase();window.releaseWrite=false;window.lockFinished=new Promise((resolve,reject)=>{const tx=db.transaction('games','readwrite'),store=tx.objectStore('games');tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>reject(tx.error);function keep(){const req=store.get('__interleaving_check__');req.onsuccess=()=>{window.lockHeld=true;if(!window.releaseWrite)keep()};}keep();});});
        await blocker.waitForFunction(()=>window.lockHeld===true);
        await page.evaluate(()=>{window.queuedWrites=0;const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(store,mode,...args){if(mode==='readwrite')window.queuedWrites++;return original.call(this,store,mode,...args)}});
        await page.locator('#board button').nth(1).click();
        await page.waitForFunction(()=>window.queuedWrites>0);
        await older.locator('#board button').first().click();
        await older.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.date==='2026-11-07',key);
        const legacy=await older.evaluate(key=>localStorage.getItem(key),key);
        await page.getByText('別のタブの記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.locator('#restart').isDisabled(), true);
        assert.equal(await page.locator('#board button:enabled').count(), 0);
        await blocker.evaluate(()=>{window.releaseWrite=true});
        await blocker.evaluate(()=>window.lockFinished);
        assert.deepEqual(await read(),before);
        assert.equal(await older.evaluate(key=>localStorage.getItem(key),key),legacy);
        await page.reload();
        await page.getByText('日付ごとに記録を選んでね').waitFor();
        await page.getByLabel('2026-11-07 の記録').selectOption('versioned');
        await page.getByRole('button',{name:'選択内容を確認'}).click();
        await page.getByRole('button',{name:'この内容で保存'}).click();
        await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const after=await read(), restored=after.records.find(r=>r.date==='2026-11-07');
        assert.deepEqual(restored,JSON.parse(legacy));
        assert.deepEqual(after.records.find(r=>r.date==='2026-11-08'),before.records.find(r=>r.date==='2026-11-08'));
        assert.equal(await older.evaluate(key=>localStorage.getItem(key),key),legacy);
        assert.deepEqual(errors,[]);
        console.log(`${fixed?'fixed':'dynamic'} ${game} ${mode}: queued save rejected after previous-day old tab write; recovery retained both days`);
      } finally {await context.close();}
    }
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
