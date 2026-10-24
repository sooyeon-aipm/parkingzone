import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSearchFilters,matchesSearchFilters} from './search-filters.js';
const lot=info=>({products:[],search_info:{source_url:'https://example.com/source',verified_at:'2026-10-24T08:00:00Z',...info}});
test('기본 조건은 시설을 유지하고 미확인 특성으로 조건을 통과시키지 않는다',()=>{
  const filters=defaultSearchFilters();
  assert.equal(matchesSearchFilters(lot({}),filters),true);
  assert.equal(matchesSearchFilters(lot({}),{...filters,card:true}),false);
  assert.equal(matchesSearchFilters(lot({mechanical:null}),{...filters,nonMechanical:true}),false);
  assert.equal(matchesSearchFilters(lot({mechanical:false}),{...filters,nonMechanical:true}),true);
});
test('선택한 주차장 유형을 모으고 추가 조건은 함께 만족해야 한다',()=>{
  const filters={...defaultSearchFilters(),public:true,partner:true,card:true};
  assert.equal(matchesSearchFilters(lot({public:true,card:true}),filters),true);
  assert.equal(matchesSearchFilters(lot({partner:true,card:true}),filters),true);
  assert.equal(matchesSearchFilters(lot({public:true}),filters),false);
  assert.equal(matchesSearchFilters(lot({public:true,card:true,source_url:null}),filters),false);
});
test('무료·충전소·월정기 조건으로 일반 상품을 만들어 내지 않는다',()=>{
  const filters=defaultSearchFilters();
  assert.equal(matchesSearchFilters(lot({kind:'free',free_type:'cafe'}),{...filters,cafe:false}),false);
  assert.equal(matchesSearchFilters(lot({kind:'ev'}),{...filters,ev:false}),false);
  assert.equal(matchesSearchFilters(lot({}),{...filters,monthlyOnly:true}),false);
});
