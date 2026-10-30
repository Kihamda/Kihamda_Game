const params = new URLSearchParams(location.search);
let circuitDifficulty=['easy','hard','oni','kiwami','legacy'].includes(params.get('difficulty'))?params.get('difficulty'):'normal';
const circuitVersions={easy:'2',normal:'3',hard:'2',oni:'2',kiwami:'2',legacy:'1'};
const circuitRequested=params.get('difficulty')||'normal',circuitVersion=params.get('version');
const invalidCircuitLink=circuitVersion!==null && (!Object.hasOwn(circuitVersions,circuitRequested)||circuitVersions[circuitRequested]!==circuitVersion);
let lightsDifficulty=['easy','hard','oni','kiwami','legacy'].includes(params.get('difficulty'))?params.get('difficulty'):'normal';
const lightsRequested=params.get('difficulty')||'normal',lightsVersion=params.get('version'),lightsVersions={easy:'2',normal:'2',hard:'2',oni:'2',kiwami:'2',legacy:'1'};
const invalidLightsLink=lightsVersion!==null&&(!Object.hasOwn(lightsVersions,lightsRequested)||lightsVersions[lightsRequested]!==lightsVersion);
const lightsBoards={"easy":[19,39,78,140,305,626,1252,2248,4880,10016,12544,20032,29184,35968,51200,58368],"normal":[122,184,209,229,261,344,364,410,430,499,539,559,582,688,729,749,781,848,868,975,1062,1103,1147,1165,1209,1232,1328,1369,1435,1478,1522,1562,1669,1713,1752,1959,2058,2135,2147,2197,2209,2300,2421,2487,2526,2538,2614,2717,2729,2752,2804,2848,2955,3083,3135,3170,3232,3357,3392,3678,4179,4396,4421,4465,4590,4614,4658,4719,4781,4804,4900,4941,4985,5007,5051,5074,5202,5510,5639,5683,5742,5804,5829,5905,6008,6074,6099,6119,6570,6784,6889,6996,7008,7062,7115,7167,7424,7912,7996,8290,8630,8707,8759,8798,8860,8949,8993,9032,9098,9175,9187,9315,9416,9500,9537,9589,9694,9730,9782,9823,9885,9920,9972,10004,10057,10109,10123,10175,10210,10468,10968,11020,11283,11303,11342,11404,11569,11674,11890,11993,12112,12132,12198,12239,12283,12310,12322,12415,12477,12500,12596,12637,12649,12703,12715,12738,12867,13116,13141,13153,13310,13335,13347,13438,13448,13500,13525,13569,13672,13738,13763,13815,13890,13952,14230,14500,14585,14660,14726,14811,14831,15290,15374,15443,15463,15564,15608,15660,15729,15922,16144,16484,16754,16945,17004,17171,17191,17230,17292,17420,17555,17575,17614,17658,17841,17924,17968,18075,18095,18118,18162,18361,18404,18646,18984,19075,19127,19178,19349,19400,19477,19489,19528,19580,19646,19715,19997,20009,20084,20098,20191,20203,20287,20310,20322,20384,20477,20496,20932,21521,21767,21811,21870,21912,21932,22354,22416,22624,22912,22964,23649,23838,23875,23927,24028,24040,24064,24354,24609,24648,24835,24887,24926,24988,25000,25152,25442,25504,25632,26100,26636,26705,26771,26791,26830,26926,26951,26995,27057,27096,27116,27378,27410,27728,27748,28036,28732,28757,28769,28926,28995,29236,29277,29289,29343,29355,29378,29462,29474,29567,29629,29846,30080,30312,30378,30403,30455,30600,30677,30906,31300,31344,31366,31451,31471,31632,31652,31737,32050,32300,32369,32526,32595,32615,32716,32940,33444,33798,33842,33883,33903,33988,34064,34169,34318,34362,34387,34407,34508,34673,34858,34883,34935,35048,35157,35350,35584,35871,35883,35906,36020,36061,36073,36157,36192,36246,36258,36351,36478,36488,36540,36565,36577,36803,37604,38002,38224,38419,38439,38478,38540,38705,38744,39584,39744,39796,40224,40418,40609,40648,40732,40835,40887,40926,41088,41312,41608,41832,42752,43058,43280,43474,43534,43603,43623,43665,43724,43820,43889,43911,43955,44014,44688,44708,44868,45248,45344,45768,46408,46912,47218,47280,47440,47460,47635,47655,47694,47756,47921,48305,48396,48531,48551,48590,48868,49138,49220,49286,49330,49371,49391,49490,49657,49681,49740,49806,49850,49875,49895,49927,49971,50030,50092,50161,50220,50704,50724,51140,51252,51293,51305,51359,51371,51394,51478,51490,51583,51645,51720,51772,51797,51809,51966,52035,52200,52328,52394,52419,52471,52693,52886,53120,53296,53712,53732,54232,54321,54547,54567,54606,54668,55154,55360,55650,55712,55841,56067,56119,56158,56220,56776,56864,57332,57448,57514,57539,57591,57813,58006,58420,58461,58473,58527,58539,58562,58646,58658,58751,58813,58848,58940,58965,58977,59134,59203,59368,59436,59920,60356,60484,60550,60635,60655,60754,60816,60921,60945,61114,61191,61235,61294,61356,61896,61984,62400,62452,62528,62818,63009,63048,63235,63287,63326,63388,63537,63763,63783,63822,63884,64100,64370,64560,64754,64996,65036,65171,65191,65230,65457,65496],"hard":[949,1823,1910,2013,2319,2906,3290,3493,3727,3771,3814,3846,3931,3993,4013,4331,5251,5354,5438,5463,5628,6233,6253,6319,6342,6479,6523,6712,7256,7276,7367,7411,7546,7608,7633,7653,7737,7826,8006,8173,8410,8551,8652,9241,9636,10398,10519,10531,10684,10721,10914,11126,11229,11510,11595,11939,12857,12946,13051,13188,13880,14126,14151,14316,14401,14654,14921,14973,15039,15074,15199,15211,15764,16087,16099,16234,16296,16321,16373,16565,16791,17033,17398,17748,18268,18483,18542,18764,18808,18830,18899,19026,19245,19899,19942,20586,20757,20926,21003,21055,21078,21193,21245,21277,21289,21471,21483,21611,22026,22078,22103,22165,22268,22312,22554,22885,23078,23119,23163,23181,23225,23248,23300,23344,23385,23405,23451,23471,23579,24186,24248,24273,24293,24519,24563,24816,25253,25336,25368,25690,25841,25893,25998,26127,26171,26317,26361,26393,26413,26480,26546,26587,26607,27159,27210,27639,27777,28158,28235,28287,28297,28349,28372,28384,28468,28509,28521,28575,28587,28610,28985,29074,29094,29179,29639,29742,29767,29811,29932,30033,30053,30226,30573,30815,30827,30996,31049,31101,31167,31799,31850,31900,31912,31937,31989,32138,32215,32227,32457,32694,32893,33078,33119,33131,33193,33308,33397,33598,33635,33697,33788,34241,34708,34761,35119,35309,35502,35527,35571,35706,35768,35793,35813,36646,36731,36925,37067,37119,37151,37163,37186,37238,37341,37353,37429,37468,37534,37655,37667,37706,37758,37857,38039,38051,38090,38273,38325,38646,38793,38948,38989,39033,39055,39099,39142,39259,39279,39321,39341,39408,39448,39642,39845,39973,40012,40056,40078,40167,40282,40473,40806,41061,41349,41581,41869,41997,42041,42150,42191,42235,42267,42287,42310,42416,42457,42477,42501,42650,42670,42695,42739,42874,42936,42961,42981,43146,43223,43370,44105,44157,44171,44223,44290,44383,44395,44445,44457,44480,44609,44862,45052,45093,45402,45509,45593,45613,45839,45883,45926,46029,46157,46223,46267,46290,46310,46489,46509,46576,46616,46661,46727,46771,46810,46830,46993,47013,47096,47306,47541,47862,47947,48009,48084,48096,48137,48331,48502,48641,48693,48732,48798,48919,48931,48970,49448,50324,50377,50429,50473,50548,50655,50667,50881,51068,51134,51655,52114,52242,52589,52655,52782,52807,52851,53048,53073,53093,53242,53322,53557,53791,53803,53878,53940,53981,54025,54077,54347,54409,54774,54814,54826,54903,54913,54965,55004,55048,55191,55203,55242,55354,55461,55770,55899,55961,56048,56294,56335,56379,56422,56525,56601,56621,56688,56754,56922,56984,57073,57125,57164,57230,57709,57775,57902,57927,57971,58092,58168,58193,58213,58259,58318,58362,59012,59193,59478,59540,59593,59645,59689,59778,59871,59883,60010,60072,60181,60284,60350,60478,61035,61398,61455,61499,61542,61584,61645,61721,61741,61808,62042,62104,62245,62609,62629,62744,62855,62899,62938,63129,63462,63563,63625,63712,63990,64030,64129,64181,64220,64407,64419,64458,64586,64821,64860,64926,65142,65289],"oni":[1632,4080,4137,4226,4500,5160,6148,6218,7173,7342,8216,8371,8462,10241,10293,10332,10570,10632,10761,14868,15106,16513,16604,16648,16803,16842,17673,18439,18705,18725,20673,21016,21140,21378,26214,28804,30008,32788,32841,33026,33061,33345,33546,33623,34962,36873,36948,37026,37377,37896,41016,42113,42130,44052,50562,52484,57362,60097],"kiwami":[17,1048577,32777,524297,65553,262161,2177,1048833,16777473,2097665,16781313,8421377,16842753,1310721,1026,32786,524306,2306,8450,8388866,16777730,5122,6146,264194,12290,20482,2101250,8392706,73730,270338,81922,8454146,1572866,36,516,131076,4132,4612,36868,528388,294916,196612,589828,393220,16392,1048616,2120,8264,2097224,5128,263176,6152,67592,264200,12296,20488,2101256,8392712,73736,16809992,2359304,16777232,8388656,1048656,16777296,8336,1052688,16842768,1310736,2621456,4256,65696,262304,131360,524576,4194592,4640,135200,528416,4198432,196640,589856,393248,9437216,18874400,64,32960,524480,4194496,33344,131648,4194880,18496,8390720,266304,2105408,8396864,2113600,163904,655424,17825856,131200,4194432,33152,524672,4194688,4736,66176,262784,36992,528512,295040,589952,256,9472,8389888,2099456,8390912,69888,2105600,164096,655616,17826048,37376,135680,4198912,295424,197120,393728,9437696,18874880,9216,2098176,2102272,8393728,271360,10240,18432,2103296,8394752,83968,8456192,1181696,2361344,4096,2109440,8400896,2117632,8409088,167936,561152,4231168,659456,4722688,8462336,16916480,2367488,8404992,4227072,65536,262144,4718592,17825792]};
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
function generateEasyCircuitPuzzle(year, month, dayOfMonth) {
  const layouts=[[10,10,12,6,10,9,3,10,10],[12,6,12,5,5,5,3,9,3]];
  const options=layouts.flatMap((masks,layout)=>{
    const corners=masks.flatMap((mask,i)=>rotateCircuit(mask,2)!==mask?[i]:[]),choices=corners.map(i=>[i]);
    for(let a=0;a<corners.length;a++)for(let b=a+1;b<corners.length;b++)choices.push([corners[a],corners[b]]);
    return choices.map(indices=>({layout,indices}));
  });
  const day=Math.floor(Date.UTC(year,month-1,dayOfMonth)/86400000);
  const {layout,indices}=options[((day%options.length)+options.length)%options.length];
  const turns=Array(9).fill(0);for(const index of indices)turns[index]=1;
  return {masks:[...layouts[layout]],turns};
}
function circuitTemplateIndex(day, count) {
  const cycle=Math.floor(day/count);return ((day+73*cycle)%count+count)%count;
}
function generateNormalCircuitPuzzle(year, month, dayOfMonth) {
  const templates=["5g","5m9y","78","5mhr","bk","5n4n","td","5nch","zo","62a8","144","62vn","15x","632u","1s1","659c","1x1","6hw7","2o1","6i3k","9ht","6ioo","9pw","6ivo","a9s","6l1o","agg","6lu7","aid","6o7n","b2o","6ogj","b84","6p2j","ba8","6re8","bed","6xrf","bv4","6xyd","c0l","6yjx","c2o","6yr5","c6p","711r","c8k","71n4","cud","71uc","czl","740s","dgk","7ac6","dm9","7al0","do4","7b73","dsx","7dhw","e90","7dpm","eep","7eat","eio","7ehz","ekx","7gu8","f10","7ju8","f79","7kne","fc0","7mzw","fdt","7n92","j01","7nyz","jc5","7q5m","jxs","7qds","kjk","7qyy","kpw","7r64","ks4","7u33","lc5","7woc","lhs","7xgc","ljp","7zp7","lo4","80f3","m9s","80n0","mc1","82u0","mgg","831m","mxt","83mz","n3l","83u7","n7k","86y0","n9t","89d7","npw","8a5k","nw5","8chb","o0w","8d34","o2p","8dbk","oo1","8fm3","oth","8fp3","1eqc","8ga9","1esg","8gh6","1ewl","8iuf","1fed","8jm7","1fk1","8sbs","1fo4","8v9r","1fq8","8w3j","1g6d","8yf3","1gcw","8z67","1gh1","8ze4","1gj5","91ko","1h50","91su","1ha9","92e3","1o84","92lb","1oac","94rz","1oud","94ys","1p04","95k0","1p28","95qy","1p6d","9b3k","1pn4","9bto","1psl","9c1n","1puo","9e8k","1pyp","9eg8","1q0k","9f1m","1ql1","9f8s","1qpw","9hfg","1qro","9hm7","1rdg","9i7f","1rfk","9ied","1rk1","9kr8","1s1h","9liz","1s75","9qw7","1sb8","9r3g","1sdc","9row","1sth","9rw1","1t00","9u6j","1t45","9us1","1t69","9uz7","1ts4","9x5i","1txd","9xec","1xk5","9y0f","1xvo","a0cb","1ych","a9ze","1yio","aalm","1yno","aatr","1z4w","ad0r","1zad","ad81","1zcg","adti","1zh0","ae0q","1zxc","ah4w","202t","ajju","204x","akcf","2091","aps5","20pd","aqdn","20wx","aqks","211x","asr7","21is","asyk","21ol","atjp","21sw","atqo","21v5","attr","22f8","aw45","22h0","awpl","22lc","awwr","22n5","b5eb","237l","b5lq","239t","b66t","23e8","b6ds"], layouts=[[10,10,12,6,10,9,3,10,10],[12,6,12,5,5,5,3,9,3]];
  const day=Math.floor(Date.UTC(year,month-1,dayOfMonth)/86400000);
  const encoded=parseInt(templates[circuitTemplateIndex(day,templates.length)],36);
  return {masks:[...layouts[encoded>>18]],turns:Array.from({length:9},(_,i)=>(encoded>>(2*i))&3)};
}
function generateHighCircuitPuzzle(year,month,dayOfMonth,size){
 const tables={"4":["0003ac6a663c56c53939","0003a36a693356c53939","0003a36a693c56c5c939","0003a36a693c56c53639","0003a36a693c56c539c9","0003a36a693c56c53936","0003ac9a993c56c53939","0003ac9a693c56c5c939","0003ac9a693c56c53639","0003ac9a693c56c539c9","0003ac9a693c56c53936","0003ac6a993356c53939","0003ac6a993c56353939","0003ac6a69cc56c53939","0003ac6a993c56c53639","0003ac6a993c56c539c9","0003ac6a993c56c53936","0003ac6a663c56c5c939","0003ac6a663c56c539c9","0003ac6a663c56c53936","0003ac6a69cc56c5c939","0003ac6a69cc56c53639","0003ac6a69cc56c53936","0003ac6a693359c53939","0003ac6a693356c5c939","0003ac6a693356c53639","0003ac6a693c56c53639","0003ac6a693356c539c9","0003ac6a693c56c5c936","04079c6c955c693c3aa9","04079c6c955369cc3aa9","04079c6c955369333aa9","04079c6c9553693c3aa6","0407636c955369cc3aa9","0407636c955369333aa9","0407636c9553693c3aa6","04076c9c9553993c3aa9","04076c9c9553663c3aa9","04076c9c9553693ccaa9","0003ac6a693c56c539c9","04076c636553693c3aa9","04076c639553993c3aa9","04076c639553663c3aa9","04076c639553693ccaa9","04076c6c655c693c3aa9","04076c6c655369cc3aa9","04076c6c655369333aa9","04076c6c6553693c3aa6","04076c6c955c993c3aa9","04076c6c955c663c3aa9","04076c6c955c693ccaa9","04076c6c9553663c3aa6","04076c6c6553693c3aa9","04076c6c955369cccaa9","04076c6c9553693ccaa6","040f9aa396c569393aaa","040f9aac96c569c93aaa","040f9aac96c569363aaa","040f9aac96c56939caaa","040f6aa366c569393aaa","040f6aa396c599393aaa","040f6aa396c56939caaa","040f6aac66c569c93aaa","040f6aac66c569363aaa","040f6aac99c569363aaa","04076c6c955c693c3aa9","040f6aac963599393aaa","040f6aac96c599363aaa","040f6aac96c569c9caaa","040f6aac96c56936caaa","040f9aa396a9696c3a93","040f9aac96a6696c3a93","040f9aac96a9699c3a93","040f9aac96a969633a93","040f9aac96a9696cca93","040f9aac96a9696c3a63","040f9aac96a9696c3a9c","040f6aa366a9696c3a93","04076c6c955369333aa9","040f6aa399a9696c3a93","040f6aa396a9996c3a93","040f6aa396a9666c3a93","040f6aa396a9699c3a93","040f6aa396a9696cca93","040f6aa396a9696c3a9c","040f6aac66a6696c3a93","040f6aac66a9699c3a93","040f6aac66a969633a93","040f6aac66a9696c3a63","040f6aac66a9696c3a9c","040f6aac99a969633a93","040f6aac66c569393aaa","040f6aac99a9696c3a9c","040f6aac96a6996c3a93","040f6aac96a6666c3a93","040f6aac96a6696cca93","040f6aac96a6696c3a63","040f6aac96a999633a93","040f6aac96a9996c3a63","040f6aac96a9996c3a9c","040f6aac96a9666c3a9c","040f6aac96a9699cca93","040f6aac96a96963ca93","040f6aac96a9696cca9c","040f6aac66a9696c3a93","040f9c6393956aa93aaa","040f9c6c93656aa93aaa","040f9c6c93956aa63aaa","040f9c6c93956aa9caaa","040f636c93959aa93aaa","040f636c93956aa9caaa","040f6c9c63956aa93aaa","040f6c9c93959aa93aaa","040f6c9c93956aa63aaa","040f6c9c93956aa9caaa","040f6c6363956aa93aaa","040f6c639c956aa93aaa","040f6aac96a9996c3a93","040f6c6393959aa93aaa","040f6c6c93659aa93aaa","040f9c6c95556955ca93","040f9c6c955569553a9c","040f636c955569553a63","040f6c9c955599553a93","040f6c9c955566553a93","040f6c63955599553a93","040f6c63955566553a93","040f6c6c655569553a9c","08039ac63c55c555c939","08036a363c55c5553639","08039aaa3c6cc3953aa9","08036ac93c5535553939","08036ac93c55c555c939","08036ac6cc55c55539c9","08036ac6cc55c5553936","08036ac63355c55539c9","08036ac63355c5553936","08039aaa3aacc6c5c939","08039aaa3aacc6c53639","08039aaa3aacc6c539c9","08036aaacaacc6353939","08036aaacaacc6c53639","08036aaacaacc6c539c9","08036aaa3c6c33953aa9","08036aaacaacc6c53936","08036aaa3aa3c6c5c939","08036aaa3aa3c6c539c9","08036aaa3aac36c539c9","08036aaa3aac36c53936","08036aaa3aacc9c53936","08036aaa3aacc635c939","08036aaa3aacc6c5c936","08039aaa3c9cc3953aa9","08039aaa3c63c3953aa9","08039aaa3c6cc395caa9","08039aaa3c6cc3953aa6","08036ac6cc39c3ac3aa9","08036aaacc63c3953aa9","08036aaacc6cc3653aa9","08036aaacc6cc3953aa6","08036aaa3c9c33953aa9","08036aaa3c9cc395caa9","08036aaa3c6333953aa9","08036aaa3c63cc953aa9","08036aaa3c63c395caa9","08036aaa3c6c33953aa6","08036aaa3c6cc395caa6","08039ac93c39c3ac3aa9","08039ac63cc9c3ac3aa9","08036ac63c3933ac3aa9","08039ac63c36c3ac3aa9","08039ac63c39c3a33aa9","08039ac63c39c3accaa9","08039ac63c39c3ac3aa6","08036a36cc39c3ac3aa9","08036a363c3933ac3aa9","08036a363c39c3a33aa9","08036a363c39c3accaa9","08036ac9cc39c3ac3aa9","08036ac93339c3ac3aa9","08036ac93c3933ac3aa9","08036ac93c39ccac3aa9","080b6aac3c66c5563939","08036ac93c39c3accaa9","08036ac93c39c3ac3aa6","08036ac6cc36c3ac3aa9","08036ac6cc39c3a33aa9","08036ac6cc39c3ac3aa6","08036ac63339c3a33aa9","08036ac63339c3ac3aa6","08036ac63cc933ac3aa9","08036ac63cc9c3accaa9","08036ac63cc9c3ac3aa6","08036ac63c3633ac3aa9","08036ac63c36ccac3aa9","080b6aac3c6935563939","08036ac63c36c3accaa9","08036ac63c3933a33aa9","08036ac63c3933ac3aa6","08036ac63c39ccac3aa6","08036ac63c39c3a3caa9","08036ac63c39c3accaa6","080b9aa33c69c5563939","080b9aac3c99c5563939","080b9aac3c69c5593939","080b9aac3c69c55639c9","080b9aac3c69c5563936","080b6aa33369c5563939","0c0f9c6c53953c69a93a","080b6aa33c6935563939","080b6aa33c69c556c939","080b6aa33c69c5563639","080b6aaccc69c5593939","080b6aaccc69c55639c9","080b6aaccc69c5563936","080b6aac3369c5593939","080b6aac3369c55639c9","080b6aac3369c5563936","080b6aac3c9935563939","080b6aac3c99c556c939","080b6aac3c99c5563639","0c0f636c53953c69a93a","080b6aac3c6635563939","080b6aac3c66c556c939","080b6aac3c66c5563639","080b6aac3c6935593939","080b6aac3c6935563936","080b6aac3c69c559c939","0c0f9c6353953c69a93a","0c0f9c6c53953369a93a","0c0f9c6c53953c99a93a","0c0f9c6c53953c66a93a","0c0f9c6c53953c69a63a","0c0f9c6c53953c69a9ca","0c0f6c6353953c69a93a","0c0f636c5395cc69a93a","0c0f636c53953c99a93a","0c0f636c53953c66a93a","0c0f636c53953c69a63a","0c0f636c53953c69a9ca","0c0f6c9c5395cc69a93a","0c0f6c9c53953369a93a","0c0f6c9c53953c66a93a","0c0f6c9c53953c69a63a","0c0f6c9c53953c69a9ca","0c0f6c635395cc69a93a","0c0f6c6353953369a93a","0c0f6c6c53953369a93a","0c0f6c6353953c99a93a","0c0f6c6353953c69a63a","0c0f6c6353953c69a9ca","0c0f6c6c5c953c66a93a","0c0f6c6c5365cc69a93a","0c0f6c6c5395cc66a93a","0c0f6c6c5395cc69a9ca","0c0f6c6c53953c66a63a"],"5":["0004ac6aa633ac3ac696a93c3aaa9","0004ac6aa695cc3c395696c53a939","0004ac6c6695393c6ac696c53a939","0004ac6c6695393c56c633953aaa9","0004c6ac6396956c5695396c3aaa9","0004c6ac6336956a96956c3c393a9","0004c6c6a3956c6c3c553a953aaa9","0004c6c6a3953c6ca695393c3aaa9","0004c6c6a3953c6a9695cc3c393a9","0004c6aaa53c6c3c395696953a939","0004c6ac656c393c3ac696c53a939","0004c6ac653c693c56c693953aaa9","000eac6ac693c53a9536a93c3aaa9","000eac6ac69569569565a695393a9","000ec6aac396a96a96a56c6c393a9","0018aac6c6939553ac556c39393aa","0018aac6c6c335556a95396c3aa93","0018aac6c6c395535a956c6c39393","0018ac6ac695693c53c635693a93a","0018ac6ac693c53c695695c93a93a","0018ac6ac633c53c695693c53aa93","0018ac6ac695c95693c556a9393aa","0018ac6ac695695633c53c693a93a","0018ac6ac693c556a9556c693a93a","0018c6aac396c56c539539cc3aa93","0018c6aac336c56a93956c6c39393","0018c6aac396596a96c56c5539393","0018c6c6c393956ccc5539393aaaa","0018c6c6c393956c6a95696c3aa93","0018c6c6c393956aaa956ccc39393","0018c6aac56c693c53c695693a93a","0018c6aac53a953c695695693a93a","0018c6aac53c693ca3c693c53aa93","0a046aac656c5595395636c53a939","0a046aac656a9593c696a96c3aaa9","0a046ac6a5c93c93ac56aa953aaa9","0a046ac6a5696c93c696a93c3aaa9","0a046ac6a5693c95cc5695553a939","0a046ac6a5693c956a9633ac3aaa9","0a046c6c65395596c55693353aaa9","0a046c6c65695596a95696c53a939","0a046c6aa5535c93c696a93c3aaa9","0a046c6aa5556c95695696c53a939","0a046c6c655539953ac636c53a939","0a046aac63ac39ac3ac696953a939","0a046aac635c39ac56c693953aaa9","0a046aac63c635c53c555695393a9","0a046ac6a3c53cc56c555695393a9","0a046aaaa3c6acc39695cc3c393a9","0a046aac63c695c53c553ca53a939","0a046ac6a3953cc53c553c553a939","0a046aac63ac69c696c53a953aaa9","0a0e6aaac56c6995696696c53a939","0a0e6ac6c5695595693633ac3aaa9","0a0e6c6ac5396996c56693353aaa9","0a0e6c6ac5696996a96696c53a939","0a0e6c6ac5539593c536a93c3aaa9","0a0e6aaac3ac69c635655695393a9","0a0e6aaac3c6c5c39535cc3c393a9","0a0e6ac6c3c395c3ac356c6c393a9","0a0e6aaac396a9c53c653c553a939","0a0e6ac6c3c335c56c35393c3aaa9","0a186aaac56ac5939396a96c3aa93","0a186ac6c5695595695635693a93a","0a186ac6c5695595695693953aa93","0a186c6ac5696996c3c693a93aaaa","0a186c6ac5539595695695693a93a","0a186c6ac553c595c95693c53aa93","0a186aaac3c6c5a95396596c3aa93","0a186ac6c3c395a96a96a9cc3aa93","0a186ac6c39395c56c555539393aa","0a186ac6c3c335c56a95556c39393","0a186aaac3ac69c633c556a9393aa","0a186aaac3c6c5c39555cc5539393","0a186ac6c3c395c3ac556ca539393","0a186aaac396a9c53ac53c693a93a","0a186ac6c3c5a5c539553c693a93a","0a186aaac3ac69c633c53c693a93a","0a186aaac3aac5c6a9556c693a93a","0a186ac6c3c395c56c5539a53aa93","0a186aaac35c69c693c53ac53aa93","14046aac63c635695695693c93aa9","14046ac6a3c53c696c556a9593aa9","14046ac6a3c53c695695c93c93aa9","14046aaaa56c6c393956c69593939","14046aac65cc39393ac6c6c593939","14046c6c6539693aaac6c6c593939","14046aac656c3939a6c6c39593aa9","14046c6c6539393ac6c6939593aa9","14046c6c6539553ac396c35c93aa9","14046ac6a5c93c53ac53c695a93a9","14046ac6a5696c53c693c53ca93a9","14046c6aa553ac539693c53ca93a9","14046aac63c695693c539695a93a9","14046ac6a3c53c693c53c635a93a9","14046ac6a3953c695693c53ca93a9","14046c6aa539cc56a95396c5aa939","14046aac656c39556ac396c5aa939","14046c6c65393956aac336c5aa939","140e6c6ac539693ac3a6c35c93aa9","140e6c6ac5a3c553c533c53ca93a9","140e6aaac3acc96a9563c695a93a9","14186aaac3c6c569a395696c93a93","14186ac6c3c395696c55c93993aaa","14186ac6c3c395696a9569cc93a93","14186aaac5cc693953c6c5699393a","14186aaac56a95396956c5699393a","14186c6ac539693a93c6c5699393a","14186aaac56c693953c693c593a93","14186c6ac539693ac3c6c39593a93","14186aaac396c5695393c56ca9393","14186ac6c3c335696c53c539a93aa","14186ac6c3c39569ca93c56ca9393","14186aaac3ac696a93c396a9a93aa","0004ac6aa693ac3a6696a93c3aaa9","0004ac6aa6956c3c3956c6c53a939","0004ac6c6695393c3ac696653a939","0004ac6c66c5393c56c693953aaa9","0004c6ac6396c56c5695393c3aaa9","0004c6ac6396956ac6956c3c393a9","0004c6c6a3953c6c3c559a953aaa9","0004c6c6a3953c6c5695399c3aaa9","0004c6c6a3c53c6a96956c3c393a9","0004c6aaa53c3c3c395696c53a939","0004c6ac653c393c9ac696c53a939","0004c6ac653c393c56c6c3953aaa9","000eac6ac693c53ac536a99c3aaa9","000eac6ac6c5695695655695393a9","000ec6aac396596a96a56c3c393a9","0018aac6c6c395535c556c39393aa","0018aac6c6c395556a95996c3aa93","0018aac6c6c39553aa956c3c39393","0018ac6ac6c5693c53c695693a93a","0018ac6ac693653c695695693a93a","0018ac6ac693c53c395693c53aa93","0018ac6ac695695693c5a6a9393aa","0018ac6ac695695693c53c393a93a","0018ac6ac6c3c556a9553c693a93a","0018c6aac396656c5395396c3aa93","0018c6aac396c56ac3956c6c39393","0018c6aac396a96a96c53c5539393","0018c6c6c393956c6c5539993aaaa","0018c6c6c3c3956c6a95396c3aa93","0018c6c6c393c56aaa956c6c39393","0018c6aac53c693ca3c695693a93a","0018c6aac53ac53c6956c5693a93a","0018c6aac53c693c53c693653aa93","0a046aac653c5595395696c53a939","0a046aac656ac593c696a93c3aaa9","0a046ac6a5693c935c56aa953aaa9","0a046ac6a5693c93c696593c3aaa9","0a046ac6a5693c956c5695a53a939","0a046ac6a5393c956a9693ac3aaa9","0a046c6c6539a596c55693953aaa9","0a046c6c65395596595696c53a939","0a046c6aa553ac93c696593c3aaa9","0a046c6aa5556c95395696653a939","0a046c6c65a539953ac696c53a939","0a046aac63ac99ac3ac696c53a939","0a046aac63ac39aca6c693953aaa9","0a046aac63c695c53c55a695393a9","0a046ac6a3c53cc53c5556c5393a9","0a046aaaa366acc396956c3c393a9","0a046aac63c6c5c53c553c553a939","0a046ac6a3c53cc59c553c553a939","0a046aac63ac39c696c59a953aaa9","0a0e6aaac56c6995396696653a939","0a0e6ac6c5395595693693ac3aaa9","0a0e6c6ac5393996c56693953aaa9","0a0e6c6ac5396996596696c53a939","0a0e6c6ac553c593c536593c3aaa9","0a0e6aaac3ac69c6956556c5393a9","0a0e6aaac366c5c395356c3c393a9","0a0e6ac6c3c3c5c3ac356c3c393a9","0a0e6aaac3c6a9c59c653c553a939","0a0e6ac6c3c395c56c35993c3aaa9","0a186aaac56ac593c396a93c3aa93","0a186ac6c5395595695695693a93a","0a186ac6c569a595695693c53aa93","0a186c6ac539699663c693a93aaaa","0a186c6ac553c5956956c5693a93a","0a186c6ac553c595695693653aa93","0a186aaac366c5a95396a96c3aa93","0a186ac6c3c3c5a96a96a96c3aa93","0a186ac6c3c395c53c555539393aa","0a186ac6c3c395c56a95a56c39393","0a186aaac3ac69c693c55659393aa","0a186aaac366c5c395556c5539393","0a186ac6c3c3c5c3ac556c5539393","0a186aaac3c6a9c59ac53c693a93a","0a186ac6c3c555c539559c693a93a","0a186aaac3ac69c693c53c393a93a","0a186aaac35ac5c6a9553c693a93a","0a186ac6c3c3c5c56c5539553aa93","0a186aaac3ac69c6c3c53ac53aa93","14046aac63c695695695393c93aa9","14046ac6a3c53c693c556ac593aa9","14046ac6a3653c695695693c93aa9","14046aaaa56c3c393956c6c593939","14046aac656c39399ac6c6c593939","14046c6c6539393aaac666c593939","14046aac656c393956c6c3c593aa9","14046c6c6599393ac6c6c39593aa9","14046c6c6539a53ac396c3ac93aa9","14046ac6a5693c535c53c695a93a9","14046ac6a5693c53c693653ca93a9","14046c6aa553ac53c693c59ca93a9","14046aac636695693c53c695a93a9","14046ac6a3c59c693c53c695a93a9","14046ac6a3c53c69a693c53ca93a9","14046c6aa5396c56a953c6c5aa939","14046aac656c39553ac39665aa939","14046c6c65993956aac396c5aa939","140e6c6ac539393ac3a6c3ac93aa9","140e6c6ac553c5536533c53ca93a9","140e6aaac3ac696a95636695a93a9","14186aaac3c6c5695395693c93a93","14186ac6c36395696c55693993aaa","14186ac6c3c3c5696a95696c93a93","14186aaac56c6939a3c6c5699393a","14186aaac56ac539695665699393a","14186c6ac539693ac3c6c5399393a","14186aaac53c693953c6c3c593a93","14186c6ac539393ac3c6c3c593a93","14186aaac3c6c569a393c56ca9393","14186ac6c3c395696c536539a93aa","14186ac6c3c395696a93c53ca9393","14186aaac35c696a93c3c6a9a93aa","0004ac6aa693ac3ac696a96c3aaa9","0004ac6aa6356c3c395696c53a939","0004ac6c6695693c3ac696c53a939","0004ac6c6695393ca6c693953aaa9","0004c6ac6396956c5695693c3aaa9","0004c6ac6396956a96956c6c393a9","0004c6c6a3353c6c3c553a953aaa9","0004c6c6a3956c6c5695393c3aaa9","0004c6c6a3953c6a36956c3c393a9","0004c6aaa53c6c3c395636c53a939","0004c6ac653c393c3ac696953a939","0004c6ac656c393c56c693953aaa9","000eac6ac693953ac536a93c3aaa9","000eac6ac695695635655695393a9","000ec6aac396a96a96a5cc3c393a9","0018aac6c6c39553ac556c69393aa","0018aac6c69395556a95396c3aa93","0018aac6c6c33553aa956c6c39393","0018ac6ac695693ca3c695693a93a","0018ac6ac693c53c695635693a93a","0018ac6ac693c53c695693953aa93","0018ac6ac635695693c556a9393aa","0018ac6ac695c95693c53c693a93a","0018ac6ac693c55659553c693a93a","0018c6aac396c56c5395696c3aa93","0018c6aac396c56a93956ccc39393","0018c6aac336a96a96c56c5539393","0018c6c6c393356c6c5539393aaaa"]};
 const day=Math.floor(Date.UTC(year,month-1,dayOfMonth)/86400000),table=tables[size],entry=table[circuitTemplateIndex(day,table.length)];
 return {size,start:parseInt(entry.slice(0,2),16),end:parseInt(entry.slice(2,4),16),masks:[...entry.slice(4)].map(x=>parseInt(x,16)),turns:Array(size*size).fill(0)};
}
function generateHardCircuitPuzzle(year, month, dayOfMonth) {
  const templates=["1","5m9t","1c","5mag","2p","5mb8","44","5mc4","5s","5md5","74","5mha","80","5mi0","8h","5mis","91","5mk3","ac","5n2y","b5","5n48","cg","5n9i","dc","5nb4","sh","5pg4","ut","5ph0","zk","5pik","10w","5q81","139","5q94","169","5slp","1n4","5smd","1r5","5ssh","1sh","5stv","1vk","5tm8","2dh","5vro","2f4","5vss","2ht","5vth","2jo","5w0g","2kx","5wkc","2nl","5yx0","2q9","5yxk","35w","5yy9","378","5yz0","38k","5z44","3b4","5zpf","3cx","5zqc","3yc","6239","41t","6250","4qo","62v6","4s4","658w","4w4","659s","5j8","6611","5kg","68fk","5n4","6bkd","5ro","6blc","6io","6br7","6kg","6ccg","7b4","6epy","7ww","6equ","8pc","6fi8","8xs","6hwl","9hx","6l1f","9kg","6l3k","9n4","6o7k","9oh","6o89","9ts","6o90","aas","6oei","adg","6ozv","b28","6rcz","b4g","6s74","buo","6uj9","bw4","6ups","c01","6xpc","cnl","70u9","coh","70us","cpt","70w0","cr4","70wk","csh","7130","cu8","71o2","cw0","740p","dg0","747g","dhs","7763","dkg","7775","dmo","7ac5","e9w","7aio","edd","7dhp","f0k","7dj4","f2o","7dpc","f5s","7gni","fwg","7goi","glc","7jt6","hq8","7q4i","iys","7q56","j44","7qbk","jwh","7tar","lcg","7wg4","m4w","7wh6","m9c","82tc","mcg","8fer","mgw","8ffl","n40","8fgu","oow","8fm8","1el1","8g7a","1em8","8iku","1en4","8ilu","1eo1","8lqq","1eph","8ow0","1eq8","8owm","1erk","8oxw","1ev4","8s1u","1fcw","8s2p","1fes","8s3p","1fjk","8v7l","1g74","8w00","1g8w","8yfk","1gas","94pt","1gxt","97us","1h0k","97w1","1h38","9b1u","1hqc","9hcm","1i00","9i4g","1ji8","9qtc","1kw0","9tzh","1l1d","9u0s","1loh","9u1a","1mh0","9u74","1n9g","9usc","1o1w","9x50","1p6o","9xc4","1r7k","a0ar","1rcw","a0bl","1rg4","a0j4","1s01","a3gx","1t10","a48w","1tvk","a7g2","1uhc","aj9o","20ox","amgw","20qp","avy8","229t","b5dt"];
  const layouts=[[10,10,12,6,10,9,3,10,10],[12,6,12,5,5,5,3,9,3]],day=Math.floor(Date.UTC(year,month-1,dayOfMonth)/86400000);
  const encoded=parseInt(templates[circuitTemplateIndex(day,templates.length)],36);
  return {masks:[...layouts[encoded>>18]],turns:Array.from({length:9},(_,i)=>(encoded>>(2*i))&3)};
}
function circuitTrace(masks, size=3, start=0, end=8) {
  let index=start, incoming=8, visited=0;
  const reached=[];
  while(true) {
    if(visited & (1<<index) || !(masks[index]&incoming)) return {reached,won:false};
    visited|=1<<index; reached.push(index);
    const outgoing=masks[index]^incoming;
    if(index===end && outgoing===2) return {reached,won:visited===(1<<(size*size))-1};
    const row=Math.floor(index/size), col=index%size;
    if((outgoing===1&&row===0)||(outgoing===2&&col===size-1)||(outgoing===4&&row===size-1)||(outgoing===8&&col===0)) return {reached,won:false};
    const delta={1:-size,2:1,4:size,8:-1}[outgoing];
    if(delta===undefined) return {reached,won:false};
    index+=delta; incoming=rotateCircuit(outgoing,2);
  }
}
function circuitSolved(masks, size=3, start=0, end=8) { return circuitTrace(masks,size,start,end).won; }
function generateDailyBalance(date) {
  const [year,month,day]=date.split('-').map(Number), dayNumber=Math.floor(Date.UTC(year,month-1,day)/86400000);
  const cycle=Math.floor(dayNumber/24), dayInCycle=((dayNumber%24)+24)%24;
  let index=((dayInCycle+7*cycle)%24+24)%24;
  const pool=[0,1,2,3], result=[];
  for(const divisor of [6,2,1,1]) {const choice=Math.floor(index/divisor);index%=divisor;result.push(pool.splice(choice,1)[0]);}
  return result;
}
function swapSums(values) {
  return [0,1,2].map(row=>values.slice(row*3,row*3+3).reduce((a,b)=>a+b,0))
    .concat([0,1,2].map(col=>values[col]+values[col+3]+values[col+6]));
}
function generateSwapPuzzle(random=Math.random) {
  const mix=items=>{const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};
  const goal=mix([1,2,3,4,5,6,7,8,9]), targets=swapSums(goal);
  let values;
  for(let attempt=0;attempt<20;attempt++) {
    values=mix(goal);
    if(!swapSums(values).every((sum,index)=>sum===targets[index]))return {goal,targets,values};
  }
  values=[...goal];[values[0],values[4]]=[values[4],values[0]];
  return {goal,targets,values};
}
function generateDailySwap(date) {
  let seed=(Math.floor(Date.parse(`${date}T00:00:00Z`)/86400000)^0x7a1234b5)>>>0 || 1;
  return generateSwapPuzzle(()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;});
}
function shiftLine(values, axis, index) {
  const next=[...values], cells=axis==='row' ? [index*3,index*3+1,index*3+2] : [index,index+3,index+6];
  cells.forEach((cell,i)=>{next[cells[(i+1)%3]]=values[cell];});
  return next;
}
function generateShiftPuzzle(random=Math.random) {
  let values=[1,2,3,4,5,6,7,8,9];const scramble=[];
  for(let i=0;i<12;i++) {
    const move=Math.floor(random()*6), axis=move<3?'row':'column', index=move%3;
    values=shiftLine(values,axis,index);scramble.push([axis,index]);
  }
  if(values.every((value,index)=>value===index+1)) {
    values=shiftLine(values,'row',0);scramble.push(['row',0]);
  }
  return {values,scramble};
}
function generateNumberQuiz(random=Math.random) {
  const n=(min,max)=>min+Math.floor(random()*(max-min+1));
  const arithmetic=()=>{const start=n(1,9),step=n(2,6);return {terms:Array.from({length:4},(_,i)=>start+step*i),answer:start+step*4,hint:'同じ数を足す',explanation:`前の数に${step}を足すよ。`}};
  const multiply=()=>{const start=n(1,3),factor=n(2,3);return {terms:Array.from({length:4},(_,i)=>start*factor**i),answer:start*factor**4,hint:'同じ数をかける',explanation:`前の数に${factor}をかけるよ。`}};
  const alternating=()=>{const start=n(1,5),first=n(1,3),second=n(4,6),terms=[start];for(let i=0;i<3;i++)terms.push(terms.at(-1)+(i%2?second:first));return {terms,answer:terms.at(-1)+second,hint:'2つの数を交互に足す',explanation:`${first}と${second}を交互に足すよ。`}};
  const squares=()=>{const start=n(1,4);return {terms:Array.from({length:4},(_,i)=>(start+i)**2),answer:(start+4)**2,hint:'連続する数の2乗',explanation:`${start}、${start+1}、${start+2}、${start+3}、${start+4}をそれぞれ2乗するよ。`}};
  const descending=()=>{const step=n(2,5),start=n(4,8)*step;return {terms:Array.from({length:4},(_,i)=>start-step*i),answer:start-step*4,hint:'同じ数を引く',explanation:`前の数から${step}を引くよ。`}};
  const questions=[arithmetic(),multiply(),alternating(),squares(),descending()];
  for(const question of questions){const choices=new Set([question.answer]);for(let offset=1;choices.size<4;offset++) {if(question.answer-offset>=0)choices.add(question.answer-offset);if(choices.size<4)choices.add(question.answer+offset)}question.choices=[...choices];for(let i=question.choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[question.choices[i],question.choices[j]]=[question.choices[j],question.choices[i]]}}
  for(let i=questions.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[questions[i],questions[j]]=[questions[j],questions[i]]}
  return questions;
}
function generateMirrorPattern(random=Math.random) {
  const indices=Array.from({length:9},(_,i)=>i);
  for(let i=indices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}
  const count=3+Math.floor(random()*4),filled=new Set(indices.slice(0,count));
  const pattern=Array.from({length:9},(_,i)=>filled.has(i));
  if([0,3,6].every(i=>pattern[i]===pattern[i+2])){
    const value=count===6;
    const index=[0,3,6].find(i=>pattern[i]===value);
    pattern[index]=!value;
  }
  return pattern;
}
let threeMode='solo';
const threeLines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function threeWinningLine(cells) {
  return threeLines.find(([a,b,c])=>cells[a] && cells[a]===cells[b] && cells[b]===cells[c]) ?? null;
}
function threeWinner(cells) {
  const line=threeWinningLine(cells);return line ? cells[line[0]] : null;
}
function chooseThreeMove(cells,random=Math.random) {
  const empty=cells.flatMap((v,i)=>v===null?[i]:[]);
  for(const mark of ['computer','player']) for(const index of empty) {
    const trial=[...cells];trial[index]=mark;
    if(threeWinner(trial)===mark)return index;
  }
  return empty.length?empty[Math.floor(random()*empty.length)]:null;
}
const games = {
  three() {
    category.textContent='対戦パズル';board.classList.add('three');
    const modeGroup=document.createElement('div');modeGroup.className='three-modes';modeGroup.setAttribute('role','group');modeGroup.setAttribute('aria-label','遊ぶ人数');
    for(const [value,label] of [['solo','ひとり'],['duo','ふたり']]){
      const option=document.createElement('button');option.type='button';option.textContent=label;option.dataset.mode=value;option.setAttribute('aria-pressed',String(value===threeMode));
      option.addEventListener('click',event=>{if(value===threeMode)return;threeMode=value;start();if(event.detail===0)document.querySelector(`.three-modes [data-mode="${value}"]`).focus();});
      modeGroup.append(option);
    }
    status.before(modeGroup);cleanup=()=>modeGroup.remove();
    const cells=Array(9).fill(null),buttons=[];let finished=false,turn='player';
    const markName=mark=>mark==='player'?'○':'×';
    function render() {
      const line=threeWinningLine(cells),winner=line ? cells[line[0]] : null;finished=!!winner||cells.every(Boolean);
      buttons.forEach((cell,index)=>{
        const mark=cells[index];cell.classList.toggle('three-winner',!!line?.includes(index));cell.textContent=mark ? markName(mark) : '';
        const name=mark==='player'?(threeMode==='duo'?'丸':'あなたの丸'):mark==='computer'?(threeMode==='duo'?'バツ':'コンピューターのバツ'):'空き';
        cell.setAttribute('aria-label',`${Math.floor(index/3)+1}行${index%3+1}列 ${name}`);
        cell.setAttribute('aria-disabled',String(finished||!!mark));
      });
      let result=winner==='player'?'あなたの勝ち！':winner==='computer'?'コンピューターの勝ち':'引き分け';
      if(threeMode==='duo' && winner)result=`${markName(winner)}の勝ち！`;
      status.textContent=finished?result:threeMode==='duo'?`${markName(turn)}の番`:'あなたの番　○を置こう';
      if(finished)offerCopy(`3つならべ ${threeMode==='duo'?result:(winner==='player'?'勝ち':winner==='computer'?'負け':'引き分け')}\nhttps://game.kihamda.net/play-three.html`);
    }
    for(let i=0;i<9;i++)buttons.push(button('',event=>{
      if(finished||cells[i])return;
      const placed=turn;cells[i]=placed;let reply=null;
      if(threeMode==='solo' && !threeWinner(cells)&&cells.some(value=>value===null)){reply=chooseThreeMove(cells);cells[reply]='computer';}
      if(threeMode==='duo')turn=turn==='player'?'computer':'player';
      const who=threeMode==='duo'?markName(placed):'あなた';
      announcement.textContent=`${who}は${Math.floor(i/3)+1}行${i%3+1}列に置いたよ。${reply===null?'':`コンピューターは${Math.floor(reply/3)+1}行${reply%3+1}列に置いたよ。`}`;
      render();if(finished && event?.detail===0)restart.focus();
    }));
    render();
  },
  number() {
    category.textContent='数あて';board.classList.add('number');
    const answer=1+Math.floor(Math.random()*100);let low=1,high=100,attempts=0,finished=false;
    const form=document.createElement('form');form.className='number-form';form.noValidate=true;
    const label=document.createElement('label');label.htmlFor='number-guess';label.textContent='予想する数';
    const input=document.createElement('input');input.id='number-guess';input.type='text';input.inputMode='numeric';input.autocomplete='off';input.setAttribute('aria-describedby','number-hint number-error');
    const submit=document.createElement('button');submit.type='submit';submit.textContent='答える';
    const hint=document.createElement('p');hint.id='number-hint';
    const error=document.createElement('p');error.id='number-error';error.setAttribute('role','status');
    const historyTitle=document.createElement('h2');historyTitle.textContent='これまでのヒント';historyTitle.hidden=true;
    const history=document.createElement('ol');history.className='number-history';
    form.append(label,input,submit,hint,error);board.append(form,historyTitle,history);
    function showStatus(message=''){status.textContent=finished?status.textContent:`${message}残り ${7-attempts}回`;hint.textContent=`答えの範囲：${low}〜${high}`;}
    form.addEventListener('submit',event=>{
      event.preventDefault();if(finished)return;
      const text=input.value.normalize('NFKC').trim(),guess=Number(text);
      if(!/^\d+$/.test(text)||!Number.isSafeInteger(guess)||guess<1||guess>100){error.textContent='1から100の整数を入力してね。';input.setAttribute('aria-invalid','true');return;}
      if(guess<low||guess>high){error.textContent=`${low}から${high}の数を入力してね。`;input.setAttribute('aria-invalid','true');return;}
      error.textContent='';input.removeAttribute('aria-invalid');attempts++;
      const item=document.createElement('li');
      if(guess===answer){item.textContent=`${guess}：正解！`;finished=true;status.textContent=`正解！ ${attempts}回で当てたよ`;offerCopy(`かくれた数 ${attempts}回で正解\nhttps://game.kihamda.net/play-number.html`);}
      else {
        const higher=guess<answer;item.textContent=`${guess}：もっと${higher?'大きい':'小さい'}`;
        if(higher)low=guess+1;else high=guess-1;
        if(attempts===7){finished=true;status.textContent=`答えは ${answer} だったよ`;offerCopy('かくれた数 7回で挑戦\nhttps://game.kihamda.net/play-number.html');}
      }
      historyTitle.hidden=false;history.append(item);input.value='';
      if(finished){input.disabled=true;submit.disabled=true;restart.focus();}
      showStatus(finished ? '' : `${item.textContent}。`);
    });
    showStatus();
  },
  mirror() {
    category.textContent='図形パズル';board.classList.add('mirror');
    const sample=generateMirrorPattern(),cells=Array(9).fill(false),buttons=[];
    let moves=0,won=false;
    for(const label of ['お手本','こたえ']){const heading=document.createElement('span');heading.className='mirror-heading';heading.textContent=label;board.append(heading);}
    for(let row=0;row<3;row++){
      for(let col=0;col<3;col++){
        const i=row*3+col,cell=document.createElement('span');cell.className=sample[i]?'mirror-sample on':'mirror-sample';cell.textContent=sample[i]?'●':'・';cell.setAttribute('role','img');cell.setAttribute('aria-label',`お手本 ${row+1}行${col+1}列 ${sample[i]?'ぬり':'空き'}`);board.append(cell);
      }
      for(let col=0;col<3;col++){
        const i=row*3+col,cell=button('',()=>{if(won)return;cells[i]=!cells[i];moves++;render();});buttons.push(cell);
      }
    }
    function render(){
      won=cells.every((value,i)=>value===sample[Math.floor(i/3)*3+2-i%3]);
      buttons.forEach((cell,i)=>{cell.className=cells[i]?'on':'';cell.textContent=cells[i]?'●':'・';cell.setAttribute('aria-pressed',String(cells[i]));cell.setAttribute('aria-disabled',String(won));cell.setAttribute('aria-label',`こたえ ${Math.floor(i/3)+1}行${i%3+1}列 ${cells[i]?'ぬり':'空き'}`);});
      status.textContent=won?`クリア！ ${moves}手でできたよ`:`${moves}手　左右反転して作ろう`;
      if(won)offerCopy(`かがみのもよう ${moves}手でクリア\nhttps://game.kihamda.net/play-mirror.html`);
    }
    render();
  },
  series() {
    category.textContent='数のクイズ';board.classList.add('series');
    const questions=generateNumberQuiz();let index=0,score=0;
    function showQuestion() {
      board.replaceChildren();announcement.textContent='';let answered=false;const q=questions[index];
      status.textContent=`${index+1}問目 / 5問`;
      const hint=document.createElement('p');hint.className='series-hint';hint.textContent=q.hint;board.append(hint);
      const sequence=document.createElement('p');sequence.className='series-sequence';sequence.textContent=`${q.terms.join('　')}　？`;board.append(sequence);
      const choices=q.choices.map(value=>{const choice=button(String(value),event=>{
        if(answered)return;answered=true;const correct=value===q.answer;if(correct)score++;
        choices.forEach(item=>{item.setAttribute('aria-disabled','true');const choiceValue=Number(item.dataset.value);item.textContent=`${choiceValue}${choiceValue===q.answer?' 正解':choiceValue===value?' 選んだ':''}`;});
        const feedback=document.createElement('p');feedback.className='series-feedback';feedback.setAttribute('role','status');feedback.textContent=`${correct?'正解！':'おしい！'} 答えは${q.answer}。${q.explanation}`;board.append(feedback);
        const next=button(index===4?'結果を見る':'次の問題',nextEvent=>{
          index++;if(index===questions.length){board.replaceChildren();status.textContent=`${score} / 5問正解`;offerCopy(`つぎの数は？ ${score} / 5問正解\nhttps://game.kihamda.net/play-series.html`);const result=document.createElement('p');result.className='series-feedback';result.textContent='もう一度、別の問題に挑戦しよう。';board.append(result);if(nextEvent?.detail===0)restart.focus();}
          else {showQuestion();if(nextEvent?.detail===0)board.querySelector('button').focus();}
        });next.className='series-next';if(event?.detail===0)next.focus();
      });choice.className='series-choice';choice.dataset.value=String(value);return choice;});
    }
    showQuestion();
  },
  shift() {
    category.textContent='パズル';board.classList.add('shift');
    let values=generateShiftPuzzle().values,won=false;
    const cells=[], controls=[], history=[];
    function announceLine(axis,index) {
      const line=axis==='row' ? values.slice(index*3,index*3+3) : [values[index],values[index+3],values[index+6]];
      announcement.textContent=`${index+1}${axis==='row'?'行':'列'} ${line.join('、')}`;
    }
    function move(axis,index) {
      if(won)return;
      history.push({values:[...values],axis,index});values=shiftLine(values,axis,index);render();
      if(!won)announceLine(axis,index);
    }
    for(let row=0;row<3;row++) {
      for(let col=0;col<3;col++) {
        const cell=document.createElement('span');cell.className='shift-cell';cell.setAttribute('role','img');
        cell.style.gridColumn=String(col+1);cell.style.gridRow=String(row+1);board.append(cell);cells.push(cell);
      }
      const control=button('→',()=>move('row',row));control.className='shift-control';
      control.style.gridColumn='4';control.style.gridRow=String(row+1);
      control.setAttribute('aria-label',`${row+1}行を右へ動かす`);controls.push(control);
    }
    for(let col=0;col<3;col++) {
      const control=button('↓',()=>move('column',col));control.className='shift-control';
      control.style.gridColumn=String(col+1);control.style.gridRow='4';
      control.setAttribute('aria-label',`${col+1}列を下へ動かす`);controls.push(control);
    }
    const undo=button('戻す',()=>{
      if(!history.length)return;
      const previous=history.pop();values=previous.values;render();announceLine(previous.axis,previous.index);
    });undo.className='shift-undo';undo.style.gridColumn='4';undo.style.gridRow='4';undo.setAttribute('aria-label','一手戻す');
    function render() {
      won=values.every((value,index)=>value===index+1);
      cells.forEach((cell,index)=>{cell.textContent=String(values[index]);cell.setAttribute('aria-label',`${Math.floor(index/3)+1}行${index%3+1}列 ${values[index]}`);});
      controls.forEach(control=>control.setAttribute('aria-disabled',String(won)));
      undo.setAttribute('aria-disabled',String(!history.length));
      status.textContent=won?`クリア！ ${history.length}回で並べたよ`:`${history.length}回　1から9まで並べよう`;
    }
    render();
  },
  swap(reset) {
    const daily=params.get('mode')==='daily', date=daily?todayInTokyo():null;
    category.textContent=daily?`今日のパズル ${date}`:'パズル';board.classList.add('swap');
    const puzzle=daily?generateDailySwap(date):generateSwapPuzzle(), targets=puzzle.targets, values=puzzle.values;
    const storage=daily?dailyStorage('swap',date):null;
    let selected=null,moves=0,won=false;
    if(storage){
      if(reset)storage.clear();
      const saved=storage.load();
      if(saved && Array.isArray(saved.values) && saved.values.length===9 && saved.values.every(n=>Number.isInteger(n)&&n>=1&&n<=9) && new Set(saved.values).size===9 && Number.isSafeInteger(saved.moves) && saved.moves>=0){values.splice(0,9,...saved.values);moves=saved.moves;}
    }
    const cells=values.map((_,i)=>{
      const cell=button('',()=>{
        if(won)return;
        if(selected===null){selected=i;}
        else if(selected===i){selected=null;}
        else {
          [values[selected],values[i]]=[values[i],values[selected]];selected=null;moves++;
          if(storage && !storage.save({values:[...values],moves})){recoverDailyConflict();return;}
        }
        render();
      });
      cell.style.gridColumn=String(i%3+1);cell.style.gridRow=String(Math.floor(i/3)+1);
      return cell;
    });
    const clues=targets.map((_,i)=>{
      const clue=document.createElement('span');clue.className='swap-clue';clue.setAttribute('role','img');
      clue.style.gridColumn=String(i<3?4:i-2);clue.style.gridRow=String(i<3?i+1:4);
      board.append(clue);return clue;
    });
    function render() {
      const sums=swapSums(values);won=sums.every((sum,i)=>sum===targets[i]);
      cells.forEach((cell,i)=>{
        cell.textContent=String(values[i]);cell.setAttribute('aria-pressed',String(selected===i));cell.setAttribute('aria-disabled',String(won));
        cell.setAttribute('aria-label',`${Math.floor(i/3)+1}行${i%3+1}列 ${values[i]}${selected===i?' 選択中':''}`);
      });
      clues.forEach((clue,i)=>{
        clue.textContent=`${sums[i]} / ${targets[i]}`;
        clue.setAttribute('aria-label',`${i<3?`${i+1}行`:`${i-2}列`} 合計 ${sums[i]} 目標 ${targets[i]}`);
        clue.classList.toggle('matched',sums[i]===targets[i]);
      });
      status.textContent=won?`クリア！ ${moves}回でそろえたよ`:selected===null?`${moves}回　マスを2つ選んでね`:`${moves}回　入れ替えるマスを選んでね`;
      if(won)offerCopy(`たし算スワップ${daily?` ${date}`:''} ${moves}回でクリア\nhttps://game.kihamda.net/play-swap.html${daily?'?mode=daily':''}`);
    }
    render();
  },
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
    const daily=params.get('mode')==='daily',size=lightsDifficulty==='kiwami'?5:4;
    let cells=Array(size*size).fill(false),moves=0,progress=null,dailyDate=null;
    const toggle=i=>{const x=i%size,y=Math.floor(i/size);for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy;if(a>=0&&a<size&&b>=0&&b<size)cells[b*size+a]=!cells[b*size+a]}};
    const group=document.createElement('div');group.className='lights-modes';group.setAttribute('role','group');group.setAttribute('aria-label','難易度');
    for(const [value,label] of [['easy','かんたん'],['normal','ふつう'],['hard','難関'],['oni','鬼'],['kiwami','極']]){const option=document.createElement('button');option.type='button';option.dataset.difficulty=value;option.textContent=label;option.setAttribute('aria-pressed',String(value===lightsDifficulty));option.addEventListener('click',event=>{if(value===lightsDifficulty)return;lightsDifficulty=value;start();if(event.detail===0)document.querySelector(`.lights-modes [data-difficulty="${value}"]`)?.focus()});group.append(option)}
    status.before(group);
    let legacyButton=null,notice=null;
    if(daily){
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),part=type=>parts.find(item=>item.type===type).value;
      const date=`${part('year')}-${part('month')}-${part('day')}`;dailyDate=date;category.textContent=`今日のパズル ${date}`;
      let oldRecord=false;try{for(const key of ['kihamda-daily-lights','kihamda-daily-lights-previous']){const raw=localStorage.getItem(key);if(raw===null)continue;try{if(JSON.parse(raw)?.date===date)oldRecord=true}catch(_){oldRecord=true}}}catch(_){oldRecord=true}
      if(oldRecord||lightsDifficulty==='legacy'){legacyButton=document.createElement('button');legacyButton.type='button';legacyButton.className='circuit-legacy';legacyButton.textContent=lightsDifficulty==='legacy'?'ふつうに戻る':'以前の問題を開く';legacyButton.addEventListener('click',event=>{lightsDifficulty=lightsDifficulty==='legacy'?'normal':'legacy';start();if(event.detail===0)(lightsDifficulty==='legacy'?document.querySelector('.circuit-legacy'):document.querySelector('.lights-modes [data-difficulty="normal"]'))?.focus()});board.after(legacyButton)}
      if(lightsVersion===null&&lightsRequested==='normal'&&lightsDifficulty==='normal'){notice=document.createElement('details');notice.className='circuit-notice';const summary=document.createElement('summary');summary.textContent='以前のリンクについて';const text=document.createElement('p');text.textContent='以前の共有リンクでは、今の「ふつう」が開くよ。以前の問題も今日の日付で遊べるよ。';notice.append(summary,text);if(!legacyButton){const open=document.createElement('button');open.type='button';open.className='circuit-legacy';open.textContent='以前の問題を開く';open.addEventListener('click',event=>{lightsDifficulty='legacy';start();if(event.detail===0)document.querySelector('.circuit-legacy')?.focus()});notice.append(open)}board.after(notice)}
      progress=dailyProgress(lightsDifficulty==='legacy'?'lights':`lights-${lightsDifficulty}-v2`,date,size*size);
      if(lightsDifficulty==='legacy') {let seed=Number(date.replace(/\D/g,''))>>>0;const indices=[...Array(16).keys()];for(let i=indices.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[indices[i],indices[j]]=[indices[j],indices[i]]}indices.slice(0,8).forEach(toggle);if(!cells.some(Boolean))toggle(0)}
      else {const day=Math.floor(Date.UTC(Number(part('year')),Number(part('month'))-1,Number(part('day')))/86400000),options=lightsBoards[lightsDifficulty],n=options.length,index=((day+7*Math.floor(day/n))%n+n)%n,bits=options[index];cells=cells.map((_,i)=>Boolean(bits&(1<<i)))}
    }else{category.textContent='パズル';const options=lightsBoards[lightsDifficulty==='legacy'?'normal':lightsDifficulty],bits=options[Math.floor(Math.random()*options.length)];cells=cells.map((_,i)=>Boolean(bits&(1<<i)))}
    cleanup=()=>{group.remove();legacyButton?.remove();notice?.remove()};
    if(progress){if(reset)progress.clear();const saved=progress.load();if(saved){cells=saved.cells;moves=saved.moves}}
    board.dataset.lightsSize=size;board.style.setProperty('--lights-columns',size);
    const buttons=cells.map((_,i)=>button('',()=>{if(!cells.some(Boolean))return;toggle(i);moves++;if(progress&&!progress.save(cells,moves)){recoverDailyConflict();return}render()}));
    function render(){const won=!cells.some(Boolean);cells.forEach((on,i)=>{buttons[i].className=on?'on':'';buttons[i].textContent=on?'✦':'·';buttons[i].setAttribute('aria-disabled',String(won));buttons[i].setAttribute('aria-label',`${Math.floor(i/size)+1}行${i%size+1}列 ${on?'点灯':'消灯'}`)});status.textContent=cells.some(Boolean)?`${moves}手`:`クリア！ ${moves}手で消せたよ`;if(progress&&!cells.some(Boolean))offerCopy(`ひかりのスイッチ ${{easy:'かんたん',normal:'ふつう',hard:'難関',oni:'鬼',kiwami:'極',legacy:'以前の問題'}[lightsDifficulty]} ${dailyDate} ${moves}手\nhttps://game.kihamda.net/play-lights.html?mode=daily&difficulty=${lightsDifficulty}&version=${lightsDifficulty==='legacy'?'1':'2'}`)}render();
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
    const modeGroup=document.createElement('div');modeGroup.className='circuit-modes';modeGroup.setAttribute('role','group');modeGroup.setAttribute('aria-label','難易度');
    for(const [value,label] of [['easy','かんたん'],['normal','ふつう'],['hard','難関'],['oni','鬼'],['kiwami','極']]) {
      const option=document.createElement('button');option.type='button';option.dataset.difficulty=value;option.textContent=label;option.setAttribute('aria-pressed',String(value===circuitDifficulty));
      option.addEventListener('click',event=>{if(value===circuitDifficulty)return;circuitDifficulty=value;start();if(event.detail===0)document.querySelector(`.circuit-modes [data-difficulty="${value}"]`).focus();});
      modeGroup.append(option);
    }
    status.before(modeGroup);
    let oldRecord=false,validOldRecord=false;
    try {
      for(const key of ['kihamda-daily-circuit','kihamda-daily-circuit-previous']) {
        const raw=localStorage.getItem(key);if(raw===null)continue;
        try { const saved=JSON.parse(raw);if(saved?.date===date){oldRecord=true;validOldRecord ||= Array.isArray(saved.turns)&&saved.turns.length===9&&saved.turns.every(n=>Number.isInteger(n)&&n>=0&&n<4)&&Number.isSafeInteger(saved.moves)&&saved.moves>=0;} }
        catch (_) { oldRecord=true; }
      }
    } catch (_) { oldRecord=true; }
    let legacyButton=null;
    if(oldRecord||circuitDifficulty==='legacy') {
      legacyButton=document.createElement('button');legacyButton.type='button';legacyButton.className='circuit-legacy';
      legacyButton.textContent=circuitDifficulty==='legacy'?'ふつうに戻る':validOldRecord?'以前の記録を開く':'以前の問題を開く';
      legacyButton.addEventListener('click',event=>{circuitDifficulty=circuitDifficulty==='legacy'?'normal':'legacy';start();if(event.detail===0){const focus=circuitDifficulty==='legacy'?document.querySelector('.circuit-legacy'):document.querySelector('.circuit-modes [data-difficulty="normal"]');focus?.focus();}});
      status.before(legacyButton);
    }
    let legacyNotice=null;
    if(circuitVersion===null && circuitRequested==='normal' && circuitDifficulty==='normal') {
      legacyNotice=document.createElement('details');legacyNotice.className='circuit-notice';
      const summary=document.createElement('summary');summary.textContent='以前のリンクについて';
      const text=document.createElement('p');text.textContent='以前の共有リンクでは、今の「ふつう」が開くよ。以前の問題も今日の日付で遊べるよ。';
      legacyNotice.append(summary,text);
      if(!legacyButton) {
        const oldLink=document.createElement('button');oldLink.type='button';oldLink.className='circuit-legacy';oldLink.textContent='以前の問題を開く';
        oldLink.addEventListener('click',event=>{circuitDifficulty='legacy';start();if(event.detail===0)document.querySelector('.circuit-legacy')?.focus();});
        legacyNotice.append(oldLink);
      }
      board.after(legacyNotice);
    }
    cleanup=()=>{modeGroup.remove();legacyButton?.remove();legacyNotice?.remove()};
    const generator=circuitDifficulty==='easy'?generateEasyCircuitPuzzle:circuitDifficulty==='hard'?generateHardCircuitPuzzle:circuitDifficulty==='legacy'?generateCircuitPuzzle:generateNormalCircuitPuzzle;
    if(['hard','oni','kiwami'].includes(circuitDifficulty))instructions.textContent='押したマスと上下左右の道が回るよ。始から終まで、すべてのマスをつなげてね。';
    if(['easy','legacy'].includes(circuitDifficulty))instructions.textContent='マスを押して道を回そう。左の始から右の終まで、すべてのマスをつなげてね。';
    const size=circuitDifficulty==='oni'?4:circuitDifficulty==='kiwami'?5:3;
    const puzzle=size===3?generator(part('year'),part('month'),part('day')):generateHighCircuitPuzzle(part('year'),part('month'),part('day'),size);
    const {masks,turns:initial,start:begin=0,end=8}=puzzle;
    board.style.setProperty('--circuit-columns',size);board.dataset.circuitSize=size;board.dataset.circuitDifficulty=circuitDifficulty;
    const storage=dailyStorage(circuitDifficulty==='easy'?'circuit-easy-v2':circuitDifficulty==='hard'?'circuit-linked-v2':circuitDifficulty==='normal'?'circuit-normal-v3':circuitDifficulty==='oni'?'circuit-oni-v2':circuitDifficulty==='kiwami'?'circuit-kiwami-v2':'circuit',date); let turns=[...initial], moves=0;
    try {
      if(reset) storage.clear();
      const saved=storage.load();
      if(saved && Array.isArray(saved.turns) && saved.turns.length===size*size && saved.turns.every(n=>Number.isInteger(n)&&n>=0&&n<4) && Number.isSafeInteger(saved.moves) && saved.moves>=0) {
        turns=[...saved.turns]; moves=saved.moves;
      }
    } catch (_) {}
    board.classList.add('circuit');
    const directions=[[1,'上'],[2,'右'],[4,'下'],[8,'左']];
    const affected=i=>['hard','oni','kiwami'].includes(circuitDifficulty)?[i,...[-size,size,...(i%size?[-1]:[]),...(i%size<size-1?[1]:[])].map(delta=>i+delta).filter(j=>j>=0&&j<size*size)]:circuitDifficulty==='normal'&&i%3<2?[i,i+1]:[i];
    const buttons=turns.map((_,i)=>button('',()=>{
      if(circuitSolved(masks.map((mask,j)=>rotateCircuit(mask,turns[j])),size,begin,end)) return;
      const group=affected(i);
      for(const j of group)turns[j]=(turns[j]+1)%4; moves++;
      if(!storage.save({turns,moves})){recoverDailyConflict();return;}
      render();
    }));
    if(['hard','normal','oni','kiwami'].includes(circuitDifficulty)) {
      const highlight=i=>{const selected=i===null?[]:affected(i);buttons.forEach((b,j)=>b.classList.toggle('circuit-affected',selected.includes(j)));};
      let lastTouch=null;
      buttons.forEach((b,i)=>{
        b.addEventListener('focus',()=>highlight(i));b.addEventListener('blur',()=>highlight(null));
        b.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'){lastTouch=i;highlight(i);}});
        b.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')lastTouch=null;const active=document.activeElement;if(!board.contains(active)||!active.matches(':focus-visible'))highlight(i);});
        b.addEventListener('pointerleave',()=>{const active=document.activeElement;highlight(board.contains(active)&&active.matches(':focus-visible')?buttons.indexOf(active):lastTouch);});
      });
    }
    function render(){
      const current=masks.map((mask,i)=>rotateCircuit(mask,turns[i])), {reached,won}=circuitTrace(current,size,begin,end);
      buttons.forEach((b,i)=>{
        const mask=current[i], ends=directions.filter(([bit])=>mask&bit).map(([,name])=>name).join('と');
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('viewBox','0 0 100 100'); svg.setAttribute('aria-hidden','true');
        for(const [bit,x,y] of [[1,50,0],[2,100,50],[4,50,100],[8,0,50]]) if(mask&bit){
          const line=document.createElementNS('http://www.w3.org/2000/svg','line');
          for(const [name,value] of Object.entries({x1:50,y1:50,x2:x,y2:y})) line.setAttribute(name,String(value));
          svg.append(line);
        }
        b.replaceChildren(svg); b.dataset.endpoint=i===begin?'始':i===end?'終':'';
        b.classList.toggle('circuit-connected',reached.includes(i));
        b.setAttribute('aria-disabled',String(won));
        const linked=['normal','hard','oni','kiwami'].includes(circuitDifficulty);
        const neighbors=affected(i).filter(j=>j!==i).map(j=>`${Math.floor(j/size)+1}行${j%size+1}列`);
        const operation=linked?(neighbors.length?` 押すとこのマスと${neighbors.join('、')}が回る`:' 押すとこのマスが回る'):'';
        b.setAttribute('aria-label',`${Math.floor(i/size)+1}行${i%size+1}列 ${i===begin?'始点 ':i===end?'終点 ':''}${ends}につながる道${reached.includes(i)?' 始点から接続':''}${operation}`);
      });
      status.textContent=won?`クリア！ ${moves}手でつながったよ`:`${moves}手　つながり ${reached.length} / ${size*size}`;
      if(won) offerCopy(`くるくる回路 ${circuitDifficulty==='easy'?'かんたん':circuitDifficulty==='hard'?'難関':circuitDifficulty==='legacy'?'以前の問題':circuitDifficulty==='oni'?'鬼':circuitDifficulty==='kiwami'?'極':'ふつう'} ${date} ${moves}手\nhttps://game.kihamda.net/play-circuit.html?difficulty=${circuitDifficulty}&version=${circuitDifficulty==='normal'?'3':circuitDifficulty==='legacy'?'1':'2'}`);
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
const gridColumns={three:3,mirror:3,swap:3,lights:4,memory:4,order:4,garden:4,path:4,sum:3,slide:3,circuit:3};
board.addEventListener('keydown',event=>{
  const columns=id==='lights'?Number(board.dataset.lightsSize||4):id==='circuit'?Number(board.dataset.circuitSize||3):Object.hasOwn(gridColumns,id) ? gridColumns[id] : 0;
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
  document.body.classList.remove('dodge-mode','grid-mode','path-mode','lights-mode');announcement.textContent='';record.hidden=true;record.textContent='';copyResult.hidden=true;copyResult.onclick=null;copyFeedback.hidden=true;copyFeedback.textContent='';status.setAttribute('aria-live','polite');board.replaceChildren();board.classList.remove('garden','slide','sum','path','sort','circuit','timing','recall','code','balance','swap','shift','series','mirror','number','three');board.style.display='';controls.hidden=true;
  if(!Object.hasOwn(games,id)){title.textContent='ゲームが見つかりません';instructions.textContent='ゲーム一覧から選んでね。';status.textContent='';return;}
  if(id==='lights'&&invalidLightsLink){title.textContent='この問題は開けないよ';instructions.textContent='対応していない問題の版だよ。ゲーム一覧から開いてね。';category.textContent='';status.textContent='';restart.hidden=true;return;}
  if(id==='circuit'&&invalidCircuitLink){title.textContent='この問題は開けないよ';instructions.textContent='対応していない問題の版だよ。ゲーム一覧から開いてね。';category.textContent='';status.textContent='';restart.hidden=true;return;}
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
