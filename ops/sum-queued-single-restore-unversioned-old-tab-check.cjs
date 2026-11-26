const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');

const oldScript = execFileSync('git', ['show', 'ee15909:site/game.js']);
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
        const page = await context.newPage(), older = await context.newPage(), blocker = await context.newPage(), errors = [];
        for (const p of [page, older, blocker]) p.on('pageerror', error => errors.push(error.message));
        const base = `http://127.0.0.1:${server.address().port}`, id = `sum-${mode}-v2`, key = 'kihamda-daily-sum';
        const url = fixed ? `${base}/play-sum.html?difficulty=${mode}&version=2` : `${base}/game.html?game=sum&difficulty=${mode}&version=2`;
        for (const [p, date] of [[page,'2026-11-08'], [older,'2026-11-07'], [blocker,'2026-11-08']]) await p.addInitScript(date => {
          const NativeDate = Date, now = NativeDate.parse(`${date}T03:00:00Z`);
          window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
        }, date);
        await page.goto(url);
        await page.locator('#board button').first().click();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        await page.evaluate(async id => {
          const db = await openDailyDatabase();
          await new Promise((resolve, reject) => {
            const tx = db.transaction('games', 'readwrite'), store = tx.objectStore('games'), request = store.get(id);
            request.onsuccess = () => store.put({game:id, records:request.result, legacy:null, createdAt:new Date().toISOString()}, `backup:${id}:single-race`);
            tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
          });
          db.close();
        }, id);
        await page.locator('#board button').nth(1).click();
        await page.waitForFunction(async id => {
          const db = await openDailyDatabase();
          return new Promise(resolve => { const tx = db.transaction('games'), r = tx.objectStore('games').get(id); tx.oncomplete = () => { db.close(); resolve(r.result?.[0]?.moves === 2); }; });
        }, id);
        await page.getByRole('button', {name:'退避した記録を見る'}).click();
        const candidates = page.locator('button[data-kind=basic][data-source=database][data-archive-id=single-race]');
        await candidates.first().waitFor();
        assert.equal(await candidates.count(), 1);
        await candidates.click();
        await page.getByRole('button', {name:'この記録を復元'}).waitFor();
        await older.goto(`${base}/old/game.html?game=sum`);
        await older.locator('#board button').first().waitFor();
        const read = () => page.evaluate(async () => {
          const db = await openDailyDatabase();
          return new Promise((resolve, reject) => {
            const tx = db.transaction('games'), store = tx.objectStore('games'), keys = store.getAllKeys(), values = store.getAll();
            tx.oncomplete = () => { db.close(); resolve({keys:keys.result, values:values.result}); };
            tx.onabort = () => reject(tx.error);
          });
        });
        const before = await read();
        assert(before.keys.includes(id));
        assert.equal(before.values[before.keys.indexOf(id)][0].moves, 2);
        assert(before.keys.includes(`backup:${id}:single-race`));
        await blocker.goto(url);
        await blocker.evaluate(async () => {
          const db = await openDailyDatabase(); db.onversionchange = () => db.close(); window.releaseWrite = false;
          window.lockFinished = new Promise((resolve, reject) => {
            const tx = db.transaction('games','readwrite'), store = tx.objectStore('games');
            tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
            function keep() { const req = store.get('__interleaving_check__'); req.onsuccess = () => { window.lockHeld = true; if (!window.releaseWrite) keep(); }; }
            keep();
          });
        });
        await blocker.waitForFunction(() => window.lockHeld === true);
        await page.evaluate(() => {
          window.queuedWrites = 0; const original = IDBDatabase.prototype.transaction;
          IDBDatabase.prototype.transaction = function(store, mode, ...args) { if (mode === 'readwrite') window.queuedWrites++; return original.call(this, store, mode, ...args); };
        });
        await page.getByRole('button', {name:'この記録を復元'}).click();
        await page.waitForFunction(() => window.queuedWrites > 0);
        await older.locator('#board button').first().click();
        await older.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.moves === 1, key);
        const legacy = await older.evaluate(key => localStorage.getItem(key), key);
        if (mode === 'normal') {
          await page.getByText('以前の記録が変わったよ。画面を開き直してね。').waitFor();
          assert.equal(await page.locator('.sum-recovery button:enabled, .sum-recovery select:enabled').count(), 0);
          assert.equal(await page.locator('#restart').isDisabled(), true);
          assert.equal(await page.locator('#board button:enabled').count(), 0);
        }
        await blocker.evaluate(() => { window.releaseWrite = true; });
        await blocker.evaluate(() => window.lockFinished);
        if (mode === 'normal') {
          await page.getByText('記録が変わったか、確認できないよ。画面を開き直してね。', {exact:true}).waitFor();
          assert.equal(await page.locator('.sum-recovery button:enabled, .sum-recovery select:enabled').count(), 0);
          assert.equal(await page.locator('#restart').isDisabled(), true);
          assert.equal(await page.locator('#board button:enabled').count(), 0);
          assert.deepEqual(await read(), before);
          await page.reload();
          await page.getByText('日付ごとに記録を選んでね').waitFor();
          assert.deepEqual(await read(), before);
        } else {
          await page.getByText('復元したよ。画面を開き直してね。', {exact:true}).waitFor();
          const restored = await read();
          const record = restored.values[restored.keys.indexOf(id)];
          assert.equal(record.find(item => item.date === '2026-11-08').moves, 1);
          for (let i = 0; i < before.keys.length; i++) {
            if (before.keys[i] !== id) assert.deepEqual(restored.values[restored.keys.indexOf(before.keys[i])], before.values[i]);
          }
          const added = restored.keys.filter(key => !before.keys.includes(key));
          assert.equal(added.length, 1);
          assert(String(added[0]).startsWith(`backup:${id}:`));
          assert.deepEqual(restored.values[restored.keys.indexOf(added[0])].records, before.values[before.keys.indexOf(id)]);
          await page.reload();
          await page.locator('#board button[aria-pressed=true]').waitFor();
          assert.deepEqual(await read(), restored);
        }
        assert.equal(await older.evaluate(key => localStorage.getItem(key), key), legacy);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        assert.deepEqual(errors, []);
        console.log(`${fixed ? 'fixed' : 'dynamic'} ${mode}: queued single-candidate restore and unversioned old-tab write handled; database and legacy retained through reload`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
