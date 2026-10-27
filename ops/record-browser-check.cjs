const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve('site');
const server = http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)) return res.writeHead(400).end();
  fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',{'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'}[path.extname(file)]||'application/octet-stream');res.end(data)});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    const origin=`http://127.0.0.1:${server.address().port}`;
    const context=await browser.newContext();
    await context.addInitScript(()=>{let t=0;Object.defineProperty(performance,'now',{value:()=>{t+=window.testStep||1000;return t}})});
    const page=await context.newPage();
    const finish=async()=>{for(let n=1;n<=15;n++)await page.getByRole('button',{name:String(n),exact:true}).click();await page.getByRole('button',{name:'16',exact:true}).focus();await page.keyboard.press('Space')};
    await page.goto(`${origin}/game.html?game=order`);
    assert(await page.locator('#record').isHidden());
    await page.getByRole('button',{name:'1',exact:true}).focus();
    await page.keyboard.press('Space');
    assert(await page.evaluate(()=>document.activeElement.tagName==='BUTTON' && !document.activeElement.disabled));
    await page.locator('#restart').click();
    await finish(); assert.equal(await page.locator('#record').textContent(),'自己ベスト 1.00秒');
    assert(await page.locator('#restart').evaluate(el=>el===document.activeElement));
    await page.locator('#restart').click(); await page.evaluate(()=>window.testStep=2000); await finish();
    assert.equal(await page.locator('#record').textContent(),'自己ベスト 1.00秒');
    await page.locator('#restart').click(); await page.evaluate(()=>window.testStep=500); await finish();
    assert.equal(await page.locator('#record').textContent(),'自己ベスト 0.50秒');
    await page.reload(); assert.equal(await page.locator('#record').textContent(),'自己ベスト 0.50秒');
    await page.goto(`${origin}/game.html?game=lights`); assert(await page.locator('#record').isHidden());
    await context.close();
    const blocked=await browser.newContext();
    await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked')}}));
    const other=await blocked.newPage();const errors=[];other.on('pageerror',e=>errors.push(e.message));
    await other.goto(`${origin}/game.html?game=order`);
    for(let n=1;n<=16;n++)await other.getByRole('button',{name:String(n),exact:true}).click();
    assert((await other.locator('#status').textContent()).includes('ゴール'));assert(await other.locator('#record').isVisible());assert.deepEqual(errors,[]);
    await blocked.close(); console.log('Personal best: update, retention, reload and unavailable storage passed');
  } finally {await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
