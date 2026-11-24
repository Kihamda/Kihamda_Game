const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
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
    // Keep the original idle-screen interruption check separate from the queued-write race.
    const idleContext = await browser.newContext();
    try {
      const idle = await idleContext.newPage(), upgrader = await idleContext.newPage(), errors = [];
      for (const page of [idle, upgrader]) page.on('pageerror', error => errors.push(error.message));
      const base = `http://127.0.0.1:${server.address().port}`;
      await idle.goto(fixed ? `${base}/play-circuit.html?mode=daily` : `${base}/game.html?game=circuit&mode=daily`);
      await idle.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
      await upgrader.goto(`${base}/old/game.html?game=unknown`);
      await upgrader.evaluate(() => new Promise((resolve, reject) => {
        const request = indexedDB.open('kihamda-games-daily', 2);
        request.onsuccess = () => { request.result.close(); resolve(); };
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(Error('blocked'));
      }));
      await idle.getByText('記録が変わったよ。画面を開き直してね。').waitFor();
      assert.equal(await idle.locator('#restart').isDisabled(), true);
      assert.equal(await idle.locator('#board button:enabled').count(), 0);
      assert.deepEqual(errors, []);
      console.log('database version change stops idle screen before writes');
    } finally { await idleContext.close(); }
    for (const mode of ['easy','normal','hard','oni','kiwami']) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage(), older = await context.newPage(), blocker = await context.newPage(), errors = [];
        for (const p of [page, older, blocker]) p.on('pageerror', e => errors.push(e.message));
        for (const [p, date] of [[page,'2026-11-08'], [older,'2026-11-07']]) await p.addInitScript(date => {
          const NativeDate = Date, now = NativeDate.parse(`${date}T03:00:00Z`);
          window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
        }, date);
        const version = mode === 'normal' ? 3 : 2;
        const base = `http://127.0.0.1:${server.address().port}`, id = `circuit-${mode === 'hard' ? 'linked' : mode}-v${version}`, key = `kihamda-daily-${id}`;
        const url = fixed ? `${base}/play-circuit.html?mode=daily&difficulty=${mode}&version=${version}` : `${base}/game.html?game=circuit&mode=daily&difficulty=${mode}&version=${version}`;
        await older.goto(`${base}/old/game.html?game=circuit&mode=daily&difficulty=${mode}&version=${version}`);
        await older.locator('#board button').first().click();
        await older.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('1手'));
        const legacy = await older.evaluate(key => localStorage.getItem(key), key);
        assert.ok(legacy);
        await older.close();
        await page.goto(url);
        await page.locator('#board button').first().click();
        await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('1手'));
        await page.waitForFunction(async id => {
          const db = await openDailyDatabase();
          return new Promise(resolve => { const tx=db.transaction('games'), q=tx.objectStore('games').get(id); tx.oncomplete=()=>{db.close();resolve(q.result?.some(record=>record.date==='2026-11-08' && record.moves===1))}; });
        }, id);
        await page.evaluate(async id => {
          const db=await openDailyDatabase();
          await new Promise((resolve,reject)=>{const tx=db.transaction('games','readwrite');tx.objectStore('games').put({marker:'existing archive'},`multi-backup:${id}:existing`);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});
          db.close();
        }, id);
        const before = await page.evaluate(async () => {
          const db=await openDailyDatabase();
          return new Promise((resolve,reject)=>{const tx=db.transaction('games'),store=tx.objectStore('games'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>{db.close();resolve({keys:keys.result,values:values.result})};tx.onabort=()=>reject(tx.error)});
        });
        assert.ok(before.keys.includes(id));
        assert.ok(before.keys.includes(`multi-backup:${id}:existing`));
        await blocker.goto(url);
        await blocker.locator('#board button').first().waitFor();
        await blocker.evaluate(async () => { const db=await openDailyDatabase(); db.onversionchange=()=>db.close(); window.releaseWrite=false; window.lockFinished=new Promise((resolve,reject)=>{ const tx=db.transaction('games','readwrite'), store=tx.objectStore('games'); tx.oncomplete=()=>{db.close();resolve()}; tx.onabort=()=>reject(tx.error); function keep(){const req=store.get('__interleaving_check__');req.onsuccess=()=>{window.lockHeld=true;if(!window.releaseWrite)keep()};} keep(); }); });
        await blocker.waitForFunction(()=>window.lockHeld===true);
        await page.evaluate(()=>{window.queuedWrites=0;const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(store,mode,...args){if(mode==='readwrite')window.queuedWrites++;return original.call(this,store,mode,...args)}});
        await page.locator('#board button').nth(1).click();
        await page.waitForFunction(()=>window.queuedWrites>0);
        await blocker.evaluate(()=>{window.upgrade=new Promise((resolve,reject)=>{const request=indexedDB.open('kihamda-games-daily',2);request.onsuccess=()=>{request.result.close();resolve()};request.onerror=()=>reject(request.error)})});
        await page.getByText('記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.locator('#restart').isDisabled(), true);
        assert.equal(await page.locator('#board button:enabled').count(), 0);
        await blocker.evaluate(()=>{window.releaseWrite=true});
        await blocker.evaluate(()=>Promise.all([window.lockFinished,window.upgrade]));
        const readAll = () => blocker.evaluate(() => new Promise((resolve,reject)=>{
          const request=indexedDB.open('kihamda-games-daily',2);
          request.onerror=()=>reject(request.error);
          request.onsuccess=()=>{const db=request.result,tx=db.transaction('games'),store=tx.objectStore('games'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>{db.close();resolve({keys:keys.result,values:values.result})};tx.onabort=()=>reject(tx.error)};
        }));
        assert.deepEqual(await readAll(), before);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        for (let attempt=0; attempt<2; attempt++) {
          await page.reload();
          await page.getByText('記録を読み込めないため、今回の進み具合は保存されないよ。').waitFor();
          await page.locator('#board button').first().click();
          await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('1手'));
          assert.deepEqual(await readAll(),before);
          assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),legacy);
        }
        assert.deepEqual(errors, []);
        console.log(`${fixed?'fixed':'dynamic'} ${mode}: queued play interrupted by database upgrade; records retained through reloads and unsaved play`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode=1; });
