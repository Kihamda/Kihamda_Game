const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(process.env.SITE_DIR||'site');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://x').pathname);fs.readFile(file,(error,data)=>error?res.writeHead(404).end():res.writeHead(200,{'Content-Type':{'.js':'text/javascript','.html':'text/html','.css':'text/css'}[path.extname(file)]||'text/plain'}).end(data))});
(async()=>{
 await new Promise(resolve=>server.listen(0,resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try {
  const page=await browser.newPage({viewport:{width:320,height:480}});
  await page.addInitScript(()=>{window.testTime=100;Object.defineProperty(performance,'now',{value:()=>window.testTime});Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copyText=text}}})});
  await page.goto(`http://127.0.0.1:${server.address().port}/${process.env.SITE_DIR?'play-timing.html':'game.html?game=timing'}`);
  const button=page.locator('#board button');
  async function select(mode){await page.locator(`.timing-modes [data-difficulty="${mode}"]`).click()}
  async function measure(ms){await button.click();await page.evaluate(value=>window.testTime+=value,ms);await button.click()}
  await select('easy');await button.click();assert(await page.locator('progress').isVisible());
  await page.evaluate(()=>window.testTime+=3000);await button.click();assert(await page.locator('progress').isHidden());
  assert.equal(await page.evaluate(()=>localStorage.getItem('kihamda-timing-v2-easy')),'0');
  await select('normal');assert(await page.locator('#record').isHidden());await measure(5100);
  assert.equal(await page.evaluate(()=>localStorage.getItem('kihamda-timing-v2-normal')),'100');
  await measure(5500);assert.equal(await page.evaluate(()=>localStorage.getItem('kihamda-timing-v2-normal')),'100');
  await select('hard');await measure(999);assert((await page.locator('#status').textContent()).includes('やり直そう'));
  await measure(1200);await measure(2400);await measure(3600);assert((await page.locator('#status').textContent()).includes('0.00秒'));
  await select('oni');let instructions=await page.locator('#instructions').textContent();
  let sequence=instructions.match(/[123](?=、|秒)/g).map(Number).reverse();
  await button.click();assert(!(await page.locator('#instructions').textContent()).includes('、'));await page.evaluate(n=>window.testTime+=n*1000,sequence[0]);await button.click();
  for(const n of sequence.slice(1))await measure(n*1000);
  assert((await page.locator('#status').textContent()).includes('差の合計 0.00秒'));await page.locator('#copy-result').click();assert((await page.evaluate(()=>window.copyText)).includes('提示'));
  await button.click();assert.equal(await button.textContent(),'スタート');assert((await page.locator('#instructions').textContent()).includes('、'));
  await select('kiwami');instructions=await page.locator('#instructions').textContent();
  const [ab,bc,cd,de,ea]=[...instructions.matchAll(/=([\d.]+)/g)].map(x=>Number(x[1])*1000),a=(ab-bc+cd-de+ea)/2,b=ab-a,c=bc-b,d=cd-c,e=de-d;
  for(const n of [a,b,c,d,e])await measure(n);
  assert((await page.locator('#status').textContent()).includes('差の合計 0.00秒'));await page.locator('#copy-result').click();assert((await page.evaluate(()=>window.copyText)).includes('A+B='));
  await button.click();assert.equal(await button.textContent(),'スタート');
  await measure(a);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))});
  assert((await page.locator('#status').textContent()).includes('中止'));assert.equal(await button.textContent(),'スタート');
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{value:false,configurable:true}));
  await select('easy');await button.focus();await page.keyboard.press('Space');await page.evaluate(()=>window.testTime+=3000);await page.keyboard.press('Space');
  assert((await page.locator('#status').textContent()).includes('完了'));
  for(const size of [{width:320,height:480},{width:568,height:320},{width:1280,height:800}]){
   await page.setViewportSize(size);for(const mode of ['easy','normal','hard','oni','kiwami']){await select(mode);const geometry=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,buttons:[...document.querySelectorAll('.timing-modes button,#board button')].map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height]})}));assert(geometry.scroll<=geometry.width,JSON.stringify({size,mode,geometry}));assert(geometry.buttons.every(([w,h])=>w>=44&&h>=44),JSON.stringify({size,mode,geometry}))}
  }
  console.log('Five levels: progress, independent records, best preservation, dynamic challenges, copy, cancellation, keyboard and three viewports passed');
 } finally {await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
