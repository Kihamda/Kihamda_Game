const {chromium}=require('playwright'),assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const candidates=require('./slide-five-candidates.json'),root=path.resolve(process.env.SITE_DIR||'site');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(400).end();fs.readFile(file,(err,bytes)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(bytes)})});
function solve(start,size){const goal=size===2?'1230':'123456780',q=[start],seen=new Map([[start,null]]);for(let n=0;n<q.length;n++){let b=q[n];if(b===goal){let moves=[];while(seen.get(b)){const [p,t]=seen.get(b);moves.push(t);b=p}return moves.reverse()}let z=b.indexOf('0');for(let i=0;i<b.length;i++){if(Math.abs(Math.floor(i/size)-Math.floor(z/size))+Math.abs(i%size-z%size)!==1)continue;const a=b.split(''),t=a[i];[a[z],a[i]]=[a[i],a[z]];let next=a.join('');if(!seen.has(next)){seen.set(next,[b,t]);q.push(next)}}}throw Error('unsolvable')}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{for(const [width,height] of [[320,480],[568,320],[1280,800]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:true});await page.addInitScript(()=>{Math.random=()=>0});
    await page.goto(`http://127.0.0.1:${server.address().port}${process.env.SITE_DIR?'/play-slide.html':'/game.html?game=slide'}`);
    const cells=page.locator('#board button'),read=async()=>(await cells.allTextContents()).map(x=>x||'0').join('');
    assert.equal(await page.locator('.slide-modes [aria-pressed=true]').textContent(),'ふつう');
    for(const mode of ['easy','normal','hard','oni','kiwami']){
      await page.locator(`.slide-modes [data-difficulty=${mode}]`).click();
      assert.equal(await cells.count(),mode==='easy'?4:9);
      const initial=await read(),sample=candidates[mode]?.find(x=>x.board===initial);
      const moves=sample?sample.moves.map(String):solve(initial,mode==='easy'?2:3);
      if(mode==='easy'){await cells.nth(0).focus();await page.keyboard.press('ArrowDown');assert(await cells.nth(2).evaluate(el=>el===document.activeElement),'2x2 grid arrow navigation')}
      let stageTested=false;
      for(const [i,t] of moves.entries()){
        const before=await read(),index=before.indexOf(t),empty=before.indexOf('0');assert(index>=0);
        if(i===0){await cells.nth(index).focus();await page.keyboard.press('Space');assert.equal((await read())[empty],t);assert(await (moves.length===1?page.locator('#restart'):cells.nth(empty)).evaluate(el=>el===document.activeElement));
          if(mode==='easy'){await page.locator('.slide-undo').focus();await page.keyboard.press('Space');assert.equal(await read(),before);assert(await page.evaluate(()=>!!document.activeElement.closest('#board')),'focus stays on the board after undo');await cells.nth(index).tap()}
          const altered=await read();await page.locator(`.slide-modes [data-difficulty=${mode==='easy'?'normal':'easy'}]`).click();await page.locator(`.slide-modes [data-difficulty=${mode}]`).click();assert.equal(await read(),altered);
        }else await cells.nth(index).tap();
        const after=await read();
        if((mode==='oni'||mode==='kiwami')&&!stageTested&&after.startsWith('876')){
          assert((await page.locator('#instructions').textContent()).includes('次は'));
          await page.locator('.slide-undo').click();assert.equal(await read(),before);assert((await page.locator('#instructions').textContent()).includes('まず'));
          await cells.nth(before.indexOf(t)).tap();stageTested=true;
        }
      }
      assert((await page.locator('#status').textContent()).includes('クリア'),mode);
      if(mode==='oni'||mode==='kiwami')assert(stageTested);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
      const boxes=await cells.evaluateAll(xs=>xs.filter(x=>!x.disabled).map(x=>{const r=x.getBoundingClientRect();return {w:r.width,h:r.height}}));assert(boxes.every(b=>b.w>=44&&b.h>=44));
      await page.locator('#restart').click();assert(!(await page.locator('#status').textContent()).includes('クリア'));
    }
    console.log(`${width}x${height}: five levels, solution, undo, keyboard, touch and switch passed`);await page.close();
  }}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
