const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const revisions = {circuit:'f7574a1', lights:'543fa8d', garden:'a014afd', path:'5b37aec', sort:'aae5968'};
const game = process.argv[2];
if (!revisions[game]) throw new Error('Specify circuit, lights, garden, path or sort');
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
async function play(page, mode) {
  if (game === 'path') {
    const index = await page.evaluate(mode => { const p = generateFivePath(mode, '2026-11-07'); const saved=JSON.parse(localStorage.getItem(`kihamda-daily-path-${mode}-v2`) || 'null'); const steps=saved?.steps || []; return Array.from({length:(p.size || 5)**2}, (_, i) => i).find(i => validPathSteps(p, [...steps,[i]])); }, mode);
    assert.notEqual(index, undefined); await page.locator('#board button').nth(index).click();
  } else if (game === 'sort') {
    const move = await page.evaluate(mode => {
      const tubes = [...document.querySelectorAll('#board>button:not(.sort-undo)')].map(el => [...el.querySelectorAll('.sort-slot')].reverse().map(slot => slot.textContent).filter(Boolean));
      for (let from=0; from<tubes.length; from++) for (let to=0; to<tubes.length; to++) {
        const a=tubes[from], b=tubes[to]; if (from===to || !a.length || b.length===3 || (b.length && b.at(-1)!==a.at(-1))) continue;
        const next=tubes.map(t=>[...t]); next[to].push(next[from].pop());
        const won=['oni','kiwami'].includes(mode) ? next.every((t,i)=>i===3 ? !t.length : t.length===3 && t.every(c=>c===t[0])) : next.every(t=>!t.length || (t.length===3 && t.every(c=>c===t[0])));
        if (!won) return [from,to];
      }
    }, mode);
    assert.ok(move); for (const index of move) await page.locator('#board>button:not(.sort-undo)').nth(index).click();
  } else { const moves=await page.evaluate(()=>parseInt(document.querySelector('#status').textContent,10) || 0); await page.locator('#board button').nth(moves ? 1 : 0).click(); }
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    for (const mode of ['easy','normal','hard','oni','kiwami']) for (const stage of ['select','confirm']) {
      const context = await browser.newContext();
      try {
        const page=await context.newPage(), older=await context.newPage(), errors=[];
        for (const p of [page,older]) p.on('pageerror', e=>errors.push(e.message));
        for (const [p,date] of [[page,'2026-11-08'],[older,'2026-11-07']]) await p.addInitScript(date=>{
          const NativeDate=Date, now=NativeDate.parse(`${date}T03:00:00Z`);
          window.Date=class extends NativeDate { constructor(...args){super(...(args.length ? args : [now]));} static now(){return now;} };
        },date);
        const version=game==='circuit' && mode==='normal' ? 3 : 2;
        const storageMode=game==='circuit' && mode==='hard' ? 'linked' : mode;
        const id=`${game}-${storageMode}-v${version}`, key=`kihamda-daily-${id}`;
        const base=`http://127.0.0.1:${server.address().port}`, query=`mode=daily&difficulty=${mode}&version=${version}`;
        await page.goto(fixed ? `${base}/play-${game}.html?${query}` : `${base}/game.html?game=${game}&${query}`);
        await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        await page.locator('#restart').click();
        await page.waitForFunction(()=>!document.querySelector('#restart').disabled);
        await older.goto(`${base}/old/game.html?game=${game}&${query}`);
        await older.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        await play(older, mode);
        await older.waitForFunction(key=>JSON.parse(localStorage.getItem(key) || 'null')?.date==='2026-11-07',key);
        await page.getByText('記録が変わったよ。画面を開き直してね。').waitFor();
        await page.reload(); await page.getByText('日付ごとに記録を選んでね').waitFor();
        await page.getByLabel('2026-11-07 の記録').selectOption('versioned');
        if(stage==='confirm') await page.getByRole('button',{name:'選択内容を確認'}).click();
        const read=()=>page.evaluate(async id=>{ const db=await openDailyDatabase(); return new Promise((resolve,reject)=>{const tx=db.transaction('games'), store=tx.objectStore('games'), records=store.get(id), meta=store.get(`source:${id}`); tx.oncomplete=()=>{db.close();resolve({records:records.result,meta:meta.result})}; tx.onabort=()=>reject(tx.error)}); },id);
        const before=await read(), previous=await older.evaluate(key=>localStorage.getItem(key),key);
        await play(older, mode);
        await older.waitForFunction(([key,previous])=>localStorage.getItem(key)!==previous,[key,previous]);
        const legacy=await older.evaluate(key=>localStorage.getItem(key),key);
        await page.getByText('記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.locator('.sum-recovery button:enabled, .sum-recovery select:enabled').count(),0);
        assert.deepEqual(await read(),before);
        await page.reload(); await page.getByText('日付ごとに記録を選んでね').waitFor();
        await page.getByLabel('2026-11-07 の記録').selectOption('versioned');
        await page.getByRole('button',{name:'選択内容を確認'}).click();
        await page.getByRole('button',{name:'この内容で保存'}).click();
        await page.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        const after=await read(), old=JSON.parse(legacy), field={circuit:'turns',lights:'cells',garden:'cells',path:'steps',sort:'actions'}[game];
        assert.deepEqual(after.records.find(r=>r.date==='2026-11-08'),before.records.find(r=>r.date==='2026-11-08'));
        assert.deepEqual(after.records.find(r=>r.date==='2026-11-07')[field],old[field]);
        assert.equal(await older.evaluate(key=>localStorage.getItem(key),key),legacy);
        assert.deepEqual(errors,[]);
        console.log(`${fixed?'fixed':'dynamic'} ${game} ${mode} ${stage}: stale controls disabled and both days retained`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
