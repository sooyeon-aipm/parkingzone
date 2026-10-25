import test from 'node:test';import assert from 'node:assert/strict';import {connectPassSnapshot} from './pass-catalog.js';
const now='2026-10-25T10:00:00Z',lot={products:[]};
const product={id:'modu-1',name:'3시간권',price_won:3000,query_date:'2026-10-25',sale_status:'AVAILABLE',source_url:'https://app.modu.kr/t/1?parkingDate=2026-10-25'};
const snapshot={query_date:'2026-10-25',collected_at:now,last_result:'SUCCESS',products:[product]};
test('원격 상품은 수집 날짜에만 판매 가능하며 미래 날짜를 만들지 않는다',()=>{const p=connectPassSnapshot(lot,snapshot,now).observed_products[0];assert.deepEqual(p.available_dates,['2026-10-25']);assert.equal(p.available,true);});
test('수집 실패는 마지막 가격을 보존하고 구매를 막으며 수동 가격으로 되돌리지 않는다',()=>{const l=connectPassSnapshot(lot,{...snapshot,last_result:'ERROR'},now);assert.equal(l.observed_products[0].price_won,3000);assert.equal(l.observed_products[0].available,false);assert.equal(l.pass_source_registered,true);});
test('7일 만료·미래 시각의 기록은 현재 상품으로 표시하지 않는다',()=>{for(const at of ['2026-10-01T00:00:00Z','2026-10-26T00:00:00Z'])assert.equal(connectPassSnapshot(lot,{...snapshot,collected_at:at},now).observed_products.length,0);});
test('실제 정상 빈 배열은 실패와 구분하며 중복 상품은 거절한다',()=>{assert.equal(connectPassSnapshot(lot,{...snapshot,products:[]},now).observed_products.length,0);assert.throws(()=>connectPassSnapshot(lot,{...snapshot,products:[product,product]},now));});
