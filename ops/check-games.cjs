const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const sourcePath = fs.existsSync(path.join(__dirname, 'game.js')) ? path.join(__dirname, 'game.js') : path.join(__dirname, '..', 'site', 'game.js');
const source = fs.readFileSync(sourcePath, 'utf8');
function run(game) {
  class Element {
    constructor(){this.children=[];this.events={};this.style={};this.hidden=false;this.disabled=false;this.textContent='';}
    addEventListener(n,f){this.events[n]=f} removeEventListener(){} setAttribute(){} append(e){this.children.push(e)} replaceChildren(){this.children=[]} replaceWith(){} cloneNode(){return new Element()} click(){if(!this.disabled)this.events.click?.()} getContext(){return {clearRect(){},beginPath(){},arc(){},fill(){},fillText(){}}}
  }
  const els=Object.fromEntries(['board','status','title','instructions','category','controls','left','right','restart'].map(x=>[x,new Element()]));
  const document={querySelector:s=>els[s.slice(1)],createElement:()=>new Element(),addEventListener(){},removeEventListener(){},title:''};
  const context={document,location:{search:'?game='+game},URLSearchParams,performance:{now:()=>1234},setTimeout,clearTimeout,requestAnimationFrame:()=>1,cancelAnimationFrame(){},Math};
  vm.runInNewContext(source,context); return els;
}
for(const name of ['lights','memory','order','dodge']){
  const e=run(name);assert(e.title.textContent);assert(e.status.textContent || name==='dodge');
  if(name==='lights'){assert.equal(e.board.children.length,16);const before=e.status.textContent;e.board.children[0].click();assert.notEqual(e.status.textContent,before);}
  if(name==='memory'){assert.equal(e.board.children.length,16);e.board.children[0].click();assert.notEqual(e.board.children[0].textContent,'？');}
  if(name==='order'){for(let i=1;i<=16;i++){const b=e.board.children.find(x=>Number(x.textContent)===i);assert(b);b.click();}assert(e.status.textContent.includes('ゴール'))}
  if(name==='dodge'){assert.equal(e.board.children.length,1);assert.equal(e.controls.hidden,false)}
  e.restart.click();assert(e.board.children.length);console.log(name+': ok');
}
