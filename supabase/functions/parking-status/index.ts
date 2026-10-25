// 공개된 주차 시설·상태만 반환한다. DB 테이블/RPC는 익명에게 열지 않는다.
// Edge 게이트웨이 JWT 검증 ON. 기존 공개 anon JWT로 읽을 수 있는 제한된 조회다.
export async function handler(req: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (req.method !== 'GET') return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405, headers });
  if (new URL(req.url).search) return Response.json({ error: 'PARAMETERS_NOT_ALLOWED' }, { status: 400, headers });
  let modern: Record<string, string> = {};
  try { modern = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'); } catch { /* 아래 설정 검사 */ }
  const key = modern.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const base = Deno.env.get('SUPABASE_URL');
  if (!key || !base) return Response.json({ error: 'SERVER_CONFIG_MISSING' }, { status: 503, headers });
  try {
    const res = await fetcher(`${base}/rest/v1/rpc/parking_read_snapshot_with_passes`, {
      method: 'POST', signal: AbortSignal.timeout(15_000),
      headers: { 'Content-Type': 'application/json', apikey: key,
        ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) },
      body: '{}',
    });
    if (!res.ok) { await res.body?.cancel(); throw new Error('READ_FAILED'); }
    const data = await res.json();
    if (data?.data_origin !== 'LIVE' || !Number.isFinite(Date.parse(data.as_of)) || !Array.isArray(data.lots) || data.lots.length > 15) throw new Error('BAD_SNAPSHOT');
    return Response.json(data, { headers });
  } catch {
    // 원본 SQL 오류·키·헤더를 응답에 포함하지 않는다. 더미로 대체하지 않는다.
    return Response.json({ error: 'PARKING_READ_FAILED' }, { status: 502, headers });
  }
}
if (Deno.env.get('PARKING_TEST_MODE') !== '1') Deno.serve(req => handler(req));
