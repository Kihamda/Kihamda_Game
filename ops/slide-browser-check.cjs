const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve('site');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (error, data) => {
    if (error) return res.writeHead(404).end();
    res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript'}[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
});
const neighbors = i => [i-3, i+3, ...(i%3 ? [i-1] : []), ...(i%3<2 ? [i+1] : [])].filter(n=>n>=0 && n<9);
function solve(start) {
  const target='123456780', queue=[start], seen=new Map([[start,null]]);
  for (let cursor=0; cursor<queue.length; cursor++) {
    const state=queue[cursor]; if(state===target) break;
    const empty=state.indexOf('0');
    for(const index of neighbors(empty)) {
      const a=state.split(''); [a[empty],a[index]]=[a[index],a[empty]]; const next=a.join('');
      if(!seen.has(next)){seen.set(next,[state,index]);queue.push(next);}
    }
  }
  assert(seen.has(target), 'generated puzzle must be solvable');
  const moves=[];for(let state=target;state!==start;){const [prior,index]=seen.get(state);moves.push(index);state=prior;}
  return moves.reverse();
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    const origin=`http://127.0.0.1:${server.address().port}`;
    for(const width of [320,1280]){
      const page=await browser.newPage({viewport:{width,height:width===320?568:800},hasTouch:width===320});
      await page.goto(`${origin}/game.html?game=slide`);
      const cells=page.locator('#board button');
      assert.equal(await cells.count(),9);
      const board=async()=>(await cells.allTextContents()).map(s=>s||'0').join('');
      const start=await board(); assert.notEqual(start,'123456780');
      const empty=start.indexOf('0'); assert(await cells.nth(empty).isDisabled());
      const invalid=[...Array(9).keys()].find(i=>i!==empty&&!neighbors(empty).includes(i));
      await cells.nth(invalid).click(); assert.equal(await board(),start); assert.equal(await page.locator('#status').textContent(),'0手');
      const moves=solve(start);
      for(const [n,index] of moves.entries()) {
        if(n===0 || n===moves.length-1){
          const before=await board(), destination=before.indexOf('0'), tile=before[index];
          await cells.nth(index).focus(); await page.keyboard.press('Space');
          if(n===moves.length-1) assert(await page.locator('#restart').evaluate(el=>el===document.activeElement));
          else {assert.equal((await board())[destination],tile);assert(await cells.nth(destination).evaluate(el=>el===document.activeElement));}
        }
        else if(width===320) await cells.nth(index).tap(); else await cells.nth(index).click();
      }
      assert.equal(await board(),'123456780'); assert((await page.locator('#status').textContent()).includes('クリア'));
      await page.locator('#restart').click(); assert.notEqual(await board(),'123456780'); assert.equal(await page.locator('#status').textContent(),'0手');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.close();
    }
    console.log('Slide puzzle: solvable, keyboard, touch, completion and restart passed');
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
