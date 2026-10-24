const verifiedShared = lot => lot.search_info?.kind==='shared' && lot.search_info.source_url && Number.isFinite(Date.parse(lot.search_info.verified_at));
export function visibleInMapLayer(lot, shared) {
  return shared || !verifiedShared(lot);
}
export function mapDisplay(lot, product, tickets) {
  if (tickets && product) return {map_label:new Intl.NumberFormat('ko-KR').format(product.price_won),map_caption:product.name,map_kind:'ticket'};
  const fee=lot.facility_info?.hourly_fee_won;
  return {map_label:Number.isInteger(fee) && fee>=0 ? new Intl.NumberFormat('ko-KR').format(fee) : 'P',map_caption:'',map_kind:verifiedShared(lot)?'shared':'onsite'};
}
