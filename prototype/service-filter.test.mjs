import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serviceProducts,durationMatches} from './service-filter.js';
import {readFileSync} from 'node:fs';
test('월주차·세차는 해당 유형의 상품만 표시한다',()=>{
  const products=[{id:'day',category:'당일권'},{id:'monthly',category:'월주차'},{id:'wash',category:'세차'}];
  assert.deepEqual(serviceProducts(products,'monthly').map(p=>p.id),['monthly']);
  assert.deepEqual(serviceProducts(products,'carwash').map(p=>p.id),['wash']);
  assert.deepEqual(serviceProducts(products,'parking').map(p=>p.id),['day']);
});
test('일반 상품만 있을 때 월주차·세차 결과를 만들지 않는다',()=>{
  assert.deepEqual(serviceProducts([{category:'시간권'}],'monthly'),[]);
  assert.deepEqual(serviceProducts([{category:'시간권'}],'carwash'),[]);
});
test('2일 이상 조건에 현재 카탈로그의 당일·시간·야간권을 연결하지 않는다',()=>{
  const catalog=JSON.parse(readFileSync(new URL('./data/facilities.json',import.meta.url),'utf8'));
  const products=catalog.lots.flatMap(lot=>lot.products);
  assert.ok(products.length>0);
  assert.deepEqual(products.filter(p=>durationMatches(p,'2일 이상')),[]);
  assert.ok(products.some(p=>durationMatches(p,'종일')));
  assert.equal(durationMatches({category:'시간권',duration_minutes:180},'5시간'),false);
  assert.equal(durationMatches({category:'시간권',duration_minutes:300},'5시간'),true);
});
