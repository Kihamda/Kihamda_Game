const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

// The parent revision still saves path progress in localStorage.
const oldScript = execFileSync('git', ['show', '95ebeca^:site/game.js']);
const root = path.resolve('site');
const server = http.createServer((req, res) => {
  let name = new URL(req.url, 'http://localhost').pathname;
  if (name === '/old/game.js') return res.writeHead(200, {'Content-Type':'text/javascript'}).end(oldScript);
  if (name.startsWith('/old/')) name = name.slice(4);
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (error, data) => error ? res.writeHead(404).end() : res.writeHead(200, {'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(file)] || 'text/plain'}).end(data));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    for (const scenario of ['same-day', 'previous-day']) {
      const [mode, storageMode, version] = ['normal', 'normal', 2];
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
        const oldDate = scenario === 'same-day' ? '2026-11-08' : '2026-11-07';
        for (const [page, date] of [[newer, '2026-11-08'], [older, oldDate]]) {
          await page.addInitScript(date => {
            const NativeDate = Date, now = NativeDate.parse(`${date}T03:00:00Z`);
            window.Date = class extends NativeDate {
              constructor(...args) { super(...(args.length ? args : [now])); }
              static now() { return now; }
            };
          }, date);
        }
        const base = `http://127.0.0.1:${server.address().port}`;
        const query = `game=path&mode=daily&difficulty=${mode}&version=${version}`;
        await newer.goto(`${base}/game.html?${query}`);
        await older.goto(`${base}/old/game.html?game=path&mode=daily`);
        for (const page of [newer, older]) await page.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const id = `path-${storageMode}-v${version}`, oldKey = 'kihamda-daily-path';
        await newer.evaluate(id => { window.raceId = id; window.armRace = true; }, id);
        const choices = await newer.evaluate(({mode, date}) => { const puzzle = generateFivePath(mode, date); return Array.from({length:(puzzle.size || 5) ** 2}, (_, i) => i).filter(i => validPathSteps(puzzle, [[i]])); }, {mode, date:oldDate});
        assert.ok(choices.length, `${mode}: a valid first move is required`);
        await newer.locator('#restart').click();
        await older.waitForFunction(() => localStorage.getItem('race-signal') === 'put-requested');
        await older.locator('#board button').nth(choices[0]).click();
        await older.waitForFunction(() => document.querySelectorAll('#board button[aria-pressed=true]').length > 1);
        const old = await older.evaluate(key => localStorage.getItem(key), oldKey);
        assert.equal(JSON.parse(old).moves, 1);
        assert.equal(JSON.parse(old).date, oldDate);
        await newer.getByText('記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await newer.evaluate(() => window.raceCompleted), false);
        await older.evaluate(() => localStorage.setItem('race-release', 'yes'));
        const read = page => page.evaluate(async id => {
          const db = await openDailyDatabase();
          return new Promise((resolve, reject) => { const tx = db.transaction('games'), req = tx.objectStore('games').get(id); tx.oncomplete = () => { db.close(); resolve(req.result); }; tx.onabort = () => reject(tx.error); });
        }, id);
        const saved = await read(newer);
        assert.equal(await newer.evaluate(() => window.raceCompleted), true);
        assert.equal(saved[0].moves, 0);
        const oldSteps = JSON.parse(old).route.slice(1).map(cell => [cell]);
        assert.notDeepEqual(saved[0].steps, oldSteps);
        await newer.reload();
        await newer.getByText('日付ごとに記録を選んでね').waitFor();
        await newer.getByLabel(`${oldDate} の記録`).selectOption('legacy');
        await newer.getByRole('button', {name:'選択内容を確認'}).click();
        await newer.getByRole('button', {name:'この内容で保存'}).click();
        await newer.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const selected = await read(newer);
        assert.deepEqual(selected.find(item => item.date === oldDate).steps, oldSteps);
        assert.equal(selected.find(item => item.date === oldDate).moves, 1);
        if (scenario === 'previous-day') assert.deepEqual(selected.find(item => item.date === '2026-11-08'), saved[0]);
        await newer.getByRole('button', {name:'退避した記録を見る'}).click();
        await newer.locator('button[data-source=database]').first().click();
        await newer.getByRole('button', {name:'この記録を復元'}).click();
        await newer.getByRole('button', {name:'復元した記録を開く'}).click();
        await newer.waitForFunction(() => document.querySelectorAll('#board button[aria-pressed=true]').length === 1);
        const restored = await read(newer);
        assert.deepEqual(restored.find(item => item.date === '2026-11-08'), saved[0]);
        if (scenario === 'previous-day') assert.deepEqual(restored.find(item => item.date === oldDate), selected.find(item => item.date === oldDate));
        assert.equal(restored.length, scenario === 'previous-day' ? 2 : 1);
        assert.equal(await newer.evaluate(key => localStorage.getItem(key), oldKey), old);
        assert.deepEqual(errors, []);
        console.log(`${scenario}: in-flight legacy-tab write, notification, both records and restore passed`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
