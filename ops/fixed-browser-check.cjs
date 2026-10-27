const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve('preview');
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
    const page = await browser.newPage({viewport:{width:375,height:667},hasTouch:true});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/index.html`);
    await page.getByRole('link', {name:'今日のひかりのスイッチ ↗'}).click();
    assert.equal(new URL(page.url()).pathname, '/play-lights.html');
    assert.equal(new URL(page.url()).searchParams.get('mode'), 'daily');
    await page.waitForFunction(() => document.querySelector('#category').textContent.startsWith('今日のパズル'));
    await page.goto(`${origin}/index.html`);
    await page.getByRole('link', {name:/ペアをさがせ/}).click();
    assert.equal(new URL(page.url()).pathname, '/play-memory.html');
    for (const [id, title] of [['lights','ひかりのスイッチ'], ['memory','ペアをさがせ'], ['order','数字のかけっこ'], ['dodge','ほしよけステップ'], ['slide','ならべてタイル'], ['garden','かずの花壇']]) {
      await page.goto(`${origin}/play-${id}.html?game=invalid`);
      assert.equal(await page.locator('#title').textContent(), title);
      assert(await page.locator('#board button, #board canvas').count());
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), `https://game.kihamda.net/play-${id}.html`);
      assert.equal(await page.locator('meta[name=description]').getAttribute('content'), await page.locator('#instructions').textContent());
      await page.locator('#restart').click();
      assert.equal(await page.locator('#title').textContent(), title);
    }
    await page.goto(`${origin}/play-lights.html?mode=daily`);
    assert((await page.locator('#category').textContent()).startsWith('今日のパズル'));
    const noJs = await browser.newContext({javaScriptEnabled:false});
    const plain = await noJs.newPage();
    for (const id of ['lights','memory','order','dodge','slide','garden']) {
      await plain.goto(`${origin}/play-${id}.html`);
      assert(await plain.locator('#instructions').isVisible());
      assert(await plain.locator('noscript p').isVisible());
    }
    await noJs.close();
    assert.deepEqual(errors, []);
    console.log('Fixed pages: mobile controls, restart, identity, daily mode and no-JavaScript text passed');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
