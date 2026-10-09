import { readFileSync,readdirSync,existsSync } from 'node:fs';
import { resolve,relative } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const [directory,target,commit,projectId]=process.argv.slice(2);const root=resolve(directory);
const version=JSON.parse(readFileSync(resolve(root,'build-version.json'),'utf8'));
assert.equal(version.target,target);assert.equal(version.commit,commit);
const registry=JSON.parse(readFileSync('unity-projects.json','utf8'));
assert(registry.projects.some(p=>p.id===version.project),'Project is not registered');
if(projectId)assert.equal(version.project,projectId);
for(const line of readFileSync(resolve(root,'SHA256SUMS'),'utf8').trim().split(/\r?\n/)){
  const match=line.match(/^([0-9a-f]{64})  (.+)$/);assert(match,'Invalid checksum');
  const path=resolve(root,match[2]);assert(!relative(root,path).startsWith('..'),'Path outside artifact');
  assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),match[1]);
}
if(target==='StandaloneWindows64')assert(readdirSync(root).some(p=>p.endsWith('.exe')));
if(target==='WebGL'){
  assert(existsSync(resolve(root,'index.html')));const build=readdirSync(resolve(root,'Build'));
  assert(build.some(p=>p.endsWith('.wasm')));assert(build.some(p=>p.endsWith('.data')));assert(!build.some(p=>p.endsWith('.gz')||p.endsWith('.br')),'Host compression contract unknown');
}
console.log('Unity artifact verified: '+target+' '+commit);
