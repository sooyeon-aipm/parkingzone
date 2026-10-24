import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRefreshPolicy} from './refresh-policy.js';

test('복귀·자동·수동 요청이 겹쳐도 한 요청을 공유한다', async () => {
  let complete, calls = 0;
  const policy = createRefreshPolicy({load: () => { calls++; return new Promise(resolve => {complete = resolve;}); }});
  const first = policy.refresh();
  assert.equal(policy.refresh(), first);
  assert.equal(policy.refresh({force:true}), first);
  await Promise.resolve();
  assert.equal(calls, 1);
  complete(); await first;
});

test('성공 후 60초 이전 복귀는 생략하고 이후 다시 조회한다', async () => {
  let time = 0, calls = 0;
  const policy = createRefreshPolicy({now: () => time, load: async () => {calls++;}});
  await policy.refresh(); time = 59999;
  assert.equal(await policy.refresh(), false);
  time = 60000; await policy.refresh();
  assert.equal(calls, 2);
});

test('실패 시에도 자동 재시도 간격을 지키고 수동 재시도는 허용한다', async () => {
  let calls = 0;
  const policy = createRefreshPolicy({now: () => 0, load: async () => { if (++calls === 1) throw Error('offline'); }});
  await assert.rejects(policy.refresh());
  assert.equal(await policy.refresh(), false);
  await policy.refresh({force:true});
  assert.equal(calls, 2);
});

test('앱이 처리한 실패는 성공으로 간주하지 않으며 재시도 후 복구한다', async () => {
  let time = 0, calls = 0;
  const policy = createRefreshPolicy({now: () => time, load: async () => ++calls !== 1});
  assert.equal(await policy.refresh(), false);
  time = 59999;
  assert.equal(await policy.refresh(), false);
  assert.equal(calls, 1);
  time = 60000;
  assert.equal(await policy.refresh(), true);
  assert.equal(calls, 2);
});

test('느린 성공 응답은 요청 시작이 아니라 응답 완료부터 60초를 계산한다', async () => {
  let time = 0, complete, calls = 0;
  const policy = createRefreshPolicy({now: () => time, load: () => {calls++; return new Promise(resolve => {complete=resolve;});}});
  const pending=policy.refresh();
  await Promise.resolve();
  time=25000; complete(); await pending;
  time=60000;
  assert.equal(await policy.refresh(), false);
  assert.equal(calls, 1);
});
