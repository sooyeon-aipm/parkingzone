import {test} from 'node:test';
import assert from 'node:assert/strict';
import {koreaDate,shiftMonth,monthDays,selectableDate} from './calendar.js';
test('한국 자정 경계를 UTC와 구분한다',()=>{
  assert.equal(koreaDate(new Date('2026-10-24T14:59:59Z')),'2026-10-24');
  assert.equal(koreaDate(new Date('2026-10-24T15:00:00Z')),'2026-10-25');
});
test('월 이동은 연말·연초를 넘긴다',()=>{
  assert.equal(shiftMonth('2026-12',1),'2027-01');
  assert.equal(shiftMonth('2027-01',-1),'2026-12');
});
test('윤년의 2월과 다음 달 일자를 정확하게 생성한다',()=>{
  assert.equal(monthDays('2028-02','2028-02-28').length,29);
  assert.equal(monthDays('2027-02','2027-02-01').length,28);
  assert.equal(monthDays('2026-11','2026-10-24')[0].disabled,false);
  assert.equal(monthDays('2026-10','2026-10-24')[22].disabled,true);
  assert.equal(monthDays('2026-10','2026-10-24')[23].disabled,false);
});
test('자정이 지나 전날이 된 선택과 존재하지 않는 날짜를 거절한다',()=>{
  assert.equal(selectableDate('2026-10-24','2026-10-25'),false);
  assert.equal(selectableDate('2026-10-25','2026-10-25'),true);
  assert.equal(selectableDate('2026-11-01','2026-10-25'),true);
  assert.equal(selectableDate('2027-02-29','2027-02-01'),false);
});
