import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import test from 'node:test';
const ctx={window:{},structuredClone};for(const f of ['measured-map.js','walking-matched-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const api=ctx.window.MeasuredMap,data=ctx.window.MAPPED_MEASURED_DATA;
test('previously empty sections carry actual nearby frame identifiers and transfer distances',()=>{
 api.validate(data);
 const transferred=data.segments.filter(s=>s.nearbyObservation);
 assert.equal(transferred.length,15);assert.equal(data.segments.length,189);
 assert.equal(data.segments.filter(s=>s.estimate).length,0);
 for(const s of transferred){
  assert.equal(s.sampleCount,10);
  assert.equal(s.nearbyObservation.frameIds.length,10);
  assert(s.nearbyObservation.frameIds.every(id=>/^s[1-3]-frame-\d+$/.test(id)));
  assert(s.nearbyObservation.nearestDistanceM>=0);
  assert(s.nearbyObservation.farthestDistanceM<10);
  assert(s.nearbyObservation.nearestDistanceM<=s.nearbyObservation.farthestDistanceM);
  assert(Number.isFinite(Date.parse(s.observedAt)));
 }
 const bad=structuredClone(data);bad.segments.find(s=>s.nearbyObservation).nearbyObservation.frameIds.pop();
 assert.throws(()=>api.validate(bad),/주변 실측점/);
});
