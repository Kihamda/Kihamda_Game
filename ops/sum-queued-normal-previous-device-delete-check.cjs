const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');

const oldScript = execFileSync('git', ['show', 'ee15909:site/game.js']);
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
    for (const mode of ['normal']) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage(), older = await context.newPage(), blocker = await context.newPage(), errors = [];
        for (const p of [page, older, blocker]) p.on('pageerror', error => errors.push(error.message));
        const base = `http://127.0.0.1:${server.address().port}`, id = `sum-${mode}-v2`, key = 'kihamda-daily-sum';
        const url = fixed ? `${base}/play-sum.html?difficulty=${mode}&version=2` : `${base}/game.html?game=sum&difficulty=${mode}&version=2`;
        for (const [p, date] of [[page,'2026-11-08'], [older,'2026-11-07']]) await p.addInitScript(date => {
          const NativeDate = Date, now = NativeDate.parse(`${date}T03:00:00Z`);
          window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
        }, date);
        await page.goto(url);
        await page.locator('#board button').first().click();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        await page.evaluate(async id => {
          const db = await openDailyDatabase();
          await new Promise((resolve, reject) => {
            const tx = db.transaction('games','readwrite'), store = tx.objectStore('games'), request = store.get(id);
            request.onsuccess = () => {
              const records = [...request.result, {...request.result[0], date:'2026-11-07'}];
              store.put(records, id);
              const archive = {game:id, records, legacy:null, createdAt:new Date().toISOString()};
              store.put(archive, `backup:${id}:queued-delete-a`);
              store.put(archive, `backup:${id}:queued-delete-b`);
            };
            tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
          });
          db.close();
        }, id);
        await page.reload();
        await page.getByRole('button', {name:'退避した記録を見る'}).click();
        const selected = await page.locator('button[data-source=database]').first().getAttribute('data-archive-id');
        await page.locator('button[data-source=database]').first().click();
        await page.getByRole('button', {name:'この退避を整理'}).click();
        await page.getByRole('button', {name:'この退避を削除', exact:true}).waitFor();
        await older.goto(`${base}/old/game.html?game=sum`);
        await older.locator('#board button').first().waitFor();
        const read = () => page.evaluate(async () => {
          const db = await openDailyDatabase();
          return new Promise((resolve, reject) => {
            const tx = db.transaction('games'), store = tx.objectStore('games'), keys = store.getAllKeys(), values = store.getAll();
            tx.oncomplete = () => { db.close(); resolve({keys:keys.result, values:values.result}); };
            tx.onabort = () => reject(tx.error);
          });
        });
        const before = await read();
        assert(before.keys.includes(id));
        for (const suffix of ['a','b']) assert(before.keys.includes(`backup:${id}:queued-delete-${suffix}`));
        await blocker.goto(url);
        await blocker.evaluate(async () => {
          const db = await openDailyDatabase(); window.releaseWrite = false;
          window.lockFinished = new Promise((resolve, reject) => {
            const tx = db.transaction('games','readwrite'), store = tx.objectStore('games');
            tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
            function keep() { const req = store.get('__interleaving_check__'); req.onsuccess = () => { window.lockHeld = true; if (!window.releaseWrite) keep(); }; }
            keep();
          });
        });
        await blocker.waitForFunction(() => window.lockHeld === true);
        await page.evaluate(() => {
          window.queuedWrites = 0; const original = IDBDatabase.prototype.transaction;
          IDBDatabase.prototype.transaction = function(store, mode, ...args) { if (mode === 'readwrite') window.queuedWrites++; return original.call(this, store, mode, ...args); };
        });
        await page.getByRole('button', {name:'この退避を削除', exact:true}).click();
        await page.waitForFunction(() => window.queuedWrites > 0);
        await older.locator('#board button').nth(1).click();
        await older.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.moves === 1, key);
        const legacy = await older.evaluate(key => localStorage.getItem(key), key);
        await page.getByText('以前の記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.getByRole('button', {name:'ゲームに戻る'}).isDisabled(), true);
        assert.equal(await page.locator('#restart').isDisabled(), true);
        assert.equal(await page.locator('#board button:enabled').count(), 0);
        await blocker.evaluate(() => { window.releaseWrite = true; });
        await blocker.evaluate(() => window.lockFinished);
        await page.getByText('記録が変わったよ。一覧を開き直してね。', {exact:true}).waitFor();
        assert.equal(await page.getByRole('button', {name:'ゲームに戻る'}).isDisabled(), true);
        assert.deepEqual(await read(), before);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.reload();
        await page.getByText('日付ごとに記録を選んでね').waitFor();
        assert.deepEqual(await read(), before);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        const oldRecord = JSON.parse(legacy);
        const oldOwners = oldRecord.cells.map(cell => cell ? 0 : -1);
        const baseline = await read();
        const original = baseline.values[baseline.keys.indexOf(id)];
        assert.notDeepEqual(original.find(x => x.date === oldRecord.date).owners, oldOwners);
        await page.getByLabel('2026-11-07 の記録').selectOption('database');
        await page.getByRole('button', {name:'選択内容を確認'}).click();
        await page.getByRole('button', {name:'この内容で保存'}).click();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        const saved = await read();
        assert.deepEqual(saved.values[saved.keys.indexOf(id)], original);
        const added = saved.keys.filter(k => !baseline.keys.includes(k));
        assert.equal(added.length, 1);
        assert(added[0].startsWith(`multi-backup:${id}:`));
        const archive = saved.values[saved.keys.indexOf(added[0])];
        assert.deepEqual(archive.database, original);
        assert.deepEqual(archive.result, original);
        assert.deepEqual(archive.evicted, []);
        assert.deepEqual(archive.choices, [{date:oldRecord.date, source:'database'}]);
        const source = archive.sources.find(x => x.id === 'legacy');
        assert(source);
        assert.deepEqual(source.before, []);
        assert.deepEqual(source.after, [{date:oldRecord.date, owners:oldOwners, moves:oldRecord.moves}]);
        for (const k of baseline.keys.filter(k => k.startsWith(`backup:${id}:`))) {
          assert.deepEqual(saved.values[saved.keys.indexOf(k)], baseline.values[baseline.keys.indexOf(k)]);
        }
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.reload();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        assert.deepEqual(await read(), saved);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.getByRole('button', {name:'退避した記録を見る'}).click();
        await page.locator(`button[data-kind=multi][data-source=legacy-after][data-date="2026-11-07"][data-archive-id="${added[0].split(':').at(-1)}"]`).click();
        await page.getByRole('button', {name:'この記録を復元'}).click();
        await page.getByText('復元したよ。画面を開き直してね。').waitFor();
        const restored = await read();
        assert.deepEqual(restored.values[restored.keys.indexOf(id)], [...original.filter(x => x.date !== oldRecord.date), {date:oldRecord.date, owners:oldOwners, moves:oldRecord.moves}].sort((a,b) => b.date.localeCompare(a.date)));
        for (const k of saved.keys.filter(k => k !== id)) {
          assert.deepEqual(restored.values[restored.keys.indexOf(k)], saved.values[saved.keys.indexOf(k)]);
        }
        const newKeys = restored.keys.filter(k => !saved.keys.includes(k));
        assert.equal(newKeys.length, 1);
        assert(newKeys[0].startsWith(`backup:${id}:`));
        const restoreBackup = restored.values[restored.keys.indexOf(newKeys[0])];
        assert.deepEqual(restoreBackup.records, original);
        assert.deepEqual(restoreBackup.legacy, {date:oldRecord.date, owners:oldOwners, moves:oldRecord.moves});
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.reload();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        assert.deepEqual(await read(), restored);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.getByRole('button', {name:'退避した記録を見る'}).click();
        await page.locator(`button[data-kind=basic][data-source=database][data-date="2026-11-07"][data-archive-id="${newKeys[0].split(':').at(-1)}"]`).click();
        await page.getByRole('button', {name:'この記録を復元'}).click();
        await page.getByText('復元したよ。画面を開き直してね。').waitFor();
        const rerestored = await read();
        const expected = [...restored.values[restored.keys.indexOf(id)].filter(x => x.date !== '2026-11-07'), original.find(x => x.date === '2026-11-07')].sort((a,b) => b.date.localeCompare(a.date));
        assert.deepEqual(rerestored.values[rerestored.keys.indexOf(id)], expected);
        for (const k of restored.keys.filter(k => k !== id)) {
          assert.deepEqual(rerestored.values[rerestored.keys.indexOf(k)], restored.values[restored.keys.indexOf(k)]);
        }
        const lastKeys = rerestored.keys.filter(k => !restored.keys.includes(k));
        assert.equal(lastKeys.length, 1);
        assert(lastKeys[0].startsWith(`backup:${id}:`));
        const lastBackup = rerestored.values[rerestored.keys.indexOf(lastKeys[0])];
        assert.deepEqual(lastBackup.records, restored.values[restored.keys.indexOf(id)]);
        assert.deepEqual(lastBackup.legacy, original.find(x => x.date === '2026-11-07'));
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.reload();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        assert.deepEqual(await read(), rerestored);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.getByRole('button', {name:'退避した記録を見る'}).click();
        await page.locator(`button[data-kind=basic][data-source=database][data-date="2026-11-07"][data-archive-id="${lastKeys[0].split(':').at(-1)}"]`).click();
        await page.getByRole('button', {name:'この記録を復元'}).click();
        await page.getByText('復元したよ。画面を開き直してね。').waitFor();
        const switched = await read();
        assert.deepEqual(switched.values[switched.keys.indexOf(id)], restored.values[restored.keys.indexOf(id)]);
        for (const k of rerestored.keys.filter(k => k !== id)) {
          assert.deepEqual(switched.values[switched.keys.indexOf(k)], rerestored.values[rerestored.keys.indexOf(k)]);
        }
        const switchKeys = switched.keys.filter(k => !rerestored.keys.includes(k));
        assert.equal(switchKeys.length, 1);
        assert(switchKeys[0].startsWith(`backup:${id}:`));
        const switchBackup = switched.values[switched.keys.indexOf(switchKeys[0])];
        assert.deepEqual(switchBackup.records, expected);
        assert.deepEqual(switchBackup.legacy, restored.values[restored.keys.indexOf(id)].find(x => x.date === oldRecord.date));
        await page.reload();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        assert.deepEqual(await read(), switched);
        const pressed = await page.locator('#board button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-pressed') === 'true'));
        assert.deepEqual(pressed, original.find(x => x.date === '2026-11-08').owners.map(owner => owner === 0));
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.getByRole('button', {name:'退避した記録を見る'}).click();
        await page.locator(`button[data-kind=basic][data-source=database][data-date="2026-11-07"][data-archive-id="${switchKeys[0].split(':').at(-1)}"]`).click();
        await page.getByRole('button', {name:'この退避を整理'}).click();
        await page.getByRole('button', {name:'この退避を削除', exact:true}).click();
        await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'status');
        const afterDelete = await read();
        assert.deepEqual(afterDelete.keys, switched.keys.filter(k => k !== switchKeys[0]));
        for (const k of afterDelete.keys) {
          assert.deepEqual(afterDelete.values[afterDelete.keys.indexOf(k)], switched.values[switched.keys.indexOf(k)]);
        }
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        await page.reload();
        await page.locator('#board button[aria-pressed=true]').waitFor();
        assert.deepEqual(await read(), afterDelete);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), legacy);
        assert.deepEqual(await page.locator('#board button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-pressed') === 'true')), pressed);
        assert.deepEqual(errors, []);
        console.log(`${fixed ? 'fixed' : 'dynamic'} ${mode}: queued deletion, device selection, archive restoration, pre-restore backup, previous-day record switchback, selected archive deletion and persistence through reload passed`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
