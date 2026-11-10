import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from './server.mjs';
const request=(body,origin='https://example.test')=>new Request('https://example.test/api/walking-candidates',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)});
const points={from:{lat:36.365473,lng:127.338021},to:{lat:36.366,lng:127.339}};
test('API key stays on server, input is bounded and same-origin',async()=>{
 assert.equal((await handleRequest(request(points),{},{})).status,503);
 assert.equal((await handleRequest(request(points,'https://other.test'),{KAKAO_REST_API_KEY:'test-only'},{})).status,403);
 assert.equal((await handleRequest(request({...points,to:{lat:0,lng:0}}),{KAKAO_REST_API_KEY:'test-only'},{})).status,400);
});
test('static assets and HEAD are served without an API key',async()=>{
 const assets={'/index.html':{type:'text/html',body:'sample'}};
 const response=await handleRequest(new Request('https://example.test/'),{},assets);assert.equal(await response.text(),'sample');
 assert.equal(await (await handleRequest(new Request('https://example.test/',{method:'HEAD'}),{},assets)).text(),'');
});
