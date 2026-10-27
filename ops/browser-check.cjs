const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve('site');
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname === '/' ? 'index.html' : decodeURIComponent(new URL(req.url, 'http://localhost').pathname.slice(1));
  const file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep)) { res.writeHead(400).end(); return; }
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'}[path.extname(file)] || 'application/octet-stream'); res.end(data); });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true});
  try {
    for (const width of [375, 1280]) {
      const page = await browser.newPage({ viewport: {width, height: 800} });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin); assert.equal(await page.locator('.card').count(), 4);
      for (const id of ['lights','memory','order','dodge']) {
        await page.goto(`${origin}/game.html?game=${id}`);
        assert(await page.locator('#title').textContent());
        if (id === 'lights') { await page.locator('#board button').first().click(); assert((await page.locator('#status').textContent()).includes('1手')); }
        if (id === 'memory') { await page.locator('#board button').first().click(); assert.notEqual(await page.locator('#board button').first().textContent(), '？'); }
        if (id === 'order') { for(let n=1;n<=16;n++) await page.getByRole('button',{name:String(n),exact:true}).click(); assert((await page.locator('#status').textContent()).includes('ゴール')); }
        if (id === 'dodge') { assert(await page.locator('canvas').isVisible()); await page.locator('#left').click(); }
        await page.locator('#restart').click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${id} overflow at ${width}`);
      }
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); server.close(); }
  console.log('Browser checks passed');
})().catch(e => { console.error(e); server.close(); process.exitCode=1; });
