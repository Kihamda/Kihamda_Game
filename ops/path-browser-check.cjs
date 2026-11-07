const {chromium} = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve('site');
const server = http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep))return res.writeHead(400).end();
  fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',{'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'}[path.extname(file)]||'application/octet-stream');res.end(data)});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    const context=await browser.newContext({viewport:{width:320,height:568},hasTouch:true});
    await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.copied=text}}));
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.clock.install({time:new Date('2026-10-27T03:00:00Z')});
    await page.goto(`http://127.0.0.1:${server.address().port}/game.html?game=path`);
    const ready=()=>page.waitForFunction(()=>document.querySelectorAll('#board button').length&&!document.querySelector('#restart').disabled);
    const fresh=async value=>{await page.goto(`http://127.0.0.1:${server.address().port}/game.html?game=unknown`);await page.evaluate(async v=>{await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase('kihamda-games-daily');request.onsuccess=resolve;request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('database delete blocked'))});if(v===null)localStorage.removeItem('kihamda-daily-path-normal-v2');else localStorage.setItem('kihamda-daily-path-normal-v2',JSON.stringify(v))},value);await page.goto(`http://127.0.0.1:${server.address().port}/game.html?game=path`);await ready()};await ready();
    const puzzle=await page.evaluate(()=>generatePathPuzzle(2026,10,27));
    const cells=page.locator('#board button');assert.equal(await cells.count(),16);
    assert.equal(await page.locator('#status').textContent(),'1 / 16マス');
    const nonNeighbor=[...Array(16).keys()].find(i=>i!==puzzle.start&&!((Math.abs(i-puzzle.start)===4)||(Math.floor(i/4)===Math.floor(puzzle.start/4)&&Math.abs(i-puzzle.start)===1)));
    await cells.nth(nonNeighbor).tap();assert.equal(await page.locator('#status').textContent(),'上下左右の隣のマスを押してね。');
    assert.equal(await page.locator('#status').getAttribute('role'),'status');
    const fixtures=await page.evaluate((puzzle)=>{
      const queue=[[puzzle.start]], found={};
      for(let cursor=0;cursor<queue.length && (!found.order||!found.goal||!found.visited);cursor++){
        const route=queue[cursor];
        for(const cell of pathNeighbors(route.at(-1))){
          const cp=puzzle.checkpoints.indexOf(cell);
          if(route.includes(cell)){
            if(cell!==route.at(-2)&&!found.visited)found.visited={route,cell};
          } else if(cp>=0&&puzzle.checkpoints.slice(0,cp).some(item=>!route.includes(item))){
            if(!found.order)found.order={route,cell};
          } else if(cell===puzzle.goal&&route.length<15){
            if(!found.goal)found.goal={route,cell};
          } else if(route.length<15&&cell!==puzzle.goal){
            queue.push([...route,cell]);
          }
        }
      }
      return found;
    },puzzle);
    for(const [kind,message] of [['order','数字は1から順番に通ろう。'],['goal','数字とほかのマスをすべて通ってからゴールしよう。'],['visited','通ったマスには戻れないよ。1つ前のマスを押してね。']]){
      assert(fixtures[kind],`Missing ${kind} fixture`);
      await fresh({date:'2026-10-27',steps:fixtures[kind].route.slice(1).map(i=>[i]),moves:fixtures[kind].route.length-1});
      if(kind==='visited')await page.setViewportSize({width:320,height:480});
      await cells.nth(fixtures[kind].cell).tap();assert.equal(await page.locator('#status').textContent(),message);
      if(kind==='visited'){
        await page.locator('#board').evaluate(el=>el.scrollIntoView({block:'center'}));
        const board=await page.locator('#board').boundingBox();
        assert(board.y>=0&&board.y+board.height<=480,'Board must remain reachable at 320×480');
        const sizes=await cells.evaluateAll(items=>items.map(item=>{const rect=item.getBoundingClientRect();return [rect.width,rect.height]}));
        assert(sizes.every(([width,height])=>width>=44&&height>=44),'Touch targets must be at least 44px');
        await page.setViewportSize({width:320,height:568});
      }
    }
    const invalidSaves=[
      {route:[puzzle.start,puzzle.start],moves:1},
      {route:[...fixtures.order.route,fixtures.order.cell],moves:2},
      {route:[...fixtures.goal.route,fixtures.goal.cell],moves:2},
      {route:[puzzle.start],moves:-1},
      {route:[puzzle.solution[1]],moves:0}
    ];
    for(const saved of invalidSaves){
      await fresh({date:'2026-10-27',steps:saved.route[0]===puzzle.start?saved.route.slice(1).map(i=>[i]):[[puzzle.goal]],moves:saved.moves});assert.equal(await page.locator('#status').textContent(),'1 / 16マス');
    }
    const invalidBefore=await page.evaluate(()=>localStorage.getItem('kihamda-daily-path-normal-v2'));
    await page.locator('#restart').tap();
    assert.equal(await page.evaluate(()=>localStorage.getItem('kihamda-daily-path-normal-v2')),invalidBefore);
    await fresh(null);
    await cells.nth(puzzle.solution[1]).focus();await page.keyboard.press('Space');await ready();
    assert.equal(await page.locator('#status').textContent(),'2 / 16マス');
    await page.reload();await ready();assert.equal(await page.locator('#status').textContent(),'2 / 16マス');
    await cells.nth(puzzle.start).tap();await ready();assert.equal(await page.locator('#status').textContent(),'1 / 16マス');
    for(const i of puzzle.solution.slice(1)){await cells.nth(i).tap();await ready()}
    assert((await page.locator('#status').textContent()).startsWith('クリア！'));
    await page.locator('#copy-result').tap();assert((await page.evaluate(()=>window.copied)).includes('/play-path.html'));
    await page.reload();await ready();assert((await page.locator('#status').textContent()).startsWith('クリア！'));
    await page.locator('#restart').tap();await ready();assert.equal(await page.locator('#status').textContent(),'1 / 16マス');
    await page.clock.setFixedTime(new Date('2026-10-28T03:00:00Z'));await page.reload();await ready();
    assert((await page.locator('#category').textContent()).includes('2026-10-28'));
    assert.equal(await page.locator('#status').textContent(),'1 / 16マス');
    await page.setViewportSize({width:320,height:480});
    for(const id of ['lights','memory','order','dodge','sum','slide','garden','path']){
      await page.goto(`http://127.0.0.1:${server.address().port}/game.html?game=${id}`);
      if(id==='path')await ready();if(id==='garden'||id==='path') await page.locator('#board').evaluate(el=>el.scrollIntoView({block:'center'}));
      const board=await page.locator('#board').boundingBox();
      assert(board.y>=0&&board.y+board.height<=480,`${id} board must be visible at 320×480`);
      const sizes=await page.locator('#board button').evaluateAll(items=>items.map(item=>{const rect=item.getBoundingClientRect();return [rect.width,rect.height]}));
      assert(sizes.every(([width,height])=>width>=44&&height>=44),`${id} targets must be at least 44px`);
      if(id==='dodge'){
        const controls=await page.locator('#controls').boundingBox();
        assert(controls.y+controls.height<=480,'Dodge controls must fit at 320×480');
      }
    }
    for(const height of [480,501,568]){
      await page.setViewportSize({width:320,height});await page.clock.setFixedTime(new Date('2026-10-27T03:00:00Z'));await page.goto(`http://127.0.0.1:${server.address().port}/game.html?game=path`);await ready();await page.locator('#restart').tap();await ready();
      await page.locator('#board').evaluate(el=>el.scrollIntoView({block:'center'}));const rect=await page.locator('#board').boundingBox();assert(rect.y>=0&&rect.y+rect.height<=height,`path not reachable at 320x${height}`);
      const sizes=await cells.evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return [r.width,r.height]}));
      assert(sizes.every(([w,h])=>w>=44&&h>=44));await cells.nth(puzzle.solution[1]).tap();await ready();assert((await page.locator('#status').textContent()).includes('2 / 16'));
    }
    assert.deepEqual(errors,[]);await context.close();
    console.log('Daily path: touch, keyboard, invalid move, undo, save, solve, copy, restart and date change passed');
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
