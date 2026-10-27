const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve('site');
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname === '/' ? 'index.html' : decodeURIComponent(new URL(req.url, 'http://localhost').pathname.slice(1));
  const file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep)) { res.writeHead(400).end(); return; }
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'}[path.extname(file)] || 'application/octet-stream'); res.end(data); });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    for (const width of [320, 375, 1280]) {
      const page = await browser.newPage({ viewport: {width, height: width === 320 ? 568 : width === 375 ? 667 : 800}, hasTouch: width <= 375 });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin); assert.equal(await page.locator('.card').count(), 5);
      await page.getByRole('link', {name:'このサイトについて'}).click();
      assert.equal(await page.getByRole('link', {name:'Kihamda.NETのお問い合わせフォーム'}).getAttribute('href'), 'https://kihamda.net/form');
      await page.goto(origin);
      await page.locator('.daily-link').click();
      assert((await page.locator('#category').textContent()).startsWith('今日のパズル'));
      const dailyBoard = await page.locator('#board button').allTextContents();
      await page.locator('#board button').first().click();
      await page.locator('#restart').click();
      assert.deepEqual(await page.locator('#board button').allTextContents(), dailyBoard);
      await page.reload();
      assert.deepEqual(await page.locator('#board button').allTextContents(), dailyBoard);
      assert.equal(await page.locator('.back').getAttribute('href'), '/#games');
      for (const id of ['lights','memory','order','dodge','garden']) {
        await page.goto(`${origin}/game.html?game=${id}`);
        assert(await page.locator('#title').textContent());
        if (id === 'lights') { await page.locator('#board button').first().click(); assert((await page.locator('#status').textContent()).includes('1手')); }
        if (id === 'memory') { await page.locator('#board button').first().click(); assert.notEqual(await page.locator('#board button').first().textContent(), '？'); }
        if (id === 'order') { for(let n=1;n<=16;n++) await page.getByRole('button',{name:String(n),exact:true}).click(); assert((await page.locator('#status').textContent()).includes('ゴール')); }
        if (id === 'garden') {
          const first = page.locator('#board button').first();
          await first.focus(); await page.keyboard.press('Space');
          assert.equal(await first.getAttribute('aria-pressed'), 'true');
          assert((await first.getAttribute('aria-label')).includes('花あり'));
          await page.keyboard.press('Space');
          assert.equal(await first.getAttribute('aria-pressed'), 'false');
          const initial = await page.locator('.garden-clue').allTextContents();
          assert.equal(initial.length, 8);
          const solution = await page.evaluate(() => {
            const clues=[...document.querySelectorAll('.garden-clue')].map(e=>Number(e.textContent));
            const cols=clues.slice(0,4), rows=clues.slice(4);
            for(let mask=0;mask<65536;mask++) {
              if(rows.every((n,r)=>[0,1,2,3].reduce((v,c)=>v+((mask>>(r*4+c))&1),0)===n) && cols.every((n,c)=>[0,1,2,3].reduce((v,r)=>v+((mask>>(r*4+c))&1),0)===n)) return mask;
            }
            return null;
          });
          assert.notEqual(solution, null);
          for(let i=0;i<16;i++) if((solution>>i)&1) await page.locator('#board button').nth(i).click();
          assert((await page.locator('#status').textContent()).includes('クリア'));
          await page.locator('#restart').click();
          assert.deepEqual(await page.locator('.garden-clue').allTextContents(), initial);
          await page.reload();
          assert.deepEqual(await page.locator('.garden-clue').allTextContents(), initial);
        }
        if (id === 'dodge') {
          assert(await page.locator('canvas').isVisible());
          assert(await page.evaluate(() => document.querySelector('#controls').getBoundingClientRect().bottom <= innerHeight), 'controls must fit on the initial viewport');
          assert.equal(await page.locator('#status').textContent(), 'スタートを押してね');
          assert.equal(await page.locator('#status').getAttribute('aria-live'), 'off');
          assert.equal(await page.locator('#announcement').getAttribute('aria-live'), 'polite');
          await page.waitForTimeout(650);
          assert.equal(await page.locator('#status').textContent(), 'スタートを押してね');
          await page.getByRole('button', {name:'スタート'}).click();
          await page.waitForTimeout(150);
          const playerX = () => page.locator('canvas').evaluate(c => { const data=c.getContext('2d').getImageData(0,365,400,1).data; let sum=0,count=0; for(let x=0;x<400;x++) if(data[x*4]===169 && data[x*4+1]===223 && data[x*4+2]===200) { sum+=x; count++; } return count ? sum/count : null; });
          const before = await playerX();
          await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(200); await page.keyboard.up('ArrowLeft');
          const after = await playerX();
          assert(before !== null && after !== null && after < before, 'player should move left after starting');
          if(width<=375) await page.locator('#right').tap(); else await page.locator('#right').click(); await page.waitForTimeout(50);
          assert((await playerX()) > after, 'right button should move player right');
          await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(100);
          await page.evaluate(() => window.dispatchEvent(new Event('blur')));
          await page.waitForTimeout(50); const stopped = await playerX();
          await page.waitForTimeout(100); assert.equal(await playerX(), stopped, 'player should stop when focus is lost');
          await page.keyboard.up('ArrowLeft');
          await page.keyboard.down('ArrowLeft'); await page.keyboard.down('ArrowRight');
          await page.waitForTimeout(50); const balanced = await playerX();
          await page.waitForTimeout(100); assert.equal(await playerX(), balanced, 'opposite keys should cancel');
          await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(100);
          assert((await playerX()) > balanced, 'held right key should resume movement');
          await page.keyboard.up('ArrowRight');
          assert.notEqual(await page.locator('#status').textContent(), 'スタートを押してね');
        }
        await page.locator('#restart').click();
        if (id === 'dodge') {
          assert.equal(await page.locator('#status').textContent(), 'スタートを押してね');
          await page.evaluate(() => { Math.random = () => .5; });
          await page.getByRole('button', {name:'スタート'}).click();
          await page.waitForFunction(() => document.querySelector('#status').textContent.includes('ゲームオーバー'), null, {timeout:10000});
          assert.equal(await page.locator('#announcement').textContent(), await page.locator('#status').textContent());
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${id} overflow at ${width}`);
      }
      assert.deepEqual(errors, []); await page.close();
    }
    const completionPage = await browser.newPage();
    await completionPage.addInitScript(() => { Math.random = () => .25; });
    await completionPage.goto(`${origin}/game.html?game=lights`);
    const lightMask = await completionPage.locator('#board button').evaluateAll(bs => bs.reduce((mask,b,i) => mask | (b.classList.contains('on') ? 1<<i : 0),0));
    const toggles=[...Array(16).keys()].map(i => { let mask=0,x=i%4,y=Math.floor(i/4); for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) {const a=x+dx,b=y+dy;if(a>=0&&a<4&&b>=0&&b<4)mask^=1<<(b*4+a);} return mask; });
    let solution=null;
    for(let candidate=0;candidate<65536;candidate++) {let result=lightMask;for(let i=0;i<16;i++)if((candidate>>i)&1)result^=toggles[i];if(result===0){solution=candidate;break;}}
    assert.notEqual(solution,null);
    for(let i=0;i<16;i++) if((solution>>i)&1) await completionPage.locator('#board button').nth(i).click();
    assert((await completionPage.locator('#status').textContent()).includes('クリア'));
    await completionPage.goto(`${origin}/game.html?game=memory`);
    assert.equal(await completionPage.locator('#board button').first().getAttribute('aria-label'), '1行1列 伏せたカード');
    assert.equal(await completionPage.locator('#board button').nth(1).getAttribute('aria-label'), '1行2列 伏せたカード');
    const symbols=['●','◆','▲','★','♥','☀','✿','■','●','◆','▲','★','♥','☀','✿','■'];
    for(let i=symbols.length-1;i>0;i--){const j=Math.floor(.25*(i+1));[symbols[i],symbols[j]]=[symbols[j],symbols[i]];}
    const mismatch=symbols.findIndex(s=>s!==symbols[0]);
    const third=symbols.findIndex((_,i)=>i!==0 && i!==mismatch);
    await completionPage.locator('#board button').nth(0).click();
    await completionPage.locator('#board button').nth(mismatch).click();
    await completionPage.locator('#board button').nth(third).click();
    assert.equal(await completionPage.locator('#board button').nth(third).textContent(),'？');
    await completionPage.locator('#restart').click();
    await completionPage.waitForTimeout(750);
    assert((await completionPage.locator('#board button').allTextContents()).every(v=>v==='？'));
    assert.equal(await completionPage.locator('#status').textContent(),'0組 / 8組');
    const names={'●':'まる','◆':'ひし形','▲':'さんかく','★':'ほし','♥':'ハート','☀':'たいよう','✿':'はな','■':'しかく'};
    for(const symbol of new Set(symbols)) {
      const indices=symbols.flatMap((s,i)=>s===symbol?[i]:[]);
      await completionPage.locator('#board button').nth(indices[0]).click();
      assert((await completionPage.locator('#board button').nth(indices[0]).getAttribute('aria-label')).includes(names[symbol]));
      await completionPage.locator('#board button').nth(indices[1]).click();
    }
    assert((await completionPage.locator('#status').textContent()).includes('クリア'));
    assert((await completionPage.locator('#board button').first().getAttribute('aria-label')).includes('そろったカード'));
    await completionPage.close();
    const invalidPage = await browser.newPage();
    for (const id of ['unknown','__proto__','toString']) {
      await invalidPage.goto(`${origin}/game.html?game=${id}`);
      assert.equal(await invalidPage.locator('#title').textContent(), 'ゲームが見つかりません');
      assert.equal(await invalidPage.locator('.back').getAttribute('href'), '/#games');
    }
    await invalidPage.close();
    const landscape = await browser.newPage({viewport:{width:667,height:375}});
    await landscape.goto(`${origin}/game.html?game=dodge`);
    assert(await landscape.evaluate(() => document.querySelector('#controls').getBoundingClientRect().bottom <= innerHeight));
    assert(await landscape.getByRole('button',{name:'スタート'}).isVisible());
    await landscape.close();
    const datePage = await browser.newPage();
    await datePage.clock.install({time: new Date('2026-10-27T14:59:00Z')});
    await datePage.goto(`${origin}/game.html?game=garden`);
    assert((await datePage.locator('#category').textContent()).includes('2026-10-27'));
    const beforeMidnight = await datePage.locator('.garden-clue').allTextContents();
    await datePage.clock.setFixedTime(new Date('2026-10-27T15:01:00Z'));
    await datePage.reload();
    assert((await datePage.locator('#category').textContent()).includes('2026-10-28'));
    assert.notDeepEqual(await datePage.locator('.garden-clue').allTextContents(), beforeMidnight);
    await datePage.close();
  } finally { await browser.close(); server.close(); }
  console.log('Browser checks passed');
})().catch(e => { console.error(e); server.close(); process.exitCode=1; });
