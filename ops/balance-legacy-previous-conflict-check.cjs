const {chromium} = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('node:assert/strict');

const root = path.resolve(process.env.SITE_DIR || 'site');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (error, data) => error ? res.writeHead(404).end() : res.writeHead(200, {'Content-Type': {'.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css'}[path.extname(file)] || 'text/plain'}).end(data));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    const context = await browser.newContext();
    try {
      const first = await context.newPage(), stale = await context.newPage(), today = await context.newPage();
      const errors = [];
      for (const [page, date] of [[first,'2026-11-02'], [stale,'2026-11-02'], [today,'2026-11-03']]) {
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(date => {
          const NativeDate = Date, now = NativeDate.parse(date + 'T03:00:00Z');
          window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
        }, date);
      }
      const base = `http://127.0.0.1:${server.address().port}`;
      const url = process.env.SITE_DIR ? `${base}/play-balance.html?mode=daily` : `${base}/game.html?game=balance&mode=daily`;
      const move = async (page, a, b) => { await page.locator('.balance-choice').nth(a).click(); await page.locator('.balance-choice').nth(b).click(); };
      const read = page => page.evaluate(() => [localStorage.getItem('kihamda-daily-balance'), localStorage.getItem('kihamda-daily-balance-previous')]);
      await first.goto(url);
      await move(first, 0, 1);
      await stale.goto(url);
      await today.goto(url);
      await move(today, 0, 1);
      const [todayRecord, initialPrevious] = await read(today);
      assert.equal(JSON.parse(todayRecord).date, '2026-11-03');
      assert.equal(JSON.parse(initialPrevious).date, '2026-11-02');
      await move(first, 2, 3);
      const [current, previous] = await read(first);
      assert.equal(current, todayRecord);
      assert.equal(JSON.parse(previous).count, 2);
      await stale.locator('#restart').click();
      assert.match(await stale.locator('#status').textContent(), /別のタブ/);
      assert.deepEqual(await read(stale), [current, previous]);
      await stale.reload();
      assert.match(await stale.locator('#status').textContent(), /2回/);
      assert.deepEqual(await read(stale), [current, previous]);
      await today.reload();
      assert.match(await today.locator('#status').textContent(), /1回/);
      assert.deepEqual(errors, []);
      console.log('Legacy balance: previous-day conflict preserves both days through restart and reload');
    } finally { await context.close(); }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
