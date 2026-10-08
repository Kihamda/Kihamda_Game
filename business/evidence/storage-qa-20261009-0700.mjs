// Local Chromium QA; all non-local requests, including analytics, are blocked.
import { chromium } from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:4175';
const cases = [
  ['normal',null,0], ['valid','128',128], ['getter-denied',null,0],
  ['read-throws',null,0], ['write-throws',null,0], ['negative','-5',0],
  ['nan','NaN',0], ['partial','12oops',0], ['unsafe','9007199254740992',0],
  ['decimal','3.5',0], ['empty','',0], ['missing-storage',null,0],
];
const browser = await chromium.launch({ executablePath:'/usr/bin/chromium', headless:true });
const report = {run_id:'scheduled-game-20261009-0700',experiment_id:'EXP-merge2048',
  baseline:'dcae2496c4e872a0127ab2f61bd79cdc5dd74a9d',
  public_main:'8b0d8f51332261874947b115f549d8ddb986cad0',
  scope:'storage-only candidate; Chromium localhost synthetic QA, not business metrics',
  analytics_blocked:true,cases:[],performance:null,safari_real_device_verified:false};
try {
  for (const [mode,raw,initialBest] of cases) {
    const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true,serviceWorkers:'block'});
    await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
    await context.addInitScript(({mode,raw})=>{
      // Deterministic adjacent initial tiles: real key input merges and exercises writes.
      Math.random=()=>0.1;
      if(mode==='normal'||mode==='valid') {if(raw!==null)localStorage.setItem('merge2048-best',raw);return;}
      if(mode==='getter-denied') {
        Object.defineProperty(window,'localStorage',{get(){throw new DOMException('QA denied','SecurityError');}});return;
      }
      if(mode==='missing-storage') {Object.defineProperty(window,'localStorage',{value:undefined});return;}
      Object.defineProperty(window,'localStorage',{value:{
        getItem(){if(mode==='read-throws')throw new Error('QA read failure');return raw;},
        setItem(){if(mode==='write-throws')throw new DOMException('QA quota','QuotaExceededError');},
      }});
    },{mode,raw});
    const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
    const c={mode,raw,expected_initial_best:initialBest};
    try {
      assert.equal((await p.goto(base+'/games/merge2048/')).status(),200);
      await p.locator('.merge2048-tile').first().waitFor();
      assert.equal(Number(await p.locator('.merge2048-score-value').nth(1).textContent()),initialBest);
      await p.keyboard.press('ArrowLeft');await p.waitForTimeout(700);
      c.score=Number(await p.locator('.merge2048-score-value').nth(0).textContent());
      c.best=Number(await p.locator('.merge2048-score-value').nth(1).textContent());
      assert.equal(c.score,4);assert.equal(c.best,Math.max(4,initialBest));
      if(mode==='normal')assert.equal(await p.evaluate(()=>localStorage.getItem('merge2048-best')),'4');
      await p.getByRole('button',{name:'New Game',exact:true}).click();
      assert.equal(await p.locator('.merge2048-tile').count(),2);
      assert.equal(Number(await p.locator('.merge2048-score-value').nth(1).textContent()),c.best);
      await p.reload();await p.locator('.merge2048-tile').first().waitFor();
      c.reloaded_best=Number(await p.locator('.merge2048-score-value').nth(1).textContent());
      assert.equal(c.reloaded_best,mode==='normal'?4:initialBest);
      assert.equal(await p.locator('.merge2048-tile').count(),2);
      assert.deepEqual(errors,[]);c.result='pass';
      if(mode==='normal') {
        report.performance=await p.evaluate(()=>({
          dom_content_loaded_ms:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
          fcp_ms:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,
          note:'localhost, no CPU/network throttle; not field CWV'}));
        report.seo=await p.evaluate(()=>({title:document.title,
          canonical:document.querySelector('link[rel="canonical"]')?.href,
          description:document.querySelector('meta[name="description"]')?.content}));
        report.viewport_checks=[];
        for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:800}]) {
          await p.setViewportSize(size);await p.waitForTimeout(150);
          const geometry=await p.locator('.merge2048-board').evaluate(el=>{
            const a=el.getBoundingClientRect(),f=document.querySelector('.game-shell-frame').getBoundingClientRect();
            return {x:a.x,y:a.y,width:a.width,height:a.height,
              fully_inside_frame:a.left>=f.left&&a.right<=f.right&&a.top>=f.top&&a.bottom<=f.bottom};
          });
          report.viewport_checks.push({viewport:size,geometry});
          if(size.width===390) {
            const before=await p.locator('.merge2048-tile').evaluateAll(a=>a.map(t=>[t.textContent,t.style.top,t.style.left]));
            const cdp=await context.newCDPSession(p);
            const point={x:Math.max(25,geometry.x+90),y:Math.max(480,geometry.y+80)};
            await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
            await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x,y:point.y+65}]});
            await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
            await p.waitForTimeout(200);
            const after=await p.locator('.merge2048-tile').evaluateAll(a=>a.map(t=>[t.textContent,t.style.top,t.style.left]));
            report.real_touch={mechanism:'Chromium CDP touch, not synthetic DOM event',board_changed:JSON.stringify(before)!==JSON.stringify(after)};
            assert.equal(report.real_touch.board_changed,true);
          }
        }
      }
    } catch(e) {c.result='fail';c.failure=String(e);}
    c.page_errors=errors;report.cases.push(c);await context.close();
  }
} finally {
  await browser.close();
  report.passed=report.cases.length===cases.length&&report.cases.every(c=>c.result==='pass');
  report.resume='Best score only; reload starts new board. Board resume remains unsupported.';
  writeFileSync('business/evidence/storage-qa-20261009-0700.json',JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));
if(!report.passed)process.exitCode=1;
