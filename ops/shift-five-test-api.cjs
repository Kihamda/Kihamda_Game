const fs=require('fs'),vm=require('vm');
let source=fs.readFileSync('site/game.js','utf8');source=source.slice(0,source.indexOf('let shiftDifficulty=')).replace('return {makeSession};','return {makeSession,create,daily,initial,play,undo,valid,validPuzzle};');module.exports=vm.runInThisContext(source+'\nshiftFive');
