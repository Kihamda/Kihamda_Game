const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve('preview');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(400).end();
  fs.readFile(file, (error, data) => {
    if (error) return res.writeHead(404).end();
    res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript'}[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const page = await browser.newPage({viewport:{width:375,height:667},hasTouch:true});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    async function checkIcon(){const icon=await page.locator('link[rel=icon]').getAttribute('href');assert(icon.startsWith('data:image/svg+xml,'));assert(await page.evaluate(async url=>{const svg=new DOMParser().parseFromString(await (await fetch(url)).text(),'image/svg+xml');return svg.documentElement.localName==='svg'&&!!svg.querySelector('rect')&&!!svg.querySelector('path')},icon));}
    for(const width of [320,375,1280]) {
      await page.setViewportSize({width,height:800});await page.goto(`${origin}/index.html`);await checkIcon();
      assert.equal(await page.title(),'無料ブラウザゲーム | Kihamda Games');
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://game.kihamda.net/');
      assert((await page.locator('meta[name=description]').getAttribute('content')).includes('日替わりパズル'));
      const links=page.locator('.daily-link');assert.equal(await links.count(),8);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const rects=await links.evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return [r.width,r.height,r.right]}));
      assert(rects.every(([w,h,right])=>w>=44&&h>=44&&right<=width));
    }
    await page.setViewportSize({width:375,height:667});
    await page.goto(`${origin}/index.html`);
    await page.getByRole('button',{name:'記憶',exact:true}).click();
    assert.equal(await page.locator('.card').filter({visible:true}).count(),2);
    await page.locator('.card').filter({hasText:'ぎゃくからメモリー'}).click();
    assert.equal(new URL(page.url()).pathname,'/play-recall.html');
    await page.goto(`${origin}/index.html`);
    await page.locator('.card').filter({hasText:'3つならべ'}).click();
    assert.equal(new URL(page.url()).pathname,'/play-three.html');
    await page.locator('#board > button').first().click();
    assert.equal(await page.locator('#board > button[aria-disabled=true]').count(),2);
    await page.goto(`${origin}/index.html`);
    await page.locator('.card').filter({hasText:'かくれた数'}).click();
    assert.equal(new URL(page.url()).pathname,'/play-number.html');
    await page.locator('#number-guess').fill('50');await page.locator('#number-guess').press('Enter');
    assert.equal(await page.locator('.number-history li').count(),1);
    await page.goto(`${origin}/index.html`);
    await page.locator('.card').filter({hasText:'かがみのもよう'}).click();
    assert.equal(new URL(page.url()).pathname,'/play-mirror.html');
    await page.waitForFunction(()=>document.querySelectorAll('.mirror-sample').length===9);
    const pattern=await page.locator('.mirror-sample').evaluateAll(els=>els.map(el=>el.classList.contains('on')));
    for(let i=0;i<9;i++)if(pattern[Math.floor(i/3)*3+2-i%3])await page.locator('.mirror button').nth(i).click();
    assert((await page.locator('#status').textContent()).includes('クリア'));
    await page.locator('#restart').click();assert((await page.locator('#status').textContent()).startsWith('0手'));
    await page.goto(`${origin}/index.html`);
    await page.locator('.card').filter({hasText:'つぎの数は？'}).click();
    assert.equal(new URL(page.url()).pathname,'/play-series.html');
    await page.goto(`${origin}/index.html`);
    await page.locator('.card').filter({hasText:'たてよこシフト'}).click();
    assert.equal(new URL(page.url()).pathname,'/play-shift.html');
    await page.goto(`${origin}/index.html`);
    await page.locator('.card').filter({hasText:'たし算スワップ'}).click();
    assert.equal(new URL(page.url()).pathname,'/play-swap.html');
    await page.goto(`${origin}/index.html`);
    await page.locator('.card').filter({hasText:'くらべて順番'}).click();
    assert.equal(new URL(page.url()).pathname,'/play-balance.html');
    await page.goto(`${origin}/index.html`);
    await page.locator('.card').filter({hasText:'かたちの暗号'}).click();
    assert.equal(new URL(page.url()).pathname,'/play-code.html');
    await page.goto(`${origin}/index.html`);
    await page.getByRole('link', {name:'ひかりのスイッチ ↗'}).click();
    assert.equal(new URL(page.url()).pathname, '/play-lights.html');
    assert.equal(new URL(page.url()).searchParams.get('mode'), 'daily');
    await page.waitForFunction(() => document.querySelector('#category').textContent.startsWith('今日のパズル'));
    for (const [label,id] of [['たし算スワップ ↗','swap'],['くらべて順番 ↗','balance'],['くるくる回路 ↗','circuit'],['かずの花壇 ↗','garden'],['ぴったり3枚 ↗','sum'],['まいにち道つなぎ ↗','path'],['いろわけボトル ↗','sort']]) {
      await page.goto(`${origin}/index.html`);await page.getByRole('link',{name:label}).click();
      assert.equal(new URL(page.url()).pathname,`/play-${id}.html`);
      await page.waitForFunction(() => document.querySelector('#category').textContent.startsWith('今日のパズル'));
      assert((await page.locator('#category').textContent()).startsWith('今日のパズル'));
    }
    await page.goto(`${origin}/index.html`);
    await page.getByRole('link', {name:'このサイトについて'}).click();
    assert.equal(new URL(page.url()).pathname, '/site-info.html');await checkIcon();
    assert.equal(await page.getByRole('link',{name:'Kihamda.NETのお問い合わせフォーム'}).getAttribute('href'),'https://kihamda.net/form');
    assert.equal(await page.getByRole('link',{name:'Kihamda.NETのプライバシーポリシー'}).getAttribute('href'),'https://kihamda.net/privacy-policy');
    await page.goto(`${origin}/index.html`);
    await page.getByRole('link', {name:/ペアをさがせ/}).click();
    assert.equal(new URL(page.url()).pathname, '/play-memory.html');
    await page.goto(`${origin}/index.html`);
    await page.locator('.card').filter({hasText:'まいにち道つなぎ'}).click();
    assert.equal(new URL(page.url()).pathname, '/play-path.html');
    await page.waitForFunction(()=>document.querySelectorAll('#board button').length===16);
    assert.equal(await page.locator('#board button').count(), 16);
    for (const [id, title] of [['three','3つならべ'], ['number','かくれた数'], ['mirror','かがみのもよう'], ['series','つぎの数は？'], ['shift','たてよこシフト'], ['swap','たし算スワップ'], ['balance','くらべて順番'], ['code','かたちの暗号'], ['recall','ぎゃくからメモリー'], ['timing','5秒ぴったり'], ['circuit','くるくる回路'], ['lights','ひかりのスイッチ'], ['memory','ペアをさがせ'], ['order','数字のかけっこ'], ['dodge','ほしよけステップ'], ['sum','ぴったり3枚'], ['slide','ならべてタイル'], ['garden','かずの花壇'], ['path','まいにち道つなぎ'], ['sort','いろわけボトル']]) {
      await page.goto(`${origin}/play-${id}.html?game=invalid`);await checkIcon();
      assert.equal(await page.locator('#title').textContent(), title);
      assert(await page.locator('#board button, #board canvas').count());
      assert.equal(await page.getByRole('link',{name:'このサイトについて'}).getAttribute('href'), '/site-info.html');
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), `https://game.kihamda.net/play-${id}.html`);
      assert.equal(await page.locator('meta[name=description]').getAttribute('content'), await page.locator('#instructions').textContent());
      await page.locator('#restart').click();
      assert.equal(await page.locator('#title').textContent(), title);
    }
    await page.goto(`${origin}/play-lights.html?mode=daily`);
    assert((await page.locator('#category').textContent()).startsWith('今日のパズル'));
    const noJs = await browser.newContext({javaScriptEnabled:false});
    const plain = await noJs.newPage();
    for (const id of ['three','number','mirror','series','shift','swap','balance','code','recall','timing','circuit','lights','memory','order','dodge','slide','sum','garden','path','sort']) {
      await plain.goto(`${origin}/play-${id}.html`);
      assert(await plain.locator('#instructions').isVisible());
      assert(await plain.locator('noscript p').isVisible());
    }
    await noJs.close();
    assert.deepEqual(errors, []);
    console.log('Fixed pages: mobile controls, restart, identity, daily mode and no-JavaScript text passed');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
