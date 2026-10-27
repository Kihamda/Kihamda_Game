const { chromium }=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('site');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(400).end();fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',{'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'}[path.extname(file)]||'application/octet-stream');res.end(data)})});
async function solve(page,game){
  const cells=page.locator('#board button');
  const mask=await page.evaluate(game=>{
    if(game==='lights'){
      const initial=[...document.querySelectorAll('#board button')].reduce((m,b,i)=>m|(b.classList.contains('on')?1<<i:0),0);
      const flips=[...Array(16).keys()].map(i=>{let m=0,x=i%4,y=Math.floor(i/4);for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy;if(a>=0&&a<4&&b>=0&&b<4)m^=1<<(b*4+a)}return m});
      for(let v=0;v<65536;v++){let m=initial;for(let i=0;i<16;i++)if((v>>i)&1)m^=flips[i];if(!m)return v}
    }else{
      const clues=[...document.querySelectorAll('.garden-clue')].map(e=>Number(e.textContent)),cols=clues.slice(0,4),rows=clues.slice(4);
      for(let v=0;v<65536;v++)if(rows.every((n,r)=>[0,1,2,3].reduce((a,c)=>a+((v>>(r*4+c))&1),0)===n)&&cols.every((n,c)=>[0,1,2,3].reduce((a,r)=>a+((v>>(r*4+c))&1),0)===n))return v;
    }
    return null;
  },game);
  assert.notEqual(mask,null);
  for(let i=0;i<16;i++)if((mask>>i)&1)await cells.nth(i).click();
  assert((await page.locator('#status').textContent()).includes('クリア'));
}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const origin=`http://127.0.0.1:${server.address().port}`,context=await browser.newContext({permissions:['clipboard-read','clipboard-write']}),page=await context.newPage();
    await page.clock.install({time:new Date('2026-10-27T03:00:00Z')});
    for(const game of ['lights','garden']){
      await page.goto(`${origin}/game.html?game=${game}${game==='lights'?'&mode=daily':''}`);
      assert(await page.locator('#copy-result').isHidden());await solve(page,game);assert(await page.locator('#copy-result').isVisible());
      await page.locator('#copy-result').click();await page.locator('#copy-feedback').waitFor({state:'visible'});assert.equal(await page.locator('#copy-feedback').textContent(),'結果をコピーしたよ');
      const text=await page.evaluate(()=>navigator.clipboard.readText());
      assert.match(text,/2026-10-27 \d+手\r?\nhttps:\/\/game\.kihamda\.net\/play-/);
      assert(text.endsWith(`play-${game}.html${game==='lights'?'?mode=daily':''}`));
      await page.reload();assert(await page.locator('#copy-result').isVisible());
      await page.locator('#restart').click();assert(await page.locator('#copy-result').isHidden());assert(await page.locator('#copy-feedback').isHidden());
    }
    await context.close();
    const denied=await browser.newContext();await denied.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))}}));const p=await denied.newPage();
    await p.goto(`${origin}/game.html?game=garden`);await solve(p,'garden');await p.locator('#copy-result').click();await p.locator('#copy-feedback').waitFor({state:'visible'});assert.equal(await p.locator('#copy-feedback').textContent(),'コピーできなかったよ');await denied.close();
    const slow=await browser.newContext();
    await slow.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>new Promise(resolve=>{window.finishCopy=resolve})}}));
    const pending=await slow.newPage();await pending.goto(`${origin}/game.html?game=garden`);await solve(pending,'garden');
    await pending.locator('#copy-result').click();await pending.locator('#restart').click();
    await pending.evaluate(()=>window.finishCopy());await pending.waitForTimeout(50);
    assert(await pending.locator('#copy-feedback').isHidden(),'old copy result should not appear after restart');
    await slow.close();
    console.log('Daily result copy: hidden before completion, clipboard, reload, restart, denied permission passed');
  } finally {await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
