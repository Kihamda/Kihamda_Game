const params = new URLSearchParams(location.search);
const id = params.get('game');
const board = document.querySelector('#board'), status = document.querySelector('#status'), announcement = document.querySelector('#announcement');
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
    const names={'●':'まる','◆':'ひし形','▲':'さんかく','★':'ほし','♥':'ハート','☀':'たいよう','✿':'はな','■':'しかく'};
    const cardLabel=(i,value)=>`${Math.floor(i/4)+1}行${i%4+1}列 ${value}`;
    const buttons=symbols.map((s,i)=>button('？',()=>{ if(locked || buttons[i].disabled || open.includes(i)) return; buttons[i].textContent=s; buttons[i].className='flipped'; buttons[i].setAttribute('aria-label',cardLabel(i,names[s])); open.push(i); if(open.length===2){ turns++; if(symbols[open[0]]===symbols[open[1]]) { open.forEach(j=>{buttons[j].disabled=true;buttons[j].className='matched';buttons[j].setAttribute('aria-label',cardLabel(j,`${names[symbols[j]]} そろったカード`));}); matched++;open=[];status.textContent=matched===8?`クリア！ ${turns}回でそろえたよ`:`${matched}組 / 8組`; } else {locked=true; timer=setTimeout(()=>{open.forEach(j=>{buttons[j].textContent='？';buttons[j].className='';buttons[j].setAttribute('aria-label',cardLabel(j,'伏せたカード'));});open=[];locked=false;},700);} } })); buttons.forEach((b,i)=>b.setAttribute('aria-label',cardLabel(i,'伏せたカード'))); status.textContent='0組 / 8組'; cleanup=()=>clearTimeout(timer);
  },
  order() {
    category.textContent='スピード'; title.textContent='数字のかけっこ'; instructions.textContent='1から16まで順番に押そう。最初のタップで計測開始！';
    let next=1,start=0; const nums=shuffle([...Array(16)].map((_,i)=>i+1));
    nums.forEach(n=>{const b=button(n,()=>{if(n!==next)return;if(next===1)start=performance.now();b.disabled=true;b.className='matched';next++;status.textContent=next===17?`ゴール！ ${((performance.now()-start)/1000).toFixed(2)}秒`:`次は ${next}`;});}); status.textContent='次は 1';
  },
  garden() {
    category.textContent='日替わりパズル'; title.textContent='かずの花壇';
    instructions.textContent='マスを押して、各行と各列の数字と同じ数だけ花を咲かせよう。';
    const patterns=[2495,57104,39391,3065,39195,32516,64913,30544,1872,7984,64708,12022,50429,7949,40433,53727,823,5973,63094,61188,11259,2300,15138,37019,62978,11067,51448,35083,1254,57233,35227,45839,64526,3890,827,11782,26400,3357,8439,65152,24532,5119,947,58026,4076,64920,3921,41134,40880,56568,1367,59532,28174,62007,62066,49032,53198,2991,36812,43791,24674,35229,56640,47371,1010,2995,45840,33021,205,1876,54348,28516,64400,1841,29169,55513,24413,61666,61262,3293,61516,14111,1906,59407,63705,19664,64785,39120,2233,54284,2302,57506,6585,47904,60428,5495,21983,39197,4875,52943,11170,26482,8095,8934,11002,41147,17743,3686,36480,686,36088,19692,28710,59936,1102,32515,41146,46000,24823,29463,2954,29554,2987,39135,61905,34990,17872,37275];
    const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const part = type => Number(parts.find(item => item.type === type).value);
    const date = `${part('year')}-${String(part('month')).padStart(2,'0')}-${String(part('day')).padStart(2,'0')}`; category.textContent=`今日のパズル ${date}`;
    const day = Math.floor(Date.UTC(part('year'),part('month')-1,part('day'))/86400000);
    const cycle=((day % 73728)+73728)%73728;
    const permutation=n=>{const pool=[0,1,2,3],result=[];for(let size=4;size>0;size--){result.push(pool.splice(n%size,1)[0]);n=Math.floor(n/size);}return result;};
    const base=patterns[cycle%patterns.length], rowOrder=permutation(Math.floor(cycle/128)%24), colOrder=permutation(Math.floor(cycle/3072)%24);
    let solution=0;for(let r=0;r<4;r++)for(let c=0;c<4;c++)if((base>>(rowOrder[r]*4+colOrder[c]))&1)solution|=1<<(r*4+c);
    const rows=[0,1,2,3].map(r=>[0,1,2,3].reduce((n,c)=>n+((solution>>(r*4+c))&1),0));
    const cols=[0,1,2,3].map(c=>[0,1,2,3].reduce((n,r)=>n+((solution>>(r*4+c))&1),0));
    let cells=Array(16).fill(false), moves=0, won=false;
    board.classList.add('garden');
    const clue=(value,kind,index)=>{const el=document.createElement('span');el.className='garden-clue';el.textContent=value;el.setAttribute('aria-label',`${kind}${index+1}の目標 ${value}`);board.append(el);};
    const corner=document.createElement('span');corner.setAttribute('aria-hidden','true');board.append(corner); cols.forEach((v,i)=>clue(v,'列',i));
    const buttons=[];
    for(let r=0;r<4;r++) { clue(rows[r],'行',r); for(let c=0;c<4;c++) { const i=r*4+c; buttons.push(button('',()=>{if(won)return;cells[i]=!cells[i];moves++;render();})); } }
    function render() {
      won=cells.every((on,i)=>Number(on)===((solution>>i)&1));
      cells.forEach((on,i)=>{const b=buttons[i];b.className=on?'on':'';b.textContent=on?'✿':'·';b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',`${Math.floor(i/4)+1}行${i%4+1}列 ${on?'花あり':'空き'}、行の目標 ${rows[Math.floor(i/4)]}、列の目標 ${cols[i%4]}`);});
      status.textContent=won?`クリア！ ${moves}手で咲かせたよ`:`${moves}手`;
    }
    render();
  },
  dodge() {
    document.body.classList.add('dodge-mode');status.setAttribute('aria-live','off');category.textContent='アクション';title.textContent='ほしよけステップ';instructions.textContent='左右のボタンか矢印キーで動いて、星をよけよう。'; controls.hidden=false;
    const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;canvas.setAttribute('aria-label','星をよけるゲーム画面'); board.style.display='block'; board.append(canvas); const ctx=canvas.getContext('2d');
    let x=200, items=[], ticks=0, last=0, elapsed=0, frame=0, alive=false, dir=0, pointerDir=0;
    const keys=new Set(); const updateDirection=()=>{dir=pointerDir || Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));};
    const startButton=document.createElement('button'); startButton.type='button'; startButton.className='button dodge-start'; startButton.textContent='スタート'; board.append(startButton);
    function move(e){if(!alive)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();if(e.type==='keydown')keys.add(e.key);else keys.delete(e.key);updateDirection();}}
    const stopMoving=()=>{keys.clear();pointerDir=0;updateDirection();};
    document.addEventListener('keydown',move);document.addEventListener('keyup',move);window.addEventListener('blur',stopMoving);document.addEventListener('visibilitychange',stopMoving);
    const left=document.querySelector('#left'),right=document.querySelector('#right');
    const downL=()=>{if(alive){pointerDir=-1;updateDirection();}}, downR=()=>{if(alive){pointerDir=1;updateDirection();}}, up=()=>{pointerDir=0;updateDirection();};
    for(const [el,down] of [[left,downL],[right,downR]]){el.addEventListener('pointerdown',down);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('pointerleave',up);el.addEventListener('click',()=>{if(!alive)return;x=Math.max(15,Math.min(385,x+(el===left?-30:30)));});}
    function draw(){ctx.clearRect(0,0,400,400);ctx.fillStyle='#a9dfc8';ctx.beginPath();ctx.arc(x,365,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f9c96e';ctx.font='26px sans-serif';for(const p of items)ctx.fillText('✦',p.x-12,p.y+8);}
    function loop(t){if(!alive)return;const dt=last?Math.min((t-last)/1000,.05):0;last=t;elapsed+=dt;ticks+=dt;x=Math.max(15,Math.min(385,x+dir*230*dt));if(ticks>.55){ticks=0;items.push({x:15+Math.random()*370,y:-15,s:110+Math.random()*80+elapsed*2});}for(const p of items){p.y+=p.s*dt;if(Math.abs(p.x-x)<22&&Math.abs(p.y-365)<22)alive=false;}items=items.filter(p=>p.y<420);draw();status.textContent=alive?`${elapsed.toFixed(1)}秒`:`ゲームオーバー！ ${elapsed.toFixed(1)}秒`;if(alive)frame=requestAnimationFrame(loop);else announcement.textContent=status.textContent;}
    draw();status.textContent='スタートを押してね';startButton.addEventListener('click',()=>{if(alive)return;startButton.hidden=true;alive=true;last=0;frame=requestAnimationFrame(loop);});cleanup=()=>{alive=false;startButton.remove();cancelAnimationFrame(frame);document.removeEventListener('keydown',move);document.removeEventListener('keyup',move);window.removeEventListener('blur',stopMoving);document.removeEventListener('visibilitychange',stopMoving); for(const [el,down] of [[left,downL],[right,downR]]){el.replaceWith(el.cloneNode(true));}};
  }
};
function start(){cleanup();cleanup=()=>{};document.body.classList.remove('dodge-mode');announcement.textContent='';status.setAttribute('aria-live','polite');board.replaceChildren();board.classList.remove('garden');board.style.display='';controls.hidden=true;if(!Object.hasOwn(games,id)){title.textContent='ゲームが見つかりません';instructions.textContent='ゲーム一覧から選んでね。';status.textContent='';return;}games[id]();document.title=`${title.textContent} | Kihamda Games`;}
document.querySelector('#restart').addEventListener('click',start);start();
