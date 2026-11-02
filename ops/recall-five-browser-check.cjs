const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(process.env.SITE_DIR||'site'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://x').pathname);fs.readFile(f,(e,d)=>e?res.writeHead(404).end():res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'text/plain'}).end(d))});
function solve(mode,values){
 if(mode==='easy'||mode==='normal')return values.slice().reverse();
 if(mode==='hard')return values.slice().reverse().map(n=>(n+1)%4);
 if(mode==='oni'){let r=[];for(let i=values.length-1;i>=0;i--)if((i+1)%2===0)r.push(values[i]);for(let i=values.length-1;i>=0;i--)if((i+1)%2===1)r.push(values[i]);return r}
 const indices=Array(4).fill(-1);values.forEach((n,i)=>indices[n]=i);return [0,1,2,3].filter(n=>indices[n]>=0).sort((a,b)=>indices[b]-indices[a]).map(n=>(n+1)%4);
}
(async()=>{await new Promise(r=>server.listen(0,r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:320,height:480}}),url=`http://127.0.0.1:${server.address().port}/${process.env.SITE_DIR?'play-recall.html':'game.html?game=recall'}`;await page.goto(url);
 const names=['まる','さんかく','ひし形','しかく'],ready=page.locator('.recall-ready'),choices=page.locator('#board button:not(.recall-ready)'),status=page.locator('#status');
 for(const mode of ['easy','normal','hard','oni','kiwami']){
  await page.locator(`[data-difficulty=${mode}]`).click();assert(await page.locator('#record').isHidden());
  const count={easy:2,normal:3,hard:3,oni:4,kiwami:6}[mode];
  for(let round=0;round<3-(mode==='easy'?1:0);round++){
   let text=await status.textContent(),values=text.split('：')[1].split('・').map(name=>names.indexOf(name));assert.equal(values.length,count+round);assert(values.every(n=>n>=0));if(mode==='kiwami')assert.equal(new Set(values).size,4);
   const boxes=await page.locator('#board button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return [r.right,r.bottom]}));assert(boxes.every(([right,bottom])=>right<=320&&bottom<=480),JSON.stringify({mode,round,boxes}));
   const answer=solve(mode,values);await ready.click();assert(!(await status.textContent()).includes('覚えよう'));
   if(round===0){await choices.nth((answer[0]+1)%4).click();assert((await status.textContent()).startsWith('もう一度覚えよう'));assert(await choices.nth(0).isDisabled());await ready.click()}
   for(const index of answer)await choices.nth(index).click();
  }
  assert((await status.textContent()).includes('間違い 1回'));assert.equal(await page.evaluate(key=>localStorage.getItem(key),`kihamda-recall-v2-${mode}`),'1');
  await ready.focus();await page.keyboard.press('Space');assert((await status.textContent()).startsWith('覚えよう'));assert(await ready.evaluate(el=>el===document.activeElement));
 }
 await page.reload();assert.equal(await page.locator('[data-difficulty=normal]').getAttribute('aria-pressed'),'true');assert((await page.locator('#record').textContent()).includes('1回'));
 for(const size of [{width:320,height:480},{width:568,height:320},{width:1280,height:800}]){await page.setViewportSize(size);for(const mode of ['easy','normal','hard','oni','kiwami']){await page.locator(`[data-difficulty=${mode}]`).click();const g=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('.recall-modes button,#board button')].map(b=>{const r=b.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})}));assert(g.scroll<=g.width,JSON.stringify({size,mode,g}));assert(g.buttons.every(([, ,w,h])=>w>=44&&h>=44),JSON.stringify({size,mode,g}));console.log(JSON.stringify({size,mode,ready:g.buttons[5]}));}}
 const denied=await browser.newPage();await denied.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value(){throw Error('denied')}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('denied')}})});await denied.goto(url);await denied.locator('[data-difficulty=easy]').click();
 for(let round=0;round<2;round++){const values=(await denied.locator('#status').textContent()).split('：')[1].split('・').map(name=>names.indexOf(name));await denied.locator('.recall-ready').click();for(const i of solve('easy',values))await denied.locator('#board button:not(.recall-ready)').nth(i).click()}
 assert((await denied.locator('#status').textContent()).includes('クリア'));assert((await denied.locator('#record').textContent()).includes('保存できなかった'));await denied.close();
 console.log('All levels, retries, independent scores, keyboard replay and viewport sizes passed');
 }finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
