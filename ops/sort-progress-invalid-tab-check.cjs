const {chromium} = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(process.env.SITE_DIR || 'site');
const fixed = process.env.RECOVERY_FIXED === '1';
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (error, data) => error ? res.writeHead(404).end() : res.writeHead(200, {
    'Content-Type': {'.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css'}[path.extname(file)] || 'text/plain'
  }).end(data));
});

async function readRecord(page, id) {
  return page.evaluate(async id => {
    const db = await openDailyDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('games'), request = tx.objectStore('games').get(id);
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    });
  }, id);
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    for (const mode of ['easy', 'normal', 'hard', 'oni', 'kiwami']) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage(), other = await context.newPage();
        await page.clock.install({time:new Date('2026-11-03T03:00:00Z')});
        const base = `http://127.0.0.1:${server.address().port}`;
        const id = `sort-${mode}-v2`, key = `kihamda-daily-${id}`;
        const bad = JSON.stringify({date:'2026-11-03', actions:[[99, 99]]});
        const entry = fixed ? 'play-sort.html?' : 'game.html?game=sort&';
        await page.goto(`${base}/${entry}mode=daily&difficulty=${mode}&version=2`);
        await page.waitForFunction(() => document.querySelectorAll('#board>button').length === 5 && !document.querySelector('#restart').disabled);
        const move = await page.evaluate(() => {
          const tubes = [...document.querySelectorAll('#board>button:not(.sort-undo)')].map(el => [...el.querySelectorAll('.sort-slot')].reverse().map(slot => slot.textContent).filter(Boolean));
          for (let from = 0; from < tubes.length; from++) for (let to = 0; to < tubes.length; to++) {
            if (from !== to && tubes[from].length && tubes[to].length < 3 && (!tubes[to].length || tubes[to].at(-1) === tubes[from].at(-1))) return [from, to];
          }
        });
        assert(move, `${mode}: no legal move`);
        const tubes = page.locator('#board>button:not(.sort-undo)');
        for (const index of move) await tubes.nth(index).click();
        await page.waitForFunction(() => document.querySelector('#status').textContent.includes('1手'));
        const saved = await readRecord(page, id);
        assert.deepStrictEqual(saved[0].actions, [move]);

        await other.goto(base + '/index.html');
        await other.evaluate(([k, v]) => localStorage.setItem(k, v), [key, bad]);
        await page.getByText('記録が変わったよ。画面を開き直してね。').waitFor();
        assert(await page.locator('#restart').isDisabled());
        assert.equal(await page.locator('#board>button:disabled').count(), 5);
        assert(await page.locator('.path-archive').isDisabled());
        assert.strictEqual(await other.evaluate(k => localStorage.getItem(k), key), bad);
        assert.deepStrictEqual(await readRecord(page, id), saved);

        await page.reload();
        await page.getByText('記録を読み込めないため、今回の進み具合は保存されないよ。').waitFor();
        assert.strictEqual(await other.evaluate(k => localStorage.getItem(k), key), bad);
        assert.deepStrictEqual(await readRecord(page, id), saved);
        console.log(`${fixed ? 'fixed' : 'dynamic'} ${mode}: invalid external record, stopped controls and retained data passed`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
