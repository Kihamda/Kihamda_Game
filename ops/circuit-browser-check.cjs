const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('site'), server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(400).end();fs.readFile(file,(e,d)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',{'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(file)]||'text/plain');res.end(d)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
for(const viewport of [{width:320,height:480},{width:375,height:667},{width:568,height:320},{width:1280,height:800}]){
 const ctx=await browser.newContext({viewport,hasTouch:true});await ctx.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async s=>window.copied=s}}));const p=await ctx.newPage();await p.clock.install({time:new Date('2026-10-28T03:00:00Z')});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(`http://127.0.0.1:${server.address().port}/game.html?game=circuit`);
 const buttons=p.locator('#board button'), read=()=>buttons.evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label'))) ;assert.equal(await buttons.count(),9);assert((await p.locator('#category').textContent()).includes('2026-10-28'));
 const dims=await buttons.evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height,r.bottom]}));assert(dims.every(([w,h,b])=>w>=44&&h>=44&&b<=viewport.height),JSON.stringify({viewport,dims}));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const initial=await read();await buttons.nth(0).focus();await p.keyboard.press('Space');assert.equal(await p.locator('#status').textContent(),'1手');const after=await read();assert.notDeepEqual(after,initial);await p.reload();assert.deepEqual(await read(),after);await p.locator('#restart').click();assert.deepEqual(await read(),initial);assert.equal(await p.locator('#status').textContent(),'0手');
 const puzzle=await p.evaluate(()=>generateCircuitPuzzle(2026,10,28));
 for(let i=0;i<9;i++){let count=(4-puzzle.turns[i])%4;for(let j=0;j<count;j++){if((await p.locator('#status').textContent()).includes('クリア'))break;await buttons.nth(i).tap()}}
 assert((await p.locator('#status').textContent()).includes('クリア'));await p.locator('#copy-result').click();assert((await p.evaluate(()=>window.copied)).includes('/play-circuit.html'));await p.reload();assert((await p.locator('#status').textContent()).includes('クリア'));await p.locator('#restart').click();assert.deepEqual(await read(),initial);assert.deepEqual(errors,[]);
 if(viewport.width===320)await p.screenshot({path:'../circuit-320.png'});
 await ctx.close();
}
console.log('Circuit: touch, keyboard, layouts, save, reload, solve, copy and restart passed');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
