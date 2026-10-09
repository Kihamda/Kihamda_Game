// Synthetic audit only. Analytics and every non-local request are aborted.
import { chromium } from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4176';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});
const report={run_id:'scheduled-game-20261009-1300',source_main:'0d3192f7464a710b0c5b4db34f7d9bb971ed6a85',
  purpose:'Source-level tag queue behavior on local browser, not collected GA4 data',
  analytics_blocked:true,external_requests_aborted:0,cases:[]};
const c=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
await c.route('**/*',r=>{
  if(new URL(r.request().url()).origin===base)return r.continue();
  report.external_requests_aborted++;return r.abort();
});
await c.addInitScript(()=>{Math.random=()=>0.1;});
const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
const queue=()=>p.evaluate(()=>Array.from(window.dataLayer??[],v=>({
  command:typeof v[0]==='string'?v[0]:typeof v[0],
  name:typeof v[1]==='string'?v[1]:typeof v[1],
}))); // No identifiers, cookie values or detailed payloads collected.
try {
  await p.goto(base+'/');
  await p.locator('a[href="/games/merge2048/"]').first().waitFor();
  report.cases.push({case:'portal_initial',fixed_counter_present:(await p.locator('body').innerText()).includes('12,450+'),queue:await queue()});
  await p.locator('a[href="/games/merge2048/"]').first().click();
  await p.locator('.merge2048-tile').first().waitFor();
  report.cases.push({case:'SPA_game_navigation',path:await p.evaluate(()=>location.pathname),queue:await queue()});
  const before=await p.locator('.merge2048-tile').evaluateAll(a=>a.map(t=>[t.textContent,t.style.top,t.style.left]));
  await p.keyboard.press('ArrowLeft');await p.waitForTimeout(600);
  const after=await p.locator('.merge2048-tile').evaluateAll(a=>a.map(t=>[t.textContent,t.style.top,t.style.left]));
  assert.notDeepEqual(before,after);
  report.cases.push({case:'intentional_board_move',board_changed:true,queue:await queue()});
  await p.getByRole('button',{name:'New Game',exact:true}).click();
  report.cases.push({case:'restart',queue:await queue()});
  await p.goto(base+'/games/merge2048/');await p.locator('.merge2048-tile').first().waitFor();
  report.cases.push({case:'direct_game_load',queue:await queue(),
    seo:await p.evaluate(()=>({title:document.title,canonical:document.querySelector('link[rel="canonical"]')?.href}))});
  assert.deepEqual(errors,[]);
  report.custom_game_start_observed=report.cases.some(x=>x.queue.some(q=>q.command==='event'&&q.name==='game_start'));
  assert.equal(report.custom_game_start_observed,false);
  report.audit_passed=true;
} catch(e) {report.audit_passed=false;report.failure=String(e);}
finally {
  report.page_errors=errors;
  report.limits='gtag remote library blocked: does not establish actual GA4 collection, enhanced measurement history settings, consent coverage, property access, or visitor behavior.';
  await browser.close();
  writeFileSync('business/evidence/measurement-browser-20261009-1300.json',JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));if(!report.audit_passed)process.exitCode=1;
