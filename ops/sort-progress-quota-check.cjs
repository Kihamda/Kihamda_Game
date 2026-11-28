const {chromium} = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const root = path.resolve(process.env.SITE_DIR || 'site');
const fixed = process.env.RECOVERY_FIXED === '1';
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return response.writeHead(400).end();
  fs.readFile(file, (error, data) => error ? response.writeHead(404).end() : response.writeHead(200, {
    'Content-Type': {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(file)] || 'text/plain'
  }).end(data));
});

async function play(page, mode, requireContinuation = false) {
  const move = await page.evaluate(({mode, requireContinuation}) => {
    const tubes = [...document.querySelectorAll('#board>button:not(.sort-undo)')].map(button =>
      [...button.querySelectorAll('.sort-slot')].reverse().map(slot => slot.textContent).filter(Boolean));
    function candidates(tubes) {
      const moves = [];
      for (let from = 0; from < tubes.length; from++) for (let to = 0; to < tubes.length; to++) {
        const a = tubes[from], b = tubes[to];
        if (from === to || !a.length || b.length === 3 || (b.length && b.at(-1) !== a.at(-1))) continue;
        const next = tubes.map(tube => [...tube]);
        next[to].push(next[from].pop());
        const won = ['oni','kiwami'].includes(mode)
          ? next.every((tube, index) => index === 3 ? !tube.length : tube.length === 3 && tube.every(color => color === tube[0]))
          : next.every(tube => !tube.length || (tube.length === 3 && tube.every(color => color === tube[0])));
        if (!won) moves.push({from, to, next});
      }
      return moves;
    }
    const choice = candidates(tubes).find(candidate => !requireContinuation || candidates(candidate.next).length);
    return choice && [choice.from, choice.to];
  }, {mode, requireContinuation});
  assert.ok(move, `No non-winning move for ${mode}`);
  for (const index of move) await page.locator('#board>button:not(.sort-undo)').nth(index).click();
}

async function readRecord(page, id) {
  return page.evaluate(async id => {
    const db = await openDailyDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('games'), request = transaction.objectStore('games').get(id);
      transaction.oncomplete = () => { db.close(); resolve(request.result); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
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

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    for (const mode of ['easy','normal','hard','oni','kiwami']) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.clock.install({time:new Date('2026-10-30T03:00:00Z')});
        const base = `http://127.0.0.1:${server.address().port}`;
        const query = `mode=daily&difficulty=${mode}&version=2`;
        const id = `sort-${mode}-v2`;
        await page.goto(fixed ? `${base}/play-sort.html?${query}` : `${base}/game.html?game=sort&${query}`);
        await page.waitForFunction(() => document.querySelectorAll('#board>button:not(.sort-undo)').length && !document.querySelector('#restart').disabled);
        const initial = await readRecord(page, id);
        await failWrites(page, id);
        await play(page, mode, true);
        await page.waitForFunction(() => window.quotaFailures > 0 && document.querySelector('#status').textContent.includes('保存できない'));
        assert.deepEqual(await readRecord(page, id), initial);
        await page.reload();
        await page.waitForFunction(() => document.querySelector('#status').textContent.includes('0手'));
        await play(page, mode, true);
        await page.waitForFunction(async id => {
          const db = await openDailyDatabase();
          return new Promise((resolve, reject) => {
            const transaction = db.transaction('games'), request = transaction.objectStore('games').get(id);
            transaction.oncomplete = () => { db.close(); resolve(request.result?.some(record => record.date === '2026-10-30' && record.actions.length === 1)); };
            transaction.onabort = () => { db.close(); reject(transaction.error); };
          });
        }, id);
        const saved = await readRecord(page, id);
        const board = await page.locator('#board').innerHTML();
        await failWrites(page, id);
        await play(page, mode);
        await page.waitForFunction(() => window.quotaFailures > 0 && document.querySelector('#status').textContent.includes('保存できない'));
        assert.deepEqual(await readRecord(page, id), saved);
        await page.reload();
        await page.waitForFunction(() => document.querySelector('#status').textContent.includes('1手'));
        assert.equal(await page.locator('#board').innerHTML(), board);
        assert.deepEqual(await readRecord(page, id), saved);
        assert.deepEqual(errors, []);
        console.log(`${fixed ? 'fixed' : 'dynamic'} ${mode}: quota failure displayed; zero-move and saved one-move records survived reload`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
