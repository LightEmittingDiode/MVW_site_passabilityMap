const CENTER={lat:36.365473,lng:127.338021};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export async function handleRequest(request,env,assets){const origin=request.headers.get('Origin'),allowed=origin==='https://lightemittingdiode.github.io';if(request.method==='OPTIONS'&&new URL(request.url).pathname.startsWith('/api/'))return new Response(null,{status:allowed?204:403,headers:allowed?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}:{}});const response=await handleInternal(request,env,assets);if(allowed){const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');return new Response(response.body,{status:response.status,headers});}return response;}
async function handleInternal(request,env,assets){
 const url=new URL(request.url);
 if(!['/api/walking-route','/api/walking-candidates'].includes(url.pathname)){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const asset=assets[url.pathname==='/'?'/index.html':url.pathname];if(!asset)return new Response('Not found',{status:404});
  return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
 }
 if(request.method!=='POST')return json({error:'POST 요청이 필요합니다.'},405);
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin&&request.headers.get('Origin')!=='https://lightemittingdiode.github.io')return json({error:'다른 사이트에서는 호출할 수 없습니다.'},403);
 if(!env.KAKAO_REST_API_KEY)return json({error:'카카오 도보 경로 연결 설정이 필요합니다.'},503);
 let input;try{const raw=await request.text();if(raw.length>2048)throw Error();input=JSON.parse(raw)}catch{return json({error:'출발·도착 좌표를 확인해주세요.'},400)}
 const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.hypot((p.lat-CENTER.lat)*111195,(p.lng-CENTER.lng)*111195*Math.cos(CENTER.lat*Math.PI/180))<=1001;
 if(!valid(input.from)||!valid(input.to))return json({error:'지정 중심 반경 1km 안에서 출발·도착을 지정해주세요.'},400);
 if(url.pathname==='/api/walking-candidates'){
  const specs=[{id:'accessible',label:'편안한 길',mode:'ACCESSIBLE'},{id:'broad',label:'넓은 길',mode:'BROAD_FIRST'},{id:'shortest',label:'최단 경로',mode:'SHORTEST'}];
  const scale=Math.cos(CENTER.lat*Math.PI/180),dx=(input.to.lng-input.from.lng)*scale,dy=input.to.lat-input.from.lat,len=Math.hypot(dx,dy);if(len>20/111195)for(const [fraction,side,meters]of [[.5,-1,120],[.5,1,120],[.5,-1,240],[.5,1,240],[.3,-1,140],[.7,1,140]]){const offset=meters/111195,via={lat:input.from.lat+dy*fraction+side*dx/len*offset,lng:input.from.lng+(input.to.lng-input.from.lng)*fraction-side*dy/len*offset/scale};if(valid(via))specs.push({id:'network-'+specs.length,label:'연결망 탐색',mode:'ACCESSIBLE',via,networkOnly:true});}
  const outcomes=await Promise.all(specs.map(async spec=>{const target=new URL('https://dapi.kakao.com/v2/routing/walk');for(const [k,v]of Object.entries({start_x:input.from.lng,start_y:input.from.lat,end_x:input.to.lng,end_y:input.to.lat,route_mode:spec.mode,input_coord:'WGS84',output_coord:'WGS84',...(spec.via?{via_x:spec.via.lng,via_y:spec.via.lat}:{})}))target.searchParams.set(k,v);try{const r=await fetch(target,{headers:{Authorization:'KakaoAK '+env.KAKAO_REST_API_KEY},signal:AbortSignal.timeout(15000)});if(!r.ok)return {error:r.status};const body=await r.json();if(body.status!=='OK'||!body.route)return {error:body.status};return {id:spec.id,label:spec.label,route:body.route,networkOnly:!!spec.networkOnly}}catch{return {error:'TIMEOUT'}}}));
  const received=outcomes.filter(r=>r.route),candidates=received.filter(r=>!r.networkOnly);if(!candidates.length){const error=outcomes.some(r=>r.error===429)?'카카오 API 호출 한도에 도달했습니다.':outcomes.some(r=>r.error===403)?'카카오 도보 API 권한을 확인해주세요.':'연결되는 도보 경로 후보를 찾지 못했습니다. 다른 지점을 선택해주세요.';return json({error},502)}
  return json({candidates,networkRoutes:received.filter(r=>r.networkOnly),failedCount:outcomes.length-received.length,requestedCount:specs.length});
 }
 const upstream=new URL('https://dapi.kakao.com/v2/routing/walk');
 for(const [k,v]of Object.entries({start_x:input.from.lng,start_y:input.from.lat,end_x:input.to.lng,end_y:input.to.lat,input_coord:'WGS84',output_coord:'WGS84',route_mode:'ACCESSIBLE'}))upstream.searchParams.set(k,v);
 try{
  const response=await fetch(upstream,{headers:{Authorization:'KakaoAK '+env.KAKAO_REST_API_KEY},signal:AbortSignal.timeout(15000)});
  if(!response.ok){const message=response.status===401?'카카오 REST API 키 설정을 확인해주세요.':response.status===403?'카카오맵 사용 설정과 도보 경로 API 권한을 확인해주세요.':response.status===429?'카카오 API 호출 한도에 도달했습니다. 잠시 후 다시 시도해주세요.':'카카오 도보 경로를 불러오지 못했습니다.';return json({error:message},response.status===429?429:502)}
  const result=await response.json();const messages={SAME_POINT:'출발지와 도착지가 같습니다.',START_LINK_NOT_FOUND:'출발지 근처에서 도보 경로를 찾지 못했습니다.',END_LINK_NOT_FOUND:'도착지 근처에서 도보 경로를 찾지 못했습니다.',ROUTE_RESULT_NOT_FOUND:'연결되는 도보 경로가 없습니다.'};
  if(result.status!=='OK'||!result.route)return json({error:messages[result.status]||'해당 지점 사이의 도보 경로를 찾지 못했습니다.'},422);
  return json({status:'OK',route:result.route});
 }catch{return json({error:'카카오 도보 경로 응답이 지연되었습니다. 다시 시도해주세요.'},504)}
}
