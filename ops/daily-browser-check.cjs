const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve('site');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (error, data) => {
    if (error) return res.writeHead(404).end();
    res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript'}[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const game of ['lights','garden']) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.clock.install({time:new Date('2026-10-27T03:00:00Z')});
      await page.goto(`${origin}/game.html?game=${game}${game === 'lights' ? '&mode=daily' : ''}`);
      const cells = page.locator('#board button');
      const before = await cells.allTextContents();
      await cells.first().click();
      const after = await cells.allTextContents();
      assert.notDeepEqual(after, before);
      await page.reload();
      assert.deepEqual(await cells.allTextContents(), after, `${game}: reload must restore progress`);
      assert((await page.locator('#status').textContent()).includes('1手'));
      await page.locator('#restart').click();
      assert.deepEqual(await cells.allTextContents(), before, `${game}: restart must clear progress`);
      await page.reload();
      assert.deepEqual(await cells.allTextContents(), before);
      await cells.first().click();
      await page.clock.setFixedTime(new Date('2026-10-28T03:00:00Z'));
      await page.reload();
      assert((await page.locator('#category').textContent()).includes('2026-10-28'));
      assert.equal(await page.locator('#status').textContent(), '0手', `${game}: old progress must not load on a new date`);
      await context.close();
    }
    const blocked = await browser.newContext();
    await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', {get() {throw new Error('storage blocked')}}));
    const page = await blocked.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    for (const game of ['lights','garden']) {
      await page.goto(`${origin}/game.html?game=${game}${game === 'lights' ? '&mode=daily' : ''}`);
      await page.locator('#board button').first().click();
      assert((await page.locator('#status').textContent()).includes('1手'));
      await page.locator('#restart').click();
      assert.equal(await page.locator('#status').textContent(), '0手');
    }
    assert.deepEqual(errors, []);
    await blocked.close();
    for(const height of [480,501,568]) for(const mode of ['', '&mode=daily']){
      const c=await browser.newContext({viewport:{width:320,height},hasTouch:true}),p=await c.newPage();await p.goto(`${origin}/game.html?game=lights${mode}`);
      const box=await p.locator('#board').boundingBox();assert(box.y+box.height<=height,`lights exceeds 320x${height}`);
      const sizes=await p.locator('#board button').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return [r.width,r.height]}));assert(sizes.every(([w,h])=>w>=44&&h>=44));
      await p.locator('#board button').first().tap();assert((await p.locator('#status').textContent()).includes('1手'));await c.close();
    }
    console.log('Daily progress: reload, restart, next date and unavailable storage passed');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
