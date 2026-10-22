// 원격 실데이터에는 테스트 상품만 UUID로 붙인다. 가상 주차 상태를 섞지 않는다.
export function attachDemoProducts(snapshot, demo) {
  if (snapshot?.data_origin !== 'LIVE' || !Number.isFinite(Date.parse(snapshot.as_of)) || !Array.isArray(snapshot.lots) || snapshot.lots.length > 15) throw new Error('INVALID_SNAPSHOT');
  const products = new Map(demo.lots.map(lot => [lot.id, lot.demo_product]));
  const ids = new Set();
  const lots = snapshot.lots.map(lot => {
    if (!products.has(lot.id) || ids.has(lot.id) || typeof lot.name !== 'string' || typeof lot.address !== 'string') throw new Error('UNKNOWN_OR_DUPLICATE_LOT');
    ids.add(lot.id);
    if (lot.observation && lot.observation.parking_id !== lot.id) throw new Error('MISMATCHED_RECORD');
    return { id: lot.id, name: lot.name, address: lot.address,
      observation: lot.observation, latest_collection: lot.latest_collection,
      demo_product: products.get(lot.id) };
  });
  return { data_origin: 'LIVE', as_of: snapshot.as_of, lots };
}
