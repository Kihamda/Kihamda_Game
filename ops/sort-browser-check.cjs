const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('site');
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(400).end();fs.readFile(f,(e,d)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',{'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'text/plain');res.end(d)})});
function solve(start){
 const key=t=>t.map(x=>x.join('')).join('|'), queue=[[start,[]]],seen=new Set([key(start)]);
 for(let n=0;n<queue.length;n++){
  const [t,steps]=queue[n];if(t.every(x=>!x.length||(x.length===3&&x.every(c=>c===x[0]))))return steps;
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
   if(i===j||!t[i].length||t[j].length===3||(t[j].length&&t[j].at(-1)!==t[i].at(-1)))continue;
   const next=t.map(a=>[...a]);next[j].push(next[i].pop());const k=key(next);if(!seen.has(k)){seen.add(k);queue.push([next,[...steps,[i,j]]]);}
  }
 }
 throw Error('unsolvable');
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 for(const viewport of [{width:320,height:480},{width:375,height:667},{width:568,height:320},{width:1280,height:800}]){
  const page=await browser.newPage({viewport,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/game.html?game=sort`);
  const buttons=page.locator('#board > button:not(.sort-undo)'),undo=page.locator('.sort-undo');assert.equal(await buttons.count(),4);
  const board=async()=>buttons.evaluateAll(bs=>bs.map(b=>Array.from(b.querySelectorAll('.sort-slot')).reverse().map(s=>s.textContent).filter(Boolean)));
  const initial=await board(),solution=solve(initial);assert(solution.length>0);
  const dims=await page.locator('#board button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {w:r.width,h:r.height,bottom:r.bottom}}));
  assert(dims.every(r=>r.w>=44&&r.h>=44),'touch target');assert(Math.max(...dims.map(x=>x.bottom))<=viewport.height,'board fits viewport');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  let invalid;
  for(let i=0;i<4&&!invalid;i++)for(let j=0;j<4;j++)if(i!==j&&initial[i].length&&(initial[j].length===3||(initial[j].length&&initial[j].at(-1)!==initial[i].at(-1)))){invalid=[i,j];break;}
  assert(invalid);await buttons.nth(invalid[0]).tap();await buttons.nth(invalid[1]).tap();assert((await page.locator('#status').textContent()).includes('同じ色'));assert.deepEqual(await board(),initial);await buttons.nth(invalid[0]).tap();
  const [a,b]=solution[0];await buttons.nth(a).focus();await page.keyboard.press('Space');assert.equal(await buttons.nth(a).getAttribute('aria-pressed'),'true');await buttons.nth(b).tap();assert((await page.locator('#status').textContent()).includes('1手'));await undo.tap();assert.deepEqual(await board(),initial);assert.equal(await undo.getAttribute('aria-disabled'),'true');
  for(const [from,to] of solution){await buttons.nth(from).tap();await buttons.nth(to).tap();}assert((await page.locator('#status').textContent()).includes('クリア'));
  await undo.tap();assert(!(await page.locator('#status').textContent()).includes('クリア'));await page.locator('#restart').tap();assert.equal(await page.locator('#status').textContent(),'0手');assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Sort: solvable board, touch, keyboard, undo, completion, restart and layouts passed');
 }finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
