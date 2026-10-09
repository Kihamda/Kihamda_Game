import { readFileSync,writeFileSync,readdirSync,existsSync } from 'node:fs';
import { resolve,dirname,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const original=JSON.parse(readFileSync(resolve(root,'docs/legacy-recovery/curation/catalog-before.json'),'utf8'));
const keep={iceslide:'ice-courier',gravityball:'tidal-ink',minerush:'survey-at-night',ntiktaktoe:'variable-table'};
const merge={
  'ice-courier':['slidemaster','slidepuzzle','lightsout','mazerun','patternlock'],
  'tidal-ink':['linedraw','minigolf','bounceball','bottleflip','gravityfour','connect4'],
  'survey-at-night':['minesweeper','oddoneout','spotdiff','memoryduel','simonecho','simonsays'],
  'variable-table':['simplechess','rockpaper','cardwar']
};
const records=original.games.map(game=>{
  const target=keep[game.id]??Object.entries(merge).find(([,ids])=>ids.includes(game.id))?.[0];
  return {id:game.id,title:game.title,oldUrl:game.path,decision:keep[game.id]?'retain':target?'merge-concept':'retire',target:target??null,
    implemented:false,reason:keep[game.id]?'既存ルールを独自のUnity作品へ発展させる候補。現在作はice-courierのみ':target?'操作またはパズル要素を候補作品へ統合する。独立した旧実装は維持しない':'既存定番ルールまたは小規模な派生作品。独自案が未確定のため現ポートフォリオから外す。人気や売上の優劣を示す判断ではない',
    recoveryCommit:'0d3192f',source:existsSync(resolve(root,`web/games/${game.id}/src/App.tsx`))?`web/games/${game.id}/src/App.tsx`:null};
});
writeFileSync(resolve(root,'business/legacy-dispositions.json'),JSON.stringify({decidedAt:'2026-10-09',source:'user:current-thread:2026-10-09:curation-authorized',policy:'保全→採否と統合先の記録→順次削除。統合予定を移植完了と扱わない',records},null,2)+'\n');
const header='| 旧作品 | 判断 | Unityでの扱い |\n| --- | --- | --- |\n';
writeFileSync(resolve(root,'docs/legacy-dispositions.md'),'# 既存Web資産の整理\n\n売上と利用者数は未観測です。重複するルールと制作範囲から選定しました。retainは移植候補、merge-conceptはアイデア統合予定です。移植・統合の完了ではありません。\n\n'+header+records.map(r=>`| ${r.id} | ${r.decision} | ${r.target??'引退。Git履歴と移行前bundleで復元可'} |`).join('\n')+'\n');
if(!process.argv.includes('--apply')){console.log('Disposition review written. Pass --apply to clean recorded sources.');process.exit(0);}
const sourceRoot=resolve(root,'web/games');
for(const entry of readdirSync(sourceRoot,{withFileTypes:true})){
  if(!entry.isDirectory()||keep[entry.name])continue;
  if(!/^[a-z0-9_-]+$/.test(entry.name))throw new Error('Unexpected source ID');
  const target=resolve(sourceRoot,entry.name);
  if(!target.startsWith(sourceRoot+sep))throw new Error('Source outside migration area');
  execFileSync('git',['rm','-r','--',`web/games/${entry.name}`],{cwd:root,stdio:'pipe'});
}
const selected=original.games.filter(game=>keep[game.id]);
writeFileSync(resolve(root,'web/src/portal/data/games.json'),JSON.stringify({games:selected},null,2)+'\n');
const thumbnails=new Set(selected.map(game=>game.thumbnail.split('/').at(-1)));
for(const entry of readdirSync(resolve(root,'web/public/thumbnails'))){
  if(!entry.endsWith('.svg')||entry==='ogp-default.svg'||thumbnails.has(entry))continue;
  if(!/^[a-z0-9_-]+\.svg$/.test(entry))throw new Error('Unexpected thumbnail name');
  execFileSync('git',['rm','--',`web/public/thumbnails/${entry}`],{cwd:root,stdio:'pipe'});
}
console.log(`Recorded ${records.length} dispositions. Retained ${selected.length} legacy references; retired/merged sources removed with Git recovery.`);
