const {chromium}=require('playwright'),assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const pool=require('./slide-five-candidates.json'),root=path.resolve(process.env.SITE_DIR||'site');
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(400).end();fs.readFile(f,(err,b)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{const origin=`http://127.0.0.1:${server.address().port}`,context=await browser.newContext(),page=await context.newPage();await page.addInitScript(()=>{Math.random=()=>0});await page.goto(`${origin}/game.html?game=slide`);
const cells=page.locator('#board button'),board=async()=>(await cells.allTextContents()).map(x=>x||'0').join(''),mode=async x=>page.locator(`.slide-modes [data-difficulty=${x}]`).click();
await mode('kiwami');const initial=await board(),entry=pool.kiwami.find(x=>x.board===initial);let step=0;
for(const move of entry.moves){const before=await board(),i=before.indexOf(String(move));await cells.nth(i).click();step++;if((await board()).startsWith('876'))break}
assert((await page.locator('#instructions').textContent()).includes('次は'));const savedBoard=await board();
await mode('easy');await cells.nth((await board()).indexOf('2')).click();const easyBoard=await board();
await page.reload();await mode('kiwami');assert.equal(await board(),savedBoard);assert((await page.locator('#instructions').textContent()).includes('次は'));
await page.locator('.slide-undo').click();assert((await page.locator('#instructions').textContent()).includes('まず'));
await mode('easy');assert.equal(await board(),easyBoard);await page.locator('#restart').click();await mode('kiwami');assert.notEqual(await board(),savedBoard);
await page.reload();await mode('kiwami');assert((await page.locator('#instructions').textContent()).includes('まず'));
await page.evaluate(()=>localStorage.setItem('kihamda-slide-hard-v2','{"version":2,"initial":"012345678","limit":null,"actions":[8]}'));
await page.reload();await mode('hard');assert.equal((await board()).length,9);assert.equal(await page.locator('#status').textContent(),'0手');assert.equal(await page.locator('.slide-undo').isDisabled(),true);
await context.close();const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('denied')}}));const other=await blocked.newPage(),errors=[];other.on('pageerror',e=>errors.push(e.message));await other.goto(`${origin}/game.html?game=slide`);await other.locator('#board .slide-movable').first().click();assert((await other.locator('#record').textContent()).includes('保存できない'));assert.deepEqual(errors,[]);await blocked.close();
console.log(`Separate saves: reload, checkpoint undo, restart isolation, invalid data, unavailable storage passed (checkpoint ${step})`);
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
