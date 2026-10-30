const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve('site');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end();
    res.setHeader('Content-Type', { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] || 'text/plain');
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    for (const reverse of [false, true]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.clock.install({ time: new Date('2026-10-30T14:59:00Z') });
      const url = `http://127.0.0.1:${server.address().port}/game.html?game=circuit`;
      await page.goto(url + (reverse ? '&difficulty=easy' : ''));
      const firstKey = reverse ? 'kihamda-daily-circuit-easy-v2' : 'kihamda-daily-circuit-normal-v3';
      const secondKey = reverse ? 'kihamda-daily-circuit-normal-v3' : 'kihamda-daily-circuit-easy-v2';
      const read = key => page.evaluate(name => localStorage.getItem(name), key);

      await page.locator('#board button').nth(0).click();
      const previousDay = await read(firstKey);
      assert(previousDay);
      await page.clock.fastForward('02:00');
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      assert.equal(await page.locator('#restart').textContent(), '今日の問題へ');
      await page.getByRole('button', { name: reverse ? 'ふつう' : 'かんたん' }).click();
      assert((await page.locator('#category').textContent()).includes('2026-10-31'));
      assert.equal(await read(firstKey), previousDay);

      await page.locator('#board button').nth(0).click();
      assert(await read(secondKey));
      await page.locator('#restart').click();
      assert.equal(await read(secondKey), null);
      assert.equal(await read(firstKey), previousDay);
      await page.getByRole('button', { name: reverse ? 'かんたん' : 'ふつう' }).click();
      await page.locator('#board button').nth(0).click();
      assert.equal(await read(`${firstKey}-previous`), previousDay);
      assert.equal(await read(secondKey), null);
      await context.close();
      console.log(`${reverse ? 'easy to normal' : 'normal to easy'}: rollover, reset and previous day retained`);
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error(err); server.close(); process.exitCode = 1; });
