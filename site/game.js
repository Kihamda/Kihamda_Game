const params = new URLSearchParams(location.search);
const id = document.body.dataset.game || params.get('game');
const board = document.querySelector('#board'), status = document.querySelector('#status'), announcement = document.querySelector('#announcement');
const title = document.querySelector('#title'), instructions = document.querySelector('#instructions');
const category = document.querySelector('#category'), controls = document.querySelector('#controls'), record = document.querySelector('#record'), copyResult = document.querySelector('#copy-result'), copyFeedback = document.querySelector('#copy-feedback');
let cleanup = () => {}, runGeneration = 0, currentDailyStorage = null;
const shuffle = values => { const a = [...values]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function button(label, action) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', action); board.append(b); return b; }
function offerResultCopy(game, date, moves) {
  const text = `${gameCatalog[game].title} ${date} ${moves}手\nhttps://game.kihamda.net/play-${game}.html${['lights','sort'].includes(game) ? '?mode=daily' : ''}`;
  offerCopy(text);
}
function offerCopy(text) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
  copyResult.hidden = false;
  const copyHandler = async () => {
    const generation = runGeneration;
    let message;
    try { await navigator.clipboard.writeText(text); message = '結果をコピーしたよ'; }
    catch (_) { message = 'コピーできなかったよ'; }
    if (generation !== runGeneration || copyResult.onclick !== copyHandler || copyResult.hidden) return;
    copyFeedback.textContent = message;
    copyFeedback.hidden = false;
  };
  copyResult.onclick = copyHandler;
}
// Keep the newest day and one earlier day without letting an old tab replace newer progress.
function dailyStorage(game, date) {
  const key=`kihamda-daily-${game}`, previousKey=`${key}-previous`;
  let snapshot=null, tracking=false, readFailed=false;
  function read(name) {
    let raw;
    try {raw=window.localStorage.getItem(name);} catch (_) {readFailed=true;showStorageUnavailable();return null;}
    try {return JSON.parse(raw);} catch (_) {return null;}
  }
  const validDate=value=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  function currentRecord() {
    const current=read(key), previous=read(previousKey);
    return current?.date===date ? current : previous?.date===date ? previous : null;
  }
  function hasConflict() {
    readFailed=false;
    const saved=currentRecord();
    return tracking && !readFailed && JSON.stringify(saved)!==snapshot;
  }
  return {
    load() {
      const saved=currentRecord(); snapshot=JSON.stringify(saved); tracking=true; currentDailyStorage=this; return saved;
    },
    isCurrent() { return !hasConflict(); },
    save(value) {
      try {
        if(hasConflict()) return false;
        if(readFailed) return true;
        const records=new Map();
        for(const item of [read(previousKey),read(key)]) if(validDate(item?.date)) records.set(item.date,item);
        if(readFailed) return true;
        records.set(date,{...value,date});
        const newest=[...records.keys()].sort().reverse().slice(0,2);
        if(!newest.includes(date)){showStorageUnavailable('この日の記録は保存できないよ');return true;}
        if(newest.length>1) window.localStorage.setItem(previousKey,JSON.stringify(records.get(newest[1])));
        else window.localStorage.removeItem(previousKey);
        window.localStorage.setItem(key,JSON.stringify(records.get(newest[0])));
        snapshot=JSON.stringify(currentRecord()); tracking=true;
      } catch (_) {showStorageUnavailable();}
      return true;
    },
    clear() {
      try {
        if(read(key)?.date===date) window.localStorage.removeItem(key);
        if(read(previousKey)?.date===date) window.localStorage.removeItem(previousKey);
      } catch (_) {showStorageUnavailable();}
    }
  };
}
function showStorageUnavailable(message='進行状況を保存できないよ') {
  document.body.classList.add('storage-unavailable');
  record.textContent=message;
  record.hidden=false;
}
function dailyProgress(game, date, count=16) {
  const storage=dailyStorage(game,date);
  return {
    load() {
      const saved=storage.load();
      if (saved && Array.isArray(saved.cells) && saved.cells.length === count && saved.cells.every(value => typeof value === 'boolean') && Number.isSafeInteger(saved.moves) && saved.moves >= 0) return saved;
      return null;
    },
    save(cells, moves) { return storage.save({cells,moves}); },
    clear() { storage.clear(); }
  };
}
function generateSumPuzzle(year, month, dayOfMonth) {
  const day=Math.floor(Date.UTC(year,month-1,dayOfMonth)/86400000);
  let seed=(day ^ 0x9e3779b9) >>> 0;
  if(!seed) seed=1;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
  const pool=Array.from({length:15},(_,i)=>i+1);
  for(let i=pool.length-1;i>0;i--){const j=random()%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
  const values=pool.slice(0,9),counts=new Map();
  for(let i=0;i<9;i++)for(let j=i+1;j<9;j++)for(let k=j+1;k<9;k++){
    const total=values[i]+values[j]+values[k];counts.set(total,(counts.get(total)||0)+1);
  }
  let targets=[...counts].filter(([,count])=>count>=2&&count<=5).map(([value])=>value).sort((a,b)=>a-b);
  if(!targets.length) targets=[...counts.keys()].sort((a,b)=>a-b);
  return {values,target:targets[random()%targets.length]};
}
function pathNeighbors(index) {
  return [index-4,index+4,...(index%4?[index-1]:[]),...(index%4<3?[index+1]:[])].filter(i=>i>=0&&i<16);
}
const pathPuzzlesByStart=new Map();
function generatePathPuzzle(year, month, dayOfMonth) {
  const day=Math.floor(Date.UTC(year,month-1,dayOfMonth)/86400000);
  let seed=day>>>0;
  seed=Math.imul(seed^(seed>>>16),0x7feb352d);
  seed=Math.imul(seed^(seed>>>15),0x846ca68b);
  seed=(seed^(seed>>>16))>>>0 || 1;
  const start=((day%16)+16)%16;
  if(!pathPuzzlesByStart.has(start)){
    const path=[start],boards=new Map();
    function enumerate(visited){
      if(path.length===16){
        const checkpoints=[path[4],path[8],path[12]],goal=path[15];
        const key=[...checkpoints,goal].join(',');
        if(!boards.has(key))boards.set(key,{start,checkpoints,goal,solution:[...path]});
        return;
      }
      for(const next of pathNeighbors(path[path.length-1])){
        if(visited&(1<<next))continue;
        path.push(next);enumerate(visited|(1<<next));path.pop();
      }
    }
    enumerate(1<<start);
    pathPuzzlesByStart.set(start,[...boards.values()]);
  }
  const boards=pathPuzzlesByStart.get(start);
  return boards[seed%boards.length];
}
// Each reverse step is the inverse of a legal forward move.
function generateSortPuzzle(random = Math.random) {
  let tubes;
  do {
    tubes = [[0,0,0],[1,1,1],[2,2,2],[]];
    let previous = '';
    for (let step=0;step<24;step++) {
      const options=[];
      for(let from=0;from<4;from++) for(let to=0;to<4;to++) {
        const source=tubes[from], target=tubes[to];
        if(from===to || !source.length || target.length===3) continue;
        if(source.length>1 && source[source.length-2]!==source[source.length-1]) continue;
        if(`${to},${from}`===previous) continue;
        options.push([from,to]);
      }
      if(!options.length) break;
      const [from,to]=options[Math.floor(random()*options.length)];
      tubes[to].push(tubes[from].pop()); previous=`${from},${to}`;
    }
  } while (tubes.filter(t=>new Set(t).size>1).length<2);
  return tubes;
}
function generateDailySortPuzzle(year, month, dayOfMonth) {
  // Templates were enumerated from winning states; each needs at least five moves.
  const patterns = ["000121122","001012221","001120122","001201122","001211220","001221102","002021211","002112102","002121201","002211012","010012122","010102212","010122021","010210212","010220121","011010222","011100222","011200212","011210202","011221020","012010212","012021210","012102102","012120021","012200121","012210120","012221001","020021211","020111202","020121021","020210112","020221101","021011202","021021210","021102210","021121002","021201102","021210201","021221010","022012101","022101210","022111200","022201101","100012221","100120212","100201221","100212120","100221210","101020212","101102202","101201202","101212002","101222010","102011022","102020211","102101202","102120021","102201012","102210210","102221100","110022012","110120220","110202102","110220021","111200022","112002201","112020120","112102002","112200210","120001122","120012012","120021210","120102201","120121020","120202011","120211200","121000212","121010220","121021020","121120020","121202010","122001012","122010102","122021001","122102010","122210001","200021121","200111022","200121012","200210121","201001212","201012021","201021120","201101220","201120012","201201012","201212001","202001121","202012110","202101201","202111020","202201011","210001221","210012102","210022101","210102201","210120120","210201012","210212010","211001202","211012020","211022010","211122000","211212000","212002101","212012010","212100201","212120010","212210100","220011210","220101021","220110120","220201011","221001120","221011002","221021100","221102100","221210001"];
  const day = Math.floor(Date.UTC(year,month-1,dayOfMonth)/86400000);
  const index=((day%patterns.length)+patterns.length)%patterns.length;
  const rotation=((Math.floor(day/patterns.length)%4)+4)%4;
  const tubes=patterns[index].match(/.{3}/g).map(group=>Array.from(group,Number));
  tubes.push([]);
  return [...tubes.slice(rotation),...tubes.slice(0,rotation)];
}
// Rotate a four-bit mask clockwise: north, east, south, west.
function rotateCircuit(mask, turns=1) {
  for(let i=0;i<turns;i++) mask=((mask << 1) & 15) | (mask >> 3);
  return mask;
}
function generateCircuitPuzzle(year, month, dayOfMonth) {
  const day=Math.floor(Date.UTC(year,month-1,dayOfMonth)/86400000);
  let seed=(day ^ 0xa5b35705)>>>0;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
  const paths=[[0,3,6,7,4,1,2,5,8],[0,1,2,5,4,3,6,7,8]];
  const path=paths[random()%paths.length], masks=Array(9).fill(0);
  const directions=[[-3,1],[1,2],[3,4],[-1,8]];
  for(let i=0;i<path.length-1;i++) {
    const a=path[i], b=path[i+1], bit=directions.find(([delta])=>delta===b-a)[1];
    masks[a]|=bit; masks[b]|=rotateCircuit(bit,2);
  }
  masks[0]|=8; masks[8]|=2;
  const turns=masks.map(()=>random()%4);
  if(circuitSolved(masks.map((mask,i)=>rotateCircuit(mask,turns[i])))) turns[0]=(turns[0]+1)%4;
  return {masks,turns};
}
function circuitTrace(masks) {
  let index=0, incoming=8, visited=0;
  const reached=[];
  while(true) {
    if(visited & (1<<index) || !(masks[index]&incoming)) return {reached,won:false};
    visited|=1<<index; reached.push(index);
    const outgoing=masks[index]^incoming;
    if(index===8 && outgoing===2) return {reached,won:visited===511};
    const row=Math.floor(index/3), col=index%3;
    if((outgoing===1&&row===0)||(outgoing===2&&col===2)||(outgoing===4&&row===2)||(outgoing===8&&col===0)) return {reached,won:false};
    const delta={1:-3,2:1,4:3,8:-1}[outgoing];
    if(delta===undefined) return {reached,won:false};
    index+=delta; incoming=rotateCircuit(outgoing,2);
  }
}
function circuitSolved(masks) { return circuitTrace(masks).won; }
function generateDailyBalance(date) {
  const [year,month,day]=date.split('-').map(Number), dayNumber=Math.floor(Date.UTC(year,month-1,day)/86400000);
  const cycle=Math.floor(dayNumber/24), dayInCycle=((dayNumber%24)+24)%24;
  let index=((dayInCycle+7*cycle)%24+24)%24;
  const pool=[0,1,2,3], result=[];
  for(const divisor of [6,2,1,1]) {const choice=Math.floor(index/divisor);index%=divisor;result.push(pool.splice(choice,1)[0]);}
  return result;
}
const games = {
  balance(reset) {
    const daily=params.get('mode')==='daily', date=daily?todayInTokyo():null;
    category.textContent=daily?`今日のパズル ${date}`:'推理';board.classList.add('balance');
    const symbols=['●','▲','◆','■'], names=['まる','さんかく','ひし形','しかく'];
    const order=daily?generateDailyBalance(date):shuffle([0,1,2,3]), comparisons=new Map(), selected=[], answer=[];
    const storage=daily?dailyStorage('balance',date):null;
    let mode='compare', count=0, finished=false;
    function comparison(first,second) {
      const light=order.indexOf(first)<order.indexOf(second)?first:second, heavy=light===first?second:first;
      comparisons.set([first,second].sort().join('-'),`${names[light]} が軽い → ${names[heavy]} が重い`);
      return `${names[light]} が軽い。${names[heavy]} が重い。`;
    }
    if(storage){
      if(reset)storage.clear();
      const saved=storage.load();
      const validIndex=i=>Number.isInteger(i)&&i>=0&&i<4;
      if(saved && Array.isArray(saved.pairs) && saved.pairs.length<=6 && saved.pairs.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(validIndex)&&pair[0]!==pair[1]) && new Set(saved.pairs.map(pair=>[...pair].sort().join('-'))).size===saved.pairs.length && Array.isArray(saved.answer) && saved.answer.length<=4 && saved.answer.every(validIndex) && new Set(saved.answer).size===saved.answer.length && Number.isSafeInteger(saved.count) && saved.count>=saved.pairs.length && typeof saved.finished==='boolean' && (!saved.finished||saved.answer.length===4)) {
        saved.pairs.forEach(pair=>comparison(...pair));answer.push(...saved.answer);count=saved.count;finished=saved.finished;
      }
    }
    function save() {return !storage || storage.save({pairs:[...comparisons.keys()].map(key=>key.split('-').map(Number)),answer:[...answer],count,finished});}
    function finishText(){return answer.every((value,i)=>value===order[i])?`正解！ ${count}回くらべたよ`:`おしい！ 答え：${order.map(i=>names[i]).join(' → ')}（${count}回）`;}
    function offerBalanceCopy(){if(answer.every((value,i)=>value===order[i]))offerCopy(`くらべて順番${daily?` ${date}`:''} ${count}回で正解\nhttps://game.kihamda.net/play-balance.html${daily?'?mode=daily':''}`);}

    const compareMode=button('くらべる',()=>{mode='compare';selected.length=0;render();});
    const answerMode=button('順番を選ぶ',()=>{mode='answer';selected.length=0;render();});
    compareMode.className=answerMode.className='balance-mode';
    const prompt=document.createElement('p');prompt.className='balance-prompt';board.append(prompt);
    const choices=symbols.map((symbol,i)=>{
      const b=button(symbol,()=>{
        if(finished)return;
        if(mode==='compare'){
          if(selected.includes(i)) selected.length=0;
          else if(!selected.length) selected.push(i);
          else {
            const first=selected.pop();
            announcement.textContent=comparison(first,i);count++;
            if(!save()){recoverDailyConflict();return;}
          }
        } else {
          const at=answer.indexOf(i);
          if(at>=0)answer.splice(at,1);else if(answer.length<4)answer.push(i);
          if(!save()){recoverDailyConflict();return;}
          announcement.textContent=answer.length?`軽い順：${answer.map(value=>names[value]).join(' → ')}`:'選択を解除したよ';
        }
        render();
      });
      b.className='balance-choice';b.setAttribute('aria-label',names[i]);return b;
    });
    const submit=button('答える',e=>{
      if(finished||answer.length!==4)return;
      finished=true;
      if(!save()){recoverDailyConflict();return;}
      announcement.textContent='';
      render();if(e?.detail===0)restart.focus();
    });submit.className='balance-submit';
    const history=document.createElement('ul');history.className='balance-history';history.setAttribute('aria-label','比較した結果');board.append(history);
    function render(){
      compareMode.hidden=answerMode.hidden=finished;
      compareMode.setAttribute('aria-pressed',String(mode==='compare'));answerMode.setAttribute('aria-pressed',String(mode==='answer'));
      prompt.hidden=finished;
      prompt.textContent=mode==='compare'?(selected.length?`${names[selected[0]]} とくらべる形を選ぼう`:'くらべる形を2つ選ぼう'):(answer.length?`軽い順：${answer.map(i=>names[i]).join(' → ')}`:'軽い順に4つ選ぼう');
      choices.forEach((b,i)=>{b.hidden=finished;b.setAttribute('aria-pressed',String((mode==='compare'?selected:answer).includes(i)));});
      submit.hidden=finished||mode!=='answer';submit.disabled=answer.length!==4;
      history.replaceChildren();for(const text of comparisons.values()){const li=document.createElement('li');li.textContent=text;history.append(li);}
      if(!finished)status.textContent=`${count}回くらべたよ`;
      else {status.textContent=finishText();offerBalanceCopy();}
    }
    render();
  },
  code() {
    category.textContent='推理';board.classList.add('code');status.setAttribute('aria-live','off');
    const symbols=['●','▲','◆','■'], names=['まる','さんかく','ひし形','しかく'];
    const answer=shuffle([0,1,2,3]).slice(0,3), selection=[], attempts=[];
    let finished=false;
    const selected=document.createElement('p');selected.className='code-selected';board.append(selected);
    const choices=symbols.map((symbol,i)=>{
      const b=button(symbol,()=>{
        if(finished)return;
        const index=selection.indexOf(i);
        if(index>=0)selection.splice(index,1);else if(selection.length<3)selection.push(i);
        render();
      });
      b.className='code-choice';b.setAttribute('aria-label',names[i]);return b;
    });
    const submit=button('答える',e=>{
      if(finished||selection.length!==3)return;
      const exact=selection.filter((value,i)=>answer[i]===value).length;
      const present=selection.filter(value=>answer.includes(value)).length-exact;
      attempts.push({values:[...selection],exact,present});selection.length=0;
      finished=exact===3||attempts.length===6;
      render();
      announcement.textContent=`位置も同じ ${exact}、形だけ同じ ${present}。${status.textContent}`;
      if(e?.detail===0)(finished?restart:choices[0]).focus();
    });submit.className='code-submit';
    const history=document.createElement('ol');history.className='code-history';history.setAttribute('aria-label','回答の履歴');board.append(history);
    function render(){
      selected.hidden=finished;
      selected.textContent=selection.length?`選んだ順：${selection.map(i=>names[i]).join('・')}`:'形を3つ選んでね';
      choices.forEach((b,i)=>{b.setAttribute('aria-pressed',String(selection.includes(i)));b.hidden=finished;b.disabled=finished||(selection.length===3&&!selection.includes(i));});
      submit.hidden=finished;submit.disabled=finished||selection.length!==3;
      history.replaceChildren();
      attempts.forEach(({values,exact,present})=>{const li=document.createElement('li');li.textContent=`${values.map(i=>names[i]).join('・')}：位置も同じ ${exact}、形だけ同じ ${present}`;history.append(li)});
      status.textContent=finished?(attempts.at(-1).exact===3?`正解！ ${attempts.length}回で当てたよ`:`答えは ${answer.map(i=>names[i]).join('・')} だったよ`):`あと ${6-attempts.length}回`;
    }
    render();
  },
  recall() {
    category.textContent='記憶';board.classList.add('recall');
    const symbols=['●','▲','◆','■'],names=['まる','さんかく','ひし形','しかく'];
    const sequence=[];
    function extend(){
      const previous=sequence.at(-1),choice=Math.floor(Math.random()*(sequence.length?3:4));
      sequence.push(sequence.length && choice>=previous ? choice+1 : choice);
    }
    for(let i=0;i<3;i++)extend();
    let position=0, mistakes=0, phase='preview';
    const ready=button('覚えた',e=>{
      if(phase==='complete'){start();if(e?.detail===0)board.querySelector('.recall-ready').focus();return;}
      if(phase!=='preview')return;
      phase='input';position=0;ready.hidden=true;choices.forEach(b=>b.disabled=false);
      status.textContent=`逆から押そう　0 / ${sequence.length}`;
      if(e?.detail===0)choices[0].focus();
    });
    ready.className='recall-ready';
    const choices=symbols.map((symbol,i)=>{
      const b=button(symbol,e=>{
        if(phase!=='input')return;
        if(i!==sequence[sequence.length-1-position]){
          mistakes++;showPreview(true);if(e?.detail===0)ready.focus();return;
        }
        position++;
        if(position<sequence.length){status.textContent=`逆から押そう　${position} / ${sequence.length}`;return;}
        if(sequence.length<5){extend();showPreview(false);if(e?.detail===0)ready.focus();return;}
        phase='complete';choices.forEach(item=>item.disabled=true);ready.hidden=false;ready.textContent='もう一度';
        status.textContent=`クリア！ 間違い ${mistakes}回`;if(e?.detail===0)ready.focus();
      });
      b.setAttribute('aria-label',names[i]);return b;
    });
    function showPreview(retry){
      phase='preview';ready.hidden=false;ready.textContent='覚えた';choices.forEach(b=>b.disabled=true);
      status.textContent=`${retry?'もう一度覚えよう':'覚えよう'}：${sequence.map(i=>names[i]).join('・')}`;
    }
    showPreview(false);
  },
  timing() {
    category.textContent='時間感覚';
    board.classList.add('timing');
    let started=null;
    const control=button('スタート',()=>{
      if(started===null){
        started=performance.now();control.textContent='ストップ';status.textContent='5秒たったらストップ！';
        copyResult.hidden=true;copyResult.onclick=null;copyFeedback.hidden=true;copyFeedback.textContent='';
      } else {
        const hundredths=Math.round((performance.now()-started)/10);
        started=null;control.textContent='もう一度';
        const elapsed=(hundredths/100).toFixed(2),difference=(Math.abs(hundredths-500)/100).toFixed(2);
        status.textContent=`${elapsed}秒　差 ${difference}秒`;
        offerCopy(`5秒ぴったり ${elapsed}秒（差 ${difference}秒）\nhttps://game.kihamda.net/play-timing.html`);
      }
    });
    status.textContent='スタートを押してね';
    const cancel=()=>{
      if(document.hidden && started!==null){started=null;control.textContent='スタート';status.textContent='計測を中止したよ。もう一度スタートしてね。';}
    };
    document.addEventListener('visibilitychange',cancel);
    cleanup=()=>document.removeEventListener('visibilitychange',cancel);
  },
  lights(reset) {
    category.textContent = 'パズル';
    let cells = Array(16).fill(false), moves = 0, progress = null, dailyDate = null;
    const toggle = i => { const x = i % 4, y = Math.floor(i / 4); [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => { const a=x+dx,b=y+dy; if(a>=0&&a<4&&b>=0&&b<4) cells[b*4+a]=!cells[b*4+a]; }); };
    if (params.get('mode') === 'daily') {
      const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date());
      const part = type => parts.find(item => item.type === type).value;
      const date = `${part('year')}-${part('month')}-${part('day')}`;
      category.textContent = `今日のパズル ${date}`;
      progress = dailyProgress('lights', date); dailyDate = date;
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
    if (progress) {
      if (reset) progress.clear();
      const saved = progress.load();
      if (saved) { cells = saved.cells; moves = saved.moves; }
    }
    const buttons = cells.map((_,i) => button('', () => { if (!cells.some(Boolean)) return; toggle(i); moves++; if(progress && !progress.save(cells,moves)){recoverDailyConflict();return;} render(); }));
    function render() { cells.forEach((on,i) => { buttons[i].className = on ? 'on' : ''; buttons[i].textContent = on ? '✦' : '·'; buttons[i].setAttribute('aria-label', `${Math.floor(i/4)+1}行${i%4+1}列 ${on?'点灯':'消灯'}`); }); status.textContent = cells.some(Boolean) ? `${moves}手` : `クリア！ ${moves}手で消せたよ`; if(progress && !cells.some(Boolean)) offerResultCopy('lights', dailyDate, moves); } render();
  },
  memory() {
    category.textContent = '記憶';
    const symbols = shuffle(['●','◆','▲','★','♥','☀','✿','■', '●','◆','▲','★','♥','☀','✿','■']);
    let open=[], matched=0, turns=0, timer=0, locked=false;
    const names={'●':'まる','◆':'ひし形','▲':'さんかく','★':'ほし','♥':'ハート','☀':'たいよう','✿':'はな','■':'しかく'};
    const cardLabel=(i,value)=>`${Math.floor(i/4)+1}行${i%4+1}列 ${value}`;
    const buttons=symbols.map((s,i)=>button('？',e=>{ if(locked || buttons[i].disabled || open.includes(i)) return; buttons[i].textContent=s; buttons[i].className='flipped'; buttons[i].setAttribute('aria-label',cardLabel(i,names[s])); open.push(i); if(open.length===2){ turns++; if(symbols[open[0]]===symbols[open[1]]) { const focused=buttons.indexOf(document.activeElement); const needsFocus=e?.detail===0 && open.includes(focused); open.forEach(j=>{buttons[j].disabled=true;buttons[j].className='matched';buttons[j].setAttribute('aria-label',cardLabel(j,`${names[symbols[j]]} そろったカード`));}); matched++;open=[];status.textContent=matched===8?`クリア！ ${turns}回でそろえたよ`:`${matched}組 / 8組`; if(needsFocus){const remaining=buttons.slice(focused+1).concat(buttons.slice(0,focused)).find(b=>!b.disabled);(remaining || document.querySelector('#restart')).focus();} } else {locked=true; timer=setTimeout(()=>{open.forEach(j=>{buttons[j].textContent='？';buttons[j].className='';buttons[j].setAttribute('aria-label',cardLabel(j,'伏せたカード'));});open=[];locked=false;},700);} } })); buttons.forEach((b,i)=>b.setAttribute('aria-label',cardLabel(i,'伏せたカード'))); status.textContent='0組 / 8組'; cleanup=()=>clearTimeout(timer);
  },
  order() {
    category.textContent='スピード';
    let next=1, start=0, best=null;
    try {
      const saved=window.localStorage.getItem('kihamda-order-best');
      if(saved!==null && saved.trim()!=='' && Number.isFinite(Number(saved)) && Number(saved)>=0) best=Number(saved);
    } catch (_) {}
    const showBest=()=>{record.hidden=best===null;record.textContent=best===null?'':`自己ベスト ${best.toFixed(2)}秒`;};
    showBest();
    const nums=shuffle([...Array(16)].map((_,i)=>i+1));
    const buttons=nums.map(n=>{
      const b=button(n,e=>{
        if(n!==next)return;
        const needsFocus=e?.detail===0 && document.activeElement===b;
        if(next===1)start=performance.now();
        b.disabled=true;b.className='matched';next++;
        if(next===17){
          const seconds=(performance.now()-start)/1000;
          status.textContent=`ゴール！ ${seconds.toFixed(2)}秒`;
          if(best===null || seconds<best){
            best=seconds;
            try {window.localStorage.setItem('kihamda-order-best', String(best));} catch (_) {}
            showBest();
          }
        } else status.textContent=`次は ${next}`;
        if(needsFocus){
          const index=buttons.indexOf(b);
          const remaining=buttons.slice(index+1).concat(buttons.slice(0,index)).find(item=>!item.disabled);
          (remaining || document.querySelector('#restart')).focus();
        }
      });
      return b;
    });
    status.textContent='次は 1';
  },
  sum(reset) {
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const part=type=>Number(parts.find(item=>item.type===type).value);
    const date=`${part('year')}-${String(part('month')).padStart(2,'0')}-${String(part('day')).padStart(2,'0')}`;
    category.textContent=`今日のパズル ${date}`;
    const {values,target}=generateSumPuzzle(part('year'),part('month'),part('day'));
    const progress=dailyProgress('sum',date,9);
    let selected=Array(9).fill(false),moves=0,won=false;
    if(reset)progress.clear();
    const saved=progress.load();
    if(saved && saved.cells.filter(Boolean).length<=3){selected=saved.cells;moves=saved.moves;}
    board.classList.add('sum');
    const buttons=values.map((value,index)=>button(String(value),()=>{
      if(won || (!selected[index] && selected.filter(Boolean).length===3))return;
      selected[index]=!selected[index];moves++;if(!progress.save(selected,moves)){recoverDailyConflict();return;}render();
    }));
    function render(){
      const chosen=values.filter((_,i)=>selected[i]),total=chosen.reduce((a,n)=>a+n,0);
      won=chosen.length===3&&total===target;
      buttons.forEach((b,i)=>{b.className=selected[i]?'on':'';b.setAttribute('aria-pressed',String(selected[i]));});
      status.textContent=won?`クリア！ 目標 ${target}`:`目標 ${target}　選択 ${chosen.length}枚　合計 ${total}`;
      if(won)offerResultCopy('sum',date,moves);
    }
    render();
  },
  path(reset) {
    board.classList.add('path');
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const part=type=>Number(parts.find(item=>item.type===type).value);
    const date=`${part('year')}-${String(part('month')).padStart(2,'0')}-${String(part('day')).padStart(2,'0')}`;
    category.textContent=`今日のパズル ${date}`;
    const puzzle=generatePathPuzzle(part('year'),part('month'),part('day'));
    const storage=dailyStorage('path',date);
    let route=[puzzle.start],moves=0;
    const validRoute=route=>Array.isArray(route)&&route.length>=1&&route.length<=16&&route[0]===puzzle.start&&route.every((cell,i)=>{
      if(!Number.isInteger(cell)||cell<0||cell>15||route.indexOf(cell)!==i)return false;
      if(i&&!pathNeighbors(route[i-1]).includes(cell))return false;
      const checkpoint=puzzle.checkpoints.indexOf(cell);
      if(checkpoint>=0&&puzzle.checkpoints.slice(0,checkpoint).some(item=>!route.slice(0,i).includes(item)))return false;
      if(i===15 && cell!==puzzle.goal)return false;
      return cell!==puzzle.goal||(i===15&&puzzle.checkpoints.every(item=>route.includes(item)));
    });
    try {
      if(reset)storage.clear();
      const saved=storage.load();
      if(saved&&validRoute(saved.route)&&Number.isSafeInteger(saved.moves)&&saved.moves>=0){route=saved.route;moves=saved.moves;}
    } catch (_) {}
    const buttons=Array.from({length:16},(_,index)=>button('',()=>{
      if(route.length===16)return;
      if(route.length>1&&index===route[route.length-2])route.pop();
      else {
        const candidate=[...route,index];
        if(!validRoute(candidate)){
          const checkpoint=puzzle.checkpoints.indexOf(index);
          if(route.includes(index))status.textContent='通ったマスには戻れないよ。1つ前のマスを押してね。';
          else if(!pathNeighbors(route[route.length-1]).includes(index))status.textContent='上下左右の隣のマスを押してね。';
          else if(checkpoint>=0&&puzzle.checkpoints.slice(0,checkpoint).some(item=>!route.includes(item)))status.textContent='数字は1から順番に通ろう。';
          else if(index===puzzle.goal)status.textContent='数字とほかのマスをすべて通ってからゴールしよう。';
          else status.textContent='最後はゴールのマスへ進もう。';
          return;
        }
        route=candidate;
      }
      moves++;
      if(!storage.save({route,moves})){recoverDailyConflict();return;}
      render();
    }));
    function render(){
      const won=route.length===16&&route[15]===puzzle.goal;
      buttons.forEach((b,i)=>{
        const checkpoint=puzzle.checkpoints.indexOf(i),position=route.indexOf(i);
        const label=i===puzzle.start?'スタート':i===puzzle.goal?'ゴール':checkpoint>=0?`数字${checkpoint+1}`:'マス';
        b.textContent=i===puzzle.start?'始':i===puzzle.goal?'終':checkpoint>=0?String(checkpoint+1):position>=0?'・':'';
        b.className=`path-cell${position>=0?' on':''}${i===route[route.length-1]?' path-current':''}`;
        b.dataset.step=position>=0?String(position+1):'';
        b.setAttribute('aria-label',`${Math.floor(i/4)+1}行${i%4+1}列 ${label}${position>=0?` 通過${position+1}番目`:''}${i===route[route.length-1]?' 現在地':''}`);
        b.setAttribute('aria-pressed',String(position>=0));
      });
      status.textContent=won?`クリア！ ${moves}手`:`${route.length} / 16マス`;
      if(won)offerResultCopy('path',date,moves);
    }
    render();
  },
  circuit(reset) {
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const part=type=>Number(parts.find(item=>item.type===type).value);
    const date=`${part('year')}-${String(part('month')).padStart(2,'0')}-${String(part('day')).padStart(2,'0')}`;
    category.textContent=`今日のパズル ${date}`;
    const {masks,turns:initial}=generateCircuitPuzzle(part('year'),part('month'),part('day'));
    const storage=dailyStorage('circuit',date); let turns=[...initial], moves=0;
    try {
      if(reset) storage.clear();
      const saved=storage.load();
      if(saved && Array.isArray(saved.turns) && saved.turns.length===9 && saved.turns.every(n=>Number.isInteger(n)&&n>=0&&n<4) && Number.isSafeInteger(saved.moves) && saved.moves>=0) {
        turns=[...saved.turns]; moves=saved.moves;
      }
    } catch (_) {}
    board.classList.add('circuit');
    const directions=[[1,'上'],[2,'右'],[4,'下'],[8,'左']];
    const buttons=turns.map((_,i)=>button('',()=>{
      if(circuitSolved(masks.map((mask,j)=>rotateCircuit(mask,turns[j])))) return;
      turns[i]=(turns[i]+1)%4; moves++;
      if(!storage.save({turns,moves})){recoverDailyConflict();return;}
      render();
    }));
    function render(){
      const current=masks.map((mask,i)=>rotateCircuit(mask,turns[i])), {reached,won}=circuitTrace(current);
      buttons.forEach((b,i)=>{
        const mask=current[i], ends=directions.filter(([bit])=>mask&bit).map(([,name])=>name).join('と');
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('viewBox','0 0 100 100'); svg.setAttribute('aria-hidden','true');
        for(const [bit,x,y] of [[1,50,0],[2,100,50],[4,50,100],[8,0,50]]) if(mask&bit){
          const line=document.createElementNS('http://www.w3.org/2000/svg','line');
          for(const [name,value] of Object.entries({x1:50,y1:50,x2:x,y2:y})) line.setAttribute(name,String(value));
          svg.append(line);
        }
        b.replaceChildren(svg); b.dataset.endpoint=i===0?'始':i===8?'終':'';
        b.classList.toggle('circuit-connected',reached.includes(i));
        b.setAttribute('aria-label',`${Math.floor(i/3)+1}行${i%3+1}列 ${i===0?'始点 ':i===8?'終点 ':''}${ends}につながる道${reached.includes(i)?' 始点から接続':''}`);
      });
      status.textContent=won?`クリア！ ${moves}手でつながったよ`:`${moves}手　つながり ${reached.length} / 9`;
      if(won) offerResultCopy('circuit',date,moves);
    }
    render();
  },
  sort(reset) {
    const daily=params.get('mode')==='daily';
    let date=null, initial;
    if(daily){
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const part=type=>Number(parts.find(item=>item.type===type).value);
      date=`${part('year')}-${String(part('month')).padStart(2,'0')}-${String(part('day')).padStart(2,'0')}`;
      category.textContent=`今日のパズル ${date}`;
      initial=generateDailySortPuzzle(part('year'),part('month'),part('day'));
    } else {category.textContent='パズル';initial=generateSortPuzzle();}
    board.classList.add('sort');
    const names=['あか','あお','きいろ'], symbols=['●','▲','◆'], storage=daily ? dailyStorage('sort',date) : null;
    let tubes=initial.map(t=>[...t]), selected=null, history=[], actions=[], won=false;
    const isWon=state=>state.every(t=>!t.length || (t.length===3 && t.every(c=>c===t[0])));
    const canMove=(state,from,to)=>Number.isInteger(from)&&Number.isInteger(to)&&from>=0&&from<4&&to>=0&&to<4&&from!==to&&state[from].length>0&&state[to].length<3&&(!state[to].length||state[to].at(-1)===state[from].at(-1));
    if(daily){
      try{
        if(reset)storage.clear();
        const saved=storage.load();
        if(saved&&Array.isArray(saved.actions)&&saved.actions.length<=10000){
          const state=initial.map(t=>[...t]), past=[];
          const valid=saved.actions.every(action=>{
            if(!Array.isArray(action)||action.length!==2||isWon(state)||!canMove(state,action[0],action[1]))return false;
            past.push(state.map(t=>[...t]));state[action[1]].push(state[action[0]].pop());return true;
          });
          if(valid){tubes=state;history=past;actions=saved.actions.map(a=>[...a]);}
        }
      }catch(_){}
    }
    const save=()=>!storage || storage.save({actions});
    const buttons=Array.from({length:4},(_,index)=>button('',()=>{
      if(won)return;
      if(selected===null) {
        if(!tubes[index].length){status.textContent='玉のあるボトルを選んでね';return;}
        selected=index;
      } else if(selected===index) selected=null;
      else {
        if(!canMove(tubes,selected,index)) {status.textContent='空きか、同じ色の上に移してね';return;}
        history.push(tubes.map(t=>[...t]));actions.push([selected,index]);
        tubes[index].push(tubes[selected].pop());selected=null;
        if(!save()){recoverDailyConflict();return;}
      }
      render();
    }));
    const undo=button('一手戻す',()=>{
      if(!history.length)return;
      tubes=history.pop();actions.pop();selected=null;if(!save()){recoverDailyConflict();return;}render();
    });
    undo.className='sort-undo';
    function render(){
      won=isWon(tubes);
      buttons.forEach((b,index)=>{
        const tube=tubes[index];b.replaceChildren();
        for(let slot=2;slot>=0;slot--){
          const span=document.createElement('span'), color=tube[slot];
          span.className=color===undefined?'sort-slot':`sort-slot sort-color-${color}`;
          span.textContent=color===undefined?'':symbols[color];b.append(span);
        }
        b.className=selected===index?'sort-selected':'';
        b.setAttribute('aria-pressed',String(selected===index));
        b.setAttribute('aria-label',`${index+1}番のボトル ${tube.length ? `下から${tube.map(c=>names[c]).join('、')}` : '空'}${selected===index?' 選択中':''}`);
      });
      undo.setAttribute('aria-disabled',String(!history.length));
      status.textContent=won?`クリア！ ${actions.length}手でそろえたよ`:selected===null?`${actions.length}手`: `${selected+1}番を選択中。移す先を押してね`;
      if(won&&daily)offerResultCopy('sort',date,actions.length);
      else {copyResult.hidden=true;copyResult.onclick=null;copyFeedback.hidden=true;copyFeedback.textContent='';}
    }
    render();
  },
  slide() {
    category.textContent='パズル';
    board.classList.add('slide');
    const solved=[1,2,3,4,5,6,7,8,0];
    let tiles=[...solved], empty=8, previous=-1, moves=0, won=false;
    const neighbors=index=>[index-3,index+3,...(index%3?[index-1]:[]),...(index%3<2?[index+1]:[])].filter(i=>i>=0&&i<9);
    for(let step=0;step<35;step++) {
      const choices=neighbors(empty).filter(index=>index!==previous);
      const next=choices[Math.floor(Math.random()*choices.length)];
      [tiles[empty],tiles[next]]=[tiles[next],tiles[empty]];
      previous=empty; empty=next;
    }
    const buttons=tiles.map((_,index)=>button('',e=>{
      if(won || !neighbors(empty).includes(index)) return;
      const needsFocus=e?.detail===0 && document.activeElement===buttons[index], destination=empty;
      [tiles[empty],tiles[index]]=[tiles[index],tiles[empty]];
      empty=index; moves++;
      won=tiles.every((tile,i)=>tile===solved[i]);
      render();
      if(needsFocus) (won ? document.querySelector('#restart') : buttons[destination]).focus();
    }));
    function render() {
      buttons.forEach((b,index)=>{
        const value=tiles[index], movable=value!==0 && neighbors(empty).includes(index) && !won;
        b.textContent=value || ''; b.disabled=value===0; b.className=value===0?'slide-empty':movable?'slide-movable':'';
        b.setAttribute('aria-label',`${Math.floor(index/3)+1}行${index%3+1}列 ${value || '空き'}${movable?' 動かせる':''}`);
      });
      status.textContent=won?`クリア！ ${moves}手で並べたよ`:`${moves}手`;
    }
    render();
  },
  garden(reset) {
    category.textContent='日替わりパズル';

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
    const progress = dailyProgress('garden', date);
    if (reset) progress.clear();
    const saved = progress.load();
    if (saved) { cells = saved.cells; moves = saved.moves; }
    board.classList.add('garden');
    const clue=(value,kind,index)=>{const el=document.createElement('span');el.className='garden-clue';el.textContent=value;el.setAttribute('aria-label',`${kind}${index+1}の目標 ${value}`);board.append(el);};
    const corner=document.createElement('span');corner.setAttribute('aria-hidden','true');board.append(corner); cols.forEach((v,i)=>clue(v,'列',i));
    const buttons=[];
    for(let r=0;r<4;r++) { clue(rows[r],'行',r); for(let c=0;c<4;c++) { const i=r*4+c; buttons.push(button('',()=>{if(won)return;cells[i]=!cells[i];moves++;if(!progress.save(cells,moves)){recoverDailyConflict();return;}render();})); } }
    function render() {
      won=cells.every((on,i)=>Number(on)===((solution>>i)&1));
      cells.forEach((on,i)=>{const b=buttons[i];b.className=on?'on':'';b.textContent=on?'✿':'·';b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',`${Math.floor(i/4)+1}行${i%4+1}列 ${on?'花あり':'空き'}、行の目標 ${rows[Math.floor(i/4)]}、列の目標 ${cols[i%4]}`);});
      status.textContent=won?`クリア！ ${moves}手で咲かせたよ`:`${moves}手`;
      if(won) offerResultCopy('garden', date, moves);
    }
    render();
  },
  dodge() {
    document.body.classList.add('dodge-mode');status.setAttribute('aria-live','off');category.textContent='アクション'; controls.hidden=false;
    const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;canvas.setAttribute('aria-label','星をよけるゲーム画面'); board.style.display='block'; board.append(canvas); const ctx=canvas.getContext('2d');
    let x=200, items=[], ticks=0, last=0, elapsed=0, frame=0, alive=false, dir=0;
    const keys=new Set(), pointers=new Map(), heldSince=new Map(), longClicks=new Map(); const updateDirection=()=>{const held=[...pointers.values()];dir=held.length?Number(held.includes(1))-Number(held.includes(-1)):Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));};
    const startButton=document.createElement('button'); startButton.type='button'; startButton.className='button dodge-start'; startButton.textContent='スタート'; board.append(startButton);
    function move(e){if(!alive)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();if(e.type==='keydown')keys.add(e.key);else keys.delete(e.key);updateDirection();}}
    const stopMoving=()=>{keys.clear();pointers.clear();heldSince.clear();longClicks.clear();updateDirection();};
    document.addEventListener('keydown',move);document.addEventListener('keyup',move);window.addEventListener('blur',stopMoving);document.addEventListener('visibilitychange',stopMoving);
    const left=document.querySelector('#left'),right=document.querySelector('#right');
    const down=direction=>e=>{if(alive){longClicks.delete(e.currentTarget);heldSince.set(e.pointerId,performance.now());pointers.set(e.pointerId,direction);updateDirection();}};
    const up=e=>{
      const started=heldSince.get(e.pointerId);
      if(e.type==='pointerup' && started!==undefined && performance.now()-started>=150)longClicks.set(e.currentTarget,performance.now()+1000);
      if(e.type!=='pointerleave')heldSince.delete(e.pointerId);pointers.delete(e.pointerId);updateDirection();
    };
    const clearReleased=e=>heldSince.delete(e.pointerId);window.addEventListener('pointerup',clearReleased);window.addEventListener('pointercancel',clearReleased);
    for(const [el,direction] of [[left,-1],[right,1]]){
      el.addEventListener('pointerdown',down(direction));el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('pointerleave',up);
      el.addEventListener('click',e=>{
        const suppress=e.detail!==0 && longClicks.has(el) && longClicks.get(el)>=performance.now();longClicks.delete(el);
        if(!alive||suppress)return;x=Math.max(15,Math.min(385,x+direction*30));
      });
    }
    function draw(){ctx.clearRect(0,0,400,400);ctx.fillStyle='#a9dfc8';ctx.beginPath();ctx.arc(x,365,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f9c96e';ctx.font='26px sans-serif';for(const p of items)ctx.fillText('✦',p.x-12,p.y+8);}
    function loop(t){if(!alive)return;const dt=last?Math.min((t-last)/1000,.05):0;last=t;elapsed+=dt;ticks+=dt;x=Math.max(15,Math.min(385,x+dir*230*dt));if(ticks>.55){ticks=0;items.push({x:15+Math.random()*370,y:-15,s:110+Math.random()*80+elapsed*2});}for(const p of items){p.y+=p.s*dt;if(Math.abs(p.x-x)<22&&Math.abs(p.y-365)<22)alive=false;}items=items.filter(p=>p.y<420);draw();status.textContent=alive?`${elapsed.toFixed(1)}秒`:`ゲームオーバー！ ${elapsed.toFixed(1)}秒`;if(alive)frame=requestAnimationFrame(loop);else announcement.textContent=status.textContent;}
    draw();status.textContent='スタートを押してね';startButton.addEventListener('click',()=>{if(alive)return;startButton.hidden=true;alive=true;last=0;frame=requestAnimationFrame(loop);});cleanup=()=>{alive=false;startButton.remove();cancelAnimationFrame(frame);document.removeEventListener('keydown',move);document.removeEventListener('keyup',move);window.removeEventListener('blur',stopMoving);document.removeEventListener('visibilitychange',stopMoving);window.removeEventListener('pointerup',clearReleased);window.removeEventListener('pointercancel',clearReleased); for(const el of [left,right]){el.replaceWith(el.cloneNode(true));}};
  }
};
const gridColumns={lights:4,memory:4,order:4,garden:4,path:4,sum:3,slide:3,circuit:3};
board.addEventListener('keydown',event=>{
  const columns=Object.hasOwn(gridColumns,id) ? gridColumns[id] : 0;
  const directions={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
  const direction=Object.hasOwn(directions,event.key) ? directions[event.key] : null;
  if(!columns || !direction)return;
  const cells=Array.from(board.querySelectorAll(':scope > button'));
  const index=cells.indexOf(event.target);
  if(index<0)return;
  event.preventDefault();
  let row=Math.floor(index/columns),col=index%columns;
  while(true) {
    row+=direction[0];col+=direction[1];
    if(row<0||col<0||col>=columns||row>=Math.ceil(cells.length/columns))return;
    const target=cells[row*columns+col];
    if(target&&!target.disabled){target.focus();return;}
  }
});
function recoverDailyConflict() {
  const cells=Array.from(board.querySelectorAll(':scope > button'));
  const focused=cells.indexOf(document.activeElement);
  start(false);
  status.textContent='別のタブの新しい記録を表示したよ';
  if(focused>=0) {
    const target=board.querySelectorAll(':scope > button')[focused];
    (target&&!target.disabled ? target : restart).focus();
  }
}
let activeDailyDate=null, dailyTimer=null, isStaleDaily=false;
const restart=document.querySelector('#restart');
function todayInTokyo() {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=type=>parts.find(item=>item.type===type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function refreshDailyDate() {
  if(!activeDailyDate)return;
  const stale=activeDailyDate!==todayInTokyo();
  category.textContent=stale ? `${activeDailyDate} の問題` : `今日のパズル ${activeDailyDate}`;
  document.body.classList.toggle('daily-stale',stale);
  restart.textContent=stale?'今日の問題へ':'もう一度';
  if(stale&&!isStaleDaily) announcement.textContent='日付が変わったよ。今日の問題を開けるよ。';
  isStaleDaily=stale;
}
function start(reset=false){
  runGeneration++;cleanup();cleanup=()=>{};currentDailyStorage=null;
  if(dailyTimer!==null){window.clearInterval(dailyTimer);dailyTimer=null;}
  activeDailyDate=null;isStaleDaily=false;restart.textContent='もう一度';
  document.body.classList.remove('daily-stale','storage-unavailable');
  document.body.classList.remove('dodge-mode','grid-mode','path-mode','lights-mode');announcement.textContent='';record.hidden=true;record.textContent='';copyResult.hidden=true;copyResult.onclick=null;copyFeedback.hidden=true;copyFeedback.textContent='';status.setAttribute('aria-live','polite');board.replaceChildren();board.classList.remove('garden','slide','sum','path','sort','circuit','timing','recall','code','balance');board.style.display='';controls.hidden=true;
  if(!Object.hasOwn(games,id)){title.textContent='ゲームが見つかりません';instructions.textContent='ゲーム一覧から選んでね。';status.textContent='';return;}
  title.textContent=gameCatalog[id].title;instructions.textContent=gameCatalog[id].instructions;const gridHelp=document.querySelector('#grid-keyboard-help'), hasGridKeys=Object.hasOwn(gridColumns,id);if(gridHelp)gridHelp.hidden=!hasGridKeys;board.setAttribute('aria-describedby',hasGridKeys?'grid-keyboard-help':'');if(id!=='dodge')document.body.classList.add('grid-mode');if(id==='path')document.body.classList.add('path-mode');if(id==='lights')document.body.classList.add('lights-mode');games[id](reset);document.title=`${title.textContent} | Kihamda Games`;
  activeDailyDate=category.textContent.match(/^今日のパズル (\d{4}-\d{2}-\d{2})$/)?.[1] || null;
  if(activeDailyDate){refreshDailyDate();dailyTimer=window.setInterval(refreshDailyDate,30000);}
}
restart.addEventListener('click',()=>{
  refreshDailyDate();
  if(!isStaleDaily && currentDailyStorage && !currentDailyStorage.isCurrent()){recoverDailyConflict();return;}
  start(!isStaleDaily);
});
if(typeof document.addEventListener==='function')document.addEventListener('visibilitychange',refreshDailyDate);
start();
