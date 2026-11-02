const centers = [50,125,200,275,350];
// Conservative reachability: 5px steps at <= 200px/s, versus the current 230px/s.
// A star is dangerous for +/- 0.18s around its crossing at the player height.
function solve({interval,waves}, targetIndices = {}) {
  const dt = 0.025, first = 3, end = first + interval * (waves.length-1) + .2;
  let states = new Map([[200, []]]);
  for (let step = 1; step <= Math.ceil(end/dt); step++) {
    const t = step*dt, next = new Map();
    for (const [old, path] of states) for (const x of [old-5,old,old+5]) {
      if(x<15 || x>385) continue;
      let valid = true;
      for(let i=0;i<waves.length;i++) {
        const offset=t-(first+i*interval);
        if(Math.abs(offset)<=.18 && waves[i].some(lane=>Math.abs(centers[lane]-x)<22)) {valid=false;break;}
        if(targetIndices[i]!==undefined && Math.abs(offset)<=dt/2 && Math.abs(x-centers[targetIndices[i]])>5) {valid=false;break;}
      }
      if(valid && !next.has(x)) next.set(x, path.concat(x));
    }
    states=next;
    if(!states.size) return null;
  }
  return states.values().next().value;
}
module.exports={solve};
