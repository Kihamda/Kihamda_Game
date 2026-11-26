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
    const context = await browser.newContext(), page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({time:new Date('2026-11-03T03:00:00Z')});
    const entry = process.env.SITE_DIR ? 'play-swap.html?mode=daily' : 'game.html?game=swap&mode=daily';
    await page.goto(`http://127.0.0.1:${server.address().port}/${entry}`);
    const cells = page.locator('#board > button');
    const goal = await page.evaluate(() => generateDailySwap('2026-11-03').goal);
    const key = 'kihamda-daily-result-v1-swap-2026-11-03';
    const swap = async (a, b) => { await cells.nth(a).click(); await cells.nth(b).click(); };
    const solve = async extra => {
      if (extra) {
        const pair = await page.evaluate(() => {
          const puzzle = generateDailySwap('2026-11-03');
          for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) {
            const values = [...puzzle.values];
            [values[a], values[b]] = [values[b], values[a]];
            if (!swapSums(values).every((sum, i) => sum === puzzle.targets[i])) return [a, b];
          }
          throw Error('No non-winning detour');
        });
        await swap(...pair); await swap(...pair);
      }
      for (let i = 0; i < 9; i++) {
        const values = (await cells.allTextContents()).map(Number);
        if (values[i] !== goal[i]) {
          await swap(i, values.indexOf(goal[i]));
          if ((await page.locator('#status').textContent()).includes('クリア')) break;
        }
      }
      const status = await page.locator('#status').textContent();
      const match = status.match(/クリア！ (\d+)回/);
      assert(match, status);
      return Number(match[1]);
    };
    const record = async best => {
      assert.equal(await page.locator('#record').textContent(), `今日のベスト ${best}回`);
      assert.equal(await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key), best);
    };
    const slow = await solve(true);
    await record(slow);
    await page.locator('#restart').click();
    const fast = await solve(false);
    assert.equal(fast, slow - 2);
    await record(fast);
    await page.reload(); await record(fast);
    await page.locator('#restart').click();
    assert.equal(await solve(true), slow);
    await record(fast);
    await page.reload(); await record(fast);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('Legacy swap: improved daily best replaces slower result and survives worse replay and reload');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
