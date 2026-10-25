import test from 'node:test';
import assert from 'node:assert/strict';
import {parkingTypeLabel,compactFacilityMeta,facilityProductsHtml,measuredPeekHeight} from './facility-sheet.js';
test('출처 미확인 유형을 민영으로 추측하지 않는다',()=>{
 assert.equal(parkingTypeLabel({}),null);
 assert.equal(parkingTypeLabel({search_info:{partner:true}}),null);
 assert.equal(parkingTypeLabel({search_info:{partner:true,source_url:'https://app.modu.kr',verified_at:'2026-10-25'}}),'제휴');
 assert.equal(compactFacilityMeta({},null),'');
 assert.equal(compactFacilityMeta({facility_info:{total_spaces:154}},null),'154면');
});
test('상품별 버튼은 해당 상품 ID와 가격을 유지하고 문자열을 이스케이프한다',()=>{
 const html=facilityProductsHtml([{id:'a',name:'<상품>',price_won:6000},{id:'b',name:'5시간',price_won:9000}],{saleOpen:p=>p.id==='a',saleLabel:()=> '판매 종료'});
 assert.match(html,/&lt;상품&gt;/);assert.match(html,/data-buy-product="a" >구매하기/);assert.match(html,/data-buy-product="b" disabled>판매 종료/);assert.match(html,/9,000원/);
});
test('초기 높이는 첫 가격 아래 4px이며 화면 높이를 넘지 않는다',()=>{
 assert.equal(measuredPeekHeight({priceBottom:780,sheetTop:400,parentHeight:844}),384);
 assert.equal(measuredPeekHeight({priceBottom:1000,sheetTop:0,parentHeight:600}),600);
 assert.equal(measuredPeekHeight({parentHeight:844,fallbackHeight:320}),320);
});
test('이용 불가 관찰 상품은 구매 버튼을 항상 비활성화한다',()=>{
 const html=facilityProductsHtml([{id:'closed',name:'평일권',price_won:9000,available:false,hours_label:'10/25(일) 이용불가'}]);
 assert.match(html,/unavailable-product/);assert.match(html,/data-buy-product="closed" disabled/);assert.match(html,/10\/25/);
});
