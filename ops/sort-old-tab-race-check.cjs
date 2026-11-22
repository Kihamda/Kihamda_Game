const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// The parent revision is the last implementation that saved these puzzles to localStorage.
const oldScript = execFileSync('git', ['show', 'aae5968:site/game.js']);
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
        const newer = await context.newPage(), older = await context.newPage(), holder = await context.newPage();
        for (const page of [newer, older, holder]) await page.clock.install({time:new Date('2026-10-30T03:00:00Z')});
        const base = `http://127.0.0.1:${server.address().port}`;
        const query = `game=sort&mode=daily&difficulty=${mode}&version=2`;
        await newer.goto(`${base}/game.html?${query}`);
        await older.goto(`${base}/old/game.html?${query}`);
        await holder.goto(`${base}/game.html?${query}`);
        for (const page of [newer, older, holder]) await page.waitForFunction(() => document.querySelectorAll('#board>button').length === 5 && !document.querySelector('#restart').disabled);
        const moves = await newer.evaluate(() => {
          const tubes = [...document.querySelectorAll('#board>button:not(.sort-undo)')].map(el => [...el.querySelectorAll('.sort-slot')].reverse().map(slot => slot.textContent).filter(Boolean));
          const fixed = ['oni', 'kiwami'].includes(new URLSearchParams(location.search).get('difficulty'));
          return tubes.flatMap((tube, from) => tubes.map((target, to) => {
            if (from === to || !tube.length || target.length === 3 || (target.length && target.at(-1) !== tube.at(-1))) return null;
            const next = tubes.map(t => [...t]); next[to].push(next[from].pop());
            const won = fixed ? next.every((t, i) => i === 3 ? !t.length : t.length === 3 && t.every(color => color === t[0])) : next.every(t => !t.length || (t.length === 3 && t.every(color => color === t[0])));
            return won ? null : [from, to];
          }).filter(Boolean));
        });
        assert(moves.length);
        // Hold the readwrite queue so the old tab writes after the new save is requested but before it runs.
        await holder.evaluate(async id => {
          window.held = await openDailyDatabase();
          window.releaseHeld = false;
          await new Promise((resolve, reject) => {
            const tx = window.held.transaction('games', 'readwrite'), store = tx.objectStore('games');
            let first = true;
            function pump() { const q = store.get(id); q.onsuccess = () => { if (first) { first = false; resolve(); } if (!window.releaseHeld) pump(); }; q.onerror = () => reject(q.error); }
            pump();
          });
        }, `sort-${mode}-v2`);
        const buttons = page => page.locator('#board>button:not(.sort-undo)');
        await buttons(newer).nth(moves[0][0]).click();
        await buttons(newer).nth(moves[0][1]).click();
        for (const index of moves.at(-1)) await buttons(older).nth(index).click();
        await older.waitForFunction(() => document.querySelector('#status').textContent.includes('1手'));
        await newer.getByText('記録が変わったよ。画面を開き直してね。').waitFor();
        await holder.evaluate(() => { window.releaseHeld = true; window.held.close(); });
        const old = await older.evaluate(key => localStorage.getItem(key), `kihamda-daily-sort-${mode}-v2`);
        assert.deepStrictEqual(JSON.parse(old).actions, [moves.at(-1)]);
        await newer.reload();
        await newer.getByText('日付ごとに記録を選んでね').waitFor();
        assert.strictEqual(await newer.evaluate(key => localStorage.getItem(key), `kihamda-daily-sort-${mode}-v2`), old);
        await newer.locator('.sum-recovery select').selectOption('versioned');
        await newer.getByRole('button', {name:'選択内容を確認'}).click();
        await newer.getByRole('button', {name:'この内容で保存'}).click();
        await newer.waitForFunction(() => document.querySelector('#status').textContent.includes('1手'));
        assert.strictEqual(await newer.evaluate(key => localStorage.getItem(key), `kihamda-daily-sort-${mode}-v2`), old);
        console.log(mode + ': queued new save, old tab write, notification and recovery passed');

        // Now allow the new transaction to finish first, then write from the stale old tab.
        const nextMoves = await newer.evaluate(() => {
          const tubes = [...document.querySelectorAll('#board>button:not(.sort-undo)')].map(el => [...el.querySelectorAll('.sort-slot')].reverse().map(slot => slot.textContent).filter(Boolean));
          return tubes.flatMap((tube, from) => tubes.map((target, to) => from !== to && tube.length && target.length < 3 && (!target.length || target.at(-1) === tube.at(-1)) ? [from, to] : null).filter(Boolean));
        });
        assert(nextMoves.length);
        for (const index of nextMoves[0]) await buttons(newer).nth(index).click();
        try { await newer.waitForFunction(() => document.querySelector('#status').textContent.includes('2手'), null, {timeout:5000}); }
        catch (error) { throw Error(`new save failed: ${await newer.locator('#status').textContent()}; moves=${JSON.stringify(nextMoves)}`, {cause:error}); }
        for (const index of nextMoves.at(-1)) await buttons(older).nth(index).click();
        await older.waitForFunction(() => document.querySelector('#status').textContent.includes('2手'));
        await newer.getByText('記録が変わったよ。画面を開き直してね。').waitFor();
        const oldAfter = await older.evaluate(key => localStorage.getItem(key), `kihamda-daily-sort-${mode}-v2`);
        assert.deepStrictEqual(JSON.parse(oldAfter).actions, [moves.at(-1), nextMoves.at(-1)]);
        await newer.reload();
        await newer.getByText('日付ごとに記録を選んでね').waitFor();
        await newer.locator('.sum-recovery select').selectOption('versioned');
        await newer.getByRole('button', {name:'選択内容を確認'}).click();
        await newer.getByRole('button', {name:'この内容で保存'}).click();
        await newer.waitForFunction(() => document.querySelector('#status').textContent.includes('2手'));
        await newer.getByRole('button', {name:'退避した記録を見る'}).click();
        await newer.locator('button[data-source=database]').first().click();
        await newer.getByRole('button', {name:'この記録を復元'}).click();
        await newer.getByRole('button', {name:'復元した記録を開く'}).click();
        await newer.waitForFunction(() => document.querySelector('#status').textContent.includes('2手'));
        const saved = await newer.evaluate(async id => {
          const db = await openDailyDatabase();
          return new Promise((resolve, reject) => { const tx = db.transaction('games'), req = tx.objectStore('games').get(id); tx.oncomplete = () => { db.close(); resolve(req.result); }; tx.onabort = () => reject(tx.error); });
        }, `sort-${mode}-v2`);
        assert.deepStrictEqual(saved[0].actions, [moves.at(-1), nextMoves[0]]);
        assert.strictEqual(await newer.evaluate(key => localStorage.getItem(key), `kihamda-daily-sort-${mode}-v2`), oldAfter);
        console.log(mode + ': new commit followed by old write, comparison and archive restore passed');
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
