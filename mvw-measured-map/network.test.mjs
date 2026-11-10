import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('network.js','utf8');
vm.runInNewContext(source+`
const edge=(from,to,length,risk)=>({from,to,length,risk,segment:{apiTimeSeconds:length,path:[{lat:0,lng:0},{lat:1,lng:1}]}});
const graph=new Map([
 ['S',[edge('S','A',50,80),edge('S','B',70,10)]],
 ['A',[edge('A','X',50,80)]],['B',[edge('B','X',70,10)]],
 ['X',[edge('X','C',50,40),edge('X','D',80,10),edge('X','S',10,0)]],
 ['C',[edge('C','T',50,40)]],['D',[edge('D','T',80,10)]]
]);
const shortest=solveWalkingGraph(graph,'S','T','0'),balanced=solveWalkingGraph(graph,'S','T','0.8'),safe=solveWalkingGraph(graph,'S','T','2',300);
const length=edges=>edges.reduce((n,e)=>n+e.length,0),risk=edges=>edges.reduce((n,e)=>n+e.risk*e.length,0)/length(edges);
assert.equal(length(shortest),200);assert.equal(length(balanced),240);assert.equal(length(safe),300);
assert.equal(risk(shortest),60);assert.equal(risk(balanced),22.5);assert.equal(risk(safe),10);
assert(!safe.some(e=>e.to==='S'));assert.equal(length(solveWalkingGraph(graph,'S','T','2',250)),240);
assert.equal(solveWalkingGraph(graph,'S','missing','2',300),null);
const base={nodes:[{id:'origin'},{id:'destination'}]},dataset=graphRouteDataset(balanced,base);assert.equal(dataset.walkingSummary.totalTime,240);assert.equal(dataset.walkingSummary.totalDistance,240);
const p={lat:36,lng:127},q={lat:36.001,lng:127},r={lat:36.0005,lng:126.999},s={lat:36.0005,lng:127.001};
const segment=(path,passability='pass')=>({path,surfaceGrade:2,passability,staticRisk:20,dynamicRisk:10});
const g=buildWalkingGraph([{segments:[segment([p,q]),segment([r,s]),segment([q,p],'blocked')]}]);
assert.equal(solveWalkingGraph(g,networkPointKey(p),networkPointKey(s),'0'),null);assert.equal(g.has(networkPointKey(q)),false);
`,{assert,$:()=>({value:'5'}),status:s=>s.passability,distance:()=>100,Map,Set,Number,Math});
console.log('Graph routing: shortest 200m/risk60, balanced third path 240m/risk22.5, safe 300m/risk10; cap, no cycles, no joins at unverified crossings, blocked edges excluded, API time sum.');

