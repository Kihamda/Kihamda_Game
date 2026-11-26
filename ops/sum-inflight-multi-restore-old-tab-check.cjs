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
    for (const mode of ['easy','normal','hard','oni','kiwami']) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage(), older = await context.newPage(), errors = [];
        for (const p of [page, older]) p.on('pageerror', error => errors.push(error.message));
        const base = `http://127.0.0.1:${server.address().port}`, id = `sum-${mode}-v2`, key = `kihamda-daily-${id}`;
        const url = fixed ? `${base}/play-sum.html?difficulty=${mode}&version=2` : `${base}/game.html?game=sum&difficulty=${mode}&version=2`;
        for (const [p, date] of [[page,'2026-11-08'], [older,'2026-11-07']]) await p.addInitScript(date => {
          const NativeDate = Date, now = NativeDate.parse(`${date}T03:00:00Z`);
          window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
        }, date);
        await page.goto(url);
        await page.locator('#board button').first().click();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        await older.goto(`${base}/old/game.html?game=sum&difficulty=${mode}&version=2`);
        await older.locator('#board button').first().click();
        await page.getByText('別のタブの記録が変わったよ。画面を開き直してね。').waitFor();
        await page.reload();
        await page.getByText('日付ごとに記録を選んでね').waitFor();
        await page.getByLabel('2026-11-07 の記録').selectOption('versioned');
        await page.getByRole('button', {name:'選択内容を確認'}).click();
        await page.getByRole('button', {name:'この内容で保存'}).click();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        await page.getByRole('button', {name:'退避した記録を見る'}).click();
        const candidates = page.locator('button[data-kind=multi]');
        await candidates.first().waitFor();
        assert((await candidates.count()) >= 2);
        const selected = page.locator('button[data-kind=multi][data-source=versioned-before][data-date="2026-11-07"]');
        await selected.click();
        await page.getByRole('button', {name:'この記録を復元'}).waitFor();
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
        assert(before.values[before.keys.indexOf(id)].some(record => record.date === '2026-11-07'));
        assert.equal(before.keys.filter(k => String(k).startsWith(`multi-backup:${id}:`)).length, 1);
        assert.equal(before.values[before.keys.findIndex(k => String(k).startsWith(`multi-backup:${id}:`))].version, 1);
        await page.evaluate(id => {
          const original = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function(value, key) {
            const request = original.call(this, value, key);
            if (window.armRace && key === id) {
              window.armRace = false; window.restoreValue = structuredClone(value); window.raceCompleted = false;
              this.transaction.addEventListener('complete', () => { window.raceCompleted = true; });
              localStorage.setItem('race-signal', 'put-requested');
              const store = this;
              function pump() { const next = store.get(key); next.onsuccess = () => { if (localStorage.getItem('race-release') !== 'yes') pump(); }; }
              pump();
            }
            return request;
          };
          window.armRace = true;
        }, id);
        await page.getByRole('button', {name:'この記録を復元'}).click();
        await older.waitForFunction(() => localStorage.getItem('race-signal') === 'put-requested');
        assert.equal(await page.evaluate(() => window.raceCompleted), false);
        await older.locator('#board button').nth(1).click();
        await older.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.moves === 2, key);
        const legacy = await older.evaluate(key => localStorage.getItem(key), key);
        await page.getByText('別のタブの記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.evaluate(() => window.raceCompleted), false);
        assert.equal(await page.locator('#restart').isDisabled(), true);
        assert.equal(await page.locator('#board button:enabled').count(), 0);
        await older.evaluate(() => localStorage.setItem('race-release', 'yes'));
        await page.getByText('復元後に別のタブの記録が変わったよ。画面を開き直して確認してね。', {exact:true}).waitFor();
        const restored = await read(), value = await page.evaluate(() => window.restoreValue);
        assert.equal(await page.evaluate(() => window.raceCompleted), true);
        assert.deepEqual(restored.values[restored.keys.indexOf(id)], value);
        assert.deepEqual(value, before.values[before.keys.indexOf(id)].filter(record => record.date !== '2026-11-07'));
        for (let i = 0; i < before.keys.length; i++) {
          if (before.keys[i] !== id) assert.deepEqual(restored.values[restored.keys.indexOf(before.keys[i])], before.values[i]);
        }
        const added = restored.keys.filter(k => !before.keys.includes(k));
        assert.equal(added.length, 1);
        assert(String(added[0]).startsWith(`backup:${id}:`));
        assert.deepEqual(restored.values[restored.keys.indexOf(added[0])].records, before.values[before.keys.indexOf(id)]);
        assert.equal(restored.values[restored.keys.indexOf(added[0])].legacy, null);
        assert.equal(await older.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.reload();
        await page.getByText('日付ごとに記録を選んでね').waitFor();
        assert.deepEqual(await read(), restored);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        assert.deepEqual(errors, []);
        console.log(`${fixed ? 'fixed' : 'dynamic'} ${mode}: in-flight multi-candidate restore completed with conflict notice; original records archived and updated legacy retained through reload`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
