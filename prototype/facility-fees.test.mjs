import {test} from 'node:test';
import assert from 'node:assert/strict';
import {facilityFeeLines} from './facility-fees.js';

test('기본·추가 단위와 시간당 요금을 구분하고 미확인 일 최대요금은 만들지 않는다', () => {
  assert.deepEqual(facilityFeeLines({basic_minutes:30,basic_fee_won:3000,additional_minutes:10,additional_fee_won:1000,hourly_fee_won:6000,daily_max_won:null}), ['기본 30분 3,000원','추가 10분당 1,000원','1시간 기준 6,000원']);
});
test('미확인과 0원을 구분하며 잘못된 요금은 표시하지 않는다', () => {
  assert.deepEqual(facilityFeeLines(null),['확인된 현장 요금 정보가 없습니다.']);
  assert.deepEqual(facilityFeeLines({hourly_fee_won:0}),['1시간 기준 0원']);
  assert.deepEqual(facilityFeeLines({hourly_fee_won:-1,basic_minutes:0,basic_fee_won:1000}),['확인된 현장 요금 정보가 없습니다.']);
});
test('공영 단위요금을 기본·추가 요금으로 임의 변환하지 않는다',()=>{
  assert.deepEqual(facilityFeeLines({unit_minutes:5,unit_fee_won:250,hourly_fee_won:3000,daily_max_won:null}),['5분당 250원','1시간 기준 3,000원']);
});
test('서울시에서만 확인한 요금은 출처와 미대조 상태를 함께 표시한다',()=>{
  assert.deepEqual(facilityFeeLines({source_label:'서울시 기준 · 모두의주차장 미대조',hourly_fee_won:4000,daily_max_won:null}),['서울시 기준 · 모두의주차장 미대조','1시간 기준 4,000원']);
});
