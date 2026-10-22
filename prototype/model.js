// 저장용 데이터에서 화면용 공통 양식을 만드는 작은 함수입니다.
export function buildView(lot, asOf) {
  const record = lot.observation;
  const time = value => value === null ? NaN : Date.parse(value);
  const now = time(asOf);
  if (!Number.isFinite(now)) throw new Error('테스트 기준 시각이 올바르지 않습니다.');
  const collected = record ? time(record.collected_at) : NaN;
  const total = record?.total_spaces;
  const available = record?.available_spaces;
  const validCounts = Number.isInteger(total) && total >= 1 && Number.isInteger(available) && available >= 0 && available <= total;
  const hasRecord = validCounts && Number.isFinite(collected) && collected <= now && now - collected <= 7 * 86400000;
  const latestRecord = hasRecord ? record : null;
  const sourceTime = latestRecord ? time(record.source_updated_at) : NaN;
  const missingTime = latestRecord?.source_updated_at === null;
  const badTime = latestRecord && !missingTime && (!Number.isFinite(sourceTime) || sourceTime > collected);
  const age = Number.isFinite(sourceTime) ? (now - sourceTime) / 60000 : null;
  const failed = ['FETCH_ERROR', 'VALIDATION_ERROR'].includes(lot.latest_collection?.result_status);
  let freshness = !latestRecord ? 'NO_RECORD' : missingTime ? 'SOURCE_TIME_MISSING' : badTime ? 'INVALID_TIME' : age > 20 ? 'STALE' : 'FRESH';
  const mode = !latestRecord || badTime ? 'NO_DATA' : failed || freshness !== 'FRESH' ? 'LAST_RECORD' : 'CURRENT';
  const rate = mode === 'CURRENT' ? Math.round((total - available) / total * 100) : null;
  const congestion = rate === null ? null : rate < 40 ? '여유' : rate < 60 ? '보통' : rate < 80 ? '혼잡' : rate < 100 ? '매우혼잡' : '만차';
  return {
    parking: { id: lot.id, name: lot.name, address: lot.address },
    latest_record: badTime ? null : latestRecord,
    latest_collection: { result: lot.latest_collection?.result_status ?? null },
    freshness: { state: freshness, age_minutes: age },
    display: {
      mode,
      congestion_label: congestion,
      warning: failed ? '최신 정보 조회 실패 · 마지막 기록입니다.' : freshness === 'STALE' ? '최신 정보 아님 · 마지막 기록입니다.' : freshness === 'SOURCE_TIME_MISSING' ? '원천 갱신 시각 미확인 · 현재 상태를 판단할 수 없습니다.' : mode === 'NO_DATA' ? '최근 유효한 수집 기록 없음' : '갱신 시점 기준이며, 도착 시점의 자리는 보장되지 않아요.'
    },
    demo_product: lot.demo_product
  };
}

export function sourceTimeLabel(record) {
  if (!record?.source_updated_at) return '원천 갱신 시각 미확인';
  return `갱신 ${new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(record.source_updated_at))}`;
}
