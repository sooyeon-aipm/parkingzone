Deno.env.set('PARKING_TEST_MODE', '1');
const { handler } = await import('./index.ts');
function assert(value: unknown) { if (!value) throw new Error('Assertion failed'); }
Deno.test('GET만 허용하고 임의 조회 매개변수를 받지 않음', async () => {
  assert((await handler(new Request('https://example.com', {method:'POST'}))).status === 405);
  assert((await handler(new Request('https://example.com?sql=anything'))).status === 400);
});
Deno.test('서버 키로 고정 RPC만 호출하고 결과는 캐시하지 않음', async () => {
  Deno.env.set('SUPABASE_SECRET_KEYS', JSON.stringify({default:'test-server-key'}));
  Deno.env.set('SUPABASE_URL','https://example.supabase.co');
  const snapshot = {data_origin:'LIVE',as_of:new Date().toISOString(),lots:[]};
  const fetcher = ((url: string, options: RequestInit) => {
    assert(url === 'https://example.supabase.co/rest/v1/rpc/parking_read_snapshot');
    assert((options.headers as Record<string,string>).apikey === 'test-server-key');
    assert(options.body === '{}');
    return Promise.resolve(Response.json(snapshot));
  }) as typeof fetch;
  const response = await handler(new Request('https://example.com'),fetcher);
  assert(response.status===200 && response.headers.get('Cache-Control')==='no-store');
  assert(JSON.stringify(await response.json())===JSON.stringify(snapshot));
});
Deno.test('DB 오류·상세 응답은 숨기고 더미로 대체하지 않음', async () => {
  const fetcher = (() => Promise.resolve(new Response('secret database error',{status:500}))) as typeof fetch;
  const response = await handler(new Request('https://example.com'),fetcher);
  assert(response.status===502);
  assert(await response.text() === '{"error":"PARKING_READ_FAILED"}');
});
