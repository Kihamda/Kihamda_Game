const {chromium}=require('playwright'),assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(process.env.SITE_DIR||'site'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(400).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
const page=await browser.newPage();await page.addInitScript(()=>{Math.random=()=>0});await page.goto(`http://127.0.0.1:${server.address().port}/game.html?game=memory`);await page.locator('.memory-modes [data-difficulty=kiwami]').click();const cards=await page.evaluate(()=>memoryStates.kiwami.cards),cells=page.locator('#board button');
const pair=async(a,b)=>{for(const n of [a,b]){const i=cards.findIndex(c=>c.shape===Math.floor(n/4)&&c.number===n%4+1);await cells.nth(i).click()}};
for(const [a,b] of [[0,4],[1,2],[3,7],[8,9],[6,10]])await pair(a,b);
assert((await page.locator('#status').textContent()).startsWith('5組'));await page.locator('.memory-undo').click();assert((await page.locator('#status').textContent()).includes('4組'));assert((await page.locator('#instructions').textContent()).includes('同じ数字'));
for(const [a,b] of [[5,13],[10,11],[6,14],[12,15]])await pair(a,b);
assert((await page.locator('#status').textContent()).includes('クリア'));assert((await page.locator('#status').textContent()).includes('戻す 1回'));
console.log('Extreme dead-end example: undo restores rule, alternative solves, undo count retained');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
