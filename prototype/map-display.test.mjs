import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleInMapLayer,mapDisplay} from './map-display.js';
test('주차권 OFF는 시설을 숨기지 않고 현장 시간요금으로 전환한다',()=>{
  const lot={facility_info:{hourly_fee_won:6000}};
  const ticket={name:'3시간권',price_won:3000};
  assert.deepEqual(mapDisplay(lot,ticket,true),{map_label:'3,000',map_caption:'3시간권',map_kind:'ticket'});
  assert.deepEqual(mapDisplay(lot,ticket,false),{map_label:'6,000',map_caption:'',map_kind:'onsite'});
  assert.equal(mapDisplay({},null,false).map_label,'P');
  assert.equal(mapDisplay({facility_info:{hourly_fee_won:0}},null,false).map_label,'0');
});
test('공유 OFF는 확인된 공유면만 제외하고 일반·미분류 시설은 유지한다',()=>{
  const shared={search_info:{kind:'shared',source_url:'https://example.com',verified_at:'2026-10-24T08:00:00Z'}};
  assert.equal(visibleInMapLayer(shared,false),false);
  assert.equal(visibleInMapLayer(shared,true),true);
  assert.equal(visibleInMapLayer({},false),true);
  assert.equal(visibleInMapLayer({search_info:{kind:'shared'}},false),true);
});
