// Synthetic local QA. Every non-local request is blocked, including analytics.
import { chromium } from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const base = 'http://127.0.0.1:4174';
const out = 'business/evidence/catalog-qa-20261009-0100.json';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
const games = ['merge2048', 'ntiktaktoe', 'snakechaos'];
const sizes = [{width:1280,height:800}, {width:390,height:844}, {width:320,height:568}, {width:844,height:390}];
const selectors = {merge2048:'.merge2048-board',ntiktaktoe:'.start-screen',snakechaos:'.snake-game'};
const report = {source_main:'00edb342f94095ee4e92f9793e1caa956671d86b',
  built_from:'2c5ba6bd6f40f28a0f049b31ba3b4821a8e0abd5',
  source_equivalence:'games/src/lockfile equal to current main; main only merged infrastructure',
  context:'Chromium synthetic local QA, no field traffic or revenue', analytics_blocked:true,
  safari_real_device_verified:false, low_end_device_verified:false, cases:[]};
mkdirSync('/tmp/game-catalog-screens', {recursive:true});
async function context(size, denied=false) {
  const c=await browser.newContext({viewport:size,isMobile:size.width<1000,hasTouch:true,serviceWorkers:'block'});
  await c.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  if(denied)await c.addInitScript(()=>Object.defineProperty(window,'localStorage',{
    configurable:true,get(){throw new DOMException('QA denied storage','SecurityError');}}));
  return c;
}
async function attempt(record,name,fn) {
  try{record[name]={result:'observed',value:await fn()};}
  catch(e){record[name]={result:'failed',error:e.message.slice(0,350)};}
}
try {
  for(const game of games) {
    for(const size of sizes) {
      const c=await context(size),p=await c.newPage();p.setDefaultTimeout(1800);
      const record={game,viewport:size,page_errors:[]};
      p.on('pageerror',e=>record.page_errors.push(e.message));
      const response=await p.goto(base+'/games/'+game+'/');
      await p.locator(selectors[game]).waitFor();await p.waitForTimeout(250);
      record.http_status=response.status();
      record.geometry=await p.locator(selectors[game]).evaluate(el=>{
        const a=el.getBoundingClientRect(),f=document.querySelector('.game-shell-frame').getBoundingClientRect();
        const left=Math.max(a.left,f.left,0),right=Math.min(a.right,f.right,innerWidth);
        const top=Math.max(a.top,f.top,0),bottom=Math.min(a.bottom,f.bottom,innerHeight);
        return {box:{x:a.x,y:a.y,width:a.width,height:a.height},
          visible_area_fraction:Math.max(0,right-left)*Math.max(0,bottom-top)/(a.width*a.height),
          fully_inside_frame:a.left>=f.left&&a.right<=f.right&&a.top>=f.top&&a.bottom<=f.bottom};
      });
      record.seo=await p.evaluate(()=>({title:document.title,
        description:document.querySelector('meta[name="description"]')?.content,
        canonical:document.querySelector('link[rel="canonical"]')?.href,
        schema:JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@type']}));
      record.synthetic_load=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {
        dom_content_loaded_ms:n.domContentLoadedEventEnd,
        first_contentful_paint_ms:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,
        resource_transfer_bytes:performance.getEntriesByType('resource').reduce((a,r)=>a+r.transferSize,0),
        note:'localhost without network/CPU throttling; not field Core Web Vitals'};});
      if(size.width===390||size.width===1280)await p.screenshot({path:'/tmp/game-catalog-screens/'+game+'-'+size.width+'.png'});
      if(size.width===1280){
        if(game==='merge2048') {
          const signature=()=>p.locator('.merge2048-tile').evaluateAll(a=>a.map(t=>[t.textContent,t.style.top,t.style.left]));
          const before=await signature();
          for(const key of ['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'])await p.keyboard.press(key);
          record.keyboard={result:JSON.stringify(before)!==JSON.stringify(await signature())?'pass':'fail'};
          await attempt(record,'restart',async()=>{await p.getByRole('button',{name:'New Game',exact:true}).click();return await p.locator('.merge2048-tile').count()===2;});
          await attempt(record,'reload',async()=>{await p.reload();await p.locator('.merge2048-tile').first().waitFor();return await p.locator('.merge2048-tile').count()===2;});
          record.resume={result:'not_supported',scope:'only best score persisted; board reload starts new game'};
        } else if(game==='ntiktaktoe'){
          await attempt(record,'play_and_resume',async()=>{
            const inputs=p.locator('input[type="number"]');
            for(let i=0;i<3;i++)await inputs.nth(i).fill('3');
            await p.getByRole('button',{name:'ゲーム開始',exact:true}).click();
            await p.locator('.cell').first().click();
            if(await p.getByRole('button',{name:'確定',exact:true}).count())await p.getByRole('button',{name:'確定',exact:true}).click();
            const filled=await p.locator('.cell.filled').count();await p.reload();
            await p.getByRole('button',{name:'ゲームを再開',exact:true}).click();
            return {filled_before:filled,filled_after:await p.locator('.cell.filled').count()};
          });
          record.board_diagnostic=await p.locator('.cell').first().evaluate(el=>({
            box:el.getBoundingClientRect().toJSON(),display:getComputedStyle(el).display,
            grid_display:getComputedStyle(el.parentElement).display,
            total_cells:document.querySelectorAll('.cell').length
          }));
          await p.screenshot({path:'/tmp/game-catalog-screens/ntiktaktoe-after-start.png'});
          record.keyboard={result:'not_applicable',scope:'pointer board; no advertised key movement'};
        } else {
          await attempt(record,'keyboard_start',async()=>{await p.keyboard.press('Enter');await p.waitForTimeout(100);return await p.locator('.snake-overlay').count()===0;});
          await p.keyboard.press('ArrowDown');record.keyboard_direction={result:'input_sent',motion_correctness:'not verified'};
          record.resume={result:'not_supported',scope:'high score only'};
        }
      } else if(size.width===390) {
        await attempt(record,'real_touch',async()=>{
          if(game==='merge2048') {
            const bounds=await p.locator('.merge2048-board').boundingBox();
            const x=Math.max(25,bounds.x+Math.min(bounds.width,180)/2), y=Math.max(bounds.y+45,480);
            const sig=()=>p.locator('.merge2048-tile').evaluateAll(a=>a.map(t=>[t.textContent,t.style.top,t.style.left]));
            const before=await sig(),session=await c.newCDPSession(p);
            for(const dy of [-65,65]) {
              await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
              await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy}]});
              await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
            }
            return {board_changed:JSON.stringify(before)!==JSON.stringify(await sig()),point:{x,y},touch:'CDP real touch; no synthetic DOM event'};
          }
          const name=game==='snakechaos'?'START':'ゲーム開始';
          await p.getByRole('button',{name,exact:true}).tap();
          return {start_tapped:true,mobile_direction_control:game==='snakechaos'?'absent in source':'pointer board'};
        });
      }
      report.cases.push(record);await c.close();
    }
    const c=await context(sizes[0],true),p=await c.newPage();p.setDefaultTimeout(1800);
    const denied={game,storage_denied:true,page_errors:[]};
    p.on('pageerror',e=>denied.page_errors.push(e.message));
    await p.goto(base+'/games/'+game+'/');await p.waitForTimeout(300);
    denied.game_rendered=await p.locator(selectors[game]).count()>0;
    if(game==='ntiktaktoe'&&denied.game_rendered)await attempt(denied,'start_without_storage',async()=>{
      await p.getByRole('button',{name:'ゲーム開始',exact:true}).click();return await p.locator('.cell').count()>0;});
    report.cases.push(denied);await c.close();
  }
  writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({output:out,cases:report.cases.length,storage:report.cases.filter(x=>x.storage_denied).map(x=>({game:x.game,rendered:x.game_rendered,errors:x.page_errors})),geometry:report.cases.filter(x=>x.viewport?.width===390).map(x=>({game:x.game,visible:x.geometry.visible_area_fraction,touch:x.real_touch}))},null,2));
} finally {await browser.close();}
