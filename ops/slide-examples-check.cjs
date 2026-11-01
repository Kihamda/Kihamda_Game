// Independent forward BFS for the five representative problems.
const assert=require('assert');
function solve(start, size, waypoint, cap=Infinity){
  const goal=size===2?'1230':'123456780';
  const initialStage=waypoint ? Number(waypoint(start)) : 1;
  const initial=start+initialStage, queue=[initial], parent=new Map([[initial,null]]);
  for(let i=0;i<queue.length;i++){
    const state=queue[i], board=state.slice(0,-1),stage=Number(state.at(-1));
    if(board===goal&&stage){const moves=[];let s=state;while(parent.get(s)){const [prev,tile]=parent.get(s);moves.push(tile);s=prev}return moves.reverse()}
    const z=board.indexOf('0'),row=Math.floor(z/size),col=z%size;
    for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const r=row+dr,c=col+dc;if(r<0||r>=size||c<0||c>=size)continue;
      const at=r*size+c,a=board.split(''),tile=a[at];[a[z],a[at]]=[a[at],a[z]];
      const b=a.join(''), next=b+Number(Boolean(stage)||Boolean(waypoint&&waypoint(b)));
      if(!parent.has(next)){parent.set(next,[state,tile]);queue.push(next)}
    }
  }
  return null;
}
const cases=[
  {level:'easy',start:'1032',size:2},
  {level:'normal',start:'582103476',size:3},
  {level:'hard',start:'823576140',size:3},
  {level:'oni',start:'823576140',size:3,waypoint:b=>b.startsWith('876')},
  {level:'kiwami',start:'285304716',size:3,waypoint:b=>b.startsWith('876'),cap:43},
];
for(const c of cases){const moves=solve(c.start,c.size,c.waypoint,c.cap);assert(moves,`${c.level} has a solution`);assert(moves.length<=(c.cap??Infinity));console.log(JSON.stringify({level:c.level,start:c.start,shortest:moves.length,cap:c.cap??null,moves:moves.join(' ')}));}
