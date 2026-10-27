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
      await page.evaluate(({route})=>localStorage.setItem('kihamda-daily-path',JSON.stringify({date:'2026-10-27',route,moves:route.length-1})),fixtures[kind]);
      if(kind==='visited')await page.setViewportSize({width:320,height:480});
      await page.reload();await cells.nth(fixtures[kind].cell).tap();assert.equal(await page.locator('#status').textContent(),message);
      if(kind==='visited'){
        const board=await page.locator('#board').boundingBox();
        assert(board.y+board.height<=480,'Board must fit below the message at 320×480');
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
      await page.evaluate(saved=>localStorage.setItem('kihamda-daily-path',JSON.stringify({date:'2026-10-27',...saved})),saved);
      await page.reload();assert.equal(await page.locator('#status').textContent(),'1 / 16マス');
    }
    await page.locator('#restart').tap();
    await cells.nth(puzzle.solution[1]).focus();await page.keyboard.press('Space');
    assert.equal(await page.locator('#status').textContent(),'2 / 16マス');
    await page.reload();assert.equal(await page.locator('#status').textContent(),'2 / 16マス');
    await cells.nth(puzzle.start).tap();assert.equal(await page.locator('#status').textContent(),'1 / 16マス');
    for(const i of puzzle.solution.slice(1))await cells.nth(i).tap();
    assert((await page.locator('#status').textContent()).startsWith('クリア！'));
    await page.locator('#copy-result').tap();assert((await page.evaluate(()=>window.copied)).includes('/play-path.html'));
    await page.reload();assert((await page.locator('#status').textContent()).startsWith('クリア！'));
    await page.locator('#restart').tap();assert.equal(await page.locator('#status').textContent(),'1 / 16マス');
    await page.clock.setFixedTime(new Date('2026-10-28T03:00:00Z'));await page.reload();
    assert((await page.locator('#category').textContent()).includes('2026-10-28'));
    assert.equal(await page.locator('#status').textContent(),'1 / 16マス');
    assert.deepEqual(errors,[]);await context.close();
    console.log('Daily path: touch, keyboard, invalid move, undo, save, solve, copy, restart and date change passed');
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
