const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(process.env.SITE_DIR||'site');
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+name);if(!f.startsWith(root+path.sep))return res.writeHead(400).end();fs.readFile(f,(e,d)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',{'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'text/plain');res.end(d)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
for(const name of ['garden','sum','lights','path','circuit','sort']) for(const suffix of ['','-previous']){
 const p=await b.newPage();await p.clock.install({time:new Date('2026-11-03T03:00:00Z')});const base=`http://127.0.0.1:${server.address().port}`;await p.goto(base+'/game.html?game=unknown');
 const key=`kihamda-daily-${name}-normal-${name==='circuit'?'v3':'v2'}${suffix}`;await p.evaluate(k=>localStorage.setItem(k,'{bad'),key);
 await p.goto(`${base}/game.html?game=${name}${['lights','sort'].includes(name)?'&mode=daily':''}`);
 assert(await p.locator('#record').isVisible());
 if(name==='path'){const next=await p.evaluate(()=>generatePathPuzzle(2026,11,3).solution[1]);await p.locator('#board button').nth(next).click()}
 else if(name==='sort'){const pair=await p.evaluate(()=>{const t=generateTrialSortPuzzle('normal','2026-11-03').tubes;for(let i=0;i<4;i++)for(let j=0;j<4;j++)if(i!==j&&t[i].length&&t[j].length<3&&(!t[j].length||t[j].at(-1)===t[i].at(-1)))return [i,j]});for(const i of pair)await p.locator('#board button:not(.sort-undo)').nth(i).click()}
 else await p.locator('#board button').first().click();
 await p.locator('#restart').click();assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),'{bad');assert(await p.locator('#record').isVisible());await p.close();console.log(name,suffix||'current','preserved after move and reset');
}
const context=await b.newContext(), a=await context.newPage(), other=await context.newPage();
await a.clock.install({time:new Date('2026-11-03T03:00:00Z')});const base=`http://127.0.0.1:${server.address().port}`;
await a.goto(`${base}/game.html?game=garden`);await a.locator('#board button').first().click();await other.goto(`${base}/game.html?game=unknown`);
const key='kihamda-daily-garden-normal-v2';await other.evaluate(k=>localStorage.setItem(k,'{bad from another tab'),key);
await a.locator('#board button').nth(1).click();await a.locator('#restart').click();assert.equal(await other.evaluate(k=>localStorage.getItem(k),key),'{bad from another tab');assert(await a.locator('#record').isVisible());await context.close();
console.log('Corruption by another tab is not overwritten or removed');
}finally{await b.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
