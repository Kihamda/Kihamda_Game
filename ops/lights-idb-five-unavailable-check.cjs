const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve('site');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end();
    res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(file)] || 'text/plain');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => Object.defineProperty(window, 'indexedDB', {get() {throw Error('unavailable')}}));
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({time:new Date('2026-11-08T03:00:00Z')});
    const base = `http://127.0.0.1:${server.address().port}/game.html?game=lights`;
    await page.goto(base + '&mode=daily&difficulty=normal&version=2');
    for (const mode of ['normal','easy','hard','oni','kiwami']) {
      if (mode !== 'normal') await page.locator(`.lights-modes [data-difficulty=${mode}]`).click();
      await page.waitForFunction(() => document.querySelector('#record').textContent.includes('保存されない'));
      await page.locator('#board button').first().click();
      assert.equal(await page.locator('#status').textContent(), '1手');
      await page.locator('#restart').click();
      await page.waitForFunction(() => document.querySelector('#record').textContent.includes('保存されない') && document.querySelector('#status').textContent === '0手');
      assert.equal(await page.evaluate(mode => localStorage.getItem(`kihamda-daily-lights-${mode}-v2`), mode), null);
    }
    await page.goto(base);
    await page.locator('#board button').first().click();
    assert.equal(await page.locator('#status').textContent(), '1手');
    await page.locator('#restart').click();
    assert.equal(await page.locator('#status').textContent(), '0手');
    assert.deepEqual(errors, []);
    await context.close();
    console.log('All five temporary modes preserve records; normal non-daily play remains usable');
  } finally { await browser.close(); server.close(); }
})().catch(error => {console.error(error); server.close(); process.exitCode=1});
