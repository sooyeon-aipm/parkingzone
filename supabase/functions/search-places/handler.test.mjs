import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler, normalizePlace} from './handler.mjs';
const item={title:'<b>카페</b> &amp; 성수',roadAddress:'서울특별시 성동구 도로 1',category:'카페',mapx:'1270557000',mapy:'375445000'};
const req=(body={query:'테스트 카페'})=>({method:'POST',headers:{'content-type':'application/json',host:'parkingzone.vercel.app',origin:'https://parkingzone.vercel.app'},body});
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
test('WGS84 정수·소수 좌표를 처리하고 누락·범위 밖 좌표를 거부한다',()=>{
  assert.deepEqual(normalizePlace(item).location,{lat:37.5445,lng:127.0557});
  assert.equal(normalizePlace(item).name,'카페 & 성수');
  assert.deepEqual(normalizePlace({...item,mapx:'127.0557',mapy:'37.5445'}).location,{lat:37.5445,lng:127.0557});
  for(const mapx of ['',null,'NaN','0','309947'])assert.equal(normalizePlace({...item,mapx}),null);
});
test('서버만 고정 HUB 주소·인증 헤더로 호출하고 정제된 장소만 반환한다',async()=>{
  const handler=createHandler({env:{NAVER_SEARCH_CLIENT_ID:'private-id',NAVER_SEARCH_CLIENT_SECRET:'private-secret'},limits:new Map(),fetchImpl:async(url,options)=>{
    assert.equal(url.origin,'https://naverapihub.apigw.ntruss.com');assert.equal(url.pathname,'/search/v1/local');
    assert.equal(url.searchParams.get('query'),'성수 테스트 카페');assert.equal(url.searchParams.get('display'),'5');
    assert.equal(options.headers['X-NCP-APIGW-API-KEY'],'private-secret');
    return {ok:true,json:async()=>({items:[{...item,description:'PRIVATE',telephone:'PRIVATE'}]})};
  }});
  const res=response();await handler(req(),res);assert.equal(res.code,200);
  assert(!JSON.stringify(res.body).includes('private'));assert(!JSON.stringify(res.body).includes('PRIVATE'));
  assert.equal(res.body.places.length,1);assert.equal(res.headers['Cache-Control'],'no-store');
});
test('잘못된 입력·다른 Origin·GET·키 미설정은 외부 호출 전에 중단한다',async()=>{
  const handler=createHandler({env:{},fetchImpl:()=>{throw Error('must not fetch');}});
  for(const [request,status] of [[req({query:'a'}),400],[req({query:'x'.repeat(81)}),400],[{...req(),method:'GET'},405],[{...req(),headers:{...req().headers,origin:'https://other.example'}},403],[req(),503]]){
    const res=response();await handler(request,res);assert.equal(res.code,status);
  }
});
test('네이버 실패·타임아웃의 상세 오류를 노출하지 않으며 한도를 적용한다',async()=>{
  let calls=0;let fails=false;
  const handler=createHandler({env:{NAVER_SEARCH_CLIENT_ID:'id',NAVER_SEARCH_CLIENT_SECRET:'SECRET'},limits:new Map(),fetchImpl:async()=>{calls++;if(fails)throw Error('SECRET');return {ok:false,status:429};}});
  let res=response();await handler(req(),res);assert.equal(res.code,429);
  fails=true;res=response();await handler(req(),res);assert.equal(res.code,502);assert(!JSON.stringify(res.body).includes('SECRET'));
  for(let i=2;i<31;i++){res=response();await handler(req(),res);}
  assert.equal(calls,30);assert.equal(res.code,429);
});
