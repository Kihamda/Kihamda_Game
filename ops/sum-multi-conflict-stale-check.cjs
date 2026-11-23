const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const oldScript = execFileSync('git', ['show', 'cbbcf05:site/game.js']);
const root = path.resolve(process.env.SITE_DIR || 'site'), oldRoot = path.resolve('site');
const fixed = process.env.RECOVERY_FIXED === '1';
const server = http.createServer((req, res) => {
  let name = new URL(req.url, 'http://localhost').pathname;
  if (name === '/old/game.js') return res.writeHead(200, {'Content-Type':'text/javascript'}).end(oldScript);
  const old = name.startsWith('/old/'); if (old) name = name.slice(4);
  const base = old ? oldRoot : root, file = path.resolve(base, '.' + name);
  if (!file.startsWith(base + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (error, data) => error ? res.writeHead(404).end() : res.writeHead(200, {'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(file)] || 'text/plain'}).end(data));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    for (const mode of ['easy','normal','hard','oni','kiwami']) for (const stage of ['select','confirm']) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage(), older = await context.newPage(), errors = [];
        for (const p of [page, older]) p.on('pageerror', e => errors.push(e.message));
        for (const [p, date] of [[page,'2026-11-08'], [older,'2026-11-07']]) await p.addInitScript(date => {
          const NativeDate = Date, now = NativeDate.parse(`${date}T03:00:00Z`);
          window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
        }, date);
        const base = `http://127.0.0.1:${server.address().port}`, id = `sum-${mode}-v2`, key = `kihamda-daily-${id}`;
        await page.goto(fixed ? `${base}/play-sum.html?difficulty=${mode}&version=2` : `${base}/game.html?game=sum&difficulty=${mode}&version=2`);
        await page.locator('#board button').first().click();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        await older.goto(`${base}/old/game.html?game=sum&difficulty=${mode}&version=2`);
        await older.locator('#board button').first().click();
        await older.locator('#board button[aria-pressed=true]').waitFor();
        await page.getByText('別のタブの記録が変わったよ。画面を開き直してね。').waitFor();
        await page.reload();
        await page.getByText('日付ごとに記録を選んでね').waitFor();
        await page.getByLabel('2026-11-07 の記録').selectOption('versioned');
        if (stage === 'confirm') await page.getByRole('button',{name:'選択内容を確認'}).click();
        const read = () => page.evaluate(async id => {
          const db = await openDailyDatabase();
          return new Promise((resolve,reject) => { const tx=db.transaction('games'), store=tx.objectStore('games'), records=store.get(id), meta=store.get(`source:${id}`); tx.oncomplete=()=>{db.close();resolve({records:records.result,meta:meta.result})}; tx.onabort=()=>reject(tx.error); });
        }, id);
        const before = await read();
        await older.locator('#board button').nth(1).click();
        await older.waitForFunction(key => JSON.parse(localStorage.getItem(key)).moves === 2, key);
        const legacy = await older.evaluate(key => localStorage.getItem(key), key);
        await page.getByText('別のタブの記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.locator('.sum-recovery button:enabled, .sum-recovery select:enabled').count(), 0);
        assert.deepEqual(await read(), before);
        await page.reload();
        await page.getByText('日付ごとに記録を選んでね').waitFor();
        await page.getByLabel('2026-11-07 の記録').selectOption('versioned');
        await page.getByRole('button',{name:'選択内容を確認'}).click();
        await page.getByRole('button',{name:'この内容で保存'}).click();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        const after = await read();
        assert.deepEqual(after.records.find(r => r.date === '2026-11-08'), before.records.find(r => r.date === '2026-11-08'));
        assert.deepEqual(after.records.find(r => r.date === '2026-11-07'), JSON.parse(legacy));
        assert.equal(await older.evaluate(key => localStorage.getItem(key), key), legacy);
        assert.deepEqual(errors, []);
        console.log(`${fixed?'fixed':'dynamic'} ${mode} ${stage}: stale controls disabled, both days retained and recovery succeeded`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode=1; });
