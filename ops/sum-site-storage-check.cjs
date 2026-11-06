const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve('site');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(400).end();fs.readFile(file,(e,data)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(data)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});const base=`http://127.0.0.1:${server.address().port}`,url=base+'/game.html?game=sum';try{
for(const mode of ['easy','normal','hard','oni','kiwami']){
 const c=await browser.newContext(),a=await c.newPage(),b=await c.newPage();await Promise.all([a.goto(url+'&difficulty='+mode),b.goto(url+'&difficulty='+mode)]);await Promise.all([a.locator('#board button').first().waitFor(),b.locator('#board button').first().waitFor()]);
 await a.locator('#board button').first().click();await a.locator('#board button[aria-pressed=true]').waitFor();
 const before=await a.evaluate(async mode=>{const db=await openDailyDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('games','readonly'),q=tx.objectStore('games').get(`sum-${mode}-v2`);tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onabort=()=>reject(tx.error)})},mode);
 await b.locator('#board button').nth(1).click();await b.getByText('記録が変わったか、保存できなかったよ。画面を開き直してね。').waitFor();
 const after=await b.evaluate(async mode=>{const db=await openDailyDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('games','readonly'),q=tx.objectStore('games').get(`sum-${mode}-v2`);tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onabort=()=>reject(tx.error)})},mode);assert.deepEqual(after,before);await c.close();console.log(mode,'sequential two-tab conflict preserves saved record');
}
{
 const c=await browser.newContext(),p=await c.newPage();await p.goto(base+'/game.html?game=unknown');await p.evaluate(()=>localStorage.setItem('test-sentinel','unchanged'));await p.goto(url+'&difficulty=oni&version=99');assert((await p.locator('#title').textContent()).includes('開けない'));assert.equal(await p.evaluate(()=>localStorage.getItem('test-sentinel')),'unchanged');await c.close();console.log('unsupported version leaves storage unchanged');
}
{
 const c=await browser.newContext();await c.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}}));const p=await c.newPage();await p.goto(url);await p.getByText('記録を読み込めないため、今回の進み具合は保存されないよ。').waitFor();await p.locator('#board button').first().click();assert.equal(await p.locator('#board button').first().getAttribute('aria-pressed'),'true');await p.getByRole('button',{name:'極'}).click();await p.locator('#board button').first().waitFor();await c.close();console.log('blocked localStorage retains volatile play and difficulty switching');
}
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
