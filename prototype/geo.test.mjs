import {test} from 'node:test';
import assert from 'node:assert/strict';
import {straightDistance,distanceLabel} from './geo.js';
test('같은 목적지는 0m, 적도 경도 1도는 약 111.2km이며 방향에 무관하다',()=>{
  assert.equal(straightDistance({lat:0,lng:0},{lat:0,lng:0}),0);
  const d=straightDistance({lat:0,lng:0},{lat:0,lng:1});
  assert.ok(Math.abs(d-111195)<2);
  assert.equal(d,straightDistance({lat:0,lng:1},{lat:0,lng:0}));
});
test('미확인 좌표를 0m로 만들지 않으며 거리 단위를 구분한다',()=>{
  assert.equal(straightDistance(null,{lat:37,lng:127}),null);
  assert.equal(straightDistance({lat:91,lng:127},{lat:37,lng:127}),null);
  assert.equal(distanceLabel(null),'—');
  assert.equal(distanceLabel(123),'123m');
  assert.equal(distanceLabel(1234),'1.2km');
});
