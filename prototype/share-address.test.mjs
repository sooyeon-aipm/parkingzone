import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAddress,confirmedAddress} from './share-address.js';
test('주소 결과의 누락 좌표를 0으로 만들지 않고 유효한 좌표와 주소만 허용한다',()=>{
  assert.equal(normalizeAddress({y:'',x:'127',jibunAddress:'주소'}),null);
  assert.equal(normalizeAddress({y:'NaN',x:'127',jibunAddress:'주소'}),null);
  assert.equal(normalizeAddress({y:'91',x:'127',jibunAddress:'주소'}),null);
  assert.equal(normalizeAddress({y:'37',x:'127'}),null);
  assert.deepEqual(normalizeAddress({y:'37.54',x:'127.05',jibunAddress:' 성수동 ',roadAddress:' 도로명 '}),{lat:37.54,lng:127.05,jibun:'성수동',road:'도로명'});
});
test('확정한 지번·좌표는 유지하고 상세 주소는 별도로 보관한다',()=>{
  const point={lat:37.54,lng:127.05,jibun:'서울 성동구 성수동2가 280-11',road:'서울 성동구 광나루로8길 22'};
  assert.equal(confirmedAddress(null,'1층'),null);
  assert.deepEqual(confirmedAddress(point,' 1층 '),{...point,detail:'1층',label:'서울 성동구 성수동2가 280-11 1층'});
  assert.equal(confirmedAddress(point).label,point.jibun);
});
