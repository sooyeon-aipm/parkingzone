export function defaultSearchFilters() {
  return {monthlyOnly:false,partner:false,public:false,card:false,nonMechanical:false,free:true,cafe:true,restaurant:true,mart:true,ev:true};
}

// 확인되지 않은 특성을 조건에 맞는다고 간주하지 않는다.
export function matchesSearchFilters(lot, filters) {
  const source=lot.search_info;
  const info=source?.source_url && Number.isFinite(Date.parse(source.verified_at)) ? source : {};
  if (filters.monthlyOnly && !lot.products.some(p=>p.service==='monthly' || p.category==='월주차')) return false;
  if (info.kind==='ev') return filters.ev;
  if (info.kind==='free') return filters.free && Boolean(filters[info.free_type]);
  if ((filters.partner || filters.public) && !((filters.partner && info.partner===true) || (filters.public && info.public===true))) return false;
  if (filters.card && info.card!==true) return false;
  if (filters.nonMechanical && info.mechanical!==false) return false;
  return true;
}
