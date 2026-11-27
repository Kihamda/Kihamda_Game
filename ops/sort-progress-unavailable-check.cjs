const {chromium} = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const root = path.resolve(process.env.SITE_DIR || 'site');
const fixed = process.env.RECOVERY_FIXED === '1';
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (error, data) => error ? res.writeHead(404).end() : res.writeHead(200, {
    'Content-Type': {'.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css'}[path.extname(file)] || 'text/plain'
  }).end(data));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    for (const denied of ['localStorage', 'indexedDB']) for (const mode of ['easy', 'normal', 'hard', 'oni', 'kiwami']) {
      const context = await browser.newContext();
      try {
        await context.addInitScript(key => Object.defineProperty(window, key, {get() { throw Error('unavailable'); }}), denied);
        const page = await context.newPage();
        await page.clock.install({time:new Date('2026-11-03T03:00:00Z')});
        const entry = fixed ? 'play-sort.html?' : 'game.html?game=sort&';
        await page.goto(`http://127.0.0.1:${server.address().port}/${entry}mode=daily&difficulty=${mode}&version=2`);
        await page.waitForSelector('#board>button');
        const record = page.locator('#record');
        await record.getByText('保存されない', {exact:false}).waitFor();
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
        assert.match(await record.textContent(), /保存されない/);
        await page.reload();
        await page.waitForSelector('#board>button');
        await record.getByText('保存されない', {exact:false}).waitFor();
        assert.doesNotMatch(await page.locator('#status').textContent(), /1手/);
        console.log(`${fixed ? 'fixed' : 'dynamic'} ${mode} ${denied}: warning, temporary move and reload passed`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
