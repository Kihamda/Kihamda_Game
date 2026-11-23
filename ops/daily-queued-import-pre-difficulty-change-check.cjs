const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const revisions = {path:'95ebeca^', sum:'4a1bd05^'};
const game = process.argv[2];
if (!revisions[game]) throw new Error('Specify path or sum');
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
async function play(page) {
  if (game === 'sum') {
    const moves = await page.evaluate(() => JSON.parse(localStorage.getItem('kihamda-daily-sum') || 'null')?.moves || 0);
    await page.locator('#board button').nth(moves).click();
  } else {
    const index = await page.evaluate(() => {
      const puzzle = generatePathPuzzle(2026, 11, 8);
      const route = JSON.parse(localStorage.getItem('kihamda-daily-path') || 'null')?.route || [puzzle.start];
      return puzzle.solution[route.length];
    });
    assert.notEqual(index, undefined);
    await page.locator('#board button').nth(index).click();
  }
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    for (const mode of ['normal']) {
      const context=await browser.newContext();
      try {
        const older=await context.newPage(), blocker=await context.newPage(), page=await context.newPage(), errors=[];
        for(const p of [older,blocker,page]) {
          p.on('pageerror', e=>errors.push(e.message));
          await p.addInitScript(()=>{const NativeDate=Date, now=NativeDate.parse('2026-11-08T03:00:00Z'); window.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:[now]))} static now(){return now}}});
        }
        const version=2;
        const id=`${game}-${mode}-v${version}`, key=`kihamda-daily-${game}`;
        const base=`http://127.0.0.1:${server.address().port}`, query=`mode=daily&difficulty=${mode}&version=${version}`;
        await older.goto(`${base}/old/game.html?game=${game}`);
        await older.waitForFunction(()=>document.querySelectorAll('#board button').length && !document.querySelector('#restart').disabled);
        await play(older,mode);
        await older.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.date==='2026-11-08',key);
        const initialLegacy=await older.evaluate(key=>localStorage.getItem(key),key);
        await blocker.goto(`${base}/index.html`);
        await blocker.evaluate(async id=>{
          const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('kihamda-games-daily',1);req.onupgradeneeded=()=>req.result.createObjectStore('games');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
          db.onversionchange=()=>db.close();
          await new Promise((resolve,reject)=>{const tx=db.transaction('games','readwrite');tx.objectStore('games').put({marker:'existing archive'},`multi-backup:${id}:existing`);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});
          window.releaseWrite=false;
          window.lockFinished=new Promise((resolve,reject)=>{const tx=db.transaction('games','readwrite'),s=tx.objectStore('games');tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>reject(tx.error);function keep(){const req=s.get('__lock__');req.onsuccess=()=>{window.lockHeld=true;if(!window.releaseWrite)keep()}}keep()});
        },id);
        await blocker.waitForFunction(()=>window.lockHeld===true);
        await page.addInitScript(()=>{window.queuedWrites=0;const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(store,mode,...args){if(mode==='readwrite')window.queuedWrites++;return original.call(this,store,mode,...args)}});
        await page.goto(fixed?`${base}/play-${game}.html?${query}`:`${base}/game.html?game=${game}&${query}`);
        await page.waitForFunction(()=>window.queuedWrites>0);
        await play(older);
        await older.waitForFunction(({key,initialLegacy})=>localStorage.getItem(key)!==initialLegacy,{key,initialLegacy});
        const legacy=await older.evaluate(key=>localStorage.getItem(key),key);
        await page.getByText(game==='sum'?'以前の記録が変わったよ。画面を開き直してね。':'記録が変わったよ。画面を開き直してね。').waitFor();
        assert.equal(await page.locator('#board button:enabled').count(),0);
        await blocker.evaluate(()=>{window.releaseWrite=true});
        await blocker.evaluate(()=>window.lockFinished);
        const after=await blocker.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('kihamda-games-daily',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('games'),s=tx.objectStore('games'),keys=s.getAllKeys(),values=s.getAll();tx.oncomplete=()=>{db.close();resolve({keys:keys.result,values:values.result})};tx.onabort=()=>reject(tx.error)}}));
        assert.deepEqual(after,{keys:[`multi-backup:${id}:existing`],values:[{marker:'existing archive'}]});
        assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),legacy);
        assert.deepEqual(errors,[]);
        console.log(`${fixed?'fixed':'dynamic'} ${game} ${mode}: queued initial import rejected after pre-difficulty old tab write; source and archive retained`);
      } finally {await context.close()}
    }
  } finally {await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
