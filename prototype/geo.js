// 두 주소 좌표 사이의 직선거리. 차량 이동 경로나 도보 거리가 아니다.
export function straightDistance(from, to) {
  const valid = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat)<=90 && Math.abs(p.lng)<=180;
  if (!valid(from) || !valid(to)) return null;
  const rad = degrees => degrees * Math.PI / 180;
  const dLat=rad(to.lat-from.lat), dLng=rad(to.lng-from.lng);
  const a=Math.sin(dLat/2)**2 + Math.cos(rad(from.lat))*Math.cos(rad(to.lat))*Math.sin(dLng/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
}
export function distanceLabel(meters) {
  if (!Number.isFinite(meters)) return '—';
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters/1000).toFixed(1)}km`;
}
