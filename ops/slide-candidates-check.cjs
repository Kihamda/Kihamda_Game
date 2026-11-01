const assert=require('assert'), fs=require('fs'), data=require('./slide-five-candidates.json');
const source=fs.readFileSync('site/game.js','utf8'),match=source.match(/^const slideCandidates=(.*);$/m);
assert(match,'site must contain slide candidate data');
const expected=structuredClone(data);for(const rows of Object.values(expected))for(const row of rows)delete row.moves;
assert.deepStrictEqual(JSON.parse(match[1]),expected,'checked candidates must match the site');
const goal='123456780';
function adjacent(i,j){return Math.abs(Math.floor(i/3)-Math.floor(j/3))+Math.abs(i%3-j%3)===1}
function replay(candidate,staged){
  let b=candidate.board.split(''),phase=false,stageAt=null;
  assert.equal([...new Set(b)].length,9);assert.equal([...b].sort().join(''),'012345678');
  for(const [i,tile] of candidate.moves.entries()){
    const z=b.indexOf('0'),at=b.indexOf(String(tile));assert(adjacent(z,at),`illegal ${candidate.board} step ${i}`);
    [b[z],b[at]]=[b[at],b[z]];
    if(staged&&!phase&&b.slice(0,3).join('')==='876'){phase=true;stageAt=i+1}
  }
  assert.equal(b.join(''),goal);if(staged)assert(phase);
  if(candidate.limit)assert(candidate.moves.length<=candidate.limit);
  return stageAt;
}
function reachableKeepingTile(board,tile){
  const q=[board], seen=new Set(q);
  for(let k=0;k<q.length;k++){
    const b=q[k];if(b===goal)return true;const z=b.indexOf('0');
    for(let j=0;j<9;j++){if(!adjacent(z,j)||b[j]===tile)continue;const a=b.split('');[a[z],a[j]]=[a[j],a[z]];const next=a.join('');if(!seen.has(next)){seen.add(next);q.push(next)}}
  }return false;
}
for(const [level,items] of Object.entries(data)){
  assert.equal(items.length,100);assert.equal(new Set(items.map(x=>x.board)).size,items.length);
  for(const x of items){
    replay(x,level!=='hard');
    if(level==='hard'){
      const fixed=[...x.board].filter((v,i)=>v!=='0'&&v===goal[i]);
      assert(fixed.some(tile=>!reachableKeepingTile(x.board,tile)),`no forced disturbance ${x.board}`);
    }
    if(level==='kiwami')assert.equal(x.limit,x.moves.length+3);
  }
  console.log(`${level}: ${items.length} unique candidates, paths and constraints passed`);
}
