import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildView } from './model.js';
import { attachDemoProducts } from './live-data.js';
const demo = JSON.parse(await readFile(new URL('./data/parking.json',import.meta.url)));
const now = '2026-10-23T00:00:00Z';
const lot = {...demo.lots[0], observation:{...demo.lots[0].observation,total_spaces:100,available_spaces:30,collected_at:now,source_updated_at:now},latest_collection:{result_status:'SUCCESS'}};
test('실제 상태와 가상 상품만 UUID로 연결하며 더미 상태는 대체하지 않음', () => {
  const snapshot = {data_origin:'LIVE',as_of:now,lots:[{...lot,observation:null}]};
  const merged = attachDemoProducts(snapshot,demo);
  assert.equal(merged.lots[0].observation,null);
  assert.equal(merged.lots[0].demo_product,demo.lots[0].demo_product);
  assert.throws(()=>attachDemoProducts({...snapshot,lots:[{...lot,id:'unknown'}]},demo));
  assert.throws(()=>attachDemoProducts({...snapshot,lots:[lot,lot]},demo));
  assert.throws(()=>attachDemoProducts({...snapshot,lots:[{...lot,observation:{parking_id:'wrong'}}]},demo));
});
test('최근 성공이어도 제공처 이상·수집중·조회 실패는 현재 배지를 숨김', () => {
  assert.equal(buildView(lot,now).display.congestion_label,'혼잡');
  for (const result_status of ['SOURCE_UNAVAILABLE','IN_PROGRESS','READ_ERROR','FETCH_ERROR','VALIDATION_ERROR']) {
    const item=buildView({...lot,latest_collection:{result_status}},now);
    assert.equal(item.display.mode,'LAST_RECORD');
    assert.equal(item.display.congestion_label,null);
    assert.equal(item.latest_record.available_spaces,30);
  }
});
test('20분 경과·7일 만료·원천 시각 없음과 잘못된 면수를 구분', () => {
  assert.equal(buildView(lot,'2026-10-23T00:20:01Z').freshness.state,'STALE');
  assert.equal(buildView(lot,'2026-10-30T00:00:01Z').display.mode,'NO_DATA');
  assert.equal(buildView({...lot,observation:{...lot.observation,source_updated_at:null}},now).freshness.state,'SOURCE_TIME_MISSING');
  assert.equal(buildView({...lot,observation:{...lot.observation,available_spaces:101}},now).display.mode,'NO_DATA');
});
