import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlaceSearch,nearbyLots} from './place-search.js';
const place={name:'테스트 카페',address:'서울 성동구',location:{lat:37.5445,lng:127.0557}};
test('선택한 가게 반경 1km 안의 주차장만 가까운 순으로 정렬하고 좌표 미확인을 제외한다',()=>{
  const lots=[{id:'far',location:{lat:37.58,lng:127.05}},{id:'near',location:{lat:37.545,lng:127.056}},{id:'unknown'},{id:'at',location:place.location}];
  assert.deepEqual(nearbyLots(lots,place).map(lot=>lot.id),['at','near']);
  assert.deepEqual(nearbyLots(lots,null),[]);
});
test('검색어는 POST 본문으로 보내며 클라이언트에 API 비밀키가 없다',async()=>{
  const client=createPlaceSearch({fetchImpl:async(url,options)=>{
    assert.equal(url,'/api/places');assert.equal(options.method,'POST');
    assert.equal(JSON.parse(options.body).query,'테스트 카페');
    assert.deepEqual(Object.keys(options.headers),['Content-Type']);
    return {ok:true,json:async()=>({places:[place]})};
  }});
  assert.deepEqual(await client.search('테스트 카페'),[place]);
});
test('입력 변경·닫기 뒤에 늦게 도착한 응답은 결과를 덮어쓰지 않는다',async()=>{
  const pending=[];
  const client=createPlaceSearch({fetchImpl:(_url,{signal})=>new Promise(resolve=>pending.push({resolve,signal}))});
  const first=client.search('이전 검색');const second=client.search('다음 검색');
  assert(pending[0].signal.aborted);
  pending[1].resolve({ok:true,json:async()=>({places:[place]})});assert.deepEqual(await second,[place]);
  pending[0].resolve({ok:true,json:async()=>({places:[]})});assert.equal(await first,null);
  const last=client.search('닫을 검색');client.cancel();pending[2].resolve({ok:true,json:async()=>({places:[place]})});assert.equal(await last,null);
});
test('키 미설정·한도 초과·일반 오류를 빈 검색 결과와 구분한다',async()=>{
  for(const error of ['PLACE_SEARCH_NOT_CONFIGURED','PLACE_SEARCH_LIMITED','UPSTREAM_SECRET']){
    const client=createPlaceSearch({fetchImpl:async()=>({ok:false,json:async()=>({error})})});
    await assert.rejects(client.search('테스트'),new RegExp(error==='UPSTREAM_SECRET'?'PLACE_SEARCH_FAILED':error));
  }
});
