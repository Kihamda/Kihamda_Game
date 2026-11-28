const {chromium} = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(process.env.SITE_DIR || 'site'), fixed = process.env.RECOVERY_FIXED === '1';
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return response.writeHead(400).end();
  fs.readFile(file, (error, data) => error ? response.writeHead(404).end() : response.writeHead(200, {
    'Content-Type': {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(file)] || 'text/plain'
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
async function failWrites(page, id) {
  await page.evaluate(id => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      if (key === id) { window.quotaFailures = (window.quotaFailures || 0) + 1; throw new DOMException('full', 'QuotaExceededError'); }
      return original.call(this, value, key);
    };
  }, id);
}
const boardState = page => page.locator('#board button').evaluateAll(buttons => buttons.map(button => [button.getAttribute('aria-label'), button.getAttribute('aria-pressed')]));
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    for (const mode of ['easy','normal','hard','oni','kiwami']) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.clock.install({time:new Date('2026-11-29T03:00:00Z')});
        const id = `sum-${mode}-v2`, base = `http://127.0.0.1:${server.address().port}`, query = `difficulty=${mode}&version=2`;
        await page.goto(fixed ? `${base}/play-sum.html?${query}` : `${base}/game.html?game=sum&${query}`);
        await page.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const initial = await readRecord(page, id), initialBoard = await boardState(page);
        await failWrites(page, id);
        await page.locator('#board button').first().click();
        await page.waitForFunction(() => window.quotaFailures > 0 && document.querySelector('#status').textContent.includes('保存できなかった'));
        assert.deepEqual(await readRecord(page, id), initial);
        assert.equal(await page.locator('#board button:enabled').count(), 0);
        await page.reload();
        await page.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        assert.deepEqual(await boardState(page), initialBoard);
        assert.deepEqual(await readRecord(page, id), initial);
        await page.locator('#board button').first().click();
        await page.waitForFunction(() => document.querySelector('#board button')?.getAttribute('aria-pressed') === 'true' && !document.querySelector('#restart').disabled);
        const saved = await readRecord(page, id), board = await boardState(page);
        assert.ok(saved.some(record => record.date === '2026-11-29' && record.moves === 1 && record.owners[0] === 0));
        for (const action of ['second card', 'restart']) {
          await failWrites(page, id);
          if (action === 'second card') await page.locator('#board button').nth(1).click();
          else await page.locator('#restart').click();
          await page.waitForFunction(() => window.quotaFailures > 0 && document.querySelector('#status').textContent.includes('保存できなかった'));
          assert.deepEqual(await readRecord(page, id), saved);
          assert.equal(await page.locator('#board button:enabled').count(), 0);
          assert.equal(await page.locator('#restart').isDisabled(), true);
          await page.reload();
          await page.waitForFunction(() => document.querySelector('#board button')?.getAttribute('aria-pressed') === 'true' && !document.querySelector('#restart').disabled);
          assert.deepEqual(await boardState(page), board);
          assert.deepEqual(await readRecord(page, id), saved);
        }
        assert.deepEqual(errors, ['full', 'full', 'full']); // The injected synchronous exceptions also reach the page error handler.
        console.log(`${fixed ? 'fixed' : 'dynamic'} ${mode}: initial, second-card and restart failures preserve records and reload state`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
