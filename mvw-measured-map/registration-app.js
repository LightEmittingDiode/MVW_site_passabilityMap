(function(){
 'use strict';
 const api=window.MeasuredMap,R=window.MeasurementRegistration;if(!api?.getDataset||!R)return;
 let base=api.getDataset(),settings,mode='',pending=null,traceId=null,trace=[],marks=[],boundMap=null,worker=null;
 const panel=document.createElement('details');panel.id='registrationPanel';panel.open=true;
 panel.innerHTML=`<summary>북쪽 보정 · 인도 정합</summary>
 <p>① 방향 후보 또는 대응점으로 회전 → ② 인도 선 조정 → ③ 저장·내보내기</p>
 <p class="reg-anchor">기준점: 위쪽 동그라미<br>36.365450031337474, 127.33815154492832</p>
 <label>회전 각도 · 시계 방향(°)<div class="reg-row"><input id="regAngle" type="number" step="0.1" min="-180" max="180" value="0"><button id="regApplyAngle" type="button">적용</button></div></label>
 <input id="regAngleSlider" aria-label="회전 각도" type="range" min="-180" max="180" step="0.1" value="0">
 <div class="reg-row"><button id="regSuggest" type="button">도보망 방향 후보 찾기</button><button id="regFit" type="button">대응점으로 방향 맞추기</button></div>
 <div id="regCandidates"></div>
 <button id="regAddPair" type="button">대응점 추가: 실측 선 → 지도 위치</button>
 <ol id="regPairs"></ol>
 <label>카카오 도보망에 가까운 점만 투영 (m)<div class="reg-row"><input id="regSnap" type="number" min="0" max="10" step="0.5" value="0"><button id="regApplySnap" type="button">투영 미리보기</button></div></label>
 <small>0이면 투영하지 않습니다. 경로망은 인도 경계와 다를 수 있습니다. 기준점은 고정됩니다.</small>
 <button id="regTrace" type="button">선택 구간을 인도에 맞추기</button>
 <p id="regSelected">지도에서 실측 구간을 선택하세요.</p>
 <div class="reg-row"><button id="regTraceFinish" type="button">인도 선 적용</button><button id="regUndo" type="button">마지막 점 취소</button></div>
 <button id="regCancel" type="button">선택 작업 취소</button>
 <div class="reg-row"><button id="regSave" type="button">이 브라우저에 저장</button><button id="regRestore" type="button">저장된 보정 불러오기</button></div>
 <div class="reg-row"><button id="regExportJS" type="button">사이트 반영용 JS 받기</button><button id="regExportJSON" type="button">보정 JSON 받기</button></div>
 <button id="regReset" type="button">이번 보정 되돌리기</button>
 <p id="regMessage" role="status" aria-live="polite">기준점을 고정한 상태로 방향을 조절할 수 있습니다.</p>
 <p id="regStats"></p>`;
 document.getElementById('measuredDatasetInfo').before(panel);
 const $=id=>document.getElementById(id),message=t=>{$('regMessage').textContent=t;},run=fn=>{try{fn();}catch(e){message(e.message);}};
 function key(){let h=2166136261;const text=JSON.stringify([base.provenance?.sha256,base.georeferencing?.anchor,base.segments.map(s=>[s.id,R.localPath(s)[0],R.localPath(s).at(-1)])]);for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return 'mvw-registration-v1-'+(h>>>0);}
 function defaults(){return {angle:0,snapM:0,pairs:[],traces:{}};}
 function resetDataset(){base=api.getDataset();settings=structuredClone(base.georeferencing?.registration||defaults());mode='';pending=null;traceId=null;trace=[];panel.hidden=!base.georeferencing?.anchor;if(base.georeferencing?.anchor){const a=base.georeferencing.anchor;panel.querySelector('.reg-anchor').textContent='기준점: 위쪽 동그라미 · '+a.lat+', '+a.lng;}sync();}
 function sync(){if(!settings)return;$('regAngle').value=settings.angle;$('regAngleSlider').value=settings.angle;$('regSnap').value=settings.snapM;renderPairs();}
 function mapReady(){const map=api.getMap();if(!map)throw Error('카카오맵이 연결된 후 사용할 수 있습니다.');if(boundMap!==map){boundMap=map;kakao.maps.event.addListener(map,'click',mapClick);}return map;}
 function clearMarks(){for(const m of marks)m.setMap(null);marks=[];}
 function mark(p,color='#1976e8',radius=1.5){if(!api.getMap())return;marks.push(new kakao.maps.Circle({map:api.getMap(),center:new kakao.maps.LatLng(p.lat,p.lng),radius,strokeWeight:2,strokeColor:color,fillColor:color,fillOpacity:.4}));}
 function drawMarks(){clearMarks();const anchor=base.georeferencing?.anchor;if(!anchor||!api.getMap())return;mark(anchor,'#1456d9',2);for(const p of settings.pairs){mark(p.target,'#8b4bc9');mark(R.project(p.local,anchor,settings.angle),'#ef971e');}if(pending)mark(R.project(pending,anchor,settings.angle),'#ef971e',2);if(trace.length){for(const p of trace)mark(p,'#1976e8');marks.push(new kakao.maps.Polyline({map:api.getMap(),path:trace.map(p=>new kakao.maps.LatLng(p.lat,p.lng)),strokeWeight:3,strokeColor:'#1976e8'}));}if(mode==='trace'&&!trace.length&&traceId){const s=api.getDataset().segments.find(s=>s.id===traceId);mark(s.path[0],'#ef971e',2);mark(s.path.at(-1),'#8b4bc9',2);}}
 function apply(){mapReady();api.load(R.apply(base,settings,window.KAKAO_AREA_NETWORK));sync();drawMarks();const stats=api.getDataset().georeferencing.registrationStats;$('regStats').textContent='도보망 투영 '+stats.networkProjectedPoints.toLocaleString()+' / '+stats.totalPoints.toLocaleString()+'점 · 수동 인도 정합 '+stats.manuallyTracedSegments+'구간';}
 function renderPairs(){$('regPairs').replaceChildren();for(const [i,p]of settings.pairs.entries()){const li=document.createElement('li'),button=document.createElement('button');li.textContent='대응점 '+(i+1)+' · '+p.target.lat.toFixed(7)+', '+p.target.lng.toFixed(7)+' ';button.textContent='삭제';button.type='button';button.onclick=()=>{settings.pairs.splice(i,1);renderPairs();drawMarks();};li.append(button);$('regPairs').append(li);}}
 function mapClick(e){run(()=>{const target={lat:e.latLng.getLat(),lng:e.latLng.getLng()};if(mode==='target'&&pending){settings.pairs.push({local:pending,target});mode='';pending=null;renderPairs();drawMarks();message('대응점을 추가했습니다. 멀리 떨어진 점을 더 지정하거나 ‘대응점으로 방향 맞추기’를 누르세요.');}else if(mode==='trace'){trace.push(target);drawMarks();message('인도 선 '+trace.length+'점. 주황색 시작 → 보라색 끝 순서로 그린 후 ‘인도 선 적용’을 누르세요.');}});}
 api.onSegmentClick=(segment,event)=>{if(mode==='target'||mode==='trace')return true;traceId=segment.id;$('regSelected').textContent=(segment.name||segment.id)+' 선택됨';if(mode!=='source')return mode==='target'||mode==='trace';run(()=>{const current=api.getDataset().segments.find(s=>s.id===segment.id),anchor=base.georeferencing.anchor,p=event?.latLng?{lat:event.latLng.getLat(),lng:event.latLng.getLng()}:current.path[Math.floor(current.path.length/2)],near=R.nearest(R.xy(p,anchor),[current.path.map(q=>R.xy(q,anchor))]),source=R.localPath(base.segments.find(s=>s.id===segment.id)),a=source[near.index],b=source[near.index+1];pending={x:a.x+(b.x-a.x)*near.t,y:a.y+(b.y-a.y)*near.t};mode='target';kakao.maps.event.preventMap?.();drawMarks();message('주황색 실측 점과 같은 실제 위치를 카카오맵에서 클릭하세요.');});return true;};
 $('regApplyAngle').onclick=()=>run(()=>{settings.angle=Number($('regAngle').value);settings.pairs=[];apply();message('회전 미리보기입니다. 기준점 위치는 유지됩니다.');});
 $('regAngleSlider').oninput=()=>{$('regAngle').value=$('regAngleSlider').value;};$('regAngleSlider').onchange=()=>$('regApplyAngle').click();
 $('regAddPair').onclick=()=>run(()=>{mapReady();mode='source';pending=null;message('기준점에서 멀리 떨어진 실측 선의 대응 위치를 먼저 클릭하세요.');});
 $('regFit').onclick=()=>run(()=>{const fit=R.fitHeading(settings.pairs,base.georeferencing.anchor);settings.angle=fit.angle;apply();message('기준점 고정 회전 '+fit.angle.toFixed(2)+'° · 대응점 RMS 오차 '+fit.rms.toFixed(2)+'m. 큰 오차는 위치·축척·궤적 변형을 확인하세요.');});
 $('regApplySnap').onclick=()=>run(()=>{settings.snapM=Number($('regSnap').value);apply();message('허용 거리 내 도보망 투영 미리보기입니다. 인도 반대편이나 교차로를 확대해 확인하세요.');});
 $('regSuggest').onclick=()=>run(()=>{mapReady();if(worker)return;message('도보망 방향 후보 계산 중입니다. 자동 후보는 실제 북쪽·인도 일치 여부를 확인해야 합니다.');$('regSuggest').disabled=true;worker=new Worker('registration-worker.js');worker.onmessage=e=>{worker.terminate();worker=null;$('regSuggest').disabled=false;if(e.data.error){message(e.data.error);return;}$('regCandidates').replaceChildren();for(const candidate of e.data.candidates){const b=document.createElement('button');b.type='button';b.textContent=candidate.angle.toFixed(2)+'° · 평균 이격 '+candidate.meanM.toFixed(1)+'m';b.onclick=()=>run(()=>{settings.angle=candidate.angle;settings.pairs=[];apply();message('자동 방향 후보를 미리 표시했습니다. 실제 대응점으로 확인한 후 저장하세요.');});$('regCandidates').append(b);}message('방향 후보 3개를 찾았습니다. 각 후보를 눌러 지도에서 비교하세요.');};worker.onerror=()=>{worker?.terminate();worker=null;$('regSuggest').disabled=false;message('방향 계산을 실행하지 못했습니다. 대응점 지정 방식으로 보정해주세요.');};worker.postMessage({data:base,network:window.KAKAO_AREA_NETWORK,anchor:base.georeferencing.anchor});});
 $('regTrace').onclick=()=>run(()=>{mapReady();if(!traceId)throw Error('먼저 실측 구간을 클릭해 선택해주세요.');mode='trace';trace=[];pending=null;drawMarks();message('주황색 시작점 → 보라색 끝점 순서로 같은 구간의 인도 위를 2점 이상 클릭하세요.');});
 $('regTraceFinish').onclick=()=>run(()=>{if(mode!=='trace'||trace.length<2)throw Error('인도 선을 2점 이상 지정해주세요.');settings.traces[traceId]=structuredClone(trace);mode='';trace=[];apply();message('선택 구간만 그린 인도 선에 배치했습니다. 위험도·시각·표본 수는 유지됩니다.');});
 $('regUndo').onclick=()=>{if(mode==='trace'){trace.pop();drawMarks();}else message('인도 선을 그리는 중에 사용할 수 있습니다.');};
 $('regCancel').onclick=()=>{mode='';pending=null;trace=[];drawMarks();message('점 선택을 취소했습니다. 적용한 보정은 유지됩니다.');};
 $('regSave').onclick=()=>run(()=>{apply();localStorage.setItem(key(),JSON.stringify(settings));message('이 브라우저에 저장했습니다. 모든 방문자에게 반영하려면 JS를 받아 저장소에 덮어써주세요.');});
 $('regRestore').onclick=()=>run(()=>{const saved=localStorage.getItem(key());if(!saved)throw Error('이 데이터에 저장된 보정이 없습니다.');const value=JSON.parse(saved);R.apply(base,value,window.KAKAO_AREA_NETWORK);settings=value;apply();message('저장된 보정을 불러왔습니다.');});
 function download(name,text,type){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('regExportJS').onclick=()=>run(()=>{apply();download('measured-data.js','window.MEASURED_MAP_DATA='+JSON.stringify(api.getDataset())+';\n','text/javascript');message('사이트의 measured-data.js를 이 파일로 교체하면 보정 결과가 기본으로 표시됩니다.');});
 $('regExportJSON').onclick=()=>run(()=>{apply();download('measured-risk-calibrated.json',JSON.stringify(api.getDataset()),'application/json');message('센서 원본 좌표와 보정 정보를 포함한 JSON을 저장했습니다.');});
 $('regReset').onclick=()=>run(()=>{settings=structuredClone(base.georeferencing?.registration||defaults());mode='';pending=null;trace=[];api.load(base);sync();drawMarks();$('regStats').textContent='';message('현재 사이트에 포함된 기준 상태로 되돌렸습니다. 저장된 보정은 유지됩니다.');});
 window.MeasuredRegistrationUI={resetDataset};window.addEventListener('moveawheel:kakao-ready',()=>{run(()=>{mapReady();drawMarks();});});
 resetDataset();if(api.getMap()){mapReady();drawMarks();}
})();
