const fs=require('fs'),vm=require('vm');
let source=fs.readFileSync('site/game.js','utf8');source=source.slice(0,source.indexOf('let swapDifficulty=')).replace('return {makeSession,sums};','return {makeSession,sums,makePuzzle,newState,play,undo,validState,easyCandidates,candidates};');module.exports=vm.runInThisContext(source+'\nswapFive');
