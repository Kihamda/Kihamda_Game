const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

// This revision saves the five sum difficulties to localStorage.
const oldScript = execFileSync('git', ['show', 'cbbcf05:site/game.js']);
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
    for (const mode of ['easy','normal','hard','oni','kiwami']) {
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
        for (const page of [newer, older]) await page.clock.install({time:new Date('2026-11-08T03:00:00Z')});
        const base = `http://127.0.0.1:${server.address().port}`;
        const query = `game=sum&difficulty=${mode}&version=2`;
        await newer.goto(`${base}/game.html?${query}`);
        await older.goto(`${base}/old/game.html?${query}`);
        for (const page of [newer, older]) await page.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const id = `sum-${mode}-v2`, oldKey = `kihamda-daily-${id}`;
        await newer.evaluate(id => { window.raceId = id; window.armRace = true; }, id);
        await newer.locator('#board button').first().click();
        await older.waitForFunction(() => localStorage.getItem('race-signal') === 'put-requested');
        await older.locator('#board button').nth(1).click();
        await older.locator('#board button[aria-pressed=true]').waitFor();
        const old = await older.evaluate(key => localStorage.getItem(key), oldKey);
        assert.equal(JSON.parse(old).moves, 1);
        await newer.getByText('別のタブの記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await newer.evaluate(() => window.raceCompleted), false);
        await older.evaluate(() => localStorage.setItem('race-release', 'yes'));
        const read = page => page.evaluate(async id => {
          const db = await openDailyDatabase();
          return new Promise((resolve, reject) => { const tx = db.transaction('games'), req = tx.objectStore('games').get(id); tx.oncomplete = () => { db.close(); resolve(req.result); }; tx.onabort = () => reject(tx.error); });
        }, id);
        const saved = await read(newer);
        assert.equal(await newer.evaluate(() => window.raceCompleted), true);
        assert.equal(saved[0].moves, 1);
        assert.notDeepEqual(saved[0].owners, JSON.parse(old).owners);
        await newer.reload();
        await newer.getByText('記録を選んでね').waitFor();
        await newer.getByRole('button', {name:'別のタブの記録を使う'}).click();
        await newer.locator('#board button[aria-pressed=true]').waitFor();
        assert.deepEqual((await read(newer))[0].owners, JSON.parse(old).owners);
        await newer.reload();
        await newer.locator('#board button[aria-pressed=true]').waitFor();
        await newer.getByRole('button', {name:'退避した記録を見る'}).click();
        await newer.locator('button[data-source=database]').first().click();
        await newer.getByRole('button', {name:'この記録を復元'}).click();
        await newer.getByRole('button', {name:'復元した記録を開く'}).click();
        await newer.locator('#board button[aria-pressed=true]').waitFor();
        assert.deepEqual((await read(newer))[0].owners, saved[0].owners);
        assert.equal(await newer.evaluate(key => localStorage.getItem(key), oldKey), old);
        assert.deepEqual(errors, []);
        console.log(`${mode}: in-flight old-tab write, notification, both records and restore passed`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
