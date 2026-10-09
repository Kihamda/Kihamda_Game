import { readFileSync } from 'node:fs';
const projects = JSON.parse(readFileSync('unity-projects.json','utf8')).projects;
const include = projects.flatMap(project => project.targets.map(target => ({id:project.id,projectPath:project.path,unityVersion:project.unityVersion,target})));
console.log('matrix=' + JSON.stringify({include}));
