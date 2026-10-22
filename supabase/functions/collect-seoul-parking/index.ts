// 서버 전용 수집기. 기존 service_role 호출만 허용하며 비밀값을 응답·로그에 남기지 않는다.
export type Task = {
  id: string; parking_id: string; source_parking_id: string;
  address: string; started_at: string;
};
type Row = Record<string, unknown>;
type Result = Record<string, unknown> & { id: string; parking_id: string; result_status: string };
const SOURCE = 'https://parking.seoul.go.kr/search/parking/list.do';
const SOURCE_TIMEOUT_MS = 20_000;
const RETRY_DELAY_MS = 30_100;

export function addressKey(value: unknown): string | null {
  const match = String(value ?? '').match(/성수동[12]가\s+\d+(?:-\d+)?(?![\d-])/);
  return match ? match[0].replace(/\s+/g, '') : null;
}

function failure(task: Task, status: string, code: string, message: string, raw?: Row): Result {
  return { id: task.id, parking_id: task.parking_id, result_status: status,
    error_code: code, error_message: message, raw_payload: raw ?? null };
}

export function assessRow(task: Task, rows: Row[], collectedAt: string): Result {
  const matches = rows.filter(r => String(r.parking_code) === task.source_parking_id);
  if (matches.length !== 1) {
    return failure(task, 'VALIDATION_ERROR', 'SOURCE_ID_COUNT', '원천 코드가 없거나 중복됨',
      { source_parking_id: task.source_parking_id, matches: matches.length });
  }
  const r = matches[0];
  // 이름·주소·원천 코드의 미리 검토한 연결만 사용한다. 주소만으로 새 시설을 합치지 않는다.
  if (!addressKey(task.address) || addressKey(task.address) !== addressKey(r.address)) {
    return failure(task, 'VALIDATION_ERROR', 'SOURCE_ADDRESS_MISMATCH', '등록한 시설과 원천 주소가 다름',
      { source_parking_id: task.source_parking_id, address: String(r.address ?? '').slice(0, 150) });
  }
  const status = String(r.que_status ?? '');
  if (status !== '1') {
    return failure(task, 'SOURCE_UNAVAILABLE', ['0', '2', '3'].includes(status) ? `SOURCE_STATUS_${status}` : 'UNKNOWN_SOURCE_STATUS',
      '원천 미연계·정보 수집 중·통신 점검 등으로 현재 수치를 사용할 수 없음',
      { source_parking_id: task.source_parking_id, que_status: status,
        que_status_nm: String(r.que_status_nm ?? '').slice(0, 50) });
  }
  const integer = (v: unknown): number | null => {
    const s = String(v ?? '').trim();
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isSafeInteger(n) ? n : null;
  };
  const total = integer(r.capacity), parked = integer(r.cur_parking);
  if (total === null || parked === null || total < 1 || parked > total) {
    return failure(task, 'VALIDATION_ERROR', 'INVALID_COUNTS', '주차 면수의 형식 또는 범위 오류',
      { capacity: String(r.capacity ?? '').slice(0, 30), cur_parking: String(r.cur_parking ?? '').slice(0, 30) });
  }
  const rawTime = String(r.cur_parking_time ?? '').trim();
  let sourceTime: string | null = null;
  if (rawTime) {
    const m = rawTime.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    const parsed = m ? Date.parse(`${rawTime.replace(' ', 'T')}+09:00`) : NaN;
    // 잘못된 월/일 자동 보정도 막는다. 시간대 없는 원천 문자열은 KST로 해석한다.
    const roundTrip = Number.isFinite(parsed) ? new Date(parsed + 9 * 3600_000).toISOString().slice(0, 19).replace('T', ' ') : '';
    if (!Number.isFinite(parsed) || roundTrip !== rawTime || parsed > Date.parse(collectedAt)) {
      return failure(task, 'VALIDATION_ERROR', 'INVALID_SOURCE_TIME', '원천 시각 형식·날짜·미래 시각 오류',
        { cur_parking_time: rawTime.slice(0, 80) });
    }
    sourceTime = new Date(parsed).toISOString();
  }
  return { id: task.id, parking_id: task.parking_id, result_status: 'SUCCESS',
    total_spaces: total, available_spaces: total - parked, source_updated_at: sourceTime,
    collected_at: collectedAt, quality_status: sourceTime ? 'VALID' : 'SOURCE_TIME_MISSING' };
}

export async function collectGroup(tasks: Task[], fetcher: typeof fetch = fetch): Promise<Result[]> {
  const dong = tasks[0].address.match(/성수동[12]가/)?.[0];
  if (!dong) return tasks.map(t => failure(t, 'VALIDATION_ERROR', 'INVALID_TARGET_AREA', '대상 지역 오류'));
  let response: Response;
  try {
    response = await fetcher(SOURCE, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': 'https://parking.seoul.go.kr/', 'Accept': 'application/json' },
      body: new URLSearchParams({ Gu: '성동구', Dong: dong, Keyword: '', index: '1', Type: '63', Rule: '0' }),
      signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS) });
  } catch (e) {
    const code = e instanceof DOMException && ['TimeoutError', 'AbortError'].includes(e.name)
      ? 'SOURCE_TIMEOUT' : 'SOURCE_NETWORK';
    return tasks.map(t => failure(t, 'FETCH_ERROR', code, '서울시 요청 응답을 받지 못함'));
  }
  if (!response.ok) {
    await response.body?.cancel();
    return tasks.map(t => failure(t, 'FETCH_ERROR', 'SOURCE_HTTP', '서울시 HTTP 응답 오류', { http_status: response.status }));
  }
  let body: Row;
  try { body = await response.json(); }
  catch (e) {
    if (e instanceof DOMException && ['TimeoutError', 'AbortError'].includes(e.name)) {
      return tasks.map(t => failure(t, 'FETCH_ERROR', 'SOURCE_TIMEOUT', '서울시 응답 본문 수신 시간 초과'));
    }
    return tasks.map(t => failure(t, 'VALIDATION_ERROR', 'INVALID_SOURCE_JSON', '원천 JSON 해석 오류'));
  }
  if (!body || typeof body !== 'object') {
    return tasks.map(t => failure(t, 'VALIDATION_ERROR', 'INVALID_SOURCE_RESPONSE', '원천 응답이 객체가 아님'));
  }
  const value = body.res_value as Row | undefined;
  if (body.result_state !== '0000' || !Array.isArray(value?.parking_list)
      || value.parking_list.some((r: unknown) => !r || typeof r !== 'object')) {
    return tasks.map(t => failure(t, 'VALIDATION_ERROR', 'INVALID_SOURCE_RESPONSE', '원천 응답 형식 오류',
      { result_state: String(body.result_state ?? '').slice(0, 30) }));
  }
  const collectedAt = new Date().toISOString();
  return tasks.map(t => assessRow(t, value.parking_list as Row[], collectedAt));
}

function serverKeys(): string[] {
  let modern: Record<string, string> = {};
  try { modern = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'); } catch { /* 설정 오류는 아래에서 차단 */ }
  return [modern.default, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')].filter((v): v is string => !!v);
}

async function rpc(name: string, args: Row): Promise<Row> {
  const key = serverKeys()[0];
  const base = Deno.env.get('SUPABASE_URL');
  if (!key || !base) throw new Error('SERVER_CONFIG_MISSING');
  const res = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: 'POST', signal: AbortSignal.timeout(15_000),
    headers: { 'Content-Type': 'application/json', apikey: key,
      ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    await res.body?.cancel();
    // SQL 원문·헤더·키를 외부 응답에 넣지 않는다.
    throw new Error(`DB_RPC_${name}_${res.status}`);
  }
  return await res.json();
}

async function runTasks(tasks: Task[]): Promise<Result[]> {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const dong = task.address.match(/성수동[12]가/)?.[0] ?? '';
    groups.set(dong, [...(groups.get(dong) ?? []), task]);
  }
  // 두 지역은 병렬 요청해 20초 요청 제한·30초 대기·재시도도 무료 실행 제한 안에 둔다.
  return (await Promise.all([...groups.values()].map(g => collectGroup(g)))).flat();
}

export async function handler(req: Request): Promise<Response> {
  const keys = serverKeys();
  if (!keys.length) return Response.json({ error: 'SERVER_CONFIG_MISSING' }, { status: 503 });
  const bearer = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!keys.includes(req.headers.get('apikey') ?? '') && !keys.includes(bearer ?? '')) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (req.method !== 'POST') return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  try {
    // 요청 본문에서 임의 시설·SQL·외부 URL을 받지 않는다. DB에 등록된 시설만 수집한다.
    const begun = await rpc('parking_begin_collection', {});
    if (begun.busy) return Response.json({ skipped: 'ACTIVE_COLLECTION' }, { status: 409 });
    const tasks = begun.tasks as Task[];
    if (!tasks.length) return Response.json({ targets: 0, observations_added: 0 });
    const results = await runTasks(tasks);
    const finished = await rpc('parking_finish_collection', { p_results: results });
    let retried = 0, retryAdded = 0;
    const retryIds = results.filter(r => r.result_status === 'FETCH_ERROR').map(r => r.id);
    if (retryIds.length) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      const next = await rpc('parking_begin_collection', { p_retry_ids: retryIds });
      const retryTasks = next.tasks as Task[];
      if (retryTasks.length) {
        const retryResults = await runTasks(retryTasks);
        const retryFinished = await rpc('parking_finish_collection', { p_results: retryResults });
        retried = retryTasks.length;
        retryAdded = Number(retryFinished.observations_added);
      }
    }
    const statuses: Record<string, number> = {};
    for (const r of results) statuses[r.result_status] = (statuses[r.result_status] ?? 0) + 1;
    return Response.json({ targets: tasks.length, finished: finished.finished,
      observations_added: Number(finished.observations_added) + retryAdded, retried, statuses,
      completed_at: new Date().toISOString() });
  } catch (e) {
    const code = e instanceof Error && /^DB_RPC_|^SERVER_CONFIG_MISSING$/.test(e.message)
      ? e.message : 'COLLECTION_FAILED';
    return Response.json({ error: code }, { status: 500 });
  }
}

if (Deno.env.get('PARKING_TEST_MODE') !== '1') Deno.serve(handler);
