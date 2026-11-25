const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const revisions = {path:'95ebeca^', sum:'4a1bd05^'};
const game = process.argv[2];
if (!revisions[game]) throw new Error('Specify path or sum');
const choice = process.argv[3] || 'legacy';
if (!['legacy','database'].includes(choice)) throw new Error('Specify legacy or database');
const oldScript = execFileSync('git', ['show', `${revisions[game]}:site/game.js`]);
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
async function play(page, date) {
  const index = await page.evaluate(({game,date}) => {
    const key = `kihamda-daily-${game}`;
    const records = [localStorage.getItem(key), localStorage.getItem(key+'-previous')].map(raw => JSON.parse(raw || 'null'));
    const saved = records.find(item => item?.date === date);
    if (game === 'sum') return saved?.moves || 0;
    const [year,month,day] = date.split('-').map(Number);
    const puzzle = generatePathPuzzle(year,month,day);
    return puzzle.solution[(saved?.route || [puzzle.start]).length];
  }, {game,date});
  assert.notEqual(index, undefined);
  await page.locator('#board button').nth(index).click();
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    const context = await browser.newContext();
    try {
      const older = await context.newPage(), seed = await context.newPage(), blocker = await context.newPage(), page = await context.newPage(), errors = [];
      for (const [p,date] of [[older,'2026-11-07'],[seed,'2026-11-08'],[blocker,'2026-11-08'],[page,'2026-11-08']]) {
        p.on('pageerror', e => errors.push(e.message));
        await p.addInitScript(date => {const NativeDate=Date, now=NativeDate.parse(`${date}T03:00:00Z`); window.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:[now]))} static now(){return now}}}, date);
      }
      const id = `${game}-normal-v2`, key = `kihamda-daily-${game}`, previous = `${key}-previous`;
      const base = `http://127.0.0.1:${server.address().port}`, query = 'mode=daily&difficulty=normal&version=2';
      await older.goto(`${base}/old/game.html?game=${game}`);
      await older.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
      await play(older,'2026-11-07');
      await seed.goto(`${base}/old/game.html?game=${game}`);
      await seed.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
      await play(seed,'2026-11-08');
      const before = await seed.evaluate(({key,previous}) => [localStorage.getItem(key),localStorage.getItem(previous)], {key,previous});
      assert.equal(JSON.parse(before[0]).date,'2026-11-08');
      assert.equal(JSON.parse(before[1]).date,'2026-11-07');
      await blocker.goto(`${base}/index.html`);
      await blocker.evaluate(async id => {
        const db = await new Promise((resolve,reject) => {const req=indexedDB.open('kihamda-games-daily',1);req.onupgradeneeded=()=>req.result.createObjectStore('games');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
        db.onversionchange=()=>db.close();
        await new Promise((resolve,reject)=>{const tx=db.transaction('games','readwrite');tx.objectStore('games').put({marker:'existing archive'},`multi-backup:${id}:existing`);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});
        db.close();
      },id);
      await page.addInitScript(id => {
        const put = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function(value, key) {
          const request = put.call(this, value, key);
          if (window.armRestoreRace && key === id) {
            window.armRestoreRace = false;
            window.restoreCompleted = false;
            this.transaction.addEventListener('complete', () => { window.restoreCompleted = true; });
            localStorage.setItem('restore-race-signal', 'put-requested');
            const store = this;
            function pump() { const next = store.get(key); next.onsuccess = () => { if (localStorage.getItem('restore-race-release') !== 'yes') pump(); }; }
            pump();
          }
          return request;
        };
        const original = IDBObjectStore.prototype.add;
        IDBObjectStore.prototype.add = function(value, key) {
          const request = original.call(this, value, key);
          if (key === id) {
            window.importCompleted = false;
            this.transaction.addEventListener('complete', () => { window.importCompleted = true; });
            localStorage.setItem('import-race-signal', 'add-requested');
            const store = this;
            function pump() { const next = store.get(key); next.onsuccess = () => { if (localStorage.getItem('import-race-release') !== 'yes') pump(); }; }
            pump();
          }
          return request;
        };
      }, id);
      await page.goto(fixed?`${base}/play-${game}.html?${query}`:`${base}/game.html?game=${game}&${query}`);
      await older.waitForFunction(()=>localStorage.getItem('import-race-signal')==='add-requested');
      await play(older,'2026-11-07');
      await older.waitForFunction(({previous,old})=>localStorage.getItem(previous)!==old,{previous,old:before[1]});
      const updated = await older.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous});
      assert.equal(updated[0],before[0]);
      assert.equal(JSON.parse(updated[1]).moves,2);
      await page.getByText(game==='sum'?'以前の記録が変わったよ。画面を開き直してね。':'記録が変わったよ。画面を開き直してね。').waitFor();
      assert.equal(await page.locator('#board button:enabled').count(),0);
      assert.equal(await page.locator('#restart').isDisabled(),true);
      assert.equal(await page.evaluate(()=>window.importCompleted),false);
      await older.evaluate(()=>localStorage.setItem('import-race-release','yes'));
      await page.waitForFunction(()=>window.importCompleted===true);
      assert.equal(await page.locator('#restart').isDisabled(),true);
      assert.equal(await page.locator('#board button:enabled').count(),0);
      const after=await blocker.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('kihamda-games-daily',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('games'),s=tx.objectStore('games'),keys=s.getAllKeys(),values=s.getAll();tx.oncomplete=()=>{db.close();resolve({keys:keys.result,values:values.result})};tx.onabort=()=>reject(tx.error)}}));
      const entries = Object.fromEntries(after.keys.map((key,index)=>[key,after.values[index]]));
      assert.deepEqual(entries[`multi-backup:${id}:existing`],{marker:'existing archive'});
      assert.deepEqual(entries[`source:${id}`].legacySnapshot,before);
      const saved = entries[id];
      assert.equal(saved.length,2);
      assert.deepEqual(saved.map(record=>record.date),['2026-11-08','2026-11-07']);
      assert.deepEqual(saved.map(record=>record.moves),[1,1]);
      for (let i=0;i<2;i++) {
        const old = JSON.parse(before[i]);
        if (game==='path') assert.deepEqual(saved[i].steps,old.route.slice(1).map(cell=>[cell]));
        else assert.deepEqual(saved[i].owners,old.cells.map(cell=>cell?0:-1));
      }
      assert.equal(Object.keys(entries).length,3);
      assert.deepEqual(await page.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous}),updated);
      await page.reload();
      await page.getByText('日付ごとに記録を選んでね').waitFor();
      await page.getByLabel('2026-11-07 の記録').selectOption(choice);
      await page.getByRole('button',{name:'選択内容を確認'}).click();
      await page.getByRole('button',{name:'この内容で保存'}).click();
      await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
      const recovered = await page.evaluate(async id=>{
        const db=await openDailyDatabase();
        return new Promise((resolve,reject)=>{const tx=db.transaction('games'),store=tx.objectStore('games'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>{db.close();resolve(Object.fromEntries(keys.result.map((key,index)=>[key,values.result[index]])))};tx.onabort=()=>reject(tx.error)});
      },id);
      const records=recovered[id], archives=Object.entries(recovered).filter(([key])=>key.startsWith(`multi-backup:${id}:`) && key!==`multi-backup:${id}:existing`);
      assert.equal(archives.length,1);
      const archive=archives[0][1];
      assert.equal(archive.game,id);
      assert.deepEqual(archive.database,saved);
      assert.deepEqual(archive.result,records);
      assert.deepEqual(archive.evicted,[]);
      const legacy=archive.sources.find(source=>source.id==='legacy');
      assert.deepEqual(legacy.before,saved);
      assert.deepEqual(legacy.after[0],saved[0]);
      const updatedOld=JSON.parse(updated[1]), updatedRecord=legacy.after.find(record=>record.date==='2026-11-07');
      assert.equal(updatedRecord.moves,2);
      if (game==='path') assert.deepEqual(updatedRecord.steps,updatedOld.route.slice(1).map(cell=>[cell]));
      else assert.deepEqual(updatedRecord.owners,updatedOld.cells.map(cell=>cell?0:-1));
      assert.deepEqual(recovered[`source:${id}`].legacySnapshot,updated);
      assert.deepEqual(records.find(record=>record.date==='2026-11-08'),saved[0]);
      const previousRecord=records.find(record=>record.date==='2026-11-07');
      assert.deepEqual(previousRecord,choice==='database'?saved[1]:updatedRecord);
      assert.deepEqual(recovered[`multi-backup:${id}:existing`],{marker:'existing archive'});
      assert.deepEqual(await page.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous}),updated);
      await page.reload();
      await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
      const afterReload=await page.evaluate(async()=>{const db=await openDailyDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('games'),store=tx.objectStore('games'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>{db.close();resolve(Object.fromEntries(keys.result.map((key,index)=>[key,values.result[index]])))};tx.onabort=()=>reject(tx.error)})});
      assert.deepEqual(afterReload,recovered);
      if (choice === 'database') {
        await page.getByRole('button',{name:'退避した記録を見る'}).click();
        await page.locator('button[data-kind="multi"][data-source="legacy-after"][data-date="2026-11-07"]').click();
        await page.getByRole('heading',{name:'記録を比較'}).waitFor();
        await page.evaluate(()=>{ window.armRestoreRace=true; });
        await page.getByRole('button',{name:'この記録を復元'}).click({noWaitAfter:true});
        await older.waitForFunction(()=>localStorage.getItem('restore-race-signal')==='put-requested');
        if (game === 'path') await older.locator('#board button').nth(JSON.parse(updated[1]).route.at(-2)).click();
        else await play(older,'2026-11-07');
        await older.waitForFunction(({previous,old})=>localStorage.getItem(previous)!==old,{previous,old:updated[1]});
        const changed=await older.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous});
        assert.equal(changed[0],updated[0]);
        assert.equal(await page.evaluate(()=>window.restoreCompleted),false);
        await page.getByText(game==='sum'?'以前の記録が変わったよ。画面を開き直してね。':'記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.locator('#restart').isDisabled(),true);
        assert.equal(await page.locator('#board button:enabled').count(),0);
        await older.evaluate(()=>localStorage.setItem('restore-race-release','yes'));
        await page.getByText('復元後に別のタブの記録が変わったよ。画面を開き直して確認してね。').waitFor();
        assert.equal(await page.getByRole('button',{name:'復元した記録を開く'}).isDisabled(),true);
        assert.equal(await page.locator('#restart').isDisabled(),true);
        assert.equal(await page.locator('#board button:enabled').count(),0);
        assert.equal(await page.locator('.sum-recovery button:enabled, .sum-recovery select:enabled').count(),0);
        const restored=await page.evaluate(async()=>{
          const db=await openDailyDatabase();
          return new Promise((resolve,reject)=>{const tx=db.transaction('games'),store=tx.objectStore('games'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>{db.close();resolve(Object.fromEntries(keys.result.map((key,index)=>[key,values.result[index]])))};tx.onabort=()=>reject(tx.error)});
        });
        assert.deepEqual(restored[id].find(record=>record.date==='2026-11-07'),updatedRecord);
        assert.deepEqual(restored[id].find(record=>record.date==='2026-11-08'),saved[0]);
        assert.deepEqual(restored[archives[0][0]],archive);
        assert.deepEqual(restored[`multi-backup:${id}:existing`],{marker:'existing archive'});
        assert.deepEqual(restored[`source:${id}`].legacySnapshot,updated);
        assert.deepEqual(await page.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous}),changed);
        assert.ok(Object.entries(restored).some(([key,value])=>key.startsWith(`backup:${id}:`) && JSON.stringify(value.records)===JSON.stringify(records)));
        await page.reload();
        await page.getByText('日付ごとに記録を選んでね').waitFor();
        await page.getByLabel('2026-11-07 の記録').selectOption('legacy');
        await page.getByRole('button',{name:'選択内容を確認'}).click();
        await page.getByRole('button',{name:'この内容で保存'}).click();
        await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const persisted=await page.evaluate(async id=>{const db=await openDailyDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('games'),request=tx.objectStore('games').get(id);tx.oncomplete=()=>{db.close();resolve(request.result)};tx.onabort=()=>reject(tx.error)})},id);
        assert.deepEqual(persisted.find(record=>record.date==='2026-11-08'),saved[0]);
        const changedOld=JSON.parse(changed[1]), changedRecord=persisted.find(record=>record.date==='2026-11-07');
        assert.equal(changedRecord.moves,changedOld.moves);
        if (game==='path') assert.deepEqual(changedRecord.steps,changedOld.route.slice(1).map(cell=>[cell]));
        else assert.deepEqual(changedRecord.owners,changedOld.cells.map(cell=>cell?0:-1));
        const readAll = () => page.evaluate(async()=>{
          const db=await openDailyDatabase();
          return new Promise((resolve,reject)=>{const tx=db.transaction('games'),store=tx.objectStore('games'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>{db.close();resolve(Object.fromEntries(keys.result.map((key,index)=>[key,values.result[index]])))};tx.onabort=()=>reject(tx.error)});
        });
        const beforeFinalReload=await readAll();
        assert.deepEqual(beforeFinalReload[id],persisted);
        assert.deepEqual(beforeFinalReload[archives[0][0]],archive);
        assert.deepEqual(beforeFinalReload[`multi-backup:${id}:existing`],{marker:'existing archive'});
        for (const [archiveKey,value] of Object.entries(restored).filter(([key])=>key.startsWith(`backup:${id}:`))) assert.deepEqual(beforeFinalReload[archiveKey],value);
        const newArchives=Object.entries(beforeFinalReload).filter(([key])=>key.startsWith(`multi-backup:${id}:`) && !(key in restored));
        assert.equal(newArchives.length,1);
        assert.deepEqual(newArchives[0][1].result,persisted);
        const readArchiveList = async () => {
          await page.getByRole('button',{name:'退避した記録を見る'}).click();
          const section=page.locator('.sum-recovery');
          await section.getByText('4件の退避',{exact:true}).waitFor();
          await section.locator(':scope > div > div > section').nth(3).waitFor();
          return section.innerText();
        };
        const listBefore=await readArchiveList();
        await page.reload();
        await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        assert.deepEqual(await readAll(),beforeFinalReload);
        assert.deepEqual(await readArchiveList(),listBefore);
      }
      assert.deepEqual(errors,[]);
      console.log(`${fixed?'fixed':'dynamic'} ${game}: in-flight import detected pre-difficulty previous-day update; ${choice} record recovered with archive${choice==='database'?', restore race detected and updated legacy record reconciled':''}`);
    } finally {await context.close()}
  } finally {await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
