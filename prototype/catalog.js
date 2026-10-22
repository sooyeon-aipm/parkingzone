// 시설 원문과 검증된 상품만 사용한다. 주차 현황·가격·거리를 만들어 채우지 않는다.
export function connectCatalog(snapshot, catalog) {
  if (snapshot?.data_origin !== 'LIVE' || !Number.isFinite(Date.parse(snapshot.as_of)) || !Array.isArray(snapshot.lots)) throw new Error('INVALID_SNAPSHOT');
  const records = new Map();
  for (const lot of snapshot.lots) {
    if (records.has(lot.id)) throw new Error('DUPLICATE_FACILITY');
    if (lot.observation && lot.observation.parking_id !== lot.id) throw new Error('MISMATCHED_OBSERVATION');
    records.set(lot.id,lot);
  }
  const ids = new Set(catalog.lots.map(lot => lot.id));
  if (ids.size !== catalog.lots.length || [...records.keys()].some(id => !ids.has(id))) throw new Error('UNKNOWN_FACILITY');
  return {
    data_origin:'LIVE', as_of:snapshot.as_of,
    lots:catalog.lots.map(facility => {
      const actual = records.get(facility.id);
      return { ...facility,
        observation:actual?.observation ?? null,
        latest_collection:actual?.latest_collection ?? null,
        products:(facility.products ?? []).filter(product =>
          product.source_url && Number.isFinite(Date.parse(product.verified_at)) &&
          Number.isInteger(product.price_won) && product.price_won >= 0),
      };
    }),
  };
}
