const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('site');const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(400).end();fs.readFile(file,(e,d)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',{'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(file)]||'text/plain');res.end(d)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
for(const game of ['lights','garden','sum','path','sort','circuit']){
 const c=await browser.newContext({viewport:{width:320,height:480},hasTouch:true}),old=await c.newPage(),today=await c.newPage();
 await old.clock.install({time:new Date('2026-10-27T14:59:45Z')});const mode=['lights','sort'].includes(game)?'&mode=daily':'';const url=`http://127.0.0.1:${server.address().port}/game.html?game=${game}${mode}`;await old.goto(url);assert((await old.locator('#category').textContent()).includes('今日のパズル 2026-10-27'));
 await old.clock.setFixedTime(new Date('2026-10-27T15:00:01Z'));await today.goto(url);
 const gameButtons=p=>p.locator('#board button:not(.sort-undo)');
 if(game==='path'){const next=await today.evaluate(()=>generatePathPuzzle(2026,10,28).solution[1]);await gameButtons(today).nth(next).tap()}
 else if(game==='sort'){const pair=await today.evaluate(()=>{let t=generateDailySortPuzzle(2026,10,28);for(let i=0;i<4;i++)for(let j=0;j<4;j++)if(i!==j&&t[i].length&&t[j].length<3&&(!t[j].length||t[j].at(-1)===t[i].at(-1)))return [i,j]});for(const i of pair)await gameButtons(today).nth(i).tap()}
 else await gameButtons(today).first().tap();
 const saved=await today.evaluate(g=>localStorage.getItem('kihamda-daily-'+g),game==='circuit'?'circuit-normal-v3':game==='lights'?'lights-normal-v2':game);const labels=await gameButtons(today).evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label')));
 // A returning tab updates immediately; a tab left open updates on its timer.
 if(game==='lights')await old.clock.runFor(30000);else await old.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 assert.equal(await old.locator('#category').textContent(),'2026-10-27 の問題');assert.equal(await old.locator('#restart').textContent(),'今日の問題へ');
 assert((await old.locator('#announcement').textContent()).includes('日付が変わった'));
 const boardRect=await old.locator('#board').boundingBox();assert(boardRect.y+boardRect.height<=480,`${game}: stale board exceeds viewport`);
 const buttonRect=await old.locator('#restart').boundingBox();assert(buttonRect.width>=44&&buttonRect.height>=44&&buttonRect.x+buttonRect.width<=320);
 await old.locator('#restart').tap();assert.equal(await old.locator('#category').textContent(),'今日のパズル 2026-10-28');assert.equal(await old.locator('#restart').textContent(),'もう一度');
 assert.equal(await old.evaluate(g=>localStorage.getItem('kihamda-daily-'+g),game==='circuit'?'circuit-normal-v3':game==='lights'?'lights-normal-v2':game),saved);assert.deepEqual(await gameButtons(old).evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label'))),labels);
 console.log(game,'date change, today navigation and saved progress passed');await c.close();
}
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
