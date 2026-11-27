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
    for (const mode of ['normal']) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage(), older = await context.newPage(), errors = [];
        for (const p of [page, older]) p.on('pageerror', error => errors.push(error.message));
        const base = `http://127.0.0.1:${server.address().port}`, id = `sum-${mode}-v2`, key = 'kihamda-daily-sum';
        const url = fixed ? `${base}/play-sum.html?difficulty=${mode}&version=2` : `${base}/game.html?game=sum&difficulty=${mode}&version=2`;
        for (const [p, date] of [[page,'2026-11-08'], [older,'2026-11-07']]) await p.addInitScript(date => {
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
            request.onsuccess = () => {
              const archive = {game:id, records:request.result, legacy:null, createdAt:new Date().toISOString()};
              store.put(archive, `backup:${id}:inflight-unversioned-a`);
              store.put(archive, `backup:${id}:inflight-unversioned-b`);
            };
            tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
          });
          db.close();
        }, id);
        await page.reload();
        await page.getByRole('button', {name:'退避した記録を見る'}).click();
        const candidates = page.locator('button[data-source=database]');
        await candidates.first().waitFor();
        assert.equal(await candidates.count(), 2);
        const selected = await candidates.first().getAttribute('data-archive-id');
        await candidates.first().click();
        await page.getByRole('button', {name:'この退避を整理'}).click();
        await page.getByRole('button', {name:'この退避を削除', exact:true}).waitFor();
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
        const archiveKey = `backup:${id}:${selected}`;
        assert(before.keys.includes(id));
        for (const suffix of ['a', 'b']) assert(before.keys.includes(`backup:${id}:inflight-unversioned-${suffix}`));
        assert(before.keys.includes(archiveKey));
        await page.evaluate(archiveKey => {
          const original = IDBObjectStore.prototype.delete;
          IDBObjectStore.prototype.delete = function(key) {
            const request = original.call(this, key);
            if (window.armRace && key === archiveKey) {
              window.armRace = false; window.raceCompleted = false;
              this.transaction.addEventListener('complete', () => { window.raceCompleted = true; });
              localStorage.setItem('race-signal', 'delete-requested');
              const store = this;
              function pump() { const next = store.get(key); next.onsuccess = () => { if (localStorage.getItem('race-release') !== 'yes') pump(); }; }
              pump();
            }
            return request;
          };
          window.armRace = true;
        }, archiveKey);
        await page.getByRole('button', {name:'この退避を削除', exact:true}).click();
        await older.waitForFunction(() => localStorage.getItem('race-signal') === 'delete-requested');
        assert.equal(await page.evaluate(() => window.raceCompleted), false);
        await older.locator('#board button').first().click();
        await older.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.moves === 1, key);
        const legacy = await older.evaluate(key => localStorage.getItem(key), key);
        await page.getByText('以前の記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.evaluate(() => window.raceCompleted), false);
        assert.equal(await page.getByRole('button', {name:'ゲームに戻る'}).isDisabled(), true);
        assert.equal(await page.locator('#restart').isDisabled(), true);
        assert.equal(await page.locator('#board button:enabled').count(), 0);
        await older.evaluate(() => localStorage.setItem('race-release', 'yes'));
        await page.waitForFunction(() => window.raceCompleted === true);
        await page.getByText('選んだ退避を削除したよ。', {exact:false}).waitFor();
        assert.equal(await page.locator('.sum-recovery button:enabled, .sum-recovery select:enabled').count(), 0);
        const remaining = await read();
        assert.deepEqual(remaining.keys, before.keys.filter(k => k !== archiveKey));
        for (let i = 0; i < before.keys.length; i++) {
          if (before.keys[i] !== archiveKey) assert.deepEqual(remaining.values[remaining.keys.indexOf(before.keys[i])], before.values[i]);
        }
        assert.equal(await older.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.getByText('以前の記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.locator('#restart').isDisabled(), true);
        assert.equal(await page.locator('#board button:enabled').count(), 0);
        await page.reload();
        await page.getByText('日付ごとに記録を選んでね').waitFor();
        assert.deepEqual(await read(), remaining);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        assert.deepEqual(errors, []);
        console.log(`${fixed ? 'fixed' : 'dynamic'} ${mode}: in-flight single-candidate archive deletion completed after unversioned legacy update; conflict notice and other records retained through reload`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
