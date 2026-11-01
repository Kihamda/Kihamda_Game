const {chromium}=require('playwright'),assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(process.env.SITE_DIR||'site'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(400).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(b)})});
function pairsFor(mode,cards){
  const indexes=cards.map((_,i)=>i),pairs=[];
  if(mode==='kiwami'){
    const route=[[0,4],[1,2],[3,7],[5,6],[8,12],[9,10],[11,15],[13,14]];
    return route.map(pair=>pair.map(n=>cards.findIndex(c=>c.shape===Math.floor(n/4)&&c.number===n%4+1)));
  }
  while(indexes.length){const i=indexes.shift(),a=cards[i],j=indexes.find(x=>{const b=cards[x];return mode==='easy'||mode==='normal'?a.symbol===b.symbol:mode==='hard'?Math.floor((a.number-1)/2)===Math.floor((b.number-1)/2):a.shape===b.shape&&a.number+b.number===5});assert(j!==undefined);indexes.splice(indexes.indexOf(j),1);pairs.push([i,j])}return pairs;
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{for(const [width,height] of [[320,480],[568,320],[1280,800]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{Math.random=()=>0});await page.goto(`http://127.0.0.1:${server.address().port}${process.env.SITE_DIR?'/play-memory.html':'/game.html?game=memory'}`);
  const cells=page.locator('#board button'),mode=async value=>page.locator(`.memory-modes [data-difficulty=${value}]`).click();assert.equal(await page.locator('.memory-modes [aria-pressed=true]').textContent(),'ふつう');
  // Cancel a mismatched pair while the flip-back timer is pending.
  const normal=await page.evaluate(()=>memoryStates.normal.cards),different=normal.findIndex(c=>c.symbol!==normal[0].symbol);await cells.nth(0).click();await cells.nth(different).click();await mode('easy');await page.waitForTimeout(750);await mode('normal');assert.equal(await page.locator('#board button.flipped').count(),0);
  for(const level of ['easy','normal','hard','oni','kiwami']){
    await mode(level);await page.locator('#restart').click();const cards=await page.evaluate(()=>memoryStates[memoryDifficulty].cards),pairs=pairsFor(level,cards);assert.equal(await cells.count(),level==='easy'?4:16);
    if(level==='easy'){await cells.nth(0).focus();await page.keyboard.press('ArrowDown');assert(await cells.nth(2).evaluate(el=>el===document.activeElement))}
    for(const [n,[a,b]] of pairs.entries()){
      if(n===0){await cells.nth(a).focus();await page.keyboard.press('Space')}else await cells.nth(a).tap();await cells.nth(b).tap();
      if(level==='kiwami'&&n===0){assert((await page.locator('#instructions').textContent()).includes('同じ形'));assert((await page.locator('#announcement').textContent()).includes('同じ形'));await page.locator('.memory-undo').click();assert((await page.locator('#instructions').textContent()).includes('同じ数字'));assert((await page.locator('#announcement').textContent()).includes('同じ数字'));await cells.nth(a).tap();await cells.nth(b).tap();assert((await page.locator('#status').textContent()).includes('戻す 1回'))}
    }
    assert((await page.locator('#status').textContent()).includes('クリア'),level);assert.equal(await page.locator('#board button:disabled').count(),cards.length);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const boxes=await cells.evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return [r.width,r.height]}));assert(boxes.every(([w,h])=>w>=44&&h>=44));
    await page.locator('#restart').click();assert((await page.locator('#status').textContent()).includes('0組'));
  }
  assert.deepEqual(errors,[]);console.log(`${width}x${height}: five levels, solutions, undo, timer switch, keyboard and touch passed`);await page.close();
}}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
