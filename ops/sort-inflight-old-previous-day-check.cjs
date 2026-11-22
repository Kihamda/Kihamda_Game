const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

// This revision stores all five sort difficulties in localStorage.
const oldScript = execFileSync('git', ['show', 'aae5968:site/game.js']);
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
    for (const mode of ['easy', 'normal', 'hard', 'oni', 'kiwami']) {
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
        const query = `game=sort&mode=daily&difficulty=${mode}&version=2`;
        await newer.goto(fixed ? `${base}/play-sort.html?mode=daily&difficulty=${mode}&version=2` : `${base}/game.html?${query}`);
        await older.goto(`${base}/old/game.html?${query}`);
        for (const page of [newer, older]) await page.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const id = `sort-${mode}-v2`, oldKey = `kihamda-daily-${id}`;
        const move = page => page.evaluate(mode => {
          const tubes = [...document.querySelectorAll('#board>button:not(.sort-undo)')].map(el => [...el.querySelectorAll('.sort-slot')].reverse().map(slot => slot.textContent).filter(Boolean));
          for (let from = 0; from < tubes.length; from++) for (let to = 0; to < tubes.length; to++) {
            const source = tubes[from], target = tubes[to];
            if (from === to || !source.length || target.length === 3 || (target.length && target.at(-1) !== source.at(-1))) continue;
            const next = tubes.map(t => [...t]); next[to].push(next[from].pop());
            const won = ['oni', 'kiwami'].includes(mode) ? next.every((t, i) => i === 3 ? !t.length : t.length === 3 && t.every(color => color === t[0])) : next.every(t => !t.length || (t.length === 3 && t.every(color => color === t[0])));
            if (!won) return [from, to];
          }
        }, mode);
        const oldMove = await move(older), newMove = await move(newer);
        assert.ok(oldMove); assert.ok(newMove);
        const play = async (page, indices) => { for (const index of indices) await page.locator('#board>button:not(.sort-undo)').nth(index).click(); };
        await newer.evaluate(id => { window.raceId = id; window.armRace = true; }, id);
        await newer.locator('#restart').click();
        await older.waitForFunction(() => localStorage.getItem('race-signal') === 'put-requested');
        await play(older, oldMove);
        await older.waitForFunction(() => document.querySelector('#status').textContent.includes('1手'));
        const old = await older.evaluate(key => localStorage.getItem(key), oldKey);
        assert.equal(JSON.parse(old).date, '2026-11-07');
        assert.deepEqual(JSON.parse(old).actions, [oldMove]);
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
        assert.deepEqual(saved[0].actions, []);
        await newer.reload();
        await newer.getByText('日付ごとに記録を選んでね').waitFor();
        await newer.getByLabel('2026-11-07 の記録').selectOption('versioned');
        await newer.getByRole('button', {name: '選択内容を確認'}).click();
        await newer.getByRole('button', {name: 'この内容で保存'}).click();
        await newer.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const selected = await read(newer);
        assert.deepEqual(selected.find(item => item.date === '2026-11-07').actions, JSON.parse(old).actions);
        assert.deepEqual(selected.find(item => item.date === '2026-11-08'), saved[0]);
        await play(newer, newMove);
        await newer.waitForFunction(async id => {
          const db = await openDailyDatabase();
          return new Promise((resolve, reject) => { const tx = db.transaction('games'), req = tx.objectStore('games').get(id); tx.oncomplete = () => { db.close(); resolve(req.result.find(item => item.date === '2026-11-08')?.actions.length === 1); }; tx.onabort = () => reject(tx.error); });
        }, id);
        await newer.getByRole('button', {name: '退避した記録を見る'}).click();
        await newer.locator('button[data-source=database]').first().click();
        await newer.getByRole('button', {name: 'この記録を復元'}).click();
        await newer.getByRole('button', {name: '復元した記録を開く'}).click();
        await newer.waitForFunction(() => document.querySelector('#status').textContent.includes('0手'));
        const restored = await read(newer);
        assert.deepEqual(restored.find(item => item.date === '2026-11-08'), saved[0]);
        assert.deepEqual(restored.find(item => item.date === '2026-11-07'), selected.find(item => item.date === '2026-11-07'));
        assert.equal(restored.length, 2);
        assert.equal(await newer.evaluate(key => localStorage.getItem(key), oldKey), old);
        assert.deepEqual(errors, []);
        console.log(`${fixed ? 'fixed' : 'dynamic'} ${mode}: previous-day old-tab write, notification, both records and restore passed`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
