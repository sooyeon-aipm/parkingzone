const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat('ko-KR').format(value);
export function parkingTypeLabel(lot) {
  const info=lot.search_info;
  if(!info?.source_url || !Number.isFinite(Date.parse(info.verified_at))) return null;
  if(info.partner===true) return '제휴';
  if(info.public===true) return '공영';
  if(info.kind==='private') return '민영';
  return null;
}
export function compactFacilityMeta(lot,record) {
  const total=lot.facility_info?.total_spaces ?? record?.total_spaces;
  const parts=Number.isInteger(total)&&total>0?[`${total}면`]:[];
  if(lot.search_info?.card===true&&lot.search_info.source_url&&Number.isFinite(Date.parse(lot.search_info.verified_at))) parts.push('카드결제');
  return parts.join(' | ');
}
export function typeIcon(label) {return label?`<span class="facility-type" data-type="${escape(label)}" aria-label="${escape(label)} 주차장">${escape(label)}</span>`:'';}
export function facilityProductsHtml(products,{selectedId=null,completed=false,saleOpen=()=>true,saleLabel=()=>''}={}) {
  return products.map(p=>`<article class="facility-product ${p.available===false?'unavailable-product':p.id===selectedId?'selected-product':''}" data-product="${escape(p.id)}"><h3>${escape(p.name)}</h3><div class="facility-price-row"><strong class="facility-product-price">${money(p.price_won)}원</strong><button type="button" class="facility-buy" data-buy-product="${escape(p.id)}" ${completed||p.available===false||!saleOpen(p)?'disabled':''}>${escape(p.available===false?'구매하기':saleOpen(p)?'구매하기':saleLabel(p))}</button></div><p class="facility-hours">${escape(p.available===false?p.hours_label:p.hours_label)}</p><details class="facility-product-conditions"><summary>이용 조건</summary>${p.conditions?.length?'':'<p>상품별 상세 조건은 아직 확인되지 않았습니다.</p>'}<ul>${(p.conditions??[]).map(text=>`<li>${escape(text)}</li>`).join('')}</ul></details></article>`).join('');
}
export function measuredPeekHeight({priceBottom,sheetTop,parentHeight,fallbackHeight,edge=4}) {
  if(!Number.isFinite(priceBottom)||!Number.isFinite(sheetTop)) return Math.min(parentHeight,Math.max(160,fallbackHeight));
  return Math.min(parentHeight,Math.max(160,Math.ceil(priceBottom-sheetTop+edge)));
}
