import test from 'node:test';
import assert from 'node:assert/strict';
import {requestCurrentAddress,locationErrorMessage} from './current-location.js';
const point={coords:{latitude:37.54,longitude:127.05}};
test('거부·미지원·잘못된 위치는 좌표 조회로 전송하지 않는다',async()=>{
 let calls=0;const reverse=()=>{calls++;};
 await assert.rejects(requestCurrentAddress({geolocation:null,reverse}),/LOCATION_UNSUPPORTED/);
 await assert.rejects(requestCurrentAddress({geolocation:{getCurrentPosition(ok,fail){fail({code:1});}},reverse}),e=>e.code===1);
 await assert.rejects(requestCurrentAddress({geolocation:{getCurrentPosition(ok){ok({coords:{latitude:NaN,longitude:127}});}},reverse}),/LOCATION_INVALID/);
 assert.equal(calls,0);
 assert.match(locationErrorMessage({code:1}),/차단/);
});
test('화면을 닫거나 검색이 바뀌면 늦게 도착한 위치를 전송하지 않는다',async()=>{
 let accept,active=true,calls=0;
 const pending=requestCurrentAddress({geolocation:{getCurrentPosition(ok){accept=ok;}},reverse:()=>{calls++;},isCurrent:()=>active});
 active=false;accept(point);
 await assert.rejects(pending,/LOCATION_CANCELLED/);assert.equal(calls,0);
});
test('버튼 호출 한 번당 위치 한 번과 유효 좌표만 전달한다',async()=>{
 let calls=0,options;
 const result=await requestCurrentAddress({geolocation:{getCurrentPosition(ok,fail,opts){calls++;options=opts;ok(point);}},reverse:p=>({...p,jibun:'확인 주소'})});
 assert.equal(calls,1);assert.equal(options.maximumAge,0);assert.equal(options.enableHighAccuracy,false);
 assert.deepEqual(result,{lat:37.54,lng:127.05,jibun:'확인 주소'});
});
test('브라우저의 위치 조회 시간 초과를 안내하고 좌표는 전송하지 않는다',async()=>{
 let options,calls=0;
 const pending=requestCurrentAddress({geolocation:{getCurrentPosition(ok,fail,opts){options=opts;fail({code:3});}},reverse:()=>{calls++;}});
 await assert.rejects(pending,e=>e.code===3);assert.equal(options.timeout,10000);assert.equal(calls,0);
 assert.match(locationErrorMessage({code:3}),/시간/);
});
