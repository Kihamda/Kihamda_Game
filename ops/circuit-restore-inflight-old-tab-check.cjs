const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

// This revision stores all five circuit difficulties in localStorage.
const oldScript = execFileSync('git', ['show', 'f7574a1:site/game.js']);
const root = path.resolve(process.env.SITE_DIR || 'site');
const oldRoot = path.resolve('site');
const fixed = process.env.RECOVERY_FIXED === '1';
const server = http.createServer((req, res) => {
  let name = new URL(req.url, 'http://localhost').pathname;
  if (name === '/old/game.js') return res.writeHead(200, {'Content-Type': 'text/javascript'}).end(oldScript);
  const old = name.startsWith('/old/');
  if (old) name = name.slice(4);
  const base = old ? oldRoot : root;
  const file = path.resolve(base, '.' + name);
  if (!file.startsWith(base + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (error, data) => error ? res.writeHead(404).end() : res.writeHead(200, {'Content-Type': {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css'}[path.extname(file)] || 'text/plain'}).end(data));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_PATH});
  try {
    for (const [mode, storageMode, version] of [['easy', 'easy', 2], ['normal', 'normal', 3], ['hard', 'linked', 2], ['oni', 'oni', 2], ['kiwami', 'kiwami', 2]]) {
      const context = await browser.newContext();
      try {
        const newer = await context.newPage(), older = await context.newPage();
        const errors = [];
        for (const page of [newer, older]) page.on('pageerror', error => errors.push(error.message));
        await newer.addInitScript(() => {
          const original = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function(value, key) {
            const request = original.call(this, value, key);
            if (window.armRace && key === window.raceId) {
              window.armRace = false;
              window.raceCompleted = false;
              this.transaction.addEventListener('complete', () => { window.raceCompleted = true; });
              localStorage.setItem('race-signal', 'put-requested');
              const store = this;
              function pump() { const next = store.get(key); next.onsuccess = () => { if (localStorage.getItem('race-release') !== 'yes') pump(); }; }
              pump();
            }
            return request;
          };
        });
        for (const [page, date] of [[newer, '2026-11-08'], [older, '2026-11-07']]) {
          await page.addInitScript(date => {
            const NativeDate = Date, now = NativeDate.parse(`${date}T03:00:00Z`);
            window.Date = class extends NativeDate {
              constructor(...args) { super(...(args.length ? args : [now])); }
              static now() { return now; }
            };
          }, date);
        }
        const base = `http://127.0.0.1:${server.address().port}`;
        const query = `game=circuit&mode=daily&difficulty=${mode}&version=${version}`;
        await newer.goto(fixed ? `${base}/play-circuit.html?mode=daily&difficulty=${mode}&version=${version}` : `${base}/game.html?${query}`);
        await older.goto(`${base}/old/game.html?${query}`);
        for (const page of [newer, older]) await page.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const id = `circuit-${storageMode}-v${version}`, oldKey = `kihamda-daily-${id}`;
        await newer.evaluate(id => { window.raceId = id; window.armRace = true; }, id);
        await newer.locator('#restart').click();
        await older.waitForFunction(() => localStorage.getItem('race-signal') === 'put-requested');
        await older.locator('#board button').first().click();
        await older.waitForFunction(() => document.querySelector('#status').textContent.startsWith('1手'));
        const old = await older.evaluate(key => localStorage.getItem(key), oldKey);
        assert.equal(JSON.parse(old).date, '2026-11-07');
        assert.equal(JSON.parse(old).moves, 1);
        await newer.getByText('記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await newer.evaluate(() => window.raceCompleted), false);
        await older.evaluate(() => localStorage.setItem('race-release', 'yes'));
        const read = page => page.evaluate(async id => {
          const db = await openDailyDatabase();
          return new Promise((resolve, reject) => { const tx = db.transaction('games'), req = tx.objectStore('games').get(id); tx.oncomplete = () => { db.close(); resolve(req.result); }; tx.onabort = () => reject(tx.error); });
        }, id);
        const saved = await read(newer);
        assert.equal(await newer.evaluate(() => window.raceCompleted), true);
        assert.equal(saved[0].date, '2026-11-08');
        assert.equal(saved[0].moves, 0);
        await newer.reload();
        await newer.getByText('日付ごとに記録を選んでね').waitFor();
        await newer.getByLabel('2026-11-07 の記録').selectOption('versioned');
        await newer.getByRole('button', {name: '選択内容を確認'}).click();
        await newer.getByRole('button', {name: 'この内容で保存'}).click();
        await newer.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const selected = await read(newer);
        assert.deepEqual(selected.find(item => item.date === '2026-11-07').turns, JSON.parse(old).turns);
        assert.deepEqual(selected.find(item => item.date === '2026-11-08'), saved[0]);
        await newer.locator('#board button').first().click();
        await newer.waitForFunction(async id => {
          const db = await openDailyDatabase();
          return new Promise((resolve, reject) => { const tx = db.transaction('games'), req = tx.objectStore('games').get(id); tx.oncomplete = () => { db.close(); resolve(req.result.find(item => item.date === '2026-11-08')?.moves === 1); }; tx.onabort = () => reject(tx.error); });
        }, id);
        const beforeRestore = await read(newer);
        await newer.getByRole('button', {name: '退避した記録を見る'}).click();
        await newer.locator('button[data-source=database]').first().click();
        await newer.evaluate(id => { localStorage.removeItem('race-signal'); localStorage.removeItem('race-release'); window.raceId = id; window.armRace = true; }, id);
        await newer.getByRole('button', {name: 'この記録を復元'}).click({noWaitAfter: true});
        await older.waitForFunction(() => localStorage.getItem('race-signal') === 'put-requested');
        await older.locator('#board button').first().click();
        await older.waitForFunction(() => document.querySelector('#status').textContent.startsWith('2手'));
        const changedOld = await older.evaluate(key => localStorage.getItem(key), oldKey);
        assert.equal(JSON.parse(changedOld).moves, 2);
        assert.equal(await newer.evaluate(() => window.raceCompleted), false);
        await older.evaluate(() => localStorage.setItem('race-release', 'yes'));
        await newer.getByText('復元後に別のタブの記録が変わったよ。画面を開き直して確認してね。').waitFor();
        const restored = await read(newer);
        assert.deepEqual(restored.find(item => item.date === '2026-11-08'), saved[0]);
        assert.deepEqual(restored.find(item => item.date === '2026-11-07'), selected.find(item => item.date === '2026-11-07'));
        assert.equal(restored.length, 2);
        const backups = await newer.evaluate(async id => {
          const db = await openDailyDatabase();
          return new Promise((resolve, reject) => {
            const tx = db.transaction('games'), store = tx.objectStore('games');
            const keys = store.getAllKeys(), values = store.getAll();
            tx.oncomplete = () => { db.close(); resolve(values.result.filter((_, index) => String(keys.result[index]).startsWith(`backup:${id}:`))); };
            tx.onabort = () => reject(tx.error);
          });
        }, id);
        assert.ok(backups.some(backup => JSON.stringify(backup.records) === JSON.stringify(beforeRestore)), 'restore must archive the overwritten records');
        assert.equal(await newer.evaluate(key => localStorage.getItem(key), oldKey), changedOld);
        assert.equal(await newer.getByRole('button', {name: '復元した記録を開く'}).isDisabled(), true);
        await newer.reload();
        await newer.getByText('日付ごとに記録を選んでね').waitFor();
        await newer.getByLabel('2026-11-07 の記録').selectOption('versioned');
        await newer.getByRole('button', {name: '選択内容を確認'}).click();
        await newer.getByRole('button', {name: 'この内容で保存'}).click();
        await newer.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const reconciled = await read(newer);
        assert.deepEqual(reconciled.find(item => item.date === '2026-11-07'), JSON.parse(changedOld));
        assert.deepEqual(reconciled.find(item => item.date === '2026-11-08'), saved[0]);
        assert.deepEqual(errors, []);
        console.log(`${fixed ? 'fixed' : 'dynamic'} ${mode}: old-tab write during archive restore, notification and reconciliation passed`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
