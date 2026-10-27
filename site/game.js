const params = new URLSearchParams(location.search);
const id = params.get('game');
const board = document.querySelector('#board'), status = document.querySelector('#status');
const title = document.querySelector('#title'), instructions = document.querySelector('#instructions');
const category = document.querySelector('#category'), controls = document.querySelector('#controls');
let cleanup = () => {};
const shuffle = values => { const a = [...values]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function button(label, action) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', action); board.append(b); return b; }
const games = {
  lights() {
    category.textContent = 'パズル'; title.textContent = 'ひかりのスイッチ'; instructions.textContent = '押したマスと上下左右の灯りが切り替わるよ。すべて消そう。';
    let cells = Array(16).fill(false), moves = 0;
    const toggle = i => { const x = i % 4, y = Math.floor(i / 4); [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => { const a=x+dx,b=y+dy; if(a>=0&&a<4&&b>=0&&b<4) cells[b*4+a]=!cells[b*4+a]; }); };
    if (params.get('mode') === 'daily') {
      const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date());
      const part = type => parts.find(item => item.type === type).value;
      const date = `${part('year')}-${part('month')}-${part('day')}`;
      category.textContent = `今日のパズル ${date}`;
      let seed = Number(date.replace(/\D/g, '')) >>> 0;
      const indices = [...Array(16).keys()];
      for (let i = indices.length - 1; i > 0; i--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const j = seed % (i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      indices.slice(0, 8).forEach(toggle);
      if (!cells.some(Boolean)) toggle(0);
    } else {
      do { cells.fill(false); shuffle([...Array(16).keys()]).slice(0,8).forEach(toggle); } while (!cells.some(Boolean));
    }
    const buttons = cells.map((_,i) => button('', () => { if (!cells.some(Boolean)) return; toggle(i); moves++; render(); }));
    function render() { cells.forEach((on,i) => { buttons[i].className = on ? 'on' : ''; buttons[i].textContent = on ? '✦' : '·'; buttons[i].setAttribute('aria-label', `${Math.floor(i/4)+1}行${i%4+1}列 ${on?'点灯':'消灯'}`); }); status.textContent = cells.some(Boolean) ? `${moves}手` : `クリア！ ${moves}手で消せたよ`; } render();
  },
  memory() {
    category.textContent = '記憶'; title.textContent = 'ペアをさがせ'; instructions.textContent = 'カードを2枚ずつめくって、同じ絵をそろえよう。';
    const symbols = shuffle(['●','◆','▲','★','♥','☀','✿','■', '●','◆','▲','★','♥','☀','✿','■']);
    let open=[], matched=0, turns=0, timer=0, locked=false;
    const buttons=symbols.map((s,i)=>button('？',()=>{ if(locked || buttons[i].disabled || open.includes(i)) return; buttons[i].textContent=s; buttons[i].className='flipped'; buttons[i].setAttribute('aria-label',s); open.push(i); if(open.length===2){ turns++; if(symbols[open[0]]===symbols[open[1]]) { open.forEach(j=>{buttons[j].disabled=true;buttons[j].className='matched';}); matched++;open=[];status.textContent=matched===8?`クリア！ ${turns}回でそろえたよ`:`${matched}組 / 8組`; } else {locked=true; timer=setTimeout(()=>{open.forEach(j=>{buttons[j].textContent='？';buttons[j].className='';buttons[j].setAttribute('aria-label','伏せたカード');});open=[];locked=false;},700);} } })); buttons.forEach(b=>b.setAttribute('aria-label','伏せたカード')); status.textContent='0組 / 8組'; cleanup=()=>clearTimeout(timer);
  },
  order() {
    category.textContent='スピード'; title.textContent='数字のかけっこ'; instructions.textContent='1から16まで順番に押そう。最初のタップで計測開始！';
    let next=1,start=0; const nums=shuffle([...Array(16)].map((_,i)=>i+1));
    nums.forEach(n=>{const b=button(n,()=>{if(n!==next)return;if(next===1)start=performance.now();b.disabled=true;b.className='matched';next++;status.textContent=next===17?`ゴール！ ${((performance.now()-start)/1000).toFixed(2)}秒`:`次は ${next}`;});}); status.textContent='次は 1';
  },
  dodge() {
    category.textContent='アクション';title.textContent='ほしよけステップ';instructions.textContent='左右のボタンか矢印キーで動いて、星をよけよう。'; controls.hidden=false;
    const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;canvas.setAttribute('aria-label','星をよけるゲーム画面'); board.style.display='block'; board.append(canvas); const ctx=canvas.getContext('2d');
    let x=200, items=[], ticks=0, last=0, elapsed=0, frame=0, alive=true, dir=0;
    function move(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();dir=e.type==='keydown'?(e.key==='ArrowLeft'?-1:1):0;}}
    document.addEventListener('keydown',move);document.addEventListener('keyup',move);
    const left=document.querySelector('#left'),right=document.querySelector('#right');
    const downL=()=>dir=-1, downR=()=>dir=1, up=()=>dir=0;
    for(const [el,down] of [[left,downL],[right,downR]]){el.addEventListener('pointerdown',down);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('pointerleave',up);el.addEventListener('click',()=>{x=Math.max(15,Math.min(385,x+(el===left?-30:30)));});}
    function loop(t){if(!alive)return;const dt=last?Math.min((t-last)/1000,.05):0;last=t;elapsed+=dt;ticks+=dt;x=Math.max(15,Math.min(385,x+dir*230*dt));if(ticks>.55){ticks=0;items.push({x:15+Math.random()*370,y:-15,s:110+Math.random()*80+elapsed*2});}ctx.clearRect(0,0,400,400);ctx.fillStyle='#a9dfc8';ctx.beginPath();ctx.arc(x,365,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f9c96e';ctx.font='26px sans-serif';for(const p of items){p.y+=p.s*dt;ctx.fillText('✦',p.x-12,p.y+8);if(Math.abs(p.x-x)<22&&Math.abs(p.y-365)<22)alive=false;}items=items.filter(p=>p.y<420);status.textContent=alive?`${elapsed.toFixed(1)}秒`:`ゲームオーバー！ ${elapsed.toFixed(1)}秒`;if(alive)frame=requestAnimationFrame(loop);}
    frame=requestAnimationFrame(loop);cleanup=()=>{alive=false;cancelAnimationFrame(frame);document.removeEventListener('keydown',move);document.removeEventListener('keyup',move); for(const [el,down] of [[left,downL],[right,downR]]){el.replaceWith(el.cloneNode(true));}};
  }
};
function start(){cleanup();cleanup=()=>{};board.replaceChildren();board.style.display='';controls.hidden=true;if(!games[id]){title.textContent='ゲームが見つかりません';instructions.textContent='ゲーム一覧から選んでね。';status.textContent='';return;}games[id]();document.title=`${title.textContent} | Kihamda Games`;}
document.querySelector('#restart').addEventListener('click',start);start();
