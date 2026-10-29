// NAVER API HUB credentials stay in the server environment; never return upstream errors.
const ENDPOINT = 'https://naverapihub.apigw.ntruss.com/search/v1/local';
const buckets = new Map();
function text(value, max = 200) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim().slice(0, max) : '';
}
function normalizePlace(item) {
  if (!item || !String(item.mapx ?? '').trim() || !String(item.mapy ?? '').trim()) return null;
  let lng = Number(item.mapx), lat = Number(item.mapy);
  // Some responses encode WGS84 degrees as integers multiplied by 10^7.
  if (Math.abs(lng) > 180) lng /= 1e7;
  if (Math.abs(lat) > 90) lat /= 1e7;
  const name = text(item.title), address = text(item.roadAddress) || text(item.address);
  if (!name || !address || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39.5 || lng < 124 || lng > 132) return null;
  return {name, address, category: text(item.category), location: {lat, lng}};
}
function scopedQuery(query) {
  return /성수|뚝섬|서울숲|서울|(?:시|군|구)\s/.test(query) ? query : `성수 ${query}`;
}
function createHandler({env = globalThis.process?.env ?? {}, fetchImpl = globalThis.fetch, now = Date.now, limits = buckets} = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, error) => res.status(status).json({error});
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(405, 'METHOD_NOT_ALLOWED'); }
    if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) return reply(415, 'JSON_REQUIRED');
    const origin = req.headers.origin;
    if (origin) {
      try { if (new URL(origin).host !== req.headers.host) return reply(403, 'ORIGIN_REJECTED'); }
      catch { return reply(403, 'ORIGIN_REJECTED'); }
    }
    let body = req.body;
    try { if (typeof body === 'string') { if (body.length > 2048) return reply(400, 'INVALID_QUERY'); body = JSON.parse(body); } }
    catch { return reply(400, 'INVALID_QUERY'); }
    const query = body?.query;
    if (typeof query !== 'string' || query.trim().length < 2 || query.length > 80 || /[\u0000-\u001f]/.test(query)) return reply(400, 'INVALID_QUERY');
    if (!env.NAVER_SEARCH_CLIENT_ID || !env.NAVER_SEARCH_CLIENT_SECRET) return reply(503, 'PLACE_SEARCH_NOT_CONFIGURED');
    const time = now();
    for (const [key, value] of limits) if (value.until <= time) limits.delete(key);
    const ip = String(req.headers['x-forwarded-for'] ?? 'local').split(',')[0].trim().slice(0, 100);
    const bucket = limits.get(ip) ?? {count: 0, until: time + 60_000};
    if (bucket.count >= 30 || limits.size >= 1000 && !limits.has(ip)) { res.setHeader('Retry-After', '60'); return reply(429, 'PLACE_SEARCH_LIMITED'); }
    bucket.count++; limits.set(ip, bucket);
    try {
      const url = new URL(ENDPOINT);
      url.search = new URLSearchParams({query: scopedQuery(query.trim()), display: '5', start: '1', sort: 'random', format: 'json'}).toString();
      const upstream = await fetchImpl(url, {
        headers: {'X-NCP-APIGW-API-KEY-ID': env.NAVER_SEARCH_CLIENT_ID, 'X-NCP-APIGW-API-KEY': env.NAVER_SEARCH_CLIENT_SECRET},
        signal: AbortSignal.timeout(8000), redirect: 'error',
      });
      if (!upstream.ok) return reply(upstream.status === 429 ? 429 : 502, upstream.status === 429 ? 'PLACE_SEARCH_LIMITED' : 'PLACE_SEARCH_FAILED');
      const data = await upstream.json();
      if (!Array.isArray(data.items) || data.items.length > 5) return reply(502, 'PLACE_SEARCH_FAILED');
      return res.status(200).json({places: data.items.map(normalizePlace).filter(Boolean), source: 'naver'});
    } catch { return reply(502, 'PLACE_SEARCH_FAILED'); }
  };
}
export {createHandler, normalizePlace, scopedQuery};
