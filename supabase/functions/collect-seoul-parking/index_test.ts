Deno.env.set('PARKING_TEST_MODE', '1');
const { assessRow, collectGroup, handler, addressKey } = await import('./index.ts');
const task = { id: 'attempt', parking_id: 'parking', source_parking_id: '172144',
  address: '성수동1가 366-1', started_at: '2026-10-23T00:00:00Z' };
const row = { parking_code: '172144', address: '성동구 성수동1가 366-1 ',
  que_status: '1', capacity: '99', cur_parking: '97', cur_parking_time: '2026-10-23 09:00:00' };
const at = '2026-10-23T00:01:00Z';
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}
Deno.test('원천 현재 주차 대수를 가능 면수로 변환하고 UTC 시각으로 저장', () => {
  const r = assessRow(task, [row], at);
  equal([r.result_status, r.total_spaces, r.available_spaces, r.source_updated_at], ['SUCCESS', 99, 2, '2026-10-23T00:00:00.000Z']);
});
Deno.test('미연계·수집중·점검중의 0은 빈자리로 계산하지 않음', () => {
  for (const s of ['0', '2', '3', 'unknown']) {
    const r = assessRow(task, [{ ...row, que_status: s, cur_parking: '0' }], at);
    equal(r.result_status, 'SOURCE_UNAVAILABLE');
    equal(r.available_spaces, undefined);
  }
});
Deno.test('음수·소수·빈 숫자·범위 초과 거절', () => {
  for (const v of ['-1', '1.5', '', '100']) equal(assessRow(task, [{ ...row, cur_parking: v }], at).error_code, 'INVALID_COUNTS');
});
Deno.test('미래 시각·잘못된 날짜를 자동 보정하지 않음', () => {
  for (const v of ['2026-10-23 09:02:00', '2026-02-30 09:00:00', 'bad']) {
    equal(assessRow(task, [{ ...row, cur_parking_time: v }], at).error_code, 'INVALID_SOURCE_TIME');
  }
});
Deno.test('원천 시각 없음과 오래된 정상 수치의 저장 의미 구분', () => {
  const missing = assessRow(task, [{ ...row, cur_parking_time: '' }], at);
  equal([missing.quality_status, missing.source_updated_at], ['SOURCE_TIME_MISSING', null]);
  equal(assessRow(task, [{ ...row, cur_parking_time: '2026-10-22 09:00:00' }], at).result_status, 'SUCCESS');
});
Deno.test('같은 원천 코드여도 주소가 다르거나 코드가 중복이면 차단', () => {
  equal(assessRow(task, [{ ...row, address: '성수동1가 366-11' }], at).error_code, 'SOURCE_ADDRESS_MISMATCH');
  equal(assessRow(task, [row, row], at).error_code, 'SOURCE_ID_COUNT');
  equal(assessRow(task, [], at).error_code, 'SOURCE_ID_COUNT');
  equal(addressKey('성동구 성수동1가 685-696* '), '성수동1가685-696');
});
Deno.test('접근 실패와 JSON 데이터 오류 구분', async () => {
  const mocked = (r: Response): typeof fetch => (async () => r) as typeof fetch;
  equal((await collectGroup([task], mocked(new Response('error', { status: 503 }))))[0].result_status, 'FETCH_ERROR');
  equal((await collectGroup([task], mocked(new Response('bad json'))))[0].result_status, 'VALIDATION_ERROR');
  equal((await collectGroup([task], mocked(Response.json(null))))[0].result_status, 'VALIDATION_ERROR');
  equal((await collectGroup([task], mocked(Response.json({result_state:'0000',res_value:{parking_list:[null]}}))))[0].result_status, 'VALIDATION_ERROR');
});
Deno.test('응답 본문 시간 초과도 접근 실패로 기록', async () => {
  const response = new Response();
  response.json = () => Promise.reject(new DOMException('timeout', 'TimeoutError'));
  const r = await collectGroup([task], (async () => response) as typeof fetch);
  equal([r[0].result_status, r[0].error_code], ['FETCH_ERROR', 'SOURCE_TIMEOUT']);
});
Deno.test('서버 역할 인증이 없는 호출은 원천·DB 요청 전에 차단', async () => {
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  equal((await handler(new Request('https://example.test', { method: 'POST' }))).status, 401);
  equal((await handler(new Request('https://example.test', { headers: { Authorization:'Bearer test-server-key' } }))).status, 405);
  Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
});
Deno.test('현재 secret 키의 apikey 인증도 허용하고 publishable 키는 거절', async () => {
  Deno.env.set('SUPABASE_SECRET_KEYS', JSON.stringify({default:'sb_secret_test_only'}));
  equal((await handler(new Request('https://example.test', {headers:{apikey:'sb_secret_test_only'}}))).status, 405);
  equal((await handler(new Request('https://example.test', {method:'POST',headers:{apikey:'sb_publishable_test_only'}}))).status, 401);
  Deno.env.delete('SUPABASE_SECRET_KEYS');
});
