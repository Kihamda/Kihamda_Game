const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');

const oldScript = execFileSync('git', ['show', 'ee15909:site/game.js']);
const versionedScript = execFileSync('git', ['show', 'cbbcf05:site/game.js']);
const root = path.resolve(process.env.SITE_DIR || 'site'), oldRoot = path.resolve('site');
const fixed = process.env.RECOVERY_FIXED === '1';
const server = http.createServer((req, res) => {
  let name = new URL(req.url, 'http://localhost').pathname;
  if (name === '/versioned/game.js') return res.writeHead(200, {'Content-Type':'text/javascript'}).end(versionedScript);
  if (name.startsWith('/versioned/')) name = '/old/' + name.slice('/versioned/'.length);
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
        const page = await context.newPage(), older = await context.newPage(), versioned = await context.newPage(), blocker = await context.newPage(), errors = [];
        for (const p of [page, older, versioned, blocker]) p.on('pageerror', error => errors.push(error.message));
        const base = `http://127.0.0.1:${server.address().port}`, id = `sum-${mode}-v2`, key = 'kihamda-daily-sum';
        const url = fixed ? `${base}/play-sum.html?difficulty=${mode}&version=2` : `${base}/game.html?game=sum&difficulty=${mode}&version=2`;
        for (const [p, date] of [[page,'2026-11-08'], [older,'2026-11-07'], [versioned,'2026-11-07'], [blocker,'2026-11-08']]) await p.addInitScript(date => {
          const NativeDate = Date, now = NativeDate.parse(`${date}T03:00:00Z`);
          window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
        }, date);
        await page.goto(url);
        await page.locator('#board button').first().click();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        await older.goto(`${base}/old/game.html?game=sum`);
        await older.locator('#board button').first().click();
        await page.getByText('以前の記録が変わったよ。画面を開き直してね。').waitFor();
        await versioned.goto(`${base}/versioned/game.html?game=sum&difficulty=${mode}&version=2`);
        await versioned.locator('#board button').first().waitFor();
        const versionedKey = `kihamda-daily-${id}`;
        await page.reload();
        await page.getByText('日付ごとに記録を選んでね').waitFor();
        await page.getByLabel('2026-11-07 の記録').selectOption('legacy');
        await page.getByRole('button', {name:'選択内容を確認'}).click();
        await page.getByRole('button', {name:'この内容で保存'}).click();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        await page.getByRole('button', {name:'退避した記録を見る'}).click();
        const candidates = page.locator('button[data-kind=multi]');
        await candidates.first().waitFor();
        assert((await candidates.count()) >= 2);
        await candidates.first().click();
        await page.getByRole('button', {name:'この退避を整理'}).click();
        await page.getByText(/この退避の候補[2-9][0-9]*件をまとめて削除するよ/).waitFor();
        await page.getByRole('button', {name:'この退避を削除', exact:true}).waitFor();
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
        assert.equal(before.keys.filter(k => String(k).startsWith(`multi-backup:${id}:`)).length, 1);
        assert.equal(before.values[before.keys.findIndex(k => String(k).startsWith(`multi-backup:${id}:`))].version, 1);
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
        await page.getByRole('button', {name:'この退避を削除', exact:true}).click();
        await page.waitForFunction(() => window.queuedWrites > 0);
        const legacy = await older.evaluate(key => localStorage.getItem(key), key);
        assert(legacy);
        const versionedBefore = await versioned.evaluate(key => localStorage.getItem(key), versionedKey);
        await versioned.locator('#board button').nth(1).click();
        await versioned.waitForFunction(({key, previous}) => localStorage.getItem(key) !== previous, {key:versionedKey, previous:versionedBefore});
        const changed = await versioned.evaluate(key => localStorage.getItem(key), versionedKey);
        await page.getByText('別のタブの記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.locator('.sum-recovery button:enabled, .sum-recovery select:enabled').count(), 0);
        assert.equal(await page.locator('#restart').isDisabled(), true);
        assert.equal(await page.locator('#board button:enabled').count(), 0);
        await blocker.evaluate(() => { window.releaseWrite = true; });
        await blocker.evaluate(() => window.lockFinished);
        await page.getByText('記録が変わったよ。一覧を開き直してね。', {exact:true}).waitFor();
        assert.equal(await page.locator('.sum-recovery button:enabled, .sum-recovery select:enabled').count(), 0);
        assert.equal(await page.locator('#restart').isDisabled(), true);
        assert.equal(await page.locator('#board button:enabled').count(), 0);
        assert.deepEqual(await read(), before);
        assert.equal(await older.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.reload();
        await page.getByText('日付ごとに記録を選んでね').waitFor();
        assert.deepEqual(await read(), before);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), versionedKey), changed);
        assert.deepEqual(errors, []);
        console.log(`${fixed ? 'fixed' : 'dynamic'} ${mode}: queued multi-candidate archive deletion rejected after versioned old-tab write; all database entries and updated legacy record retained through reload`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
