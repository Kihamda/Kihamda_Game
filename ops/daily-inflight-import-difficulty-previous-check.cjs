const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const revisions = {circuit:'f7574a1', lights:'543fa8d', garden:'a014afd', path:'5b37aec', sort:'aae5968', sum:'cbbcf05'};
const game = process.argv[2];
if (!revisions[game]) throw new Error('Specify circuit, lights, garden, path, sort or sum');
const difficulty = process.argv[3] || 'normal';
if (!['easy','normal','hard','oni','kiwami'].includes(difficulty)) throw new Error('Specify a valid difficulty');
const choice = process.argv[4] || 'versioned';
if (!['versioned','database'].includes(choice)) throw new Error('Specify versioned or database');
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
  if (game === 'sort') {
    const move = await page.evaluate(mode => {
      const tubes = [...document.querySelectorAll('#board>button:not(.sort-undo)')].map(el => [...el.querySelectorAll('.sort-slot')].reverse().map(slot => slot.textContent).filter(Boolean));
      for (let from=0; from<tubes.length; from++) for (let to=0; to<tubes.length; to++) {
        const a=tubes[from], b=tubes[to];
        if (from===to || !a.length || b.length===3 || (b.length && b.at(-1)!==a.at(-1))) continue;
        const next=tubes.map(t=>[...t]); next[to].push(next[from].pop());
        const won=['oni','kiwami'].includes(mode) ? next.every((t,i)=>i===3 ? !t.length : t.length===3 && t.every(c=>c===t[0])) : next.every(t=>!t.length || (t.length===3 && t.every(c=>c===t[0])));
        if (!won) return [from,to];
      }
    }, difficulty);
    assert.ok(move);
    for (const index of move) await page.locator('#board>button:not(.sort-undo)').nth(index).click();
    return;
  }
  if (!['path','sum'].includes(game)) {
    const moves = await page.evaluate(() => parseInt(document.querySelector('#status').textContent,10) || 0);
    await page.locator('#board button').nth(moves ? 1 : 0).click();
    return;
  }
  const index = await page.evaluate(({game,date,difficulty}) => {
    const key = `kihamda-daily-${game}-${difficulty}-v2`;
    const records = [localStorage.getItem(key), localStorage.getItem(key+'-previous')].map(raw => JSON.parse(raw || 'null'));
    const saved = records.find(item => item?.date === date);
    if (game === 'sum') return saved?.moves || 0;
    const puzzle = generateFivePath(difficulty,date), steps = saved?.steps || [];
    const size = puzzle.size || 5;
    const candidates = current => Array.from({length:size * size}, (_,i) => {
      const portal = puzzle.portal || [], pair = portal.indexOf(i);
      const step = pair < 0 ? [i] : [i,portal[pair ^ 1]];
      return validPathSteps(puzzle,[...current,step]) ? step : null;
    }).filter(Boolean);
    return candidates(steps).find(step => candidates([...steps,step]).length)?.[0];
  }, {game,date,difficulty});
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
      const version = game === 'circuit' && difficulty === 'normal' ? 3 : 2;
      const storageMode = game === 'circuit' && difficulty === 'hard' ? 'linked' : difficulty;
      const id = `${game}-${storageMode}-v${version}`, key = `kihamda-daily-${id}`, previous = `${key}-previous`;
      const base = `http://127.0.0.1:${server.address().port}`, query = `mode=daily&difficulty=${difficulty}&version=${version}`;
      await older.goto(`${base}/old/game.html?game=${game}&${query}`);
      await older.waitForFunction(() => document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
      await play(older,'2026-11-07');
      await seed.goto(`${base}/old/game.html?game=${game}&${query}`);
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
      if (game === 'sort') await older.locator('.sort-undo').click();
      else await play(older,'2026-11-07');
      await older.waitForFunction(({previous,old})=>localStorage.getItem(previous)!==old,{previous,old:before[1]});
      const updated = await older.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous});
      assert.equal(updated[0],before[0]);
      if (game === 'sort') {
        assert.equal(JSON.parse(before[1]).actions.length,1);
        assert.equal(JSON.parse(updated[1]).actions.length,0);
      } else assert.equal(JSON.parse(updated[1]).moves,2);
      await page.getByText(game==='sum'?'別のタブの記録が変わったよ。画面を開き直してね。':'記録が変わったよ。画面を開き直してね。').waitFor();
      assert.equal(await page.locator('#board button:enabled').count(),0);
      assert.equal(await page.evaluate(()=>window.importCompleted),false);
      await older.evaluate(()=>localStorage.setItem('import-race-release','yes'));
      await page.waitForFunction(()=>window.importCompleted===true);
      const after=await blocker.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('kihamda-games-daily',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('games'),s=tx.objectStore('games'),keys=s.getAllKeys(),values=s.getAll();tx.oncomplete=()=>{db.close();resolve({keys:keys.result,values:values.result})};tx.onabort=()=>reject(tx.error)}}));
      const entries = Object.fromEntries(after.keys.map((key,index)=>[key,after.values[index]]));
      assert.deepEqual(entries[`multi-backup:${id}:existing`],{marker:'existing archive'});
      assert.deepEqual(entries[`source:${id}`].snapshot,before);
      const saved = entries[id];
      assert.equal(saved.length,2);
      assert.deepEqual(saved.map(record=>record.date),['2026-11-08','2026-11-07']);
      if (game === 'sort') assert.deepEqual(saved.map(record=>record.actions.length),[1,1]);
      else assert.deepEqual(saved.map(record=>record.moves),[1,1]);
      for (let i=0;i<2;i++) {
        const old = JSON.parse(before[i]);
        assert.deepEqual(saved[i],old);
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
      const versioned=archive.sources.find(source=>source.id==='versioned');
      assert.deepEqual(versioned.before,saved);
      assert.deepEqual(versioned.after,updated.map(JSON.parse));
      assert.deepEqual(recovered[`source:${id}`].snapshot,updated);
      assert.deepEqual(records.find(record=>record.date==='2026-11-08'),saved[0]);
      const previousRecord=records.find(record=>record.date==='2026-11-07');
      assert.deepEqual(previousRecord,choice==='database'?saved[1]:JSON.parse(updated[1]));
      assert.deepEqual(recovered[`multi-backup:${id}:existing`],{marker:'existing archive'});
      assert.deepEqual(await page.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous}),updated);
      await page.reload();
      await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
      const afterReload=await page.evaluate(async id=>{const db=await openDailyDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('games'),records=tx.objectStore('games').get(id);tx.oncomplete=()=>{db.close();resolve(records.result)};tx.onabort=()=>reject(tx.error)})},id);
      assert.deepEqual(afterReload,records);
      if (choice === 'database') {
        await page.getByRole('button',{name:'退避した記録を見る'}).click();
        await page.locator('button[data-kind="multi"][data-source="versioned-after"][data-date="2026-11-07"]').click();
        await page.getByRole('heading',{name:'記録を比較'}).waitFor();
        await page.evaluate(()=>{ window.armRestoreRace=true; });
        await page.getByRole('button',{name:'この記録を復元'}).click({noWaitAfter:true});
        await older.waitForFunction(()=>localStorage.getItem('restore-race-signal')==='put-requested');
        if (game === 'path') await older.locator('.path-undo').click();
        else await play(older,'2026-11-07');
        await older.waitForFunction(({previous,old})=>localStorage.getItem(previous)!==old,{previous,old:updated[1]});
        const changed=await older.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous});
        assert.equal(changed[0],updated[0]);
        assert.equal(await page.evaluate(()=>window.restoreCompleted),false);
        await older.evaluate(()=>localStorage.setItem('restore-race-release','yes'));
        await page.getByText('復元後に別のタブの記録が変わったよ。画面を開き直して確認してね。').waitFor();
        assert.equal(await page.getByRole('button',{name:'復元した記録を開く'}).isDisabled(),true);
        const restored=await page.evaluate(async()=>{
          const db=await openDailyDatabase();
          return new Promise((resolve,reject)=>{const tx=db.transaction('games'),store=tx.objectStore('games'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>{db.close();resolve(Object.fromEntries(keys.result.map((key,index)=>[key,values.result[index]])))};tx.onabort=()=>reject(tx.error)});
        });
        assert.deepEqual(restored[id].find(record=>record.date==='2026-11-07'),JSON.parse(updated[1]));
        assert.deepEqual(restored[id].find(record=>record.date==='2026-11-08'),saved[0]);
        assert.deepEqual(restored[archives[0][0]],archive);
        assert.deepEqual(restored[`multi-backup:${id}:existing`],{marker:'existing archive'});
        assert.deepEqual(restored[`source:${id}`].snapshot,updated);
        assert.deepEqual(await page.evaluate(({key,previous})=>[localStorage.getItem(key),localStorage.getItem(previous)],{key,previous}),changed);
        assert.ok(Object.entries(restored).some(([key,value])=>key.startsWith(`backup:${id}:`) && JSON.stringify(value.records)===JSON.stringify(records)));
        await page.reload();
        await page.getByText('日付ごとに記録を選んでね').waitFor();
        await page.getByLabel('2026-11-07 の記録').selectOption('versioned');
        await page.getByRole('button',{name:'選択内容を確認'}).click();
        await page.getByRole('button',{name:'この内容で保存'}).click();
        await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const persisted=await page.evaluate(async id=>{const db=await openDailyDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('games'),request=tx.objectStore('games').get(id);tx.oncomplete=()=>{db.close();resolve(request.result)};tx.onabort=()=>reject(tx.error)})},id);
        assert.deepEqual(persisted.find(record=>record.date==='2026-11-08'),saved[0]);
        assert.deepEqual(persisted.find(record=>record.date==='2026-11-07'),JSON.parse(changed[1]));
      }
      assert.deepEqual(errors,[]);
      console.log(`${fixed?'fixed':'dynamic'} ${game} ${difficulty}: in-flight import detected difficulty-specific previous-day update; ${choice} record recovered with archive${choice==='database'?', restore race detected and updated versioned record reconciled':''}`);
    } finally {await context.close()}
  } finally {await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
