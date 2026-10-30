const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('site'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(400).end();fs.readFile(f,(e,d)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',{'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'text/plain');res.end(d)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
for(const game of ['lights','garden','sum','path','sort','circuit']){
 const c=await b.newContext(),old=await c.newPage(),newer=await c.newPage();await old.clock.install({time:new Date('2026-10-28T03:00:00Z')});const mode=['lights','sort'].includes(game)?'&mode=daily':'';const url=`http://127.0.0.1:${server.address().port}/game.html?game=${game}${mode}`;await old.goto(url);await newer.goto(url);
 if(game==='path'){const i=await newer.evaluate(()=>generatePathPuzzle(2026,10,28).solution[1]);await newer.locator('#board button').nth(i).click()}
 else if(game==='sort'){const pair=await newer.evaluate(()=>{const t=generateDailySortPuzzle(2026,10,28);for(let i=0;i<4;i++)for(let j=0;j<4;j++)if(i!==j&&t[i].length&&t[j].length<3&&(!t[j].length||t[j].at(-1)===t[i].at(-1)))return [i,j]});for(const i of pair)await newer.locator('#board button:not(.sort-undo)').nth(i).click()}
 else await newer.locator('#board button').first().click();
 const key=`kihamda-daily-${game==='circuit'?'circuit-normal-v3':game==='lights'?'lights-normal-v2':game}`,before=await newer.evaluate(k=>localStorage.getItem(k),key);assert(before,`${game}: newer progress missing`);
 await old.locator('#restart').click();assert.equal(await old.evaluate(k=>localStorage.getItem(k),key),before,`${game}: stale restart erased newer progress`);assert((await old.locator('#status').textContent()).includes('別のタブ'));assert(await old.locator('#restart').evaluate(el=>el===document.activeElement));
 const labels=p=>p.locator('#board button:not(.sort-undo)').evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label')));assert.deepEqual(await labels(old),await labels(newer),`${game}: latest board not restored`);
 await old.locator('#restart').click();assert.equal(await old.evaluate(k=>localStorage.getItem(k),key),null,`${game}: second restart did not clear progress`);console.log(game,'stale restart protects newer progress; confirmed restart clears it');await c.close();
}
}finally{await b.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
