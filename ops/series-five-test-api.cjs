const fs=require('fs'),vm=require('vm');
let source=fs.readFileSync('site/game.js','utf8');source=source.slice(0,source.indexOf('let seriesDifficulty=')).replace('return {createSeriesSession};','return {createSession:createSeriesSession,sequence,candidates};');module.exports=vm.runInThisContext(source+'\nseriesFive');
