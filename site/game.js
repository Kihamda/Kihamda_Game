const params = new URLSearchParams(location.search);
let circuitDifficulty=['easy','hard','oni','kiwami','legacy'].includes(params.get('difficulty'))?params.get('difficulty'):'normal';
const circuitVersions={easy:'2',normal:'3',hard:'2',oni:'2',kiwami:'2',legacy:'1'};
const circuitRequested=params.get('difficulty')||'normal',circuitVersion=params.get('version');
const invalidCircuitLink=circuitVersion!==null && (!Object.hasOwn(circuitVersions,circuitRequested)||circuitVersions[circuitRequested]!==circuitVersion);
let lightsDifficulty=['easy','hard','oni','kiwami','legacy'].includes(params.get('difficulty'))?params.get('difficulty'):'normal';
const lightsRequested=params.get('difficulty')||'normal',lightsVersion=params.get('version'),lightsVersions={easy:'2',normal:'2',hard:'2',oni:'2',kiwami:'2',legacy:'1'};
let sortDifficulty=['easy','hard','oni','kiwami','legacy'].includes(params.get('difficulty'))?params.get('difficulty'):'normal';
const sortRequested=params.get('difficulty')||'normal',sortVersion=params.get('version'),sortVersions={easy:'2',normal:'2',hard:'2',oni:'2',kiwami:'2',legacy:'1'};
const invalidSortLink=sortVersion!==null&&(!Object.hasOwn(sortVersions,sortRequested)||sortVersions[sortRequested]!==sortVersion);
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
const sortTrialBoards={"easy":[["00|111|222|0",1],["000|11|222|1",1],["000|111|22|2",1],["00|111|0|222",1],["000|11|1|222",1],["000|111|2|22",1],["00|222|111|0",1],["000|22|111|2",1],["000|222|11|1",1],["00|222|0|111",1],["000|22|2|111",1],["000|222|1|11",1],["00|0|111|222",1],["000|1|11|222",1],["000|2|111|22",1],["00|0|222|111",1],["000|2|22|111",1],["000|1|222|11",1],["11|000|222|1",1],["111|00|222|0",1],["111|000|22|2",1],["11|000|1|222",1],["111|00|0|222",1],["111|000|2|22",1],["11|222|000|1",1],["111|22|000|2",1],["111|222|00|0",1],["11|222|1|000",1],["111|22|2|000",1],["111|222|0|00",1],["11|1|000|222",1],["111|0|00|222",1],["111|2|000|22",1],["11|1|222|000",1],["111|2|22|000",1],["111|0|222|00",1],["22|000|111|2",1],["222|00|111|0",1],["222|000|11|1",1],["22|000|2|111",1],["222|00|0|111",1],["222|000|1|11",1],["22|111|000|2",1],["222|11|000|1",1],["222|111|00|0",1],["22|111|2|000",1],["222|11|1|000",1],["222|111|0|00",1],["22|2|000|111",1],["222|0|00|111",1],["222|1|000|11",1],["22|2|111|000",1],["222|1|11|000",1],["222|0|111|00",1],["0|00|111|222",1],["1|000|11|222",1],["2|000|111|22",1],["0|00|222|111",1],["2|000|22|111",1],["1|000|222|11",1],["1|11|000|222",1],["0|111|00|222",1],["2|111|000|22",1],["1|11|222|000",1],["2|111|22|000",1],["0|111|222|00",1],["2|22|000|111",1],["0|222|00|111",1],["1|222|000|11",1],["2|22|111|000",1],["1|222|11|000",1],["0|222|111|00",1]],"normal":[["001|2|22|011",5],["2|110|22|010",5],["012|1|22|010",5],["021|1|22|010",5],["022|11|2|010",5],["0|102|22|011",5],["0|101|222|01",5],["0|120|22|011",5],["00|122|2|011",5],["00|121|22|01",5],["002|11|1|022",5],["1|11|220|020",5],["011|1|22|020",5],["012|11|2|020",5],["021|11|2|020",5],["0|11|201|022",5],["0|111|202|02",5],["0|11|210|022",5],["00|1|211|022",5],["00|11|212|02",5],["2|110|22|100",5],["012|1|22|100",5],["010|1|222|10",5],["021|1|22|100",5],["022|11|2|100",5],["020|11|22|10",5],["001|2|22|101",5],["0|102|22|101",5],["0|120|22|101",5],["00|122|2|101",5],["00|112|0|122",5],["00|0|221|121",5],["0|100|22|121",5],["00|102|2|121",5],["00|120|2|121",5],["0|11|200|122",5],["00|1|201|122",5],["00|11|202|12",5],["00|1|210|122",5],["000|1|212|12",5],["1|11|220|200",5],["011|1|22|200",5],["012|11|2|200",5],["010|11|22|20",5],["021|11|2|200",5],["020|111|2|20",5],["002|11|1|202",5],["0|11|201|202",5],["0|11|210|202",5],["00|1|211|202",5],["00|0|221|211",5],["0|100|22|211",5],["00|102|2|211",5],["00|101|22|21",5],["00|120|2|211",5],["000|121|2|21",5],["00|112|0|212",5],["0|11|200|212",5],["00|1|201|212",5],["00|1|210|212",5],["001|2|011|22",5],["2|110|010|22",5],["012|1|010|22",5],["021|1|010|22",5],["022|11|010|2",5],["0|101|01|222",5],["0|102|011|22",5],["0|120|011|22",5],["00|121|01|22",5],["00|122|011|2",5],["002|11|022|1",5],["1|11|020|220",5],["011|1|020|22",5],["012|11|020|2",5],["021|11|020|2",5],["0|11|022|201",5],["0|111|02|202",5],["0|11|022|210",5],["00|1|022|211",5],["00|11|02|212",5],["2|110|100|22",5],["010|1|10|222",5],["012|1|100|22",5],["021|1|100|22",5],["020|11|10|22",5],["022|11|100|2",5],["001|2|101|22",5],["0|102|101|22",5],["0|120|101|22",5],["00|122|101|2",5],["00|112|122|0",5],["0|100|121|22",5],["00|102|121|2",5],["00|0|121|221",5],["00|120|121|2",5],["0|11|122|200",5],["00|1|122|201",5],["00|11|12|202",5],["00|1|122|210",5],["000|1|12|212",5],["1|11|200|220",5],["011|1|200|22",5],["010|11|20|22",5],["012|11|200|2",5],["021|11|200|2",5],["020|111|20|2",5],["002|11|202|1",5],["0|11|202|201",5],["0|11|202|210",5],["00|1|202|211",5],["0|100|211|22",5],["00|101|21|22",5],["00|102|211|2",5],["00|0|211|221",5],["00|120|211|2",5],["000|121|21|2",5],["00|112|212|0",5],["0|11|212|200",5],["00|1|212|201",5],["00|1|212|210",5],["002|1|11|022",5],["1|220|11|020",5],["021|2|11|020",5],["012|2|11|020",5],["011|22|1|020",5],["0|201|11|022",5],["0|202|111|02",5],["0|210|11|022",5],["00|211|1|022",5],["00|212|11|02",5],["001|22|2|011",5],["2|22|110|010",5],["022|2|11|010",5],["021|22|1|010",5],["012|22|1|010",5],["0|22|102|011",5],["0|222|101|01",5],["0|22|120|011",5],["00|2|122|011",5],["00|22|121|01",5],["1|220|11|200",5],["021|2|11|200",5],["020|2|111|20",5],["012|2|11|200",5],["011|22|1|200",5],["010|22|11|20",5],["002|1|11|202",5],["0|201|11|202",5],["0|210|11|202",5],["00|211|1|202",5],["00|221|0|211",5],["00|0|112|212",5],["0|200|11|212",5],["00|201|1|212",5],["00|210|1|212",5],["0|22|100|211",5],["00|2|102|211",5],["00|22|101|21",5],["00|2|120|211",5],["000|2|121|21",5],["2|22|110|100",5],["022|2|11|100",5],["021|22|1|100",5],["020|22|11|10",5],["012|22|1|100",5],["010|222|1|10",5],["001|22|2|101",5],["0|22|102|101",5],["0|22|120|101",5],["00|2|122|101",5],["00|0|112|122",5],["0|200|11|122",5],["00|201|1|122",5],["00|202|11|12",5],["00|210|1|122",5],["000|212|1|12",5],["00|221|0|121",5],["0|22|100|121",5],["00|2|102|121",5],["00|2|120|121",5],["002|1|022|11",5],["1|220|020|11",5],["021|2|020|11",5],["012|2|020|11",5],["011|22|020|1",5],["0|202|02|111",5],["0|201|022|11",5],["0|210|022|11",5],["00|212|02|11",5],["00|211|022|1",5],["001|22|011|2",5],["2|22|010|110",5],["022|2|010|11",5],["021|22|010|1",5],["012|22|010|1",5],["0|22|011|102",5],["0|222|01|101",5],["0|22|011|120",5],["00|2|011|122",5],["00|22|01|121",5],["1|220|200|11",5],["020|2|20|111",5],["021|2|200|11",5],["012|2|200|11",5],["010|22|20|11",5],["011|22|200|1",5],["002|1|202|11",5],["0|201|202|11",5],["0|210|202|11",5],["00|211|202|1",5],["00|221|211|0",5],["0|200|212|11",5],["00|201|212|1",5],["00|0|212|112",5],["00|210|212|1",5],["0|22|211|100",5],["00|2|211|102",5],["00|22|21|101",5],["00|2|211|120",5],["000|2|21|121",5],["2|22|100|110",5],["022|2|100|11",5],["020|22|10|11",5],["021|22|100|1",5],["012|22|100|1",5],["010|222|10|1",5],["001|22|101|2",5],["0|22|101|102",5],["0|22|101|120",5],["00|2|101|122",5],["0|200|122|11",5],["00|202|12|11",5],["00|201|122|1",5],["00|0|122|112",5],["00|210|122|1",5],["000|212|12|1",5],["00|221|121|0",5],["0|22|121|100",5],["00|2|121|102",5],["00|2|121|120",5],["001|011|2|22",5],["2|010|110|22",5],["012|010|1|22",5],["021|010|1|22",5],["022|010|11|2",5],["0|01|101|222",5],["0|011|102|22",5],["0|011|120|22",5],["00|01|121|22",5],["00|011|122|2",5],["002|022|11|1",5],["1|020|11|220",5],["011|020|1|22",5],["012|020|11|2",5],["021|020|11|2",5],["0|02|111|202",5],["0|022|11|201",5],["0|022|11|210",5],["00|02|11|212",5],["00|022|1|211",5],["2|100|110|22",5],["010|10|1|222",5],["012|100|1|22",5],["020|10|11|22",5],["021|100|1|22",5],["022|100|11|2",5],["001|101|2|22",5],["0|101|102|22",5],["0|101|120|22",5],["00|101|122|2",5],["0|121|100|22",5],["00|121|102|2",5],["00|121|0|221",5],["00|121|120|2",5],["0|122|11|200",5],["00|12|11|202",5],["00|122|1|201",5],["00|122|1|210",5],["000|12|1|212",5],["00|122|112|0",5],["1|200|11|220",5],["010|20|11|22",5],["011|200|1|22",5],["012|200|11|2",5],["020|20|111|2",5],["021|200|11|2",5],["002|202|11|1",5],["0|202|11|201",5],["0|202|11|210",5],["00|202|1|211",5],["0|211|100|22",5],["00|21|101|22",5],["00|211|102|2",5],["00|211|0|221",5],["00|211|120|2",5],["000|21|121|2",5],["0|212|11|200",5],["00|212|1|201",5],["00|212|1|210",5],["00|212|112|0",5],["002|022|1|11",5],["1|020|220|11",5],["021|020|2|11",5],["012|020|2|11",5],["011|020|22|1",5],["0|02|202|111",5],["0|022|201|11",5],["0|022|210|11",5],["00|02|212|11",5],["00|022|211|1",5],["001|011|22|2",5],["2|010|22|110",5],["022|010|2|11",5],["021|010|22|1",5],["012|010|22|1",5],["0|01|222|101",5],["0|011|22|102",5],["0|011|22|120",5],["00|01|22|121",5],["00|011|2|122",5],["1|200|220|11",5],["020|20|2|111",5],["021|200|2|11",5],["010|20|22|11",5],["012|200|2|11",5],["011|200|22|1",5],["002|202|1|11",5],["0|202|201|11",5],["0|202|210|11",5],["00|202|211|1",5],["0|212|200|11",5],["00|212|201|1",5],["00|212|0|112",5],["00|212|210|1",5],["0|211|22|100",5],["00|21|22|101",5],["00|211|2|102",5],["00|211|2|120",5],["000|21|2|121",5],["00|211|221|0",5],["2|100|22|110",5],["020|10|22|11",5],["022|100|2|11",5],["021|100|22|1",5],["010|10|222|1",5],["012|100|22|1",5],["001|101|22|2",5],["0|101|22|102",5],["0|101|22|120",5],["00|101|2|122",5],["0|122|200|11",5],["00|12|202|11",5],["00|122|201|1",5],["00|122|0|112",5],["00|122|210|1",5],["000|12|212|1",5],["0|121|22|100",5],["00|121|2|102",5],["00|121|2|120",5],["00|121|221|0",5],["110|2|22|100",5],["2|001|22|101",5],["102|0|22|101",5],["120|0|22|101",5],["122|00|2|101",5],["1|012|22|100",5],["1|010|222|10",5],["1|021|22|100",5],["11|022|2|100",5],["11|020|22|10",5],["112|00|0|122",5],["0|00|221|121",5],["100|0|22|121",5],["102|00|2|121",5],["120|00|2|121",5],["1|00|210|122",5],["1|000|212|12",5],["1|00|201|122",5],["11|0|200|122",5],["11|00|202|12",5],["2|001|22|011",5],["102|0|22|011",5],["101|0|222|01",5],["120|0|22|011",5],["122|00|2|011",5],["121|00|22|01",5],["110|2|22|010",5],["1|012|22|010",5],["1|021|22|010",5],["11|022|2|010",5],["11|002|1|022",5],["11|1|220|020",5],["1|011|22|020",5],["11|012|2|020",5],["11|021|2|020",5],["1|00|211|022",5],["11|0|210|022",5],["11|00|212|02",5],["11|0|201|022",5],["111|0|202|02",5],["0|00|221|211",5],["100|0|22|211",5],["102|00|2|211",5],["101|00|22|21",5],["120|00|2|211",5],["121|000|2|21",5],["112|00|0|212",5],["1|00|210|212",5],["1|00|201|212",5],["11|0|200|212",5],["11|1|220|200",5],["1|011|22|200",5],["11|012|2|200",5],["11|010|22|20",5],["11|021|2|200",5],["111|020|2|20",5],["11|002|1|202",5],["1|00|211|202",5],["11|0|210|202",5],["11|0|201|202",5],["110|2|100|22",5],["2|001|101|22",5],["102|0|101|22",5],["120|0|101|22",5],["122|00|101|2",5],["1|010|10|222",5],["1|012|100|22",5],["1|021|100|22",5],["11|020|10|22",5],["11|022|100|2",5],["112|00|122|0",5],["0|00|121|221",5],["100|0|121|22",5],["102|00|121|2",5],["120|00|121|2",5],["1|00|122|210",5],["1|000|12|212",5],["1|00|122|201",5],["11|0|122|200",5],["11|00|12|202",5],["2|001|011|22",5],["101|0|01|222",5],["102|0|011|22",5],["120|0|011|22",5],["121|00|01|22",5],["122|00|011|2",5],["110|2|010|22",5],["1|012|010|22",5],["1|021|010|22",5],["11|022|010|2",5],["11|002|022|1",5],["1|011|020|22",5],["11|012|020|2",5],["11|1|020|220",5],["11|021|020|2",5],["1|00|022|211",5],["11|0|022|210",5],["11|00|02|212",5],["11|0|022|201",5],["111|0|02|202",5],["0|00|211|221",5],["100|0|211|22",5],["101|00|21|22",5],["102|00|211|2",5],["120|00|211|2",5],["121|000|21|2",5],["112|00|212|0",5],["1|00|212|210",5],["1|00|212|201",5],["11|0|212|200",5],["1|011|200|22",5],["11|010|20|22",5],["11|012|200|2",5],["11|1|200|220",5],["11|021|200|2",5],["111|020|20|2",5],["11|002|202|1",5],["1|00|202|211",5],["11|0|202|210",5],["11|0|202|201",5],["112|0|00|122",5],["0|221|00|121",5],["120|2|00|121",5],["102|2|00|121",5],["100|22|0|121",5],["1|210|00|122",5],["1|212|000|12",5],["1|201|00|122",5],["11|200|0|122",5],["11|202|00|12",5],["110|22|2|100",5],["2|22|001|101",5],["122|2|00|101",5],["120|22|0|101",5],["102|22|0|101",5],["1|22|012|100",5],["1|222|010|10",5],["1|22|021|100",5],["11|2|022|100",5],["11|22|020|10",5],["0|221|00|211",5],["120|2|00|211",5],["121|2|000|21",5],["102|2|00|211",5],["100|22|0|211",5],["101|22|00|21",5],["112|0|00|212",5],["1|210|00|212",5],["1|201|00|212",5],["11|200|0|212",5],["11|220|1|200",5],["11|1|002|202",5],["1|211|00|202",5],["11|210|0|202",5],["11|201|0|202",5],["1|22|011|200",5],["11|2|012|200",5],["11|22|010|20",5],["11|2|021|200",5],["111|2|020|20",5],["2|22|001|011",5],["122|2|00|011",5],["120|22|0|011",5],["121|22|00|01",5],["102|22|0|011",5],["101|222|0|01",5],["110|22|2|010",5],["1|22|012|010",5],["1|22|021|010",5],["11|2|022|010",5],["11|1|002|022",5],["1|211|00|022",5],["11|210|0|022",5],["11|212|00|02",5],["11|201|0|022",5],["111|202|0|02",5],["11|220|1|020",5],["1|22|011|020",5],["11|2|012|020",5],["11|2|021|020",5],["112|0|122|00",5],["0|221|121|00",5],["120|2|121|00",5],["102|2|121|00",5],["100|22|121|0",5],["1|212|12|000",5],["1|210|122|00",5],["1|201|122|00",5],["11|202|12|00",5],["11|200|122|0",5],["110|22|100|2",5],["2|22|101|001",5],["122|2|101|00",5],["120|22|101|0",5],["102|22|101|0",5],["1|22|100|012",5],["1|222|10|010",5],["1|22|100|021",5],["11|2|100|022",5],["11|22|10|020",5],["0|221|211|00",5],["121|2|21|000",5],["120|2|211|00",5],["102|2|211|00",5],["101|22|21|00",5],["100|22|211|0",5],["112|0|212|00",5],["1|210|212|00",5],["1|201|212|00",5],["11|200|212|0",5],["11|220|200|1",5],["1|211|202|00",5],["11|210|202|0",5],["11|1|202|002",5],["11|201|202|0",5],["1|22|200|011",5],["11|2|200|012",5],["11|22|20|010",5],["11|2|200|021",5],["111|2|20|020",5],["2|22|011|001",5],["122|2|011|00",5],["121|22|01|00",5],["120|22|011|0",5],["102|22|011|0",5],["101|222|01|0",5],["110|22|010|2",5],["1|22|010|012",5],["1|22|010|021",5],["11|2|010|022",5],["1|211|022|00",5],["11|212|02|00",5],["11|210|022|0",5],["11|1|022|002",5],["11|201|022|0",5],["111|202|02|0",5],["11|220|020|1",5],["1|22|020|011",5],["11|2|020|012",5],["11|2|020|021",5],["110|100|2|22",5],["2|101|001|22",5],["102|101|0|22",5],["120|101|0|22",5],["122|101|00|2",5],["1|10|010|222",5],["1|100|012|22",5],["1|100|021|22",5],["11|10|020|22",5],["11|100|022|2",5],["112|122|00|0",5],["0|121|00|221",5],["100|121|0|22",5],["102|121|00|2",5],["120|121|00|2",5],["1|12|000|212",5],["1|122|00|210",5],["1|122|00|201",5],["11|12|00|202",5],["11|122|0|200",5],["2|011|001|22",5],["101|01|0|222",5],["102|011|0|22",5],["121|01|00|22",5],["120|011|0|22",5],["122|011|00|2",5],["110|010|2|22",5],["1|010|012|22",5],["1|010|021|22",5],["11|010|022|2",5],["1|020|011|22",5],["11|020|012|2",5],["11|020|1|220",5],["11|020|021|2",5],["1|022|00|211",5],["11|02|00|212",5],["11|022|0|210",5],["11|022|0|201",5],["111|02|0|202",5],["11|022|002|1",5],["0|211|00|221",5],["101|21|00|22",5],["100|211|0|22",5],["102|211|00|2",5],["121|21|000|2",5],["120|211|00|2",5],["112|212|00|0",5],["1|212|00|210",5],["1|212|00|201",5],["11|212|0|200",5],["1|200|011|22",5],["11|20|010|22",5],["11|200|012|2",5],["11|200|1|220",5],["11|200|021|2",5],["111|20|020|2",5],["1|202|00|211",5],["11|202|0|210",5],["11|202|0|201",5],["11|202|002|1",5],["112|122|0|00",5],["0|121|221|00",5],["120|121|2|00",5],["102|121|2|00",5],["100|121|22|0",5],["1|12|212|000",5],["1|122|210|00",5],["1|122|201|00",5],["11|12|202|00",5],["11|122|200|0",5],["110|100|22|2",5],["2|101|22|001",5],["122|101|2|00",5],["120|101|22|0",5],["102|101|22|0",5],["1|10|222|010",5],["1|100|22|012",5],["1|100|22|021",5],["11|10|22|020",5],["11|100|2|022",5],["0|211|221|00",5],["121|21|2|000",5],["120|211|2|00",5],["101|21|22|00",5],["102|211|2|00",5],["100|211|22|0",5],["112|212|0|00",5],["1|212|210|00",5],["1|212|201|00",5],["11|212|200|0",5],["1|202|211|00",5],["11|202|210|0",5],["11|202|1|002",5],["11|202|201|0",5],["1|200|22|011",5],["11|20|22|010",5],["11|200|2|012",5],["11|200|2|021",5],["111|20|2|020",5],["11|200|220|1",5],["2|011|22|001",5],["121|01|22|00",5],["122|011|2|00",5],["120|011|22|0",5],["101|01|222|0",5],["102|011|22|0",5],["110|010|22|2",5],["1|010|22|012",5],["1|010|22|021",5],["11|010|2|022",5],["1|022|211|00",5],["11|02|212|00",5],["11|022|210|0",5],["11|022|1|002",5],["11|022|201|0",5],["111|02|202|0",5],["1|020|22|011",5],["11|020|2|012",5],["11|020|2|021",5],["11|020|220|1",5],["220|1|11|200",5],["1|002|11|202",5],["201|0|11|202",5],["210|0|11|202",5],["211|00|1|202",5],["2|021|11|200",5],["2|020|111|20",5],["2|012|11|200",5],["22|011|1|200",5],["22|010|11|20",5],["221|00|0|211",5],["0|00|112|212",5],["200|0|11|212",5],["201|00|1|212",5],["210|00|1|212",5],["2|00|120|211",5],["2|000|121|21",5],["2|00|102|211",5],["22|0|100|211",5],["22|00|101|21",5],["1|002|11|022",5],["201|0|11|022",5],["202|0|111|02",5],["210|0|11|022",5],["211|00|1|022",5],["212|00|11|02",5],["220|1|11|020",5],["2|021|11|020",5],["2|012|11|020",5],["22|011|1|020",5],["22|001|2|011",5],["22|2|110|010",5],["2|022|11|010",5],["22|021|1|010",5],["22|012|1|010",5],["2|00|122|011",5],["22|0|120|011",5],["22|00|121|01",5],["22|0|102|011",5],["222|0|101|01",5],["0|00|112|122",5],["200|0|11|122",5],["201|00|1|122",5],["202|00|11|12",5],["210|00|1|122",5],["212|000|1|12",5],["221|00|0|121",5],["2|00|120|121",5],["2|00|102|121",5],["22|0|100|121",5],["22|2|110|100",5],["2|022|11|100",5],["22|021|1|100",5],["22|020|11|10",5],["22|012|1|100",5],["222|010|1|10",5],["22|001|2|101",5],["2|00|122|101",5],["22|0|120|101",5],["22|0|102|101",5],["220|1|200|11",5],["1|002|202|11",5],["201|0|202|11",5],["210|0|202|11",5],["211|00|202|1",5],["2|020|20|111",5],["2|021|200|11",5],["2|012|200|11",5],["22|010|20|11",5],["22|011|200|1",5],["221|00|211|0",5],["0|00|212|112",5],["200|0|212|11",5],["201|00|212|1",5],["210|00|212|1",5],["2|00|211|120",5],["2|000|21|121",5],["2|00|211|102",5],["22|0|211|100",5],["22|00|21|101",5],["1|002|022|11",5],["202|0|02|111",5],["201|0|022|11",5],["210|0|022|11",5],["212|00|02|11",5],["211|00|022|1",5],["220|1|020|11",5],["2|021|020|11",5],["2|012|020|11",5],["22|011|020|1",5],["22|001|011|2",5],["2|022|010|11",5],["22|021|010|1",5],["22|2|010|110",5],["22|012|010|1",5],["2|00|011|122",5],["22|0|011|120",5],["22|00|01|121",5],["22|0|011|102",5],["222|0|01|101",5],["0|00|122|112",5],["200|0|122|11",5],["202|00|12|11",5],["201|00|122|1",5],["210|00|122|1",5],["212|000|12|1",5],["221|00|121|0",5],["2|00|121|120",5],["2|00|121|102",5],["22|0|121|100",5],["2|022|100|11",5],["22|020|10|11",5],["22|021|100|1",5],["22|2|100|110",5],["22|012|100|1",5],["222|010|10|1",5],["22|001|101|2",5],["2|00|101|122",5],["22|0|101|120",5],["22|0|101|102",5],["221|0|00|211",5],["0|112|00|212",5],["210|1|00|212",5],["201|1|00|212",5],["200|11|0|212",5],["2|120|00|211",5],["2|121|000|21",5],["2|102|00|211",5],["22|100|0|211",5],["22|101|00|21",5],["220|11|1|200",5],["1|11|002|202",5],["211|1|00|202",5],["210|11|0|202",5],["201|11|0|202",5],["2|11|021|200",5],["2|111|020|20",5],["2|11|012|200",5],["22|1|011|200",5],["22|11|010|20",5],["0|112|00|122",5],["210|1|00|122",5],["212|1|000|12",5],["201|1|00|122",5],["200|11|0|122",5],["202|11|00|12",5],["221|0|00|121",5],["2|120|00|121",5],["2|102|00|121",5],["22|100|0|121",5],["22|110|2|100",5],["22|2|001|101",5],["2|122|00|101",5],["22|120|0|101",5],["22|102|0|101",5],["2|11|022|100",5],["22|1|021|100",5],["22|11|020|10",5],["22|1|012|100",5],["222|1|010|10",5],["1|11|002|022",5],["211|1|00|022",5],["210|11|0|022",5],["212|11|00|02",5],["201|11|0|022",5],["202|111|0|02",5],["220|11|1|020",5],["2|11|021|020",5],["2|11|012|020",5],["22|1|011|020",5],["22|2|001|011",5],["2|122|00|011",5],["22|120|0|011",5],["22|121|00|01",5],["22|102|0|011",5],["222|101|0|01",5],["22|110|2|010",5],["2|11|022|010",5],["22|1|021|010",5],["22|1|012|010",5],["221|0|211|00",5],["0|112|212|00",5],["210|1|212|00",5],["201|1|212|00",5],["200|11|212|0",5],["2|121|21|000",5],["2|120|211|00",5],["2|102|211|00",5],["22|101|21|00",5],["22|100|211|0",5],["220|11|200|1",5],["1|11|202|002",5],["211|1|202|00",5],["210|11|202|0",5],["201|11|202|0",5],["2|11|200|021",5],["2|111|20|020",5],["2|11|200|012",5],["22|1|200|011",5],["22|11|20|010",5],["0|112|122|00",5],["212|1|12|000",5],["210|1|122|00",5],["201|1|122|00",5],["202|11|12|00",5],["200|11|122|0",5],["221|0|121|00",5],["2|120|121|00",5],["2|102|121|00",5],["22|100|121|0",5],["22|110|100|2",5],["2|122|101|00",5],["22|120|101|0",5],["22|2|101|001",5],["22|102|101|0",5],["2|11|100|022",5],["22|1|100|021",5],["22|11|10|020",5],["22|1|100|012",5],["222|1|10|010",5],["1|11|022|002",5],["211|1|022|00",5],["212|11|02|00",5],["210|11|022|0",5],["201|11|022|0",5],["202|111|02|0",5],["220|11|020|1",5],["2|11|020|021",5],["2|11|020|012",5],["22|1|020|011",5],["2|122|011|00",5],["22|121|01|00",5],["22|120|011|0",5],["22|2|011|001",5],["22|102|011|0",5],["222|101|01|0",5],["22|110|010|2",5],["2|11|010|022",5],["22|1|010|021",5],["22|1|010|012",5],["220|200|1|11",5],["1|202|002|11",5],["201|202|0|11",5],["210|202|0|11",5],["211|202|00|1",5],["2|20|020|111",5],["2|200|021|11",5],["2|200|012|11",5],["22|20|010|11",5],["22|200|011|1",5],["221|211|00|0",5],["0|212|00|112",5],["200|212|0|11",5],["201|212|00|1",5],["210|212|00|1",5],["2|21|000|121",5],["2|211|00|120",5],["2|211|00|102",5],["22|21|00|101",5],["22|211|0|100",5],["1|022|002|11",5],["202|02|0|111",5],["201|022|0|11",5],["212|02|00|11",5],["210|022|0|11",5],["211|022|00|1",5],["220|020|1|11",5],["2|020|021|11",5],["2|020|012|11",5],["22|020|011|1",5],["2|010|022|11",5],["22|010|021|1",5],["22|010|2|110",5],["22|010|012|1",5],["2|011|00|122",5],["22|01|00|121",5],["22|011|0|120",5],["22|011|0|102",5],["222|01|0|101",5],["22|011|001|2",5],["0|122|00|112",5],["202|12|00|11",5],["200|122|0|11",5],["201|122|00|1",5],["212|12|000|1",5],["210|122|00|1",5],["221|121|00|0",5],["2|121|00|120",5],["2|121|00|102",5],["22|121|0|100",5],["2|100|022|11",5],["22|10|020|11",5],["22|100|021|1",5],["22|100|2|110",5],["22|100|012|1",5],["222|10|010|1",5],["2|101|00|122",5],["22|101|0|120",5],["22|101|0|102",5],["22|101|001|2",5],["221|211|0|00",5],["0|212|112|00",5],["210|212|1|00",5],["201|212|1|00",5],["200|212|11|0",5],["2|21|121|000",5],["2|211|120|00",5],["2|211|102|00",5],["22|21|101|00",5],["22|211|100|0",5],["220|200|11|1",5],["1|202|11|002",5],["211|202|1|00",5],["210|202|11|0",5],["201|202|11|0",5],["2|20|111|020",5],["2|200|11|021",5],["2|200|11|012",5],["22|20|11|010",5],["22|200|1|011",5],["0|122|112|00",5],["212|12|1|000",5],["210|122|1|00",5],["202|12|11|00",5],["201|122|1|00",5],["200|122|11|0",5],["221|121|0|00",5],["2|121|120|00",5],["2|121|102|00",5],["22|121|100|0",5],["2|101|122|00",5],["22|101|120|0",5],["22|101|2|001",5],["22|101|102|0",5],["2|100|11|022",5],["22|10|11|020",5],["22|100|1|021",5],["22|100|1|012",5],["222|10|1|010",5],["22|100|110|2",5],["1|022|11|002",5],["212|02|11|00",5],["211|022|1|00",5],["210|022|11|0",5],["202|02|111|0",5],["201|022|11|0",5],["220|020|11|1",5],["2|020|11|021",5],["2|020|11|012",5],["22|020|1|011",5],["2|011|122|00",5],["22|01|121|00",5],["22|011|120|0",5],["22|011|2|001",5],["22|011|102|0",5],["222|01|101|0",5],["2|010|11|022",5],["22|010|1|021",5],["22|010|1|012",5],["22|010|110|2",5],["010|2|110|22",5],["010|012|1|22",5],["010|021|1|22",5],["010|022|11|2",5],["01|0|101|222",5],["011|0|102|22",5],["011|001|2|22",5],["01|00|121|22",5],["011|0|120|22",5],["011|00|122|2",5],["020|1|11|220",5],["020|011|1|22",5],["020|012|11|2",5],["020|021|11|2",5],["02|0|111|202",5],["022|0|11|201",5],["02|00|11|212",5],["022|0|11|210",5],["022|00|1|211",5],["022|002|11|1",5],["100|2|110|22",5],["10|010|1|222",5],["100|012|1|22",5],["10|020|11|22",5],["100|021|1|22",5],["100|022|11|2",5],["101|0|102|22",5],["101|001|2|22",5],["101|0|120|22",5],["101|00|122|2",5],["121|0|100|22",5],["121|00|102|2",5],["121|00|0|221",5],["121|00|120|2",5],["12|00|11|202",5],["122|0|11|200",5],["122|00|1|201",5],["12|000|1|212",5],["122|00|1|210",5],["122|00|112|0",5],["200|1|11|220",5],["20|010|11|22",5],["200|011|1|22",5],["200|012|11|2",5],["20|020|111|2",5],["200|021|11|2",5],["202|0|11|201",5],["202|0|11|210",5],["202|00|1|211",5],["202|002|11|1",5],["21|00|101|22",5],["211|0|100|22",5],["211|00|102|2",5],["211|00|0|221",5],["21|000|121|2",5],["211|00|120|2",5],["212|0|11|200",5],["212|00|1|201",5],["212|00|1|210",5],["212|00|112|0",5],["020|1|220|11",5],["020|021|2|11",5],["020|012|2|11",5],["020|011|22|1",5],["02|0|202|111",5],["022|0|201|11",5],["022|002|1|11",5],["02|00|212|11",5],["022|0|210|11",5],["022|00|211|1",5],["010|2|22|110",5],["010|022|2|11",5],["010|021|22|1",5],["010|012|22|1",5],["01|0|222|101",5],["011|0|22|102",5],["01|00|22|121",5],["011|0|22|120",5],["011|00|2|122",5],["011|001|22|2",5],["200|1|220|11",5],["20|020|2|111",5],["200|021|2|11",5],["20|010|22|11",5],["200|012|2|11",5],["200|011|22|1",5],["202|0|201|11",5],["202|002|1|11",5],["202|0|210|11",5],["202|00|211|1",5],["212|0|200|11",5],["212|00|201|1",5],["212|00|0|112",5],["212|00|210|1",5],["21|00|22|101",5],["211|0|22|100",5],["211|00|2|102",5],["21|000|2|121",5],["211|00|2|120",5],["211|00|221|0",5],["100|2|22|110",5],["10|020|22|11",5],["100|022|2|11",5],["100|021|22|1",5],["10|010|222|1",5],["100|012|22|1",5],["101|0|22|102",5],["101|0|22|120",5],["101|00|2|122",5],["101|001|22|2",5],["12|00|202|11",5],["122|0|200|11",5],["122|00|201|1",5],["122|00|0|112",5],["12|000|212|1",5],["122|00|210|1",5],["121|0|22|100",5],["121|00|2|102",5],["121|00|2|120",5],["121|00|221|0",5],["101|2|001|22",5],["101|102|0|22",5],["101|120|0|22",5],["101|122|00|2",5],["10|1|010|222",5],["100|1|012|22",5],["100|110|2|22",5],["10|11|020|22",5],["100|1|021|22",5],["100|11|022|2",5],["121|0|00|221",5],["121|100|0|22",5],["121|102|00|2",5],["121|120|00|2",5],["12|1|000|212",5],["122|1|00|210",5],["12|11|00|202",5],["122|1|00|201",5],["122|11|0|200",5],["122|112|00|0",5],["011|2|001|22",5],["01|101|0|222",5],["011|102|0|22",5],["01|121|00|22",5],["011|120|0|22",5],["011|122|00|2",5],["010|1|012|22",5],["010|110|2|22",5],["010|1|021|22",5],["010|11|022|2",5],["020|1|011|22",5],["020|11|012|2",5],["020|11|1|220",5],["020|11|021|2",5],["02|11|00|212",5],["022|1|00|211",5],["022|11|0|210",5],["02|111|0|202",5],["022|11|0|201",5],["022|11|002|1",5],["211|0|00|221",5],["21|101|00|22",5],["211|100|0|22",5],["211|102|00|2",5],["21|121|000|2",5],["211|120|00|2",5],["212|1|00|210",5],["212|1|00|201",5],["212|11|0|200",5],["212|112|00|0",5],["20|11|010|22",5],["200|1|011|22",5],["200|11|012|2",5],["200|11|1|220",5],["20|111|020|2",5],["200|11|021|2",5],["202|1|00|211",5],["202|11|0|210",5],["202|11|0|201",5],["202|11|002|1",5],["121|0|221|00",5],["121|120|2|00",5],["121|102|2|00",5],["121|100|22|0",5],["12|1|212|000",5],["122|1|210|00",5],["122|112|0|00",5],["12|11|202|00",5],["122|1|201|00",5],["122|11|200|0",5],["101|2|22|001",5],["101|122|2|00",5],["101|120|22|0",5],["101|102|22|0",5],["10|1|222|010",5],["100|1|22|012",5],["10|11|22|020",5],["100|1|22|021",5],["100|11|2|022",5],["100|110|22|2",5],["211|0|221|00",5],["21|121|2|000",5],["211|120|2|00",5],["21|101|22|00",5],["211|102|2|00",5],["211|100|22|0",5],["212|1|210|00",5],["212|112|0|00",5],["212|1|201|00",5],["212|11|200|0",5],["202|1|211|00",5],["202|11|210|0",5],["202|11|1|002",5],["202|11|201|0",5],["20|11|22|010",5],["200|1|22|011",5],["200|11|2|012",5],["20|111|2|020",5],["200|11|2|021",5],["200|11|220|1",5],["011|2|22|001",5],["01|121|22|00",5],["011|122|2|00",5],["011|120|22|0",5],["01|101|222|0",5],["011|102|22|0",5],["010|1|22|012",5],["010|1|22|021",5],["010|11|2|022",5],["010|110|22|2",5],["02|11|212|00",5],["022|1|211|00",5],["022|11|210|0",5],["022|11|1|002",5],["02|111|202|0",5],["022|11|201|0",5],["020|1|22|011",5],["020|11|2|012",5],["020|11|2|021",5],["020|11|220|1",5],["202|1|002|11",5],["202|201|0|11",5],["202|210|0|11",5],["202|211|00|1",5],["20|2|020|111",5],["200|2|021|11",5],["200|220|1|11",5],["20|22|010|11",5],["200|2|012|11",5],["200|22|011|1",5],["212|0|00|112",5],["212|200|0|11",5],["212|201|00|1",5],["212|210|00|1",5],["21|2|000|121",5],["211|2|00|120",5],["21|22|00|101",5],["211|2|00|102",5],["211|22|0|100",5],["211|221|00|0",5],["022|1|002|11",5],["02|202|0|111",5],["022|201|0|11",5],["02|212|00|11",5],["022|210|0|11",5],["022|211|00|1",5],["020|2|021|11",5],["020|220|1|11",5],["020|2|012|11",5],["020|22|011|1",5],["010|2|022|11",5],["010|22|021|1",5],["010|22|2|110",5],["010|22|012|1",5],["01|22|00|121",5],["011|2|00|122",5],["011|22|0|120",5],["01|222|0|101",5],["011|22|0|102",5],["011|22|001|2",5],["122|0|00|112",5],["12|202|00|11",5],["122|200|0|11",5],["122|201|00|1",5],["12|212|000|1",5],["122|210|00|1",5],["121|2|00|120",5],["121|2|00|102",5],["121|22|0|100",5],["121|221|00|0",5],["10|22|020|11",5],["100|2|022|11",5],["100|22|021|1",5],["100|22|2|110",5],["10|222|010|1",5],["100|22|012|1",5],["101|2|00|122",5],["101|22|0|120",5],["101|22|0|102",5],["101|22|001|2",5],["212|0|112|00",5],["212|210|1|00",5],["212|201|1|00",5],["212|200|11|0",5],["21|2|121|000",5],["211|2|120|00",5],["211|221|0|00",5],["21|22|101|00",5],["211|2|102|00",5],["211|22|100|0",5],["202|1|11|002",5],["202|211|1|00",5],["202|210|11|0",5],["202|201|11|0",5],["20|2|111|020",5],["200|2|11|021",5],["20|22|11|010",5],["200|2|11|012",5],["200|22|1|011",5],["200|220|11|1",5],["122|0|112|00",5],["12|212|1|000",5],["122|210|1|00",5],["12|202|11|00",5],["122|201|1|00",5],["122|200|11|0",5],["121|2|120|00",5],["121|221|0|00",5],["121|2|102|00",5],["121|22|100|0",5],["101|2|122|00",5],["101|22|120|0",5],["101|22|2|001",5],["101|22|102|0",5],["10|22|11|020",5],["100|2|11|022",5],["100|22|1|021",5],["10|222|1|010",5],["100|22|1|012",5],["100|22|110|2",5],["022|1|11|002",5],["02|212|11|00",5],["022|211|1|00",5],["022|210|11|0",5],["02|202|111|0",5],["022|201|11|0",5],["020|2|11|021",5],["020|2|11|012",5],["020|22|1|011",5],["020|220|11|1",5],["01|22|121|00",5],["011|2|122|00",5],["011|22|120|0",5],["011|22|2|001",5],["01|222|101|0",5],["011|22|102|0",5],["010|2|11|022",5],["010|22|1|021",5],["010|22|1|012",5],["010|22|110|2",5],["011|2|22|010",6],["2|100|22|011",6],["0|101|22|012",6],["0|121|22|010",6],["00|121|2|012",6],["022|11|1|020",6],["1|11|200|022",6],["0|11|202|021",6],["0|11|212|020",6],["00|1|212|021",6],["011|2|22|100",6],["010|1|22|102",6],["020|1|22|101",6],["020|11|2|102",6],["2|100|22|101",6],["00|122|0|121",6],["0|11|202|120",6],["00|1|202|121",6],["00|0|211|122",6],["00|1|212|120",6],["010|1|22|201",6],["010|11|2|202",6],["022|11|1|200",6],["020|11|2|201",6],["1|11|200|202",6],["0|101|22|210",6],["00|101|2|212",6],["00|122|0|211",6],["00|121|2|210",6],["00|0|211|212",6],["011|2|010|22",6],["2|100|011|22",6],["0|101|012|22",6],["0|121|010|22",6],["00|121|012|2",6],["022|11|020|1",6],["1|11|022|200",6],["0|11|021|202",6],["0|11|020|212",6],["00|1|021|212",6],["011|2|100|22",6],["010|1|102|22",6],["020|1|101|22",6],["020|11|102|2",6],["2|100|101|22",6],["00|122|121|0",6],["0|11|120|202",6],["00|1|121|202",6],["00|0|122|211",6],["00|1|120|212",6],["010|1|201|22",6],["010|11|202|2",6],["020|11|201|2",6],["022|11|200|1",6],["1|11|202|200",6],["0|101|210|22",6],["00|101|212|2",6],["00|121|210|2",6],["00|122|211|0",6],["00|0|212|211",6],["022|1|11|020",6],["1|200|11|022",6],["0|202|11|021",6],["0|212|11|020",6],["00|212|1|021",6],["011|22|2|010",6],["2|22|100|011",6],["0|22|101|012",6],["0|22|121|010",6],["00|2|121|012",6],["022|1|11|200",6],["020|2|11|201",6],["010|2|11|202",6],["010|22|1|201",6],["1|200|11|202",6],["00|211|0|212",6],["0|22|101|210",6],["00|2|101|212",6],["00|2|121|210",6],["020|2|11|102",6],["020|22|1|101",6],["011|22|2|100",6],["010|22|1|102",6],["2|22|100|101",6],["0|202|11|120",6],["00|202|1|121",6],["00|211|0|122",6],["00|212|1|120",6],["00|0|122|121",6],["022|1|020|11",6],["1|200|022|11",6],["0|202|021|11",6],["0|212|020|11",6],["00|212|021|1",6],["011|22|010|2",6],["2|22|011|100",6],["0|22|012|101",6],["0|22|010|121",6],["00|2|012|121",6],["022|1|200|11",6],["020|2|201|11",6],["010|2|202|11",6],["010|22|201|1",6],["1|200|202|11",6],["00|211|212|0",6],["0|22|210|101",6],["00|2|212|101",6],["00|2|210|121",6],["020|2|102|11",6],["020|22|101|1",6],["010|22|102|1",6],["011|22|100|2",6],["2|22|101|100",6],["0|202|120|11",6],["00|202|121|1",6],["00|212|120|1",6],["00|211|122|0",6],["00|0|121|122",6],["011|010|2|22",6],["2|011|100|22",6],["0|012|101|22",6],["0|010|121|22",6],["00|012|121|2",6],["022|020|11|1",6],["1|022|11|200",6],["0|021|11|202",6],["0|020|11|212",6],["00|021|1|212",6],["010|102|1|22",6],["011|100|2|22",6],["020|101|1|22",6],["020|102|11|2",6],["2|101|100|22",6],["00|121|122|0",6],["0|120|11|202",6],["00|121|1|202",6],["00|120|1|212",6],["010|201|1|22",6],["010|202|11|2",6],["020|201|11|2",6],["022|200|11|1",6],["1|202|11|200",6],["0|210|101|22",6],["00|212|101|2",6],["00|210|121|2",6],["00|212|0|211",6],["022|020|1|11",6],["1|022|200|11",6],["0|021|202|11",6],["0|020|212|11",6],["00|021|212|1",6],["011|010|22|2",6],["2|011|22|100",6],["0|012|22|101",6],["0|010|22|121",6],["00|012|2|121",6],["020|201|2|11",6],["022|200|1|11",6],["010|202|2|11",6],["010|201|22|1",6],["1|202|200|11",6],["00|212|211|0",6],["0|210|22|101",6],["00|212|2|101",6],["00|210|2|121",6],["020|102|2|11",6],["020|101|22|1",6],["010|102|22|1",6],["011|100|22|2",6],["2|101|22|100",6],["0|120|202|11",6],["00|121|202|1",6],["00|120|212|1",6],["00|121|0|122",6],["100|2|22|101",6],["1|010|22|102",6],["1|020|22|101",6],["11|020|2|102",6],["122|00|0|121",6],["0|00|211|122",6],["1|00|212|120",6],["1|00|202|121",6],["11|0|202|120",6],["100|2|22|011",6],["101|0|22|012",6],["121|0|22|010",6],["121|00|2|012",6],["2|011|22|010",6],["11|022|1|020",6],["1|00|212|021",6],["11|0|212|020",6],["11|1|200|022",6],["11|0|202|021",6],["101|0|22|210",6],["101|00|2|212",6],["122|00|0|211",6],["121|00|2|210",6],["0|00|211|212",6],["1|010|22|201",6],["11|010|2|202",6],["11|022|1|200",6],["11|020|2|201",6],["11|1|200|202",6],["100|2|101|22",6],["1|010|102|22",6],["1|020|101|22",6],["11|020|102|2",6],["122|00|121|0",6],["0|00|122|211",6],["1|00|120|212",6],["1|00|121|202",6],["11|0|120|202",6],["100|2|011|22",6],["101|0|012|22",6],["121|0|010|22",6],["121|00|012|2",6],["2|011|010|22",6],["11|022|020|1",6],["1|00|021|212",6],["11|0|020|212",6],["11|1|022|200",6],["11|0|021|202",6],["101|0|210|22",6],["101|00|212|2",6],["121|00|210|2",6],["122|00|211|0",6],["0|00|212|211",6],["1|010|201|22",6],["11|010|202|2",6],["11|020|201|2",6],["11|022|200|1",6],["11|1|202|200",6],["122|0|00|121",6],["0|211|00|122",6],["1|212|00|120",6],["1|202|00|121",6],["11|202|0|120",6],["100|22|2|101",6],["1|22|010|102",6],["1|22|020|101",6],["11|2|020|102",6],["122|0|00|211",6],["121|2|00|210",6],["101|2|00|212",6],["101|22|0|210",6],["0|211|00|212",6],["11|200|1|202",6],["1|22|010|201",6],["11|2|010|202",6],["11|2|020|201",6],["121|2|00|012",6],["121|22|0|010",6],["100|22|2|011",6],["101|22|0|012",6],["2|22|011|010",6],["1|212|00|021",6],["11|212|0|020",6],["11|200|1|022",6],["11|202|0|021",6],["11|1|022|020",6],["122|0|121|00",6],["0|211|122|00",6],["1|212|120|00",6],["1|202|121|00",6],["11|202|120|0",6],["100|22|101|2",6],["1|22|102|010",6],["1|22|101|020",6],["11|2|102|020",6],["122|0|211|00",6],["121|2|210|00",6],["101|2|212|00",6],["101|22|210|0",6],["0|211|212|00",6],["11|200|202|1",6],["1|22|201|010",6],["11|2|202|010",6],["11|2|201|020",6],["121|2|012|00",6],["121|22|010|0",6],["101|22|012|0",6],["100|22|011|2",6],["2|22|010|011",6],["1|212|021|00",6],["11|212|020|0",6],["11|202|021|0",6],["11|200|022|1",6],["11|1|020|022",6],["100|101|2|22",6],["1|102|010|22",6],["1|101|020|22",6],["11|102|020|2",6],["122|121|00|0",6],["0|122|00|211",6],["1|120|00|212",6],["1|121|00|202",6],["11|120|0|202",6],["101|012|0|22",6],["100|011|2|22",6],["121|010|0|22",6],["121|012|00|2",6],["2|010|011|22",6],["11|020|022|1",6],["1|021|00|212",6],["11|020|0|212",6],["11|021|0|202",6],["101|210|0|22",6],["101|212|00|2",6],["121|210|00|2",6],["122|211|00|0",6],["0|212|00|211",6],["1|201|010|22",6],["11|202|010|2",6],["11|201|020|2",6],["11|202|1|200",6],["122|121|0|00",6],["0|122|211|00",6],["1|120|212|00",6],["1|121|202|00",6],["11|120|202|0",6],["100|101|22|2",6],["1|102|22|010",6],["1|101|22|020",6],["11|102|2|020",6],["121|210|2|00",6],["122|211|0|00",6],["101|212|2|00",6],["101|210|22|0",6],["0|212|211|00",6],["11|202|200|1",6],["1|201|22|010",6],["11|202|2|010",6],["11|201|2|020",6],["121|012|2|00",6],["121|010|22|0",6],["101|012|22|0",6],["100|011|22|2",6],["2|010|22|011",6],["1|021|212|00",6],["11|020|212|0",6],["11|021|202|0",6],["11|020|1|022",6],["200|1|11|202",6],["2|020|11|201",6],["2|010|11|202",6],["22|010|1|201",6],["211|00|0|212",6],["2|00|121|210",6],["2|00|101|212",6],["22|0|101|210",6],["200|1|11|022",6],["202|0|11|021",6],["212|0|11|020",6],["212|00|1|021",6],["1|022|11|020",6],["22|011|2|010",6],["2|00|121|012",6],["22|0|121|010",6],["22|2|100|011",6],["22|0|101|012",6],["202|0|11|120",6],["202|00|1|121",6],["211|00|0|122",6],["212|00|1|120",6],["0|00|122|121",6],["2|020|11|102",6],["22|020|1|101",6],["22|011|2|100",6],["22|010|1|102",6],["22|2|100|101",6],["200|1|202|11",6],["2|020|201|11",6],["2|010|202|11",6],["22|010|201|1",6],["211|00|212|0",6],["2|00|210|121",6],["2|00|212|101",6],["22|0|210|101",6],["200|1|022|11",6],["202|0|021|11",6],["212|0|020|11",6],["212|00|021|1",6],["1|022|020|11",6],["22|011|010|2",6],["2|00|012|121",6],["22|0|010|121",6],["22|2|011|100",6],["22|0|012|101",6],["202|0|120|11",6],["202|00|121|1",6],["212|00|120|1",6],["211|00|122|0",6],["0|00|121|122",6],["2|020|102|11",6],["22|020|101|1",6],["22|010|102|1",6],["22|011|100|2",6],["22|2|101|100",6],["211|0|00|212",6],["2|121|00|210",6],["2|101|00|212",6],["22|101|0|210",6],["200|11|1|202",6],["2|11|020|201",6],["2|11|010|202",6],["22|1|010|201",6],["211|0|00|122",6],["212|1|00|120",6],["202|1|00|121",6],["202|11|0|120",6],["0|122|00|121",6],["22|100|2|101",6],["2|11|020|102",6],["22|1|020|101",6],["22|1|010|102",6],["212|1|00|021",6],["212|11|0|020",6],["200|11|1|022",6],["202|11|0|021",6],["1|11|022|020",6],["2|121|00|012",6],["22|121|0|010",6],["22|100|2|011",6],["22|101|0|012",6],["22|2|011|010",6],["211|0|212|00",6],["2|121|210|00",6],["2|101|212|00",6],["22|101|210|0",6],["200|11|202|1",6],["2|11|201|020",6],["2|11|202|010",6],["22|1|201|010",6],["211|0|122|00",6],["212|1|120|00",6],["202|1|121|00",6],["202|11|120|0",6],["0|122|121|00",6],["22|100|101|2",6],["2|11|102|020",6],["22|1|101|020",6],["22|1|102|010",6],["212|1|021|00",6],["212|11|020|0",6],["202|11|021|0",6],["200|11|022|1",6],["1|11|020|022",6],["2|121|012|00",6],["22|121|010|0",6],["22|101|012|0",6],["22|100|011|2",6],["22|2|010|011",6],["200|202|1|11",6],["2|201|020|11",6],["2|202|010|11",6],["22|201|010|1",6],["211|212|00|0",6],["2|210|00|121",6],["2|212|00|101",6],["22|210|0|101",6],["202|021|0|11",6],["200|022|1|11",6],["212|020|0|11",6],["212|021|00|1",6],["1|020|022|11",6],["22|010|011|2",6],["2|012|00|121",6],["22|010|0|121",6],["22|012|0|101",6],["202|120|0|11",6],["202|121|00|1",6],["212|120|00|1",6],["211|122|00|0",6],["0|121|00|122",6],["2|102|020|11",6],["22|101|020|1",6],["22|102|010|1",6],["22|101|2|100",6],["211|212|0|00",6],["2|210|121|00",6],["2|212|101|00",6],["22|210|101|0",6],["200|202|11|1",6],["2|201|11|020",6],["2|202|11|010",6],["22|201|1|010",6],["212|120|1|00",6],["211|122|0|00",6],["202|121|1|00",6],["202|120|11|0",6],["0|121|122|00",6],["22|101|100|2",6],["2|102|11|020",6],["22|101|1|020",6],["22|102|1|010",6],["212|021|1|00",6],["212|020|11|0",6],["202|021|11|0",6],["200|022|11|1",6],["1|020|11|022",6],["2|012|121|00",6],["22|010|121|0",6],["22|012|101|0",6],["22|010|2|011",6],["010|011|2|22",6],["012|0|101|22",6],["010|0|121|22",6],["012|00|121|2",6],["020|022|11|1",6],["021|0|11|202",6],["020|0|11|212",6],["021|00|1|212",6],["102|010|1|22",6],["101|020|1|22",6],["102|020|11|2",6],["101|2|100|22",6],["121|00|122|0",6],["120|0|11|202",6],["121|00|1|202",6],["120|00|1|212",6],["201|010|1|22",6],["202|010|11|2",6],["201|020|11|2",6],["202|1|11|200",6],["210|0|101|22",6],["212|00|101|2",6],["210|00|121|2",6],["212|00|0|211",6],["020|022|1|11",6],["021|0|202|11",6],["020|0|212|11",6],["021|00|212|1",6],["010|011|22|2",6],["012|0|22|101",6],["010|0|22|121",6],["012|00|2|121",6],["201|020|2|11",6],["202|010|2|11",6],["201|010|22|1",6],["202|1|200|11",6],["212|00|211|0",6],["210|0|22|101",6],["212|00|2|101",6],["210|00|2|121",6],["102|020|2|11",6],["101|020|22|1",6],["102|010|22|1",6],["101|2|22|100",6],["120|0|202|11",6],["121|00|202|1",6],["120|00|212|1",6],["121|00|0|122",6],["101|100|2|22",6],["102|1|010|22",6],["101|1|020|22",6],["102|11|020|2",6],["121|122|00|0",6],["120|1|00|212",6],["121|1|00|202",6],["120|11|0|202",6],["012|101|0|22",6],["010|121|0|22",6],["012|121|00|2",6],["010|2|011|22",6],["020|11|022|1",6],["021|1|00|212",6],["020|11|0|212",6],["021|11|0|202",6],["210|101|0|22",6],["212|101|00|2",6],["210|121|00|2",6],["212|0|00|211",6],["201|1|010|22",6],["202|11|010|2",6],["201|11|020|2",6],["202|11|1|200",6],["121|122|0|00",6],["120|1|212|00",6],["121|1|202|00",6],["120|11|202|0",6],["101|100|22|2",6],["102|1|22|010",6],["101|1|22|020",6],["102|11|2|020",6],["210|121|2|00",6],["212|101|2|00",6],["210|101|22|0",6],["212|0|211|00",6],["202|11|200|1",6],["201|1|22|010",6],["202|11|2|010",6],["201|11|2|020",6],["012|121|2|00",6],["010|121|22|0",6],["012|101|22|0",6],["010|2|22|011",6],["021|1|212|00",6],["020|11|212|0",6],["021|11|202|0",6],["020|11|1|022",6],["202|200|1|11",6],["201|2|020|11",6],["202|2|010|11",6],["201|22|010|1",6],["212|211|00|0",6],["210|2|00|121",6],["212|2|00|101",6],["210|22|0|101",6],["021|202|0|11",6],["020|212|0|11",6],["021|212|00|1",6],["020|1|022|11",6],["010|22|011|2",6],["012|2|00|121",6],["010|22|0|121",6],["012|22|0|101",6],["120|202|0|11",6],["121|202|00|1",6],["120|212|00|1",6],["121|0|00|122",6],["102|2|020|11",6],["101|22|020|1",6],["102|22|010|1",6],["101|22|2|100",6],["212|211|0|00",6],["210|2|121|00",6],["212|2|101|00",6],["210|22|101|0",6],["202|200|11|1",6],["201|2|11|020",6],["202|2|11|010",6],["201|22|1|010",6],["120|212|1|00",6],["121|202|1|00",6],["120|202|11|0",6],["121|0|122|00",6],["101|22|100|2",6],["102|2|11|020",6],["101|22|1|020",6],["102|22|1|010",6],["021|212|1|00",6],["020|212|11|0",6],["021|202|11|0",6],["020|1|11|022",6],["012|2|121|00",6],["010|22|121|0",6],["012|22|101|0",6],["010|22|2|011",6]],"hard":[["012|212||010",9],["|121|202|010",9],["|120|201|012",9],["|120|210|012",9],["|120|212|010",9],["021||121|020",9],["|101|212|020",9],["|102|210|021",9],["|120|210|021",9],["|121|210|020",9],["020||212|101",9],["021||210|102",9],["021||202|101",9],["021||201|102",9],["202|102||101",9],["|120|020|121",9],["010||202|121",9],["012||201|120",9],["021||201|120",9],["020||201|121",9],["010|121||202",9],["012|120||201",9],["012|101||202",9],["012|102||201",9],["101||201|202",9],["020|101||212",9],["021|102||210",9],["010|102||212",9],["012|102||210",9],["|010|210|212",9],["012|212|010|",9],["|121|010|202",9],["|120|012|201",9],["|120|010|212",9],["|120|012|210",9],["021||020|121",9],["|102|021|210",9],["|101|020|212",9],["|120|021|210",9],["|121|020|210",9],["020||101|212",9],["021||102|210",9],["021||102|201",9],["021||101|202",9],["202|102|101|",9],["|120|121|020",9],["012||120|201",9],["010||121|202",9],["021||120|201",9],["020||121|201",9],["012|101|202|",9],["012|102|201|",9],["010|121|202|",9],["012|120|201|",9],["101||202|201",9],["010|102|212|",9],["012|102|210|",9],["020|101|212|",9],["021|102|210|",9],["|010|212|210",9],["021|121||020",9],["|212|101|020",9],["|210|102|021",9],["|210|120|021",9],["|210|121|020",9],["012||212|010",9],["|202|121|010",9],["|201|120|012",9],["|210|120|012",9],["|212|120|010",9],["012||101|202",9],["012||102|201",9],["101|201||202",9],["|210|010|212",9],["012||102|210",9],["010||102|212",9],["020|212||101",9],["021|210||102",9],["021|202||101",9],["021|201||102",9],["202||102|101",9],["010|202||121",9],["012|201||120",9],["020|201||121",9],["021|201||120",9],["|020|120|121",9],["021|121|020|",9],["|212|020|101",9],["|210|021|102",9],["|210|020|121",9],["|210|021|120",9],["012||010|212",9],["|201|012|120",9],["|202|010|121",9],["|210|012|120",9],["|212|010|120",9],["012||201|102",9],["012||202|101",9],["101|201|202|",9],["|210|212|010",9],["012||210|102",9],["010||212|102",9],["021|202|101|",9],["021|201|102|",9],["020|212|101|",9],["021|210|102|",9],["202||101|102",9],["020|201|121|",9],["021|201|120|",9],["010|202|121|",9],["012|201|120|",9],["|020|121|120",9],["012|010|212|",9],["|012|120|201",9],["|010|121|202",9],["|010|120|212",9],["|012|120|210",9],["021|020||121",9],["|021|102|210",9],["|020|101|212",9],["|020|121|210",9],["|021|120|210",9],["021|102||201",9],["021|101||202",9],["202|101|102|",9],["|121|120|020",9],["021|120||201",9],["020|121||201",9],["012|201|102|",9],["012|202|101|",9],["101|202||201",9],["010|212|102|",9],["012|210|102|",9],["|212|010|210",9],["021|020|121|",9],["|021|210|102",9],["|020|212|101",9],["|020|210|121",9],["|021|210|120",9],["012|010||212",9],["|012|201|120",9],["|010|202|121",9],["|010|212|120",9],["|012|210|120",9],["012|201||102",9],["012|202||101",9],["101|202|201|",9],["|212|210|010",9],["012|210||102",9],["010|212||102",9],["021|102|201|",9],["021|101|202|",9],["202|101||102",9],["020|121|201|",9],["021|120|201|",9],["|121|020|120",9],["102|202||101",9],["|021|201|102",9],["|021|202|101",9],["120||020|121",9],["|021|201|120",9],["|020|201|121",9],["121||202|010",9],["120||201|012",9],["120||212|010",9],["120||210|012",9],["212|012||010",9],["|021|121|020",9],["101||212|020",9],["102||210|021",9],["120||210|021",9],["121||210|020",9],["101|020||212",9],["102|021||210",9],["102|010||212",9],["102|012||210",9],["010||210|212",9],["121|010||202",9],["120|012||201",9],["101|012||202",9],["102|012||201",9],["|101|201|202",9],["102|202|101|",9],["|021|101|202",9],["|021|102|201",9],["120||121|020",9],["|021|120|201",9],["|020|121|201",9],["121||010|202",9],["120||012|201",9],["120||012|210",9],["120||010|212",9],["212|012|010|",9],["|021|020|121",9],["102||021|210",9],["101||020|212",9],["120||021|210",9],["121||020|210",9],["102|010|212|",9],["102|012|210|",9],["101|020|212|",9],["102|021|210|",9],["010||212|210",9],["101|012|202|",9],["102|012|201|",9],["121|010|202|",9],["120|012|201|",9],["|101|202|201",9],["120|020||121",9],["|201|021|120",9],["|201|020|121",9],["102||202|101",9],["|201|021|102",9],["|202|021|101",9],["102||010|212",9],["102||012|210",9],["010|210||212",9],["|201|101|202",9],["102||012|201",9],["101||012|202",9],["121|202||010",9],["120|201||012",9],["120|212||010",9],["120|210||012",9],["212||012|010",9],["101|212||020",9],["102|210||021",9],["121|210||020",9],["120|210||021",9],["|121|021|020",9],["120|020|121|",9],["|201|121|020",9],["|201|120|021",9],["102||101|202",9],["|201|102|021",9],["|202|101|021",9],["102||210|012",9],["102||212|010",9],["010|210|212|",9],["|201|202|101",9],["102||201|012",9],["101||202|012",9],["120|212|010|",9],["120|210|012|",9],["121|202|010|",9],["120|201|012|",9],["212||010|012",9],["121|210|020|",9],["120|210|021|",9],["101|212|020|",9],["102|210|021|",9],["|121|020|021",9],["102|101|202|",9],["|101|021|202",9],["|102|021|201",9],["120|121||020",9],["|121|020|201",9],["|120|021|201",9],["120|012||210",9],["120|010||212",9],["212|010|012|",9],["|020|021|121",9],["120|021||210",9],["121|020||210",9],["102|210|012|",9],["102|212|010|",9],["010|212||210",9],["101|202|012|",9],["102|201|012|",9],["|202|101|201",9],["120|121|020|",9],["|121|201|020",9],["|120|201|021",9],["102|101||202",9],["|101|202|021",9],["|102|201|021",9],["102|210||012",9],["102|212||010",9],["010|212|210|",9],["|202|201|101",9],["102|201||012",9],["101|202||012",9],["120|012|210|",9],["120|010|212|",9],["212|010||012",9],["121|020|210|",9],["120|021|210|",9],["|020|121|021",9],["201|101||202",9],["|012|102|201",9],["|012|101|202",9],["210||010|212",9],["|012|102|210",9],["|010|102|212",9],["212||101|020",9],["210||102|021",9],["210||121|020",9],["210||120|021",9],["121|021||020",9],["|012|212|010",9],["202||121|010",9],["201||120|012",9],["210||120|012",9],["212||120|010",9],["202|010||121",9],["201|012||120",9],["201|020||121",9],["201|021||120",9],["020||120|121",9],["212|020||101",9],["210|021||102",9],["202|021||101",9],["201|021||102",9],["|202|102|101",9],["201|101|202|",9],["|012|202|101",9],["|012|201|102",9],["210||212|010",9],["|012|210|102",9],["|010|212|102",9],["212||020|101",9],["210||021|102",9],["210||021|120",9],["210||020|121",9],["121|021|020|",9],["|012|010|212",9],["201||012|120",9],["202||010|121",9],["210||012|120",9],["212||010|120",9],["201|020|121|",9],["201|021|120|",9],["202|010|121|",9],["201|012|120|",9],["020||121|120",9],["202|021|101|",9],["201|021|102|",9],["212|020|101|",9],["210|021|102|",9],["|202|101|102",9],["210|010||212",9],["|102|012|210",9],["|102|010|212",9],["201||101|202",9],["|102|012|201",9],["|101|012|202",9],["201||020|121",9],["201||021|120",9],["020|120||121",9],["|102|202|101",9],["201||021|102",9],["202||021|101",9],["212|101||020",9],["210|102||021",9],["210|121||020",9],["210|120||021",9],["121||021|020",9],["202|121||010",9],["201|120||012",9],["212|120||010",9],["210|120||012",9],["|212|012|010",9],["210|010|212|",9],["|102|212|010",9],["|102|210|012",9],["201||202|101",9],["|102|201|012",9],["|101|202|012",9],["201||120|021",9],["201||121|020",9],["020|120|121|",9],["|102|101|202",9],["201||102|021",9],["202||101|021",9],["210|121|020|",9],["210|120|021|",9],["212|101|020|",9],["210|102|021|",9],["121||020|021",9],["212|120|010|",9],["210|120|012|",9],["202|121|010|",9],["201|120|012|",9],["|212|010|012",9],["201|202|101|",9],["|202|012|101",9],["|201|012|102",9],["210|212||010",9],["|212|010|102",9],["|210|012|102",9],["210|021||120",9],["210|020||121",9],["121|020|021|",9],["|010|012|212",9],["210|012||120",9],["212|010||120",9],["201|120|021|",9],["201|121|020|",9],["020|121||120",9],["202|101|021|",9],["201|102|021|",9],["|101|202|102",9],["210|212|010|",9],["|212|102|010",9],["|210|102|012",9],["201|202||101",9],["|202|101|012",9],["|201|102|012",9],["201|120||021",9],["201|121||020",9],["020|121|120|",9],["|101|102|202",9],["201|102||021",9],["202|101||021",9],["210|021|120|",9],["210|020|121|",9],["121|020||021",9],["212|010|120|",9],["210|012|120|",9],["|010|212|012",9],["010|012|212|",9],["010||120|212",9],["012||120|210",9],["020|021||121",9],["020||121|210",9],["021||120|210",9],["102|021||201",9],["101|021||202",9],["101|202|102|",9],["121||120|020",9],["121|020||201",9],["120|021||201",9],["201|012|102|",9],["202|012|101|",9],["202|101||201",9],["210|012|102|",9],["212|010|102|",9],["212||010|210",9],["020|021|121|",9],["020||210|121",9],["021||210|120",9],["010|012||212",9],["010||212|120",9],["012||210|120",9],["201|012||102",9],["202|012||101",9],["202|101|201|",9],["212||210|010",9],["212|010||102",9],["210|012||102",9],["102|021|201|",9],["101|021|202|",9],["101|202||102",9],["120|021|201|",9],["121|020|201|",9],["121||020|120",9],["101|102|202|",9],["101||021|202",9],["102||021|201",9],["121|120||020",9],["121||020|201",9],["120||021|201",9],["012|120||210",9],["010|120||212",9],["010|212|012|",9],["020||021|121",9],["020|121||210",9],["021|120||210",9],["210|102|012|",9],["212|102|010|",9],["212|010||210",9],["201|102|012|",9],["202|101|012|",9],["202||101|201",9],["121|120|020|",9],["121||201|020",9],["120||201|021",9],["101|102||202",9],["101||202|021",9],["102||201|021",9],["210|102||012",9],["212|102||010",9],["212|010|210|",9],["202||201|101",9],["202|101||012",9],["201|102||012",9],["012|120|210|",9],["010|120|212|",9],["010|212||012",9],["021|120|210|",9],["020|121|210|",9],["020||121|021",9],["202|201|101|",9],["202||012|101",9],["201||012|102",9],["212|210||010",9],["212||010|102",9],["210||012|102",9],["021|210||120",9],["020|210||121",9],["020|121|021|",9],["010||012|212",9],["010|212||120",9],["012|210||120",9],["120|201|021|",9],["121|201|020|",9],["121|020||120",9],["102|201|021|",9],["101|202|021|",9],["101||202|102",9],["212|210|010|",9],["212||102|010",9],["210||102|012",9],["202|201||101",9],["202||101|012",9],["201||102|012",9],["120|201||021",9],["121|201||020",9],["121|020|120|",9],["101||102|202",9],["101|202||021",9],["102|201||021",9],["021|210|120|",9],["020|210|121|",9],["020|121||021",9],["012|210|120|",9],["010|212|120|",9],["010||212|012",9]],"oni":[["|211|221|000",10],["12|211|2|000",10],["112|212||000",10],["1|212|21|000",10],["1|221|21|000",10],["112|221||000",10],["1|22|211|000",10],["112|2|21|000",10],["11|2|212|000",10],["11|222|1|000",10],["111|222|0|00",10],["111|220||002",10],["111|220|20|0",10],["111|2|202|00",10],["111|2|20|002",10],["111|22|200|0",10],["111|202||002",10],["111|202|20|0",10],["111|200|2|02",10],["111|200|220|",10],["111|022||002",10],["111|022|20|0",10],["111|020|2|02",10],["111|020|220|",10],["111|002|2|02",10],["111|002|220|",10],["111|0|220|02",10],["111|0|22|020",10],["111|00|2|022",10],["111|000|22|2",10],["112|000|221|",10],["|121|212|000",10],["110|222||001",10],["121|000|221|",10],["121|2|21|000",10],["12|21|21|000",10],["122|112|000|",10],["101|222||001",10],["100|110||222",10],["211|000|221|",10],["212|12|1|000",10],["21|12|12|000",10],["212|112|000|",10],["221|112|000|",10],["|112|122|000",10],["21|1|122|000",10],["221||121|000",10],["2|12|121|000",10],["2|122|11|000",10],["2|12|112|000",10],["221|12|1|000",10],["22|121|1|000",10],["221||112|000",10],["22|2|111|000",10],["222|0|111|00",10],["222|101|1|00",10],["222|10|1|001",10],["222|100|11|0",10],["222|10|110|0",10],["222||110|001",10],["222|110|100|",10],["222||101|001",10],["222|10|101|0",10],["222|1|100|01",10],["222||011|001",10],["222|10|011|0",10],["222|110|010|",10],["222|1|010|01",10],["222|1|001|01",10],["222|110|001|",10],["222|1|00|011",10],["222|110|0|01",10],["222|11|0|010",10],["222|11|000|1",10],["220||111|002",10],["202||111|002",10],["200||220|111",10],["010|101||222",10],["010|222|1|01",10],["020||202|111",10],["020|2|111|02",10],["222|101|0|01",10],["222|10|01|01",10],["222|10|10|01",10],["222|10|1|010",10],["111|02|20|02",10],["111|0|202|02",10],["111|20|20|02",10],["111|2|20|020",10],["010|222|1|10",10],["01|222|10|10",10],["01|222|01|10",10],["01|222|0|101",10],["222|101|0|10",10],["200|02|2|111",10],["202|0|20|111",10],["202|002||111",10],["220|0|20|111",10],["220|002||111",10],["2|002|20|111",10],["2|00|202|111",10],["22|0|200|111",10],["222|00|0|111",10],["222|000|1|11",10],["221|000||112",10],["221|000|21|1",10],["2|000|212|11",10],["2|000|21|112",10],["22|000|211|1",10],["212|000||112",10],["212|000|21|1",10],["211|000|2|12",10],["122|000||112",10],["122|000|21|1",10],["121|000|2|12",10],["112|000|2|12",10],["1|000|221|12",10],["1|000|22|121",10],["11|000|2|122",10],["222|001||110",10],["002|022|111|",10],["20|02|20|111",10],["2|020|20|111",10],["001|011||222",10],["222|010||110",10],["02|202|0|111",10],["02|20|02|111",10],["002|202|111|",10],["002|220|111|",10],["2|22|000|111",10],["1|222|000|11",10],["022|2|00|111",10],["02|2|002|111",10],["020|22|0|111",10],["02|220|0|111",10],["|220|002|111",10],["010|222|0|11",10],["01|222|0|110",10],["011|222|00|1",10],["01|222|001|1",10],["|222|001|110",10],["002||022|111",10],["|220|020|111",10],["02|2|020|111",10],["0|20|022|111",10],["001|222|011|",10],["|222|010|110",10],["01|222|010|1",10],["0|222|011|10",10],["|222|100|110",10],["01|222|100|1",10],["001|222|101|",10],["0|222|101|10",10],["0|222|110|10",10],["001|222|110|",10],["0|222|11|100",10],["001|222|1|10",10],["00|222|1|101",10],["00|222|111|0",10],["|221|000|112",10],["|212|000|112",10],["2|121|000|12",10],["12|000|21|12",10],["1|000|212|12",10],["21|000|21|12",10],["2|000|21|121",10],["020|2|111|20",10],["02|20|111|20",10],["02|02|111|20",10],["02|0|111|202",10],["21|12|000|21",10],["2|121|000|21",10],["12|12|000|21",10],["1|12|000|212",10],["111|0|202|20",10],["1|000|212|21",10],["111|0|00|222",10],["111|2|000|22",10],["110||001|222",10],["110|10|0|222",10],["1|101|00|222",10],["1|10|001|222",10],["11|100|0|222",10],["112||000|221",10],["112|12|000|2",10],["1|121|000|22",10],["1|12|000|221",10],["11|122|000|2",10],["101||001|222",10],["101|10|0|222",10],["100|1|01|222",10],["121||000|221",10],["121|12|000|2",10],["122|1|000|21",10],["211||000|221",10],["211|12|000|2",10],["212|1|000|21",10],["221|1|000|21",10],["2|112|000|21",10],["2|11|000|212",10],["22|1|000|211",10],["111||002|220",10],["10|10|01|222",10],["1|10|010|222",10],["111||020|220",10],["01|01|10|222",10],["01|0|101|222",10],["1|000|11|222",10],["2|000|111|22",10],["010|0|11|222",10],["01|0|110|222",10],["011|00|1|222",10],["01|001|1|222",10],["|001|110|222",10],["020|0|111|22",10],["02|0|111|220",10],["022|00|111|2",10],["02|002|111|2",10],["|002|111|220",10],["|010|110|222",10],["01|010|1|222",10],["0|011|10|222",10],["|020|111|220",10],["02|020|111|2",10],["0|022|111|20",10],["|200|111|220",10],["02|200|111|2",10],["0|202|111|20",10],["0|220|111|20",10],["0|22|111|200",10],["002|2|111|20",10],["00|2|111|202",10],["|000|112|221",10],["|000|121|221",10],["121|21|2|000",11],["122|211||000",11],["|212|211|000",11],["|221|211|000",11],["112||212|000",11],["1|21|212|000",11],["1|222|11|000",11],["112|22|1|000",11],["11|22|12|000",11],["110|222|1|00",11],["11|222|10|00",11],["11|222|01|00",11],["11|222|0|001",11],["111|22|02|00",11],["111|22|0|002",11],["111|222|00|0",11],["111|220|200|",11],["111||202|002",11],["111|20|202|0",11],["111|202|200|",11],["111|20|2|020",11],["111|200||022",11],["111|02|202|0",11],["111|022|200|",11],["111|020||022",11],["111|002||022",11],["111|02|2|020",11],["11|000|221|2",11],["11|000|22|21",11],["111|00|220|2",11],["111|00|22|20",11],["111|000|2|22",11],["112|122|000|",11],["110|100||222",11],["222|101||001",11],["121|122|000|",11],["122|000|211|",11],["101|100||222",11],["100|222||011",11],["211|122|000|",11],["212|000|211|",11],["221|000|211|",11],["211||122|000",11],["212|1|12|000",11],["|122|121|000",11],["|122|112|000",11],["221|121||000",11],["2|121|12|000",11],["2|22|111|000",11],["221|2|11|000",11],["22|21|11|000",11],["220|2|111|00",11],["22|20|111|00",11],["22|02|111|00",11],["22|0|111|002",11],["222|01|11|00",11],["222|0|11|001",11],["222|00|111|0",11],["222|101|10|0",11],["222|100|110|",11],["222|100|101|",11],["222||100|011",11],["222|1|10|010",11],["222|101|01|0",11],["222|100|011|",11],["222||010|011",11],["222||001|011",11],["222|1|01|010",11],["22|112|000|1",11],["22|11|000|12",11],["222|1|000|11",11],["222|110|00|1",11],["222|11|00|10",11],["220||200|111",11],["202||200|111",11],["200||111|022",11],["20|020|2|111",11],["200|022||111",11],["|002|202|111",11],["20|0|202|111",11],["22|002|0|111",11],["22|00|02|111",11],["222|0|00|111",11],["222|001|0|11",11],["222|00|01|11",11],["22|000|12|11",11],["22|000|1|112",11],["222|00|10|11",11],["222|00|1|110",11],["222|000|11|1",11],["|000|212|112",11],["21|000|212|1",11],["21|000|2|121",11],["211|000||122",11],["12|000|212|1",11],["121|000||122",11],["112|000||122",11],["12|000|2|121",11],["022|002|111|",11],["010|222||110",11],["011|001||222",11],["022|020|111|",11],["011|010||222",11],["222|011||100",11],["022|200|111|",11],["22|2|000|111",11],["20|22|00|111",11],["2|220|00|111",11],["21|22|000|11",11],["2|221|000|11",11],["12|22|000|11",11],["1|22|000|112",11],["10|222|00|11",11],["1|222|00|110",11],["11|222|000|1",11],["022||002|111",11],["020|2|02|111",11],["020|220||111",11],["010|222|01|1",11],["011|222|001|",11],["022||020|111",11],["|200|022|111",11],["0|202|02|111",11],["011|222|010|",11],["|222|011|100",11],["0|222|01|101",11],["010|222|10|1",11],["011|222|100|",11],["|222|101|100",11],["|222|110|100",11],["0|222|10|101",11],["0|222|111|00",11],["002|22|111|0",11],["00|22|111|02",11],["001|222|11|0",11],["00|222|11|01",11],["|211|000|122",11],["11|01|00|222",11],["11|0|001|222",11],["111|00|0|222",11],["111|02|00|22",11],["111|0|002|22",11],["11|21|000|22",11],["11|2|000|221",11],["111|20|00|22",11],["111|2|00|220",11],["111|22|000|2",11],["|101|001|222",11],["10|101|0|222",11],["|121|000|221",11],["12|121|000|2",11],["10|1|010|222",11],["100||011|222",11],["12|1|000|212",11],["122||000|211",11],["21|121|000|2",11],["212||000|211",11],["221||000|211",11],["21|1|000|212",11],["020||111|220",11],["111||022|200",11],["10|00|11|222",11],["1|00|110|222",11],["11|000|1|222",11],["12|000|11|22",11],["1|000|112|22",11],["20|00|111|22",11],["2|00|111|220",11],["21|000|11|22",11],["2|000|11|221",11],["22|000|111|2",11],["010||110|222",11],["010|01|1|222",11],["020|02|111|2",11],["|011|100|222",11],["0|01|101|222",11],["|022|111|200",11],["0|02|111|202",11],["020|20|111|2",11],["|202|111|200",11],["|220|111|200",11],["0|20|111|202",11],["|000|122|211",11],["121|212||000",12],["122|21|1|000",12],["|211|212|000",12],["|222|111|000",12],["12|22|11|000",12],["1|22|112|000",12],["10|222|11|00",12],["1|222|110|00",12],["112|2|12|000",12],["1|221|12|000",12],["1|22|121|000",12],["11|2|122|000",12],["110|222|10|0",12],["1|222|101|00",12],["1|222|10|001",12],["11|222|100|0",12],["1|222|011|00",12],["1|222|01|001",12],["110|222|01|0",12],["11|222|010|0",12],["111|2|022|00",12],["111|2|02|002",12],["111|220|02|0",12],["111|22|020|0",12],["11|222|001|0",12],["11|222|00|01",12],["111|22|002|0",12],["111|22|00|02",12],["111|222|000|",12],["111|200|202|",12],["111|202||020",12],["111|20|0|022",12],["111|020|202|",12],["111|02|200|2",12],["111|022||020",12],["1|000|22|211",12],["112|000|2|21",12],["11|000|2|212",12],["111|0|22|200",12],["111|002|2|20",12],["111|00|2|202",12],["11|000|21|22",12],["11|000|2|221",12],["111|00|20|22",12],["111|00|2|220",12],["111|000||222",12],["122|121|000|",12],["100|101||222",12],["121|000|212|",12],["12|000|211|2",12],["101|222||010",12],["10|222|0|011",12],["100|222|1|01",12],["212|121|000|",12],["21|122|000|1",12],["211|000|212|",12],["211|2|12|000",12],["212||121|000",12],["|121|122|000",12],["21|22|11|000",12],["2|221|11|000",12],["20|22|111|00",12],["2|220|111|00",12],["221|21|1|000",12],["2|212|11|000",12],["2|21|112|000",12],["22|211|1|000",12],["220|20|111|0",12],["2|202|111|00",12],["2|20|111|002",12],["22|200|111|0",12],["2|022|111|00",12],["2|02|111|002",12],["220|02|111|0",12],["22|020|111|0",12],["222|011|1|00",12],["222|01|1|001",12],["222|010|11|0",12],["222|01|110|0",12],["22|002|111|0",12],["22|00|111|02",12],["222|001|11|0",12],["222|00|11|01",12],["222|000|111|",12],["222|101|100|",12],["222|0|10|011",12],["222||101|010",12],["222|101|010|",12],["222|100|01|1",12],["222||011|010",12],["2|11|000|122",12],["221|1|000|12",12],["22|1|000|121",12],["22|12|000|11",12],["22|1|000|112",12],["222||000|111",12],["222|10|00|11",12],["222|1|00|110",12],["222|1|001|10",12],["222|1|00|101",12],["222|11|0|100",12],["200||202|111",12],["202||111|020",12],["20|0|111|022",12],["200|2|111|02",12],["202|020||111",12],["20|022|0|111",12],["2|002|02|111",12],["2|00|022|111",12],["220|0|02|111",12],["22|0|020|111",12],["22|02|00|111",12],["22|0|002|111",12],["222|01|00|11",12],["222|0|001|11",12],["222|001|01|1",12],["222|0|010|11",12],["222|0|01|110",12],["222|00|011|1",12],["2|000|122|11",12],["2|000|12|112",12],["221|000|12|1",12],["22|000|121|1",12],["222|0|100|11",12],["222|0|10|110",12],["222|001|10|1",12],["222|00|101|1",12],["22|000|112|1",12],["22|000|11|12",12],["222|00|110|1",12],["222|00|11|10",12],["212|000||121",12],["21|000|1|122",12],["122|000||121",12],["020|022|111|",12],["010|011||222",12],["222|01|1|100",12],["222|011|0|10",12],["222|010||101",12],["020|202|111|",12],["022|20|111|0",12],["220|2|00|111",12],["22|20|00|111",12],["221|2|000|11",12],["22|21|000|11",12],["202|2|00|111",12],["20|2|002|111",12],["200|22|0|111",12],["20|220|0|111",12],["212|2|000|11",12],["21|2|000|112",12],["211|22|000|1",12],["21|221|000|1",12],["122|2|000|11",12],["12|2|000|112",12],["121|22|000|1",12],["12|221|000|1",12],["100|222|0|11",12],["10|222|0|110",12],["101|222|00|1",12],["10|222|001|1",12],["112|22|000|1",12],["11|22|000|12",12],["110|222|00|1",12],["11|222|00|10",12],["020||022|111",12],["010|222|011|",12],["2|200|02|111",12],["|202|020|111",12],["1|222|01|100",12],["|222|010|101",12],["010|222|101|",12],["011|222|10|0",12],["|222|100|101",12],["02|22|111|00",12],["0|22|111|002",12],["01|222|11|00",12],["0|222|11|001",12],["0|220|111|02",12],["0|22|111|020",12],["00|2|111|022",12],["0|222|110|01",12],["0|222|11|010",12],["00|222|1|011",12],["|212|000|121",12],["1|21|000|122",12],["2|211|000|12",12],["1|011|00|222",12],["1|01|001|222",12],["110|01|0|222",12],["11|010|0|222",12],["11|001|0|222",12],["11|00|01|222",12],["111|002|0|22",12],["111|00|02|22",12],["111|020|0|22",12],["111|02|0|220",12],["111|022|00|2",12],["111|02|002|2",12],["1|211|000|22",12],["1|21|000|221",12],["112|21|000|2",12],["11|212|000|2",12],["111|200|0|22",12],["111|20|0|220",12],["111|202|00|2",12],["111|20|002|2",12],["11|221|000|2",12],["11|22|000|21",12],["111|220|00|2",12],["111|22|00|20",12],["101||010|222",12],["10|0|011|222",12],["121||000|212",12],["12|2|000|211",12],["211||000|212",12],["111|2|02|200",12],["111|0|022|20",12],["111||020|202",12],["100|0|11|222",12],["10|0|110|222",12],["101|00|1|222",12],["10|001|1|222",12],["110|00|1|222",12],["11|00|10|222",12],["112|000|1|22",12],["11|000|12|22",12],["121|000|1|22",12],["12|000|1|221",12],["122|000|11|2",12],["12|000|112|2",12],["200|0|111|22",12],["20|0|111|220",12],["202|00|111|2",12],["20|002|111|2",12],["211|000|1|22",12],["21|000|1|221",12],["212|000|11|2",12],["21|000|112|2",12],["220|00|111|2",12],["22|00|111|20",12],["221|000|11|2",12],["22|000|11|21",12],["1|01|100|222",12],["|010|101|222",12],["2|02|111|200",12],["|020|111|202",12],["|200|111|202",12],["2|000|12|211",12],["1|000|122|21",12],["|000|121|212",12],["12|212|1|000",13],["12|21|12|000",13],["112|212|000|",13],["112|221|000|",13],["122|2|11|000",13],["12|2|112|000",13],["121|22|1|000",13],["12|221|1|000",13],["|221|112|000",13],["101|222|1|00",13],["10|222|1|001",13],["100|222|11|0",13],["10|222|110|0",13],["|222|110|001",13],["112||122|000",13],["|221|121|000",13],["12|2|121|000",13],["1|21|122|000",13],["110|222|100|",13],["|222|101|001",13],["10|222|101|0",13],["1|222|100|01",13],["|222|011|001",13],["10|222|011|0",13],["110|222|010|",13],["1|222|010|01",13],["111||022|002",13],["111|20|022|0",13],["111|220|020|",13],["111|2|020|02",13],["1|222|001|01",13],["110|222|001|",13],["1|222|00|011",13],["110|222|0|01",13],["11|222|0|010",13],["111|2|002|02",13],["111|220|002|",13],["111|2|00|022",13],["111|220|0|02",13],["111|22|0|020",13],["|220|111|002",13],["|202|111|002",13],["111|202|0|02",13],["111|20|02|02",13],["222|011||001",13],["110|010||222",13],["|022|111|002",13],["111|020|20|2",13],["111|02|20|20",13],["110|001||222",13],["12|000|2|211",13],["112|000||212",13],["111|02|2|200",13],["111|002||202",13],["1|000|211|22",13],["112|000|21|2",13],["11|000|212|2",13],["112|000||221",13],["111|0|200|22",13],["111|002|20|2",13],["111|00|202|2",13],["111|002||220",13],["121|000|21|2",13],["12|000|21|21",13],["101|222|0|01",13],["10|222|01|01",13],["10|222|10|01",13],["10|222|1|010",13],["212|12|000|1",13],["21|12|000|12",13],["21|21|12|000",13],["21|2|121|000",13],["221|000|121|",13],["221|000|112|",13],["212|2|11|000",13],["21|2|112|000",13],["211|22|1|000",13],["21|221|1|000",13],["202|2|111|00",13],["20|2|111|002",13],["200|22|111|0",13],["20|220|111|0",13],["221|211||000",13],["|212|112|000",13],["21|212|1|000",13],["2|211|12|000",13],["220|200|111|",13],["20|202|111|0",13],["2|200|111|02",13],["20|022|111|0",13],["220|020|111|",13],["2|020|111|02",13],["222|011|10|0",13],["222|010|1|01",13],["222|010|110|",13],["2|002|111|02",13],["220|002|111|",13],["2|00|111|022",13],["220|0|111|02",13],["22|0|111|020",13],["222|001|1|01",13],["222|001|110|",13],["222|0|110|01",13],["222|0|11|010",13],["222|00|1|011",13],["222|01|10|01",13],["222|0|101|01",13],["220||020|111",13],["222|10|010|1",13],["222|10|01|10",13],["220||002|111",13],["21|1|000|122",13],["221||000|121",13],["2|122|000|11",13],["221|12|000|1",13],["22|121|000|1",13],["221||000|112",13],["222|100|0|11",13],["222|101|00|1",13],["222|10|001|1",13],["222||001|110",13],["222||001|101",13],["222|1|01|100",13],["202|0|111|02",13],["20|02|111|02",13],["20|20|111|02",13],["20|2|111|020",13],["202|02|0|111",13],["20|02|02|111",13],["202|002|111|",13],["|002|022|111",13],["20|0|022|111",13],["2|02|020|111",13],["2|022|00|111",13],["2|02|002|111",13],["220|02|0|111",13],["22|020|0|111",13],["222|010|0|11",13],["222|01|0|110",13],["222|011|00|1",13],["222|01|001|1",13],["222|001|011|",13],["222||010|110",13],["222|01|010|1",13],["222|0|011|10",13],["|000|122|112",13],["21|000|122|1",13],["2|000|121|12",13],["222||100|110",13],["222|01|100|1",13],["222|001|101|",13],["222|0|101|10",13],["2|000|112|12",13],["2|000|11|122",13],["221|000|1|12",13],["22|000|1|121",13],["222|0|110|10",13],["222|0|11|100",13],["222|001|1|10",13],["222|00|1|101",13],["212||000|112",13],["212|000|1|12",13],["21|000|12|12",13],["100|222||110",13],["101|001||222",13],["122||000|112",13],["222|010|1|10",13],["222|01|10|10",13],["222|01|01|10",13],["222|01|0|101",13],["02|202|111|0",13],["02|20|111|02",13],["220|20|0|111",13],["2|202|00|111",13],["2|20|002|111",13],["22|200|0|111",13],["221|21|000|1",13],["2|212|000|11",13],["2|21|000|112",13],["22|211|000|1",13],["202||002|111",13],["202|20|0|111",13],["200|2|02|111",13],["200|220||111",13],["212|21|000|1",13],["211|2|000|12",13],["211|221|000|",13],["122|21|000|1",13],["121|2|000|12",13],["121|221|000|",13],["100|222|01|1",13],["101|222|0|10",13],["101|222|001|",13],["112|2|000|12",13],["1|221|000|12",13],["1|22|000|121",13],["11|2|000|122",13],["110|222|0|10",13],["1|222|001|10",13],["1|222|00|101",13],["11|222|0|100",13],["20|20|02|111",13],["2|20|020|111",13],["10|222|01|10",13],["1|222|010|10",13],["01|222|101|0",13],["01|222|10|01",13],["022|2|111|00",13],["020|22|111|0",13],["02|220|111|0",13],["011|222|1|00",13],["010|222|11|0",13],["01|222|110|0",13],["|220|111|020",13],["0|20|111|022",13],["|222|110|010",13],["0|222|10|011",13],["12|21|000|12",13],["1|212|000|12",13],["21|21|000|12",13],["2|21|000|121",13],["|011|001|222",13],["10|011|0|222",13],["1|010|01|222",13],["1|001|01|222",13],["1|00|011|222",13],["110|0|01|222",13],["11|0|010|222",13],["111|002|02|2",13],["111|0|020|22",13],["111|0|02|220",13],["111|00|022|2",13],["111|020||220",13],["111|020|02|2",13],["111|022|0|20",13],["111|022|002|",13],["|211|000|221",13],["12|211|000|2",13],["1|212|000|21",13],["111|200||220",13],["111|200|02|2",13],["111|202|0|20",13],["111|202|002|",13],["1|221|000|21",13],["1|22|000|211",13],["112|2|000|21",13],["11|2|000|212",13],["111|220|0|20",13],["111|2|002|20",13],["111|2|00|202",13],["111|22|0|200",13],["101|0|01|222",13],["10|01|01|222",13],["121|000||221",13],["121|2|000|21",13],["12|21|000|21",13],["211|000||221",13],["200||111|220",13],["111|20|02|20",13],["111|2|020|20",13],["111|02|02|20",13],["111|0|02|202",13],["100||110|222",13],["100|01|1|222",13],["101|0|10|222",13],["110|0|10|222",13],["1|001|10|222",13],["1|00|101|222",13],["11|0|100|222",13],["112|000|12|2",13],["1|000|121|22",13],["1|000|12|221",13],["11|000|122|2",13],["121|000|12|2",13],["122|000|1|21",13],["122|000|112|",13],["200|02|111|2",13],["202|0|111|20",13],["211|000|12|2",13],["212|000|1|21",13],["212|000|112|",13],["220|0|111|20",13],["2|002|111|20",13],["2|00|111|202",13],["22|0|111|200",13],["221|000|1|21",13],["2|000|112|21",13],["2|000|11|212",13],["22|000|1|211",13],["10|01|10|222",13],["1|010|10|222",13],["20|02|111|20",13],["2|020|111|20",13],["21|000|12|21",13],["2|000|121|21",13],["12|000|12|21",13],["1|000|12|212",13],["122|211|000|",14],["112|000|212|",14],["122||112|000",14],["121|2|12|000",14],["121|221||000",14],["101|222|10|0",14],["100|222|110|",14],["122||121|000",14],["|211|122|000",14],["1|212|12|000",14],["100|222|101|",14],["|222|100|011",14],["1|222|10|010",14],["101|222|01|0",14],["100|222|011|",14],["|222|010|011",14],["111|202|02|0",14],["111|200|022|",14],["111||020|022",14],["|222|001|011",14],["110|222||010",14],["1|222|01|010",14],["111||002|022",14],["111|220||020",14],["111|2|02|020",14],["|200|111|022",14],["100|011||222",14],["222|010||011",14],["|020|111|022",14],["222|001||011",14],["|002|111|022",14],["122|000||211",14],["121|000|2|21",14],["111|022||200",14],["111|020|2|20",14],["111|002|202|",14],["211|000|122|",14],["221|121|000|",14],["212||112|000",14],["212|21|1|000",14],["211|221||000",14],["202|20|111|0",14],["200|220|111|",14],["211|212||000",14],["2|21|121|000",14],["200|202|111|",14],["2|20|111|020",14],["202|02|111|0",14],["200|022|111|",14],["222|01|101|0",14],["222|011|100|",14],["220||111|020",14],["2|02|111|020",14],["222||110|010",14],["222|01|1|010",14],["200||022|111",14],["211||000|122",14],["212|1|000|12",14],["222|101|001|",14],["222||011|100",14],["222|1|010|10",14],["202|0|02|111",14],["|022|020|111",14],["|022|002|111",14],["220|020||111",14],["2|020|02|111",14],["222|010|01|1",14],["222|011|001|",14],["222|011|010|",14],["222|0|01|101",14],["212|000|12|1",14],["|000|121|122",14],["222|010|10|1",14],["222||101|100",14],["|000|112|122",14],["221|000||121",14],["2|000|12|121",14],["222||110|100",14],["222|001||101",14],["222|0|10|101",14],["101|222||100",14],["121||000|122",14],["110|222||100",14],["112||000|122",14],["220|200||111",14],["|202|002|111",14],["20|202|0|111",14],["221|211|000|",14],["21|212|000|1",14],["202|200||111",14],["20|2|020|111",14],["212|211|000|",14],["21|2|000|121",14],["12|212|000|1",14],["10|222|010|1",14],["|221|000|121",14],["12|2|000|121",14],["|222|001|101",14],["10|222|0|101",14],["020|220|111|",14],["010|222|110|",14],["0|202|111|02",14],["0|222|101|01",14],["101|01|0|222",14],["|010|011|222",14],["|001|011|222",14],["110||010|222",14],["1|01|010|222",14],["111|002|022|",14],["111|02|020|2",14],["111|020|022|",14],["111|02|0|202",14],["121|21|000|2",14],["|212|000|211",14],["111|20|020|2",14],["111|202||200",14],["|221|000|211",14],["112||000|212",14],["1|21|000|212",14],["111|220||200",14],["111||002|202",14],["111|20|0|202",14],["212|000||211",14],["202||111|200",14],["221|000||211",14],["220||111|200",14],["10|010|1|222",14],["101||100|222",14],["110||100|222",14],["|001|101|222",14],["10|0|101|222",14],["112|000|122|",14],["12|000|121|2",14],["121|000|122|",14],["12|000|1|212",14],["20|020|111|2",14],["21|000|121|2",14],["|002|111|202",14],["20|0|111|202",14],["|000|112|212",14],["21|000|1|212",14]],"kiwami":[["120|210|10|2",17],["12|210|10|20",17],["121|210||020",17],["120|210||021",17],["120|21|1|020",17],["120|212||010",17],["120|210||012",17],["12|210|2|010",17],["120|02|112|0",17],["12|020|112|0",17],["121|202||001",17],["121|202|10|0",17],["120|202|110|",17],["121|201||002",17],["12|201|102|0",17],["122|201|100|",17],["12|200|110|2",17],["121|02|12|00",17],["121|0|12|002",17],["121|200|120|",17],["121|200|102|",17],["121||100|022",17],["121|2|10|020",17],["102||112|020",17],["10|0|112|022",17],["101|202|12|0",17],["101|200|122|",17],["101||120|022",17],["101||102|022",17],["101|220|10|2",17],["101|22|10|20",17],["101|220||021",17],["101|2|12|020",17],["101|221||020",17],["10|2|120|021",17],["100||122|021",17],["102|2|110|20",17],["10|2|110|202",17],["112|020|120|",17],["112|0|120|02",17],["112|0|12|020",17],["112|02|10|02",17],["112|0|102|02",17],["120|02|121|0",17],["12|020|121|0",17],["12|002|121|0",17],["12|00|121|02",17],["102||121|020",17],["10|0|121|022",17],["100|212|120|",17],["102|210|120|",17],["100|210|12|2",17],["110|20|120|2",17],["110|20|12|20",17],["120|201|120|",17],["102|201|120|",17],["100|201|12|2",17],["100|202|121|",17],["|202|120|011",17],["|201|122|010",17],["1|202|12|010",17],["|200|121|012",17],["1|20|120|012",17],["110|202|10|2",17],["110|20|102|2",17],["110||102|202",17],["120|202|101|",17],["12|200|101|2",17],["102|2|101|20",17],["10|2|101|202",17],["10|20|101|22",17],["10|2|101|220",17],["122|0|10|012",17],["122||102|010",17],["120||102|012",17],["122|0|10|021",17],["120||102|021",17],["102||102|021",17],["|210|101|022",17],["1|210|102|02",17],["|212|100|021",17],["1|212|10|020",17],["122||101|020",17],["|211|102|020",17],["12|1|012|002",17],["121|202|01|0",17],["120|202|011|",17],["12|201|012|0",17],["122|201|010|",17],["121|200|012|",17],["121||010|022",17],["120|1|01|022",17],["120||012|021",17],["120||012|012",17],["102|1|01|022",17],["102||012|021",17],["101||012|022",17],["2|211|010|02",17],["|212|010|021",17],["2|21|021|001",17],["101|212|02|0",17],["101|210|022|",17],["102|21|021|0",17],["102|211|020|",17],["100|212|021|",17],["|212|020|011",17],["2|210|02|011",17],["|210|021|012",17],["|210|021|021",17],["2|201|02|011",17],["|201|021|012",17],["|202|021|011",17],["122|1|020|01",17],["121||020|012",17],["2|211|001|02",17],["|212|001|021",17],["122|1|002|01",17],["121||002|012",17],["120||022|011",17],["120|2|021|01",17],["120|221||010",17],["121|220||010",17],["121|2|02|010",17],["122||012|010",17],["122||021|010",17],["|211|022|010",17],["1|212|02|010",17],["110|212||020",17],["|210|011|022",17],["1|210|012|02",17],["112|210||020",17],["1|212|01|020",17],["122||011|020",17],["121|2|01|020",17],["|211|012|020",17],["|211|021|020",17],["101|201|2|02",17],["101|202||021",17],["102|201||021",17],["120|201||021",17],["121|201||020",17],["121|20|0|021",17],["21|201|01|02",17],["2|201|01|021",17],["101|012|202|",17],["102|012|201|",17],["102|01|202|1",17],["102|010|212|",17],["102|012|210|",17],["10|012|212|0",17],["01|021|20|21",17],["0|021|201|21",17],["|012|212|010",17],["121|021||020",17],["0|01|221|201",17],["10|1|220|210",17],["102|020||211",17],["101|020|2|21",17],["10|021|2|210",17],["100|021||212",17],["102|1|200|21",17],["102||201|210",17],["102||210|210",17],["101|022||210",17],["101||200|212",17],["120|1|200|21",17],["120||201|210",17],["121||200|210",17],["0|011|20|212",17],["|010|201|212",17],["121|012||200",17],["121|010|2|20",17],["120|01|2|201",17],["120|011||202",17],["0|012|211|20",17],["|012|210|201",17],["|012|201|201",17],["122|010||201",17],["|010|211|202",17],["0|021|211|20",17],["|021|210|201",17],["|020|211|201",17],["100|1|21|202",17],["101||210|202",17],["100|1|21|220",17],["101||210|220",17],["101|002|212|",17],["101|0|212|20",17],["102|001|212|",17],["102||211|200",17],["102|0|21|201",17],["100||212|201",17],["|011|212|200",17],["1|010|212|20",17],["0|011|20|221",17],["|010|201|221",17],["110|012|202|",17],["112|010|202|",17],["1|010|202|21",17],["|012|200|211",17],["1|012|20|210",17],["100||202|211",17],["101|0|202|21",17],["|011|202|210",17],["120|10|21|20",17],["120|1|210|20",17],["102|12|02|01",17],["102|1|02|012",17],["102|0|12|012",17],["10|02|12|012",17],["210|120|2|10",17],["210|12|20|10",17],["210|20|120|1",17],["21|20|120|10",17],["210|2|12|010",17],["210||120|012",17],["212||120|010",17],["210||121|020",17],["210||120|021",17],["21|1|120|020",17],["212|21|01|00",17],["212|21|0|001",17],["212|210|100|",17],["212|201|100|",17],["212|20|1|010",17],["212|200||011",17],["210|221|01|0",17],["21|221|010|0",17],["210|220|101|",17],["21|220|100|1",17],["212||101|002",17],["212|20|101|0",17],["212||102|001",17],["21|201|102|0",17],["211|200|102|",17],["201|221||010",17],["20|221|0|011",17],["202|21|101|0",17],["202|211|100|",17],["202|210||011",17],["202|201||011",17],["202|20|110|1",17],["202|20|11|10",17],["202||110|012",17],["202||112|010",17],["202|21|1|010",17],["20|210|1|012",17],["200|211||012",17],["201|220|1|10",17],["20|220|1|101",17],["221|210|010|",17],["221|210|0|01",17],["221|21|0|010",17],["221|201|0|01",17],["221|20|01|01",17],["210|212|01|0",17],["21|212|010|0",17],["21|212|001|0",17],["21|212|00|01",17],["201|212||010",17],["20|212|0|011",17],["200|210|121|",17],["201|210|120|",17],["200|21|120|1",17],["220|210|10|1",17],["220|21|10|10",17],["210|210|102|",17],["201|210|102|",17],["200|21|102|1",17],["200|212|101|",17],["2|210|10|021",17],["2|21|101|020",17],["220|201||101",17],["220|201|10|1",17],["220|20|101|1",17],["210|202|101|",17],["21|202|100|1",17],["201|202|1|10",17],["20|202|1|101",17],["20|202|10|11",17],["20|202|1|110",17],["211|201||020",17],["210|201||021",17],["211|20|0|021",17],["201|201||012",17],["210|201||012",17],["211|20|0|012",17],["211|202||010",17],["2|201|120|01",17],["2|20|121|010",17],["212|021|100|",17],["212|020||011",17],["21|021|2|001",17],["212|02|101|0",17],["210|022|101|",17],["21|021|102|0",17],["211|020|102|",17],["210|021||021",17],["210|021||012",17],["210|02|2|011",17],["202|021||011",17],["201|021||012",17],["201|02|2|011",17],["1|020|122|01",17],["|020|121|012",17],["1|012|12|002",17],["201|012|12|0",17],["201|010|122|",17],["202|01|121|0",17],["202|011|120|",17],["200|012|121|",17],["|010|121|022",17],["1|01|120|022",17],["|012|120|021",17],["|012|120|012",17],["1|01|102|022",17],["|012|102|021",17],["|012|101|022",17],["211|010|2|02",17],["212|010||021",17],["1|002|122|01",17],["|002|121|012",17],["210|011||022",17],["210|012|1|02",17],["210||112|020",17],["212||110|020",17],["211|001|2|02",17],["212|001||021",17],["212|01|1|020",17],["211|021||020",17],["211|012||020",17],["|011|122|020",17],["2|01|121|020",17],["212|02|1|010",17],["211|022||010",17],["|021|122|010",17],["|012|122|010",17],["220||121|010",17],["|022|120|011",17],["2|021|120|01",17],["221||120|010",17],["2|02|121|010",17],["202|1|102|01",17],["202||101|012",17],["201||102|012",17],["212|0|10|012",17],["212||102|010",17],["210||102|012",17],["12|02|102|01",17],["1|02|102|012",17],["202|101|021|",17],["201|102|021|",17],["201|101|02|2",17],["201|120|021|",17],["201|121|020|",17],["20|121|021|0",17],["02|10|012|12",17],["0|102|012|12",17],["|121|021|020",17],["212||012|010",17],["0|112|02|102",17],["210|100|2|12",17],["210|102||120",17],["212|100||120",17],["201|100|2|12",17],["201|102||120",17],["201|120||120",17],["201||010|122",17],["202|1|010|12",17],["20|1|012|120",17],["200||012|121",17],["20|110|2|120",17],["202|100||121",17],["202||011|120",17],["0|10|022|121",17],["|102|020|121",17],["202|120||110",17],["202|121|0|10",17],["202|121|001|",17],["201|121|002|",17],["200|12|2|110",17],["201|12|0|102",17],["201|122||100",17],["200|121||102",17],["|121|022|100",17],["2|121|020|10",17],["0|10|022|112",17],["|102|020|112",17],["220|101|021|",17],["221|101|020|",17],["2|101|020|12",17],["|100|021|122",17],["2|10|021|120",17],["200|101||122",17],["202|101|0|12",17],["|101|022|120",17],["202|120||101",17],["200|12|2|101",17],["212||021|100",17],["212|1|020|10",17],["210||022|101",17],["210|1|02|102",17],["0|122|021|10",17],["|120|021|102",17],["|102|021|102",17],["211||020|102",17],["|122|020|101",17],["0|122|012|10",17],["|122|010|102",17],["|120|012|102",17],["201|01|21|02",17],["201|01|2|021",17],["201|21|0|021",17],["20|21|01|021",17],["201|021|01|2",17],["201|02|01|21",17],["202|021||101",17],["201|021||102",17],["201|02|2|101",17],["201|020||121",17],["201|021||120",17],["20|021|0|121",17],["121|002|021|",17],["1|002|021|12",17],["1|002|02|121",17],["12|002|01|12",17],["1|002|012|12",17],["202|011|021|",17],["201|012|021|",17],["201|011|02|2",17],["210|021|021|",17],["210|012|021|",17],["210|011|02|2",17],["212|011|020|",17],["212|0|02|101",17],["21|0|021|102",17],["21|001|021|2",17],["21|001|02|21",17],["121|02|020|1",17],["12|021|020|1",17],["112|02|020|1",17],["11|02|020|12",17],["1|01|020|122",17],["|012|020|121",17],["121|02|002|1",17],["12|021|002|1",17],["212|020||110",17],["212|020|01|1",17],["212|021|001|",17],["210|020||112",17],["210|02|012|1",17],["210|022|011|",17],["211|02|001|2",17],["12|020|02|11",17],["1|020|02|112",17],["211|020|021|",17],["211|020|012|",17],["|020|011|122",17],["2|020|01|121",17],["1|01|002|122",17],["|012|002|121",17],["212|010|02|1",17],["211|010|022|",17],["|010|021|122",17],["|010|012|122",17],["221|010|01|2",17],["22|010|01|21",17],["221|010||120",17],["220|010||121",17],["2|010|02|121",17],["|011|022|120",17],["2|01|021|120",17],["2|012|001|21",17],["2|01|001|212",17],["212|001|01|2",17],["21|001|012|2",17],["|001|012|212",17],["212|021|010|",17],["211|02|010|2",17],["21|01|010|22",17],["2|01|010|221",17],["2|012|010|21",17],["2|01|010|212",17],["201|0|012|12",17],["202|0|01|121",17],["1|022|01|120",17],["|021|012|120",17],["|012|012|120",17],["|022|010|121",17],["1|022|01|102",17],["|022|012|101",17],["|021|012|102",17],["20|2|120|110",17],["202|010|12|1",17],["20|012|120|1",17],["202||121|100",17],["201|2|12|100",17],["201||120|102",17],["201||120|120",17],["210|2|12|100",17],["210||120|102",17],["212||120|100",17],["0|022|121|10",17],["|020|121|102",17],["0|02|102|112",17],["212|020|10|1",17],["210|02|102|1",17],["|020|101|122",17],["0|021|10|122",17],["|021|102|120",17],["|021|102|102",17],["0|012|10|122",17],["|012|102|120",17],["|010|102|122",17],["200|2|101|12",17],["202||101|120",17],["0|022|112|10",17],["|020|112|102",17],["200|2|110|12",17],["202||110|120",17],["201||100|122",17],["201|0|102|12",17],["201|002||121",17],["202|001||121",17],["202|0|10|121",17],["200||120|121",17],["200||102|121",17],["|022|100|121",17],["2|020|10|121",17],["221|020||101",17],["|021|122|100",17],["2|021|120|10",17],["220|021||101",17],["2|020|12|101",17],["200||122|101",17],["202|0|12|101",17],["|022|120|101",17],["|022|102|101",17],["210|20|10|12",17],["210|2|10|120",17],["210|010|2|12",17],["210|012||120",17],["212|010||120",17],["210|021||120",17],["210|020||121",17],["21|020|1|120",17],["102||202|101",17],["120|020||121",17],["02|012|12|10",17],["0|012|12|102",17],["12|01|02|102",17],["1|012|02|102",17],["021|201|2|01",17],["02|201|21|01",17],["220|210||101",17],["220|21|1|100",17],["201|202|011|",17],["210|202|011|",17],["21|202|0|101",17],["211|202||100",17],["221|201|010|",17],["221|20|011|0",17],["|202|012|110",17],["210|20|012|1",17],["211|200|012|",17],["|202|010|112",17],["21|202|010|1",17],["20|212|010|1",17],["200|212|011|",17],["201|212||100",17],["210|212||100",17],["|212|002|101",17],["|212|001|102",17],["201|21|0|102",17],["200|211||102",17],["20|212|0|101",17],["202|201|10|1",17],["202|20|101|1",17],["202|210||101",17],["202|21|1|100",17],["201|211|020|",17],["201|210|021|",17],["20|211|021|0",17],["201|220|101|",17],["201|221|01|0",17],["20|221|01|01",17],["202|211|010|",17],["201|201|012|",17],["201|210|012|",17],["20|211|012|0",17],["201|2|01|120",17],["20|2|010|121",17],["210|220|1|10",17],["21|220|10|10",17],["212|201|010|",17],["212|20|011|0",17],["212|210|0|01",17],["212|21|0|010",17],["210|200||121",17],["210|201||120",17],["21|200|1|120",17],["212|200||101",17],["210|210||102",17],["210|201||102",17],["21|200|1|102",17],["210|2|021|10",17],["21|2|020|101",17],["210|221||010",17],["121|202||100",17],["120|20|2|110",17],["120|20|012|1",17],["12|202|010|1",17],["120|201||120",17],["120|201||102",17],["12|201|2|100",17],["120|212||100",17],["120|210||102",17],["12|210|2|100",17],["121|0|022|10",17],["121||020|102",17],["102|0|02|112",17],["101||020|122",17],["102|210|02|1",17],["10|212|020|1",17],["102||021|102",17],["102||021|120",17],["10|0|021|122",17],["102||010|122",17],["102||012|120",17],["10|0|012|122",17],["101|200|2|12",17],["101|202||120",17],["112|0|022|10",17],["112||020|102",17],["120|200||121",17],["102|200||121",17],["10|2|020|121",17],["100||022|121",17],["110|200|2|12",17],["110|202||120",17],["100|201||122",17],["102|201|0|12",17],["|201|002|121",17],["|202|001|121",17],["10|202|0|121",17],["12|202|0|101",17],["122|200||101",17],["120||022|101",17],["102||022|101",17],["|221|020|101",17],["122||021|100",17],["120|2|021|10",17],["|220|021|101",17],["12|2|020|101",17],["21|201|021|0",17],["21|20|021|01",17],["2|201|02|101",17],["|201|021|102",17],["|202|021|101",17],["0|20|021|121",17],["|201|021|120",17],["|201|020|121",17],["0|212|012|10",17],["|212|010|102",17],["|210|012|102",17],["1|202|01|102",17],["|202|012|101",17],["|201|012|102",17],["12|02|012|10",17],["12|0|012|102",17],["012|1|102|02",17],["01|12|102|02",17],["012|210|120|",17],["010|212|120|",17],["010|210|12|2",17],["021|210|120|",17],["020|210|121|",17],["020|21|120|1",17],["|202|102|101",17],["020||120|121",17],["021|212||001",17],["020|212|1|01",17],["020|212|110|",17],["020|210|112|",17],["02|211|2|001",17],["02|210|1|012",17],["022|210||011",17],["020|211||012",17],["020||122|011",17],["020|2|121|01",17],["012||121|002",17],["01|1|122|002",17],["010|221|120|",17],["010|2|121|02",17],["010|220|121|",17],["01|2|120|021",17],["011||120|022",17],["010|211||022",17],["010|212|1|02",17],["010||122|021",17],["002|1|12|012",17],["012||121|020",17],["01|1|122|020",17],["011|201|2|02",17],["011|202||021",17],["012|201||021",17],["001|21|2|021",17],["011|210|2|02",17],["012|210||021",17],["021|210||021",17],["0|212|101|02",17],["0|21|102|021",17],["011|212||020",17],["021|212||010",17],["02|211|2|010",17],["022|1|102|01",17],["022||101|012",17],["021||102|012",17],["022|1|120|01",17],["021||120|012",17],["012||120|012",17],["0|202|121|01",17],["0|201|12|012",17],["022||121|010",17],["10|210|20|12",17],["10|210|2|120",17],["20|210|1|120",17],["20|21|10|120",17],["212|012|001|",17],["101|012|022|",17],["102|012|021|",17],["102|01|022|1",17],["121|010|022|",17],["120|012|012|",17],["120|012|021|",17],["120|01|022|1",17],["121|01|0|202",17],["12|012|0|201",17],["12|012|002|1",17],["12|01|002|12",17],["212|010|01|2",17],["21|010|012|2",17],["2|010|02|211",17],["|010|021|212",17],["21|02|001|21",17],["2|021|001|21",17],["2|001|02|211",17],["|001|021|212",17],["120||010|221",17],["120|021|01|2",17],["120|022|011|",17],["121||010|220",17],["121|02|010|2",17],["121|002|012|",17],["122|002|01|1",17],["122|012|010|",17],["122|021|010|",17],["|022|010|211",17],["1|02|010|212",17],["121|01|020|2",17],["122|011|020|",17],["|012|020|211",17],["|021|020|211",17],["110||020|212",17],["|011|022|210",17],["1|012|02|210",17],["112||020|210",17],["1|01|020|212",17],["121|020|012|",17],["122|020|01|1",17],["1|020|021|12",17],["1|020|02|121",17],["102|021|0|21",17],["101|02|0|212",17],["|020|011|212",17],["2|02|011|210",17],["|021|012|210",17],["|021|021|210",17],["2|02|011|201",17],["|021|011|202",17],["|021|012|201",17],["|021|002|121",17],["101|212||200",17],["10|210|1|220",17],["101|21|020|2",17],["10|210|021|2",17],["102|210||210",17],["102|210||201",17],["102|21|1|200",17],["121|210||200",17],["120|210||201",17],["120|21|1|200",17],["0|212|011|20",17],["|212|010|201",17],["0|201|01|221",17],["120|201|01|2",17],["121|20|010|2",17],["|202|010|211",17],["0|20|012|211",17],["|201|012|210",17],["|201|012|201",17],["0|20|021|211",17],["|201|021|210",17],["|201|020|211",17],["100|202|1|21",17],["101|202||210",17],["0|221|011|20",17],["|221|010|201",17],["102|200||211",17],["102|201|0|21",17],["102||001|212",17],["101||002|212",17],["100|220|1|21",17],["101|220||210",17],["101|20|0|212",17],["100|210||212",17],["100|201||212",17],["|200|011|212",17],["1|20|010|212",17],["101|21|0|202",17],["100|211||202",17],["|210|011|202",17],["|201|011|202",17],["112||010|202",17],["|211|012|200",17],["1|210|012|20",17],["110||012|202",17],["1|21|010|202",17],["102|02|012|1",17],["102|02|01|12",17],["102|1|01|202",17],["102||012|201",17],["101||012|202",17],["102||010|212",17],["102||012|210",17],["10|0|012|212",17],["120|20|10|21",17],["120|20|1|210",17],["120|1|020|21",17],["120||021|210",17],["121||020|210",17],["120||012|210",17],["120||010|212",17],["12|2|010|210",17],["210||010|212",17],["201|101||202",17],["01|21|021|20",17],["0|21|021|201",17],["21|01|02|201",17],["2|01|021|201",17],["102|202|110|",17],["102|010|122|",17],["102|012|120|",17],["10|012|122|0",17],["101|020|122|",17],["102|021|102|",17],["102|021|120|",17],["10|021|122|0",17],["102|02|1|210",17],["10|020|1|212",17],["102|02|112|0",17],["10|02|112|02",17],["101|202|10|2",17],["101|20|102|2",17],["101|2|12|200",17],["101||120|202",17],["120|2|110|20",17],["12|20|110|20",17],["110|2|12|200",17],["110||120|202",17],["102|022|101|",17],["120|022|101|",17],["12|0|101|202",17],["122||101|200",17],["112|020|102|",17],["112|022|10|0",17],["|021|101|220",17],["120|021|10|2",17],["122|021|100|",17],["|020|101|221",17],["12|020|101|2",17],["10|020|121|2",17],["100|022|121|",17],["102||121|200",17],["120||121|200",17],["|001|121|202",17],["100||122|201",17],["102|0|12|201",17],["|002|121|201",17],["10|0|121|202",17],["121|020|102|",17],["121|022|10|0",17],["121|0|120|02",17],["121|0|12|020",17],["121||100|202",17],["120|012|1|20",17],["12|010|1|202",17],["120||120|201",17],["120||102|201",17],["12|2|100|201",17],["120||100|212",17],["120||102|210",17],["12|2|100|210",17],["120||112|020",17],["202|010||211",17],["201|01|0|221",17],["201|01|120|2",17],["20|010|121|2",17],["201|012||201",17],["201|012||210",17],["20|012|0|211",17],["201|020||211",17],["201|021||210",17],["20|021|0|211",17],["202|1|100|21",17],["202||101|210",17],["210|1|10|220",17],["212||101|200",17],["210|021|10|2",17],["21|020|101|2",17],["210||102|210",17],["210||102|201",17],["21|1|102|200",17],["210||121|200",17],["210||120|201",17],["21|1|120|200",17],["212|011|0|20",17],["212|010||201",17],["220|1|100|21",17],["220||101|210",17],["201|011||202",17],["210|011||202",17],["21|0|101|202",17],["211||100|202",17],["221|011|0|20",17],["221|010||201",17],["211|012||200",17],["210|012|1|20",17],["|012|110|202",17],["|010|112|202",17],["21|010|1|202",17],["20|010|1|212",17],["200|011||212",17],["201||100|212",17],["210||100|212",17],["|002|101|212",17],["200||102|211",17],["201|0|102|21",17],["|001|102|212",17],["20|0|101|212",17],["12|012|102|0",17],["12|012|10|02",17],["0|012|10|212",17],["|012|102|210",17],["|010|102|212",17],["1|01|102|202",17],["|012|102|201",17],["|012|101|202",17],["21|021|01|20",17],["21|021|0|201",17],["0|021|121|20",17],["|021|120|201",17],["|020|121|201",17],["2|02|101|201",17],["|021|101|202",17],["|021|102|201",17],["|201|101|202",17],["010|210||212",17],["20|10|120|21",17],["20|1|120|210",17],["10|20|12|210",17],["10|2|120|210",17],["120|020|112|",18],["121|202|100|",18],["120|201|102|",18],["12|201|100|2",18],["120|20|110|2",18],["121|020|12|0",18],["121|02|120|0",18],["121|0|10|022",18],["121||102|020",18],["102|0|112|02",18],["101|202|120|",18],["101|200|12|2",18],["101|2|102|20",18],["101|2|10|202",18],["101||122|020",18],["102||120|021",18],["10|0|122|021",18],["102||110|202",18],["112||120|020",18],["120|020|121|",18],["120|0|121|02",18],["12|0|121|020",18],["102|0|121|02",18],["10|02|121|02",18],["10|210|120|2",18],["10|210|12|20",18],["10|201|120|2",18],["10|201|12|20",18],["|202|121|010",18],["|201|120|012",18],["110|202|102|",18],["120|20|101|2",18],["12|20|101|20",18],["102||101|202",18],["102|20|101|2",18],["10|202|101|2",18],["12|02|10|012",18],["12|0|102|012",18],["12|02|10|021",18],["12|0|102|021",18],["|210|102|021",18],["|212|101|020",18],["121|202|010|",18],["120|201|012|",18],["120|12|01|02",18],["120|1|012|02",18],["102|12|01|02",18],["102|1|012|02",18],["2|21|010|021",18],["101|212|020|",18],["102|210|021|",18],["21|210|02|01",18],["2|210|021|01",18],["21|201|02|01",18],["2|201|021|01",18],["12|1|020|012",18],["2|21|001|021",18],["12|1|002|012",18],["120|1|022|01",18],["120||021|012",18],["121||022|010",18],["2|211|02|010",18],["|212|021|010",18],["2|210|011|02",18],["|210|012|021",18],["|212|011|020",18],["122|1|01|020",18],["121||012|020",18],["101|020||212",18],["102|021||210",18],["102|10|20|21",18],["102|1|20|210",18],["120|10|20|21",18],["120|1|20|210",18],["0|01|201|212",18],["121|010||202",18],["120|012||201",18],["01|012|21|20",18],["0|012|21|201",18],["01|021|21|20",18],["0|021|21|201",18],["10|1|210|202",18],["10|1|210|220",18],["101||212|200",18],["102|1|21|200",18],["102||210|201",18],["0|011|212|20",18],["|010|212|201",18],["0|01|201|221",18],["|010|202|211",18],["0|012|20|211",18],["|012|201|210",18],["100|1|202|21",18],["101||202|210",18],["212|210|01|0",18],["212|21|010|0",18],["212|201||010",18],["212|20|0|011",18],["210|221|010|",18],["210|220|10|1",18],["212|200|101|",18],["210|201|102|",18],["21|200|102|1",18],["201|221|0|01",18],["202|210|101|",18],["202|21|100|1",18],["202|201|1|10",18],["202|20|1|101",18],["202|211||010",18],["201|210||012",18],["20|211|0|012",18],["201|220||101",18],["221|210||010",18],["210|212|010|",18],["210|212|0|01",18],["21|212|0|010",18],["201|212|0|01",18],["20|212|01|01",18],["20|210|120|1",18],["20|21|120|10",18],["20|210|102|1",18],["20|21|102|10",18],["220|201|101|",18],["210|202|10|1",18],["21|202|10|10",18],["201|202||101",18],["201|202|10|1",18],["20|202|101|1",18],["21|201|0|021",18],["21|20|01|021",18],["21|201|0|012",18],["21|20|01|012",18],["212|020|101|",18],["210|021|102|",18],["210|021|2|01",18],["210|02|21|01",18],["201|021|2|01",18],["201|02|21|01",18],["1|020|12|012",18],["201|012|120|",18],["202|010|121|",18],["12|01|120|02",18],["1|012|120|02",18],["12|01|102|02",18],["1|012|102|02",18],["21|010|2|021",18],["1|002|12|012",18],["210|011|2|02",18],["210|012||021",18],["21|001|2|021",18],["212|011||020",18],["1|01|122|020",18],["|012|121|020",18],["212|021||010",18],["211|02|2|010",18],["1|022|120|01",18],["|021|120|012",18],["|022|121|010",18],["210|10|20|12",18],["210|10|2|120",18],["201|10|20|12",18],["201|10|2|120",18],["202||010|121",18],["201||012|120",18],["0|102|02|121",18],["202|121||100",18],["20|120|2|110",18],["201|120||102",18],["201|12|2|100",18],["0|121|022|10",18],["|121|020|102",18],["0|102|02|112",18],["|101|020|122",18],["0|10|021|122",18],["|102|021|120",18],["200|101|2|12",18],["202|101||120",18],["20|120|2|101",18],["212||020|101",18],["210||021|102",18],["02|12|021|10",18],["0|12|021|102",18],["02|12|012|10",18],["0|12|012|102",18],["|002|021|121",18],["201|01|021|2",18],["201|01|02|21",18],["210|01|021|2",18],["210|01|02|21",18],["121|021|020|",18],["1|021|020|12",18],["1|02|020|121",18],["12|01|020|12",18],["1|012|020|12",18],["121|021|002|",18],["212|020|011|",18],["210|021|012|",18],["210|02|011|2",18],["21|021|001|2",18],["121|020|02|1",18],["12|020|021|1",18],["1|020|01|122",18],["|020|012|121",18],["1|012|002|12",18],["212|010|021|",18],["211|010|02|2",18],["2|010|012|21",18],["2|010|01|212",18],["|010|022|121",18],["1|01|022|120",18],["|012|021|120",18],["|012|001|212",18],["212|001|012|",18],["21|021|010|2",18],["21|02|010|21",18],["212|01|010|2",18],["21|012|010|2",18],["|012|010|212",18],["12|02|01|120",18],["1|02|012|120",18],["12|02|01|102",18],["1|02|012|102",18],["201|20|12|10",18],["201|2|120|10",18],["210|20|12|10",18],["210|2|120|10",18],["0|02|121|102",18],["02|021|10|12",18],["0|021|102|12",18],["02|012|10|12",18],["0|012|102|12",18],["20|2|101|120",18],["0|02|112|102",18],["20|2|110|120",18],["201|2|100|12",18],["201||102|120",18],["202||100|121",18],["0|022|10|121",18],["|020|102|121",18],["0|021|122|10",18],["|021|120|102",18],["|020|122|101",18],["200|2|12|101",18],["202||120|101",18],["220|210|1|10",18],["210|202||101",18],["21|202|1|100",18],["221|201|01|0",18],["210|201|012|",18],["211|20|012|0",18],["211|202|010|",18],["201|212|010|",18],["20|212|011|0",18],["201|210||102",18],["200|21|1|102",18],["200|212||101",18],["202|201|101|",18],["202|210|1|10",18],["202|21|10|10",18],["201|21|021|0",18],["20|21|021|01",18],["201|21|012|0",18],["20|21|012|01",18],["212|201|01|0",18],["212|20|01|01",18],["212|210||010",18],["210|20|1|120",18],["21|20|10|120",18],["210|20|1|102",18],["21|20|10|102",18],["120|201|2|10",18],["12|201|20|10",18],["120|210|2|10",18],["12|210|20|10",18],["121|0|02|102",18],["102|0|021|12",18],["10|02|021|12",18],["102|0|012|12",18],["10|02|012|12",18],["101|20|2|120",18],["112|0|02|102",18],["102||020|121",18],["10|0|022|121",18],["110|20|2|120",18],["100|201|2|12",18],["102|201||120",18],["100|202||121",18],["120|202||101",18],["12|200|2|101",18],["122|0|021|10",18],["120||021|102",18],["122||020|101",18],["020|212||011",18],["021|21|2|001",18],["021|210||012",18],["02|210|2|011",18],["020|1|122|01",18],["020||121|012",18],["012|1|12|002",18],["010||121|022",18],["012||120|021",18],["01|1|120|022",18],["010|211|2|02",18],["010|212||021",18],["012|1|12|020",18],["01|201|21|02",18],["01|201|2|021",18],["01|210|21|02",18],["01|210|2|021",18],["021|21|2|010",18],["02|12|102|01",18],["02|1|102|012",18],["02|12|120|01",18],["02|1|120|012",18],["102|012|02|1",18],["102|01|02|12",18],["120|012|02|1",18],["120|01|02|12",18],["212|010|012|",18],["21|010|02|21",18],["2|010|021|21",18],["2|001|021|21",18],["120|021|012|",18],["120|022|01|1",18],["121|022|010|",18],["12|002|012|1",18],["2|02|010|211",18],["|021|010|212",18],["121|012|020|",18],["122|01|020|1",18],["2|011|02|210",18],["|012|021|210",18],["|011|020|212",18],["12|020|012|1",18],["12|020|01|12",18],["|020|021|121",18],["21|02|01|210",18],["2|021|01|210",18],["21|02|01|201",18],["2|021|01|201",18],["102|210|1|20",18],["102|21|10|20",18],["120|210|1|20",18],["120|21|10|20",18],["0|212|01|201",18],["01|20|012|21",18],["0|201|012|21",18],["01|20|021|21",18],["0|201|021|21",18],["10|202|1|210",18],["0|221|01|201",18],["102|200|1|21",18],["102|201||210",18],["10|220|1|210",18],["101|200||212",18],["0|20|011|212",18],["|201|010|212",18],["101|210||202",18],["100|21|1|202",18],["0|211|012|20",18],["|210|012|201",18],["|211|010|202",18],["102|012|12|0",18],["10|012|12|02",18],["102|021|12|0",18],["10|021|12|02",18],["101|202|102|",18],["101|20|12|20",18],["101|2|120|20",18],["110|2|120|20",18],["120||101|202",18],["12|2|101|200",18],["112|02|102|0",18],["120|021|102|",18],["122|021|10|0",18],["122|020|101|",18],["102|020|121|",18],["10|022|121|0",18],["100|2|12|201",18],["102||120|201",18],["100||121|202",18],["121|02|102|0",18],["121|02|10|02",18],["121||120|020",18],["120|2|10|201",18],["12|20|10|201",18],["120|2|10|210",18],["12|20|10|210",18],["201|012|0|21",18],["20|012|01|21",18],["201|021|0|21",18],["20|021|01|21",18],["202|1|10|210",18],["210|1|102|20",18],["21|10|102|20",18],["210|1|120|20",18],["21|10|120|20",18],["212|01|0|201",18],["220|1|10|210",18],["210||101|202",18],["21|1|100|202",18],["221|01|0|201",18],["211|012|0|20",18],["210|012||201",18],["211|010||202",18],["201|010||212",18],["20|011|0|212",18],["200|1|102|21",18],["201||102|210",18],["200||101|212",18],["120|201|10|2",19],["12|201|10|20",19],["121|020|120|",19],["121|0|102|02",19],["101|20|120|2",19],["101||102|202",19],["102|0|12|021",19],["10|02|12|021",19],["120||121|020",19],["102|202|101|",19],["120|12|02|01",19],["120|1|02|012",19],["2|21|021|010",19],["21|210|01|02",19],["2|210|01|021",19],["12|1|012|020",19],["102|10|21|20",19],["102|1|210|20",19],["0|01|212|201",19],["01|012|20|21",19],["0|012|201|21",19],["10|1|202|210",19],["212|210|010|",19],["212|201|0|01",19],["210|20|102|1",19],["21|20|102|10",19],["202|210|10|1",19],["202|201||101",19],["201|21|0|012",19],["20|21|01|012",19],["210|212||010",19],["201|202|101|",19],["210|01|21|02",19],["210|01|2|021",19],["1|012|12|020",19],["21|021|2|010",19],["12|02|120|01",19],["1|02|120|012",19],["201|120|2|10",19],["201|12|20|10",19],["0|121|02|102",19],["02|10|021|12",19],["0|102|021|12",19],["20|101|2|120",19],["|021|020|121",19],["210|021|01|2",19],["210|02|01|21",19],["121|020|021|",19],["1|020|012|12",19],["21|010|021|2",19],["|010|012|212",19],["12|01|02|120",19],["1|012|02|120",19],["212|012|010|",19],["201|20|10|12",19],["201|2|10|120",19],["0|02|102|121",19],["02|021|12|10",19],["0|021|12|102",19],["20|2|120|101",19],["210|202|1|10",19],["21|201|012|0",19],["21|20|012|01",19],["201|212|01|0",19],["20|210|1|102",19],["20|21|10|102",19],["102|0|02|121",19],["10|201|20|12",19],["10|201|2|120",19],["120|20|2|101",19],["12|02|021|10",19],["12|0|021|102",19],["021|210|2|01",19],["02|210|21|01",19],["020|1|12|012",19],["012|1|120|02",19],["01|12|120|02",19],["010|21|2|021",19],["120|02|012|1",19],["120|02|01|12",19],["2|021|010|21",19],["12|012|020|1",19],["21|01|02|210",19],["2|01|021|210",19],["102|20|10|21",19],["102|20|1|210",19],["0|201|01|212",19],["10|210|1|202",19],["01|21|012|20",19],["0|21|012|201",19],["120|2|101|20",19],["12|021|102|0",19],["12|021|10|02",19],["102|02|121|0",19],["10|20|12|201",19],["10|2|120|201",19],["210|1|10|202",19],["21|012|01|20",19],["21|012|0|201",19],["201|01|0|212",19],["20|10|102|21",19],["20|1|102|210",19]]};
function generateTrialSortPuzzle(mode,date){const items=sortTrialBoards[mode],n=items.length,day=date===null?null:Math.floor(Date.parse(date+'T00:00:00Z')/86400000),index=day===null?Math.floor(Math.random()*n):((day+7*Math.floor(day/n))%n+n)%n,[key,limit]=items[index];return {tubes:key.split('|').map(x=>[...x].map(Number)),limit};}
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
    let date=null, initial,trial=null;const trialMode=sortDifficulty==='legacy'?null:sortDifficulty;
    const group=document.createElement('div');group.className='lights-modes';group.setAttribute('role','group');group.setAttribute('aria-label','難易度');
    for(const [value,label] of [['easy','かんたん'],['normal','ふつう'],['hard','難関'],['oni','鬼'],['kiwami','極']]) {const option=document.createElement('button');option.type='button';option.dataset.difficulty=value;option.textContent=label;option.setAttribute('aria-pressed',String(value===sortDifficulty));option.addEventListener('click',event=>{if(value===sortDifficulty)return;sortDifficulty=value;start();if(event.detail===0)document.querySelector(`.lights-modes [data-difficulty="${value}"]`)?.focus()});group.append(option)}
    status.before(group);let legacyButton=null,notice=null;
    if(daily){
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const part=type=>Number(parts.find(item=>item.type===type).value);
      date=`${part('year')}-${String(part('month')).padStart(2,'0')}-${String(part('day')).padStart(2,'0')}`;
      category.textContent=`今日のパズル ${date}`;
      let oldRecord=false;try{for(const key of ['kihamda-daily-sort','kihamda-daily-sort-previous']){const raw=localStorage.getItem(key);if(raw===null)continue;try{if(JSON.parse(raw)?.date===date)oldRecord=true}catch(_){oldRecord=true}}}catch(_){oldRecord=true}
      const openLegacy=event=>{sortDifficulty=sortDifficulty==='legacy'?'normal':'legacy';start();if(event.detail===0)(sortDifficulty==='legacy'?document.querySelector('.circuit-legacy'):document.querySelector('.lights-modes [data-difficulty="normal"]'))?.focus()};
      if(oldRecord||sortDifficulty==='legacy'){legacyButton=document.createElement('button');legacyButton.type='button';legacyButton.className='circuit-legacy';legacyButton.textContent=sortDifficulty==='legacy'?'ふつうに戻る':'以前の問題を開く';legacyButton.addEventListener('click',openLegacy);board.after(legacyButton)}
      if(sortVersion===null&&sortRequested==='normal'&&sortDifficulty==='normal'){notice=document.createElement('details');notice.className='circuit-notice';const summary=document.createElement('summary');summary.textContent='以前のリンクについて';const text=document.createElement('p');text.textContent='以前の共有リンクでは、今の「ふつう」が開くよ。以前の問題も今日の日付で遊べるよ。';notice.append(summary,text);if(!legacyButton){const open=document.createElement('button');open.type='button';open.className='circuit-legacy';open.textContent='以前の問題を開く';open.addEventListener('click',openLegacy);notice.append(open)}board.after(notice)}
      if(trialMode){trial=generateTrialSortPuzzle(trialMode,date);initial=trial.tubes}else initial=generateDailySortPuzzle(part('year'),part('month'),part('day'));
    } else {category.textContent='パズル';if(trialMode){trial=generateTrialSortPuzzle(trialMode,null);initial=trial.tubes}else initial=generateSortPuzzle();}
    cleanup=()=>{group.remove();legacyButton?.remove();notice?.remove()};
    const fixedTargets=['oni','kiwami'].includes(trialMode),moveLimit=trialMode==='kiwami'?trial.limit:null;if(fixedTargets)instructions.textContent=moveLimit?`${moveLimit}手以内に、決まった色のボトルに玉をそろえよう。`:'決まった色のボトルに玉をそろえよう。空きか、同じ色の上に移せるよ。';
    board.classList.add('sort');
    const names=['あか','あお','きいろ'], symbols=['●','▲','◆'], storage=daily ? dailyStorage(trialMode?`sort-${trialMode}-v2`:'sort',date) : null;
    let tubes=initial.map(t=>[...t]), selected=null, history=[], actions=[], won=false;
    const isWon=state=>fixedTargets?state.every((t,i)=>i===3?t.length===0:t.length===3&&t.every(c=>c===i)):state.every(t=>!t.length || (t.length===3 && t.every(c=>c===t[0])));
    const canMove=(state,from,to)=>Number.isInteger(from)&&Number.isInteger(to)&&from>=0&&from<4&&to>=0&&to<4&&from!==to&&state[from].length>0&&state[to].length<3&&(!state[to].length||state[to].at(-1)===state[from].at(-1));
    if(daily){
      try{
        if(reset)storage.clear();
        const saved=storage.load();
        if(saved&&Array.isArray(saved.actions)&&saved.actions.length<=10000&&(moveLimit===null||saved.actions.length<=moveLimit)){
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
      if(won||moveLimit!==null&&actions.length>=moveLimit)return;
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
    buttons.forEach(b=>{let armed=false;b.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();if(!event.repeat)armed=true}});b.addEventListener('keyup',event=>{if(event.key===' '&&armed){event.preventDefault();armed=false;if(document.activeElement===b)b.click()}});b.addEventListener('blur',()=>{armed=false})});
    const undo=button('一手戻す',()=>{
      if(!history.length)return;
      tubes=history.pop();actions.pop();selected=null;if(!save()){recoverDailyConflict();return;}render();
    });
    undo.className='sort-undo';
    function render(){
      won=isWon(tubes);
      buttons.forEach((b,index)=>{
        const tube=tubes[index];b.replaceChildren();
        if(fixedTargets){const target=document.createElement('span');target.className='sort-target';target.textContent=index===3?'空':names[index];b.append(target)}
        for(let slot=2;slot>=0;slot--){
          const span=document.createElement('span'), color=tube[slot];
          span.className=color===undefined?'sort-slot':`sort-slot sort-color-${color}`;
          span.textContent=color===undefined?'':symbols[color];b.append(span);
        }
        b.className=selected===index?'sort-selected':'';
        b.setAttribute('aria-pressed',String(selected===index));
        b.setAttribute('aria-label',`${index+1}番のボトル ${fixedTargets?(index===3?'目標は空 ':`目標は${names[index]} `):''}${tube.length ? `下から${tube.map(c=>names[c]).join('、')}` : '空'}${selected===index?' 選択中':''}`);
      });
      undo.setAttribute('aria-disabled',String(!history.length));
      status.textContent=won?`クリア！ ${actions.length}手でそろえたよ`:moveLimit!==null&&actions.length>=moveLimit?'手数いっぱい。一手戻すか、もう一度を押してね':selected===null?`${actions.length}手${moveLimit!==null?` / ${moveLimit}手`:''}`: `${selected+1}番を選択中。移す先を押してね`;
      if(won&&daily){if(trialMode)offerCopy(`いろわけボトル ${{easy:'かんたん',normal:'ふつう',hard:'難関',oni:'鬼',kiwami:'極'}[trialMode]} ${date} ${actions.length}手\nhttps://game.kihamda.net/play-sort.html?mode=daily&difficulty=${trialMode}&version=2`);else offerCopy(`いろわけボトル 以前の問題 ${date} ${actions.length}手\nhttps://game.kihamda.net/play-sort.html?mode=daily&difficulty=legacy&version=1`);}
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
  if(id==='sort'&&invalidSortLink){title.textContent='この問題は開けないよ';instructions.textContent='対応していない問題の版だよ。ゲーム一覧から開いてね。';category.textContent='';status.textContent='';restart.hidden=true;return;}
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
