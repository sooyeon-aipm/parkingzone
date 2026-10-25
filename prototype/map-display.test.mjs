import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleInMapLayer,mapDisplay} from './map-display.js';
test('주차권 ON·OFF 모두 현장 1시간 요금을 쓰며 상품 최저가로 바꾸지 않는다',()=>{
  const lot={facility_info:{hourly_fee_won:6000}};
  const ticket={name:'3시간권',price_won:3000};
  assert.deepEqual(mapDisplay(lot,ticket,true),{map_label:'6,000',map_caption:'',map_kind:'onsite'});
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
test('제휴 여부는 말풍선 유형에만 반영하며 선택 상품으로 요금을 바꾸지 않는다',()=>{
 const lot={search_info:{partner:true},facility_info:{hourly_fee_won:6300}};
 assert.deepEqual(mapDisplay(lot,{price_won:17700,name:'당일권'},true),{map_label:'6,300',map_caption:'',map_kind:'ticket'});
 assert.equal(mapDisplay(lot,null,false).map_label,'6,300');
});
