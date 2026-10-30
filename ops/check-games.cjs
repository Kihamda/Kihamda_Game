const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const sourcePath = fs.existsSync(path.join(__dirname, 'game.js')) ? path.join(__dirname, 'game.js') : path.join(__dirname, '..', 'site', 'game.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const catalog = fs.readFileSync(path.join(__dirname, '..', 'site', 'catalog.js'), 'utf8');
function run(game) {
  class Element {
    constructor(){this.children=[];this.events={};this.style={setProperty(){}};this.dataset={};this.classList={add(){},remove(){}};this.hidden=false;this.disabled=false;this.textContent='';}
    addEventListener(n,f){this.events[n]=f} removeEventListener(){} setAttribute(){} append(e){this.children.push(e)} before(){} after(e){this.afterElement=e} remove(){} replaceChildren(){this.children=[]} replaceWith(){} cloneNode(){return new Element()} click(){if(!this.disabled)this.events.click?.()} getContext(){return {clearRect(){},beginPath(){},arc(){},fill(){},fillText(){}}}
  }
  const els=Object.fromEntries(['board','status','announcement','title','instructions','category','controls','record','copy-result','copy-feedback','left','right','restart'].map(x=>[x,new Element()]));
  const document={body:Object.assign(new Element(),{dataset:{}}),querySelector:s=>els[s.slice(1)],createElement:()=>new Element(),addEventListener(){},removeEventListener(){},title:''};
  const context={document,window:{addEventListener(){},removeEventListener(){}},location:{search:'?game='+game},URLSearchParams,performance:{now:()=>1234},setTimeout,clearTimeout,requestAnimationFrame:()=>1,cancelAnimationFrame(){},Math};
  vm.runInNewContext(catalog + '\n' + source,context); return els;
}
for(const name of ['lights','memory','order','dodge']){
  const e=run(name);assert(e.title.textContent);assert(e.status.textContent || name==='dodge');
  if(name==='lights'){assert.equal(e.board.children.length,16);const before=e.status.textContent;e.board.children[0].click();assert.notEqual(e.status.textContent,before);}
  if(name==='memory'){assert.equal(e.board.children.length,16);e.board.children[0].click();assert.notEqual(e.board.children[0].textContent,'？');}
  if(name==='order'){for(let i=1;i<=16;i++){const b=e.board.children.find(x=>Number(x.textContent)===i);assert(b);b.click();}assert(e.status.textContent.includes('ゴール'))}
  if(name==='dodge'){assert.equal(e.board.children.length,2);assert.equal(e.controls.hidden,false);assert.equal(e.status.textContent,'スタートを押してね');e.board.children[1].click();assert.equal(e.board.children[1].hidden,true)}
  e.restart.click();assert(e.board.children.length);console.log(name+': ok');
}

// Every daily garden has exactly one solution for its row and column counts.
const match = source.match(/const patterns=\[([\d,]+)\]/);
assert(match, 'garden patterns missing');
const patterns=match[1].split(',').map(Number);
const signature=mask=>[...[0,1,2,3].map(r=>[0,1,2,3].reduce((n,c)=>n+((mask>>(r*4+c))&1),0)),...[0,1,2,3].map(c=>[0,1,2,3].reduce((n,r)=>n+((mask>>(r*4+c))&1),0))].join(',');
const counts=new Map(); for(let mask=0;mask<65536;mask++){const key=signature(mask);counts.set(key,(counts.get(key)||0)+1);}
assert.equal(new Set(patterns).size, patterns.length);
for(const mask of patterns) assert.equal(counts.get(signature(mask)),1, `ambiguous garden ${mask}`);
// Permuting rows and columns preserves uniqueness; verify all permutations of the stored boards.
function permutations(values){if(!values.length)return [[]];return values.flatMap((value,i)=>permutations(values.filter((_,j)=>j!==i)).map(rest=>[value,...rest]));}
const orders=permutations([0,1,2,3]);
for(const mask of patterns) for(const rows of orders) for(const cols of orders) {
  let transformed=0;for(let r=0;r<4;r++)for(let c=0;c<4;c++)if((mask>>(rows[r]*4+cols[c]))&1)transformed|=1<<(r*4+c);
  assert.equal(counts.get(signature(transformed)),1, 'permuted puzzle is ambiguous');
}
console.log(`garden: ${patterns.length} unique puzzles and all row/column permutations verified`);
