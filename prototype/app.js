import {parkingTypeLabel,compactFacilityMeta,typeIcon,facilityProductsHtml,measuredPeekHeight} from './facility-sheet.js?v=20261025-fifteen4';
import { buildView, sourceTimeLabel } from './model.js';
import { connectCatalog } from './catalog.js?v=20261025-passes1';
import {straightDistance,distanceLabel} from './geo.js';
import { createParkingMap } from './parking-map.js?v=20261030-place-search';
import { createRefreshPolicy } from './refresh-policy.js';
import { startRefreshLoop } from './refresh-loop.js';
import { attachBottomSheet } from './bottom-sheet.js?v=20261025-fifteen4';
import { facilityFeeLines } from './facility-fees.js?v=20261025-fifteen4';
import { readFavorites, saveFavorites } from './favorites.js';
import { updateHtml } from './dom-update.js';
import { koreaDate, shiftMonth, monthDays, selectableDate } from './calendar.js';
import { serviceProducts, durationMatches } from './service-filter.js';
import { initialProductId, selectedProductById } from './product-selection.js';
import {defaultSearchFilters, matchesSearchFilters} from './search-filters.js';
import {createPlaceSearch,nearbyLots} from './place-search.js';
import {mapDisplay,visibleInMapLayer} from './map-display.js?v=20261025-fifteen4';
import {initShareFlow} from './share-flow.js';
import {analytics,trackEvent,productType,durationBucket} from './analytics.js';
import {installUiAnalytics} from './analytics-ui.js';
let parkingMap;
let searchFilters=defaultSearchFilters();
let sharedLayer=true;
const placeSearch=createPlaceSearch();
let placeResults=[],placeRequest=0;
let selectedPlace=null;

const initialDate=koreaDate();
let draftDate=initialDate, draftDuration='1시간', calendarMonth=initialDate.slice(0,7);
// 화면 선택(state) / 원본 데이터(dataset) / 화면용 데이터(view)를 분리합니다.
const state = { mode: 'improved', service:'parking', selectedId: null, selectedProductId:null, detailOrigin:'map', destinationId:null, query: '', sort: 'name', expanded: false, category: '제안', duration: '1시간', date: initialDate, followToday:true, scenario: 'normal', returnY: 0, zoom: 1, tickets: true, completed: false };
const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('ko-KR').format(value);
const storageKey = 'parkingzone-ut-selections-v1';
const participantView = true;
const participantScenario = 'normal';
let dataset, catalog, toastTimer, liveLoadedAt=0, liveLoadedWallAt=Date.now(), requestVersion=0, readError=false, firstReadPending=true;
const isLive = () => true;
const displayAsOf = () => new Date(Date.parse(dataset.as_of)+Math.max(performance.now()-liveLoadedAt,Date.now()-liveLoadedWallAt)).toISOString();
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3200); }
const view = lot => buildView(lot, displayAsOf(), {readError});
function analyticsContext(parkingId=state.selectedId) {
  const lot=dataset?.lots.find(lot=>lot.id===parkingId);
  if(!lot)return {service:state.service};
  const item=view(lot);
  return {service:state.service,parking_id:lot.id,display_mode:item.display.mode,freshness:item.freshness.state,congestion:item.display.congestion_label??'확인 필요'};
}
const selectedDate = () => state.followToday ? koreaDate() : state.date;
const dateLabel = value => value===koreaDate() ? '오늘' : value.replaceAll('-','.');
const saleOpen = product => product && product.available!==false && (!product.sale_starts_at || Date.parse(displayAsOf()) >= Date.parse(product.sale_starts_at));
const saleLabel = product => product?.available===false ? `${selectedDate().slice(5).replace('-','/')} 이용불가` : saleOpen(product) ? '' : `${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(product.sale_starts_at))} 판매예정`;
function productsFor(lot) {
  return serviceProducts((lot.pass_source_registered||lot.observed_products?.some(p=>p.observed_date===selectedDate())?lot.observed_products:lot.products),state.service).filter(product => product.available!==false && product.available_dates?.includes(selectedDate()) &&
    (['제안',product.category].includes(state.category)) &&
    (state.service!=='parking' || durationMatches(product,state.duration)));
}
const destination = () => selectedPlace ?? dataset.lots.find(lot=>lot.id===state.destinationId);
const lotLocation = lot => parkingMap?.getLocation(lot.id) ?? (lot.location_verified_at ? lot.location : null);
const destinationLocation = () => selectedPlace?.location ?? parkingMap?.getLocation(state.destinationId);
const distanceTo = lot => straightDistance(destinationLocation(),lotLocation(lot));
function candidateLots() {
  const term=state.query.trim();
  const scope=selectedPlace ? nearbyLots(dataset.lots,selectedPlace,lotLocation) : dataset.lots;
  return scope.filter(lot=>visibleInMapLayer(lot,sharedLayer) && matchesSearchFilters(lot,searchFilters) && (state.service==='parking' || serviceProducts(lot.products,state.service).length) && (selectedPlace || state.destinationId || !term || term==='성수동' || `${lot.name} ${lot.address}`.includes(term)));
}
function readFilterDraft() {
  return Object.fromEntries([...document.querySelectorAll('[data-search-filter]')].map(input=>[input.dataset.searchFilter,input.checked]));
}
function showFilterDraft(filters) {
  document.querySelectorAll('[data-search-filter]').forEach(input=>{input.checked=Boolean(filters[input.dataset.searchFilter]);});
  updateFilterSummary();
}
function updateFilterSummary() {
  const draft=readFilterDraft();
  $('#general-filter-summary').textContent=['partner','public','card','nonMechanical'].some(key=>draft[key])?'선택한 주차장만 보기':'필터 안함 · 전체보기';
  for(const key of ['cafe','restaurant','mart']) document.querySelector(`[data-search-filter="${key}"]`).disabled=!draft.free;
  document.querySelectorAll('[data-filter-selector]').forEach(button=>{button.disabled=!draft.ev;});
}
function visibleLots() {
  const filtered=candidateLots().filter(lot=>selectedPlace || productsFor(lot).length);
  return filtered.sort((a,b)=>{
    const order=state.sort==='price' ? (productsFor(a)[0]?.price_won ?? Infinity)-(productsFor(b)[0]?.price_won ?? Infinity)
      : state.sort==='distance' ? (distanceTo(a) ?? Infinity)-(distanceTo(b) ?? Infinity) : 0;
    return (Number.isNaN(order) ? 0 : order) || a.name.localeCompare(b.name,'ko');
  });
}
function badge(item) { const label = item.display.congestion_label ?? '확인 필요'; return `<span class="badge" data-level="${escape(label)}">${escape(label)}</span>`; }
// 목록은 짧게, 상세와 툴팁에는 원래 갱신 시각 설명을 유지합니다.
function listTimeLabel(item) {
  if (!item.latest_record) return '기록 없음';
  if (!item.latest_record.source_updated_at) return '미확인';
  return sourceTimeLabel(item.latest_record);
}
function rowHeading(lot, item) {
  const name = `<h3 class="lot-name" title="${escape(lot.name)}">${escape(lot.name)}</h3>`;
  const meters=distanceTo(lot);
  const distance=`<span class="row-distance" title="${meters===null?'목적지 또는 주차장 좌표 확인 전':'검색 목적지부터 직선거리'}">${distanceLabel(meters)}</span>`;
  if (state.mode === 'baseline') return `<div class="row-heading">${name}${distance}</div>`;
  const time = `<span class="status-time" title="${escape(item.latest_record ? sourceTimeLabel(item.latest_record) : item.display.warning)}">${escape(listTimeLabel(item))}</span>`;
  return `<div class="row-heading with-status layout-name">${badge(item)}<div class="name-and-time">${name}${time}</div>${distance}</div>`;
}
function renderList() {
  const lots = visibleLots();
  const listHtml = lots.length ? lots.map(lot => {
    const item = view(lot), products = productsFor(lot);
    const tickets = products.length ? products.map(p => `<button class="ticket" data-lot="${lot.id}" data-product="${escape(p.id)}"><span><span class="ticket-name">${escape(p.name)}</span><span class="ticket-time">${escape(p.hours_label)}${saleLabel(p) ? ` · ${escape(saleLabel(p))}` : ""}</span></span><strong>${money(p.price_won)}원</strong></button>`).join('') : `<button class="ticket" data-lot="${lot.id}"><span><span class="ticket-name">주차장 정보</span><span class="ticket-time">확인된 주차권 정보가 없습니다</span></span><strong>상세 보기</strong></button>`;
    return `<article data-parking-row="${escape(lot.id)}" class="parking-row ${lot.id === (state.selectedId ?? lots[0]?.id) ? 'selected' : ''}">${rowHeading(lot,item)}${tickets}</article>`;
  }).join('') : isLive() && !dataset.lots.length ? '<p class="empty">표시할 실제 DB 현황이 없습니다.<br>현황 새로고침으로 다시 확인해 주세요.</p>' : selectedPlace ? '<p class="empty">목적지 반경 1km 안에 조건에 맞는 등록 주차장이 없습니다.</p>' : '<p class="empty">선택 조건에 맞는 확인된 상품이 없습니다.<br>다른 날짜·이용시간·상품 종류를 선택해 주세요.</p>';
  if ($('#parking-list').dataset.renderedHtml !== listHtml) {
    const scrollTop = $('#parking-list').scrollTop;
    updateHtml($('#parking-list'), listHtml);
    $('#parking-list').dataset.renderedHtml = listHtml;
    $('#parking-list').scrollTop = scrollTop;
  }
  const chosen=destination();
  const ready=Boolean(destinationLocation());
  $('#sort-distance').disabled=!ready;
  $('#sort-distance').textContent=ready?'✓ 거리순':'목적지 선택 후 거리순';
  $('#distance-basis').textContent=chosen ? `${chosen.name} 기준 · 직선거리${selectedPlace?' · 반경 1km':''}${ready?'':' · 좌표 확인 중'}` : '검색에서 목적지를 선택하면 직선거리를 표시합니다.';
  $('#sort-distance').classList.toggle('active', state.sort === 'distance');
  $('#sort-price').classList.toggle('active', state.sort === 'price');
  document.querySelectorAll('[data-category]').forEach(button => button.classList.toggle('active', state.category === button.dataset.category));
  renderMarkers();
}
function refreshVisibleViews() {
  if (!$('#results').hidden) renderList(); else renderMarkers();
  if (!$('#detail').hidden) renderDetail();
}
function renderMarkers() {
  const candidates=candidateLots();
  $('#open-list').innerHTML=selectedPlace ? `주변 주차장 ${candidates.length}곳 <span>⌃</span>` : '🅿 오늘 주차권 <span>⌃</span>';
  parkingMap?.setLots(candidates.map(lot=>({...lot,...mapDisplay(lot,productsFor(lot)[0],state.tickets)})), state.selectedId, true);
}
function setService(service) {
  state.service=service;
  searchFilters.monthlyOnly=service==='monthly';
  const defaults=defaultSearchFilters();
  const filtersActive=Object.keys(defaults).some(key=>defaults[key]!==searchFilters[key]);
  $('#open-filters').classList.toggle('active',filtersActive);
  $('#open-filters').setAttribute('aria-pressed',String(filtersActive));
  state.category='제안';
  $('.category-row').hidden=service!=='parking';
  $('#monthly-mode').classList.toggle('active',service==='monthly');
  $('#monthly-mode').setAttribute('aria-pressed',String(service==='monthly'));
  $('#carwash-mode').classList.toggle('active',service==='carwash');
  $('#carwash-mode').setAttribute('aria-pressed',String(service==='carwash'));
  $('#open-list').innerHTML=service==='carwash'?'세차 상품 <span>⌃</span>':service==='monthly'?'월주차 상품 <span>⌃</span>':'🅿 오늘 주차권 <span>⌃</span>';
  showMap(); renderList();
}
function showList() {
  $('#results').hidden = false; $('#detail').hidden = true; $('#map-header').hidden = true; $('#home-footer').hidden = true; renderList();
}
function showMap() {
  state.selectedId=null;state.selectedProductId=null;state.expanded=false; $('#results').hidden = true; $('#detail').hidden = true; $('#map-header').hidden = false; $('#map-header').style.opacity=''; $('#home-footer').hidden = false; renderMarkers();
}
function statusPanel(item,lot) {
  const record=item.latest_record,type=typeIcon(parkingTypeLabel(lot));
  const warning=firstReadPending&&!record?'주차현황을 확인하고 있어요.':item.display.warning;
  const oldRecord=record&&item.display.mode!=='CURRENT'?'<span class="facility-record-label">마지막 기록</span>':'';
  return `<section class="status-panel facility-status" aria-label="주차장 현재 상태"><div class="panel-heading">${type}<strong>주차장 현재 상태</strong>${oldRecord}</div>${record?`<div class="space-count">${record.available_spaces}면 <small>/ 전체 ${record.total_spaces}면</small></div>`:''}<p>${escape(warning)}</p>${readError?'<button type="button" class="retry-parking" data-refresh-parking>다시 불러오기</button>':''}</section>`;
}
const selectedProduct = lot => selectedProductById(productsFor(lot),state.selectedProductId);
const noProductLabel = lot => lot.facility_info?.ticket_status==='NOT_SOLD' && lot.facility_info.ticket_status_source_url && Number.isFinite(Date.parse(lot.facility_info.ticket_status_verified_at))
  ? '앱 주차권을 판매하지 않는 주차장입니다.' : '확인된 주차권 정보가 없습니다';
function favoriteIds() { return readFavorites(localStorage,new Set(dataset.lots.map(lot=>lot.id))); }
function renderFavorites() {
  const ids=new Set(favoriteIds());
  const lots=dataset.lots.filter(lot=>ids.has(lot.id));
  $('#favorites-list').innerHTML=lots.length ? lots.map(lot=>`<button class="search-result" data-favorite-lot="${escape(lot.id)}"><span>★</span><div><strong>${escape(lot.name)}</strong><small>${escape(lot.address)}</small></div></button>`).join('') : '<p class="empty">즐겨찾는 주차장이 없습니다.</p>';
}
function toggleFavorite() {
  const ids=new Set(favoriteIds());
  const action=ids.has(state.selectedId)?'remove':'add';
  if(ids.has(state.selectedId)) ids.delete(state.selectedId); else ids.add(state.selectedId);
  try { saveFavorites(localStorage,[...ids]); $('#favorites-error').textContent=''; renderDetail(); trackEvent('favorite_result',{component_id:'facility_action',action,result:'success'}); }
  catch { toast('즐겨찾기를 저장하지 못했습니다. 다시 시도해 주세요.'); trackEvent('favorite_result',{component_id:'facility_action',action,result:'error',reason:'storage_failed'}); }
}
function handleFacilityAction(action) {
  const lot=dataset.lots.find(l=>l.id===state.selectedId);if(!lot)return;
  if(action==='favorite'){toggleFavorite();return;}
  const candidate=lot.facility_info?.source_url;
  const source=candidate?.startsWith('https://')?candidate:`${lot.facility_info?.display_name??lot.name} · ${lot.facility_info?.source_address??lot.address}`;
  const content=$('#facility-action-content');
  $('#facility-action-title').textContent=({share:'전달',edit:'수정요청',directions:'내비'})[action]??'주차장 정보';
  if(action==='share') content.innerHTML=`<p>${escape(lot.facility_info?.display_name??lot.name)}</p><input id="facility-copy-value" aria-label="공유할 주차장 링크" value="${escape(source)}" readonly><button data-copy-facility>링크 복사</button><p id="facility-action-message" role="status"></p>`;
  if(action==='directions') content.innerHTML=`<p>${escape(lot.name)}</p><p>${escape(lot.address)}</p><input id="facility-copy-value" aria-label="주차장 주소" value="${escape(lot.address)}" readonly><button data-copy-facility>주소 복사</button><button id="facility-show-on-map">지도에서 위치 보기</button><p id="facility-action-message" role="status"></p>`;
  if(action==='edit') content.innerHTML='<form id="facility-edit-form"><label>수정할 내용<textarea name="message" placeholder="어떤 정보가 다른지 적어 주세요." required></textarea></label><p>이 화면에서만 확인하며 원본 서비스로 전송하지 않습니다.</p><button type="submit">내용 확인</button><p id="facility-action-message" role="status"></p></form>';
  $('#facility-action-screen').hidden=false;
  $('#facility-action-screen').dataset.dialogType=action;
  const copy=content.querySelector('[data-copy-facility]');
  if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText($('#facility-copy-value').value);$('#facility-action-message').textContent='복사했어요.';trackEvent('clipboard_result',{component_id:'facility_copy',action,result:'success'});}catch{$('#facility-action-message').textContent='복사하지 못했습니다. 위 내용을 직접 선택해 복사해 주세요.';trackEvent('clipboard_result',{component_id:'facility_copy',action,result:'error',reason:'clipboard_failed'});}};
  const show=content.querySelector('#facility-show-on-map');if(show)show.onclick=()=>{$('#facility-action-screen').hidden=true;showMap();parkingMap?.focus(lot.id);};
  const edit=content.querySelector('#facility-edit-form');if(edit)edit.onsubmit=event=>{event.preventDefault();$('#facility-action-message').textContent='입력 내용을 확인했어요. 실제 수정 요청은 전송되지 않았습니다.';trackEvent('edit_previewed',{component_id:'facility_edit_submit',result:'preview_only'});};
  $('#close-facility-action').focus({preventScroll:true});
}
function applyDetailProgress(progress) {
  const p=Math.max(0,Math.min(1,progress));
  $('#detail').style.setProperty('--detail-progress',String(p));
  $('#detail').classList.toggle('detail-full',p>=.5);
  $('#map-header').hidden=p>=.999;
  $('#map-header').style.opacity=String(1-p);
  const actions=$('#detail-content').querySelector('.facility-actions');if(actions){actions.inert=p<.5;actions.setAttribute('aria-hidden',String(p<.5));}
  $('#detail-directions').tabIndex=p<.5?0:-1;$('#back').tabIndex=p>=.5?0:-1;
  for(const id of ['detail-type-compact','detail-compact-meta','detail-directions']) $('#'+id).setAttribute('aria-hidden',String(p>=.5));
}
let detailMeasureFrame=0;
function measureDetailPeek() {
  cancelAnimationFrame(detailMeasureFrame);
  detailMeasureFrame=requestAnimationFrame(()=>{
    const sheet=$('#detail'),content=$('#detail-content');
    if(sheet.hidden||state.expanded||sheet.classList.contains('dragging')) return;
    const price=content.querySelector('.facility-product-price')??content.querySelector('.facility-onsite');
    const fallback=$('.facility-identity').getBoundingClientRect().height+(content.querySelector('.status-panel')?.getBoundingClientRect().height??80)+125;
    const height=measuredPeekHeight({priceBottom:price?.getBoundingClientRect().bottom,sheetTop:sheet.getBoundingClientRect().top,parentHeight:sheet.parentElement.clientHeight,fallbackHeight:fallback});
    sheet.style.setProperty('--detail-peek-height',`${height}px`);
  });
}
function renderDetail() {
  const lot=dataset.lots.find(l=>l.id===state.selectedId);if(!lot)return;
  const item=view(lot),products=state.service==='parking'&&(lot.pass_source_registered||lot.observed_products?.some(p=>p.observed_date===selectedDate()))?lot.observed_products.filter(p=>p.observed_date===selectedDate()):productsFor(lot),type=parkingTypeLabel(lot);
  const unavailable=Boolean(state.selectedProductId&&!selectedProduct(lot));
  $('#detail').classList.toggle('expanded',state.expanded);
  applyDetailProgress(state.expanded?1:0);
  for(const element of [$('#expand'),$('#detail-heading')]) {
    element.setAttribute('aria-expanded',String(state.expanded));
    element.setAttribute('aria-label',state.expanded?'주차장 상세 접기':'주차장 상세 펼치기');
  }
  $('#back').setAttribute('aria-label',state.detailOrigin==='favorites'?'즐겨찾기로 돌아가기':state.detailOrigin==='list'?'비교 목록으로 돌아가기':'지도로 돌아가기');
  const displayName=lot.facility_info?.display_name??lot.name;
  const heading=`${badge(item)}<span class="detail-heading-name" title="${escape(displayName)}">${escape(displayName)}</span>`;
  if($('#detail-heading').dataset.renderedHtml!==heading){$('#detail-heading').innerHTML=heading;$('#detail-heading').dataset.renderedHtml=heading;}
  const compactType=typeIcon(type);
  if($('#detail-type-compact').innerHTML!==compactType)$('#detail-type-compact').innerHTML=compactType;
  $('#detail-updated').textContent=item.latest_record?sourceTimeLabel(item.latest_record):'최근 기록 없음';
  $('#detail-compact-meta').textContent=compactFacilityMeta(lot,item.latest_record);
  const favorite=favoriteIds().includes(lot.id);
  const actions=`<nav class="facility-actions" aria-label="주차장 기능"><button data-facility-action="share"><span>↥</span>전달</button><button data-facility-action="edit"><span>✎</span>수정요청</button><button data-facility-action="favorite" aria-pressed="${favorite}"><span>${favorite?'★':'☆'}</span>즐겨찾기</button><button data-facility-action="directions"><span>➜</span>내비</button></nav>`;
  const onsite=lot.facility_info?.ticket_status==='NOT_SOLD';
  const cards=onsite?`<div class="facility-onsite"><p><span>주차요금</span><strong>1시간 ${money(lot.facility_info.hourly_fee_won)}원</strong></p><p><span>운영시간</span><strong>${escape(lot.facility_info.operating_hours??'정보 미확인')}</strong></p></div><p class="facility-unsupported">앱 결제를 지원하지 않는 주차장입니다</p><button class="facility-request" data-request-pass>여기도 이용권 만들어 주세요</button>`:products.length?facilityProductsHtml(products,{selectedId:state.selectedProductId,completed:state.completed,saleOpen,saleLabel}):`<p class="empty facility-no-products">${escape(noProductLabel(lot))}</p>`;
  const passNotice=lot.pass_collection?.last_result==='ERROR'?'<p class="facility-unavailable">주차권 정보를 다시 확인하지 못했어요. 마지막 확인 정보이며 구매할 수 없습니다.</p>':'';
  const html=`${actions}${statusPanel(item,lot)}${passNotice}${lot.facility_info?.banner_text?`<div class="facility-banner">${escape(lot.facility_info.banner_text)}</div>`:''}${unavailable?'<p class="facility-unavailable" role="status">선택한 주차권은 현재 조건에서 이용할 수 없습니다. 다른 상품을 직접 선택해 주세요.</p>':''}<div class="facility-products" id="facility-products">${cards}</div>${products.length?'<button class="facility-all-products" data-all-products>이용권 모두보기</button>':''}<section class="info-block facility-info"><p>⌖ ${escape(lot.facility_info?.source_address??lot.address)}</p><h3>시간요금</h3><p>${facilityFeeLines(lot.facility_info).map(escape).join('<br>')}</p><details><summary>입출차·주차권 안내</summary><p>만차 혹은 현장 사정에 따라 주차가 어려울 수 있습니다.</p><p>주차 상태는 갱신 시점 기준이며 도착 시 자리를 보장하지 않습니다.</p><p>구매하기는 선택 결과의 테스트 종료이며 실제 결제·예약·발급은 이루어지지 않습니다.</p></details></section>`;
  const content=$('#detail-content');
  if(content.dataset.renderedHtml!==html){const scroll=content.scrollTop;updateHtml(content,html);content.dataset.renderedHtml=html;content.scrollTop=scroll;}
  applyDetailProgress(state.expanded?1:0);
  if(content.scrollTop===0)measureDetailPeek();
}
function openDetail(id,productId=null,origin=null) {
  state.detailOrigin=origin??($('#results').hidden?'map':'list');
  const lot=dataset.lots.find(l=>l.id===id);
  state.selectedProductId=initialProductId(lot?productsFor(lot):[],productId);
  state.returnY=$('#parking-list').scrollTop;state.selectedId=id;state.expanded=false;
  $('#results').hidden=true;$('#detail').hidden=false;$('#home-footer').hidden=true;
  $('#detail-content').scrollTop=0;renderMarkers();renderDetail();
  trackEvent('facility_opened',{component_id:state.detailOrigin==='map'?'map_marker':state.detailOrigin==='favorites'?'favorite_item':'list_product',...analyticsContext(id),origin:state.detailOrigin});
}
function trackSheet(component_id,action,origin){trackEvent('sheet_changed',{component_id,action,origin});}
function toggleExpanded(){state.expanded=!state.expanded;trackSheet('detail_height',state.expanded?'expand':'collapse','click');if(!state.expanded)$('#detail-content').scrollTop=0;renderDetail();if(!state.expanded)requestAnimationFrame(()=>{$('#detail-content').scrollTop=0;measureDetailPeek();});}
function backToList() {
  state.selectedId=null;state.selectedProductId=null;state.expanded=false;
  $('#map-header').style.opacity='';
  if(state.detailOrigin==='map'){showMap();return;}
  if(state.detailOrigin==='favorites'){showMap();renderFavorites();$('#favorites-screen').hidden=false;return;}
  showList();$('#parking-list').scrollTop=state.returnY;
}
function changeMode(mode) {
  state.mode = mode;
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  renderList(); if (!$('#detail').hidden) renderDetail();
}
function renderSearch() {
  placeRequest++;placeSearch.cancel();placeResults=[];
  $('#place-results').replaceChildren();$('#place-results').setAttribute('aria-busy','false');$('#place-search-status').textContent='';
  const term = $('#search').value.trim();
  const matches = dataset.lots.filter(lot => !term || `${lot.name} ${lot.address}`.includes(term));
  $('#search-results').innerHTML = (!term || '성수동'.includes(term) ? '<button class="search-result" data-search="성수동"><span>⌕</span><div><strong>성수동</strong><small>서울특별시 성동구</small></div></button>' : '') + matches.map(lot => `<button class="search-result" data-search="${escape(lot.name)}"><span>⌖</span><div><strong>${escape(lot.name)}</strong><small>${escape(lot.address)}</small></div></button>`).join('');
  if (!$('#search-results').innerHTML) $('#search-results').innerHTML = '<p class="empty">등록 주차장과 일치하는 결과가 없습니다. 가게 이름은 검색 버튼을 눌러 찾아보세요.</p>';
}
function submitSearch(term) {
  placeRequest++;placeSearch.cancel();selectedPlace=null;parkingMap?.setDestination(null);
  const matches=dataset.lots.filter(lot=>`${lot.name} ${lot.address}`.includes(term));
  state.destinationId=term && term!=='성수동' && matches.length===1 ? matches[0].id : null;
  state.selectedId=null;state.selectedProductId=null;state.expanded=false;
  state.query=term; state.sort=state.destinationId?'distance':'name';
  $('#destination-label').textContent=term || '목적지 또는 주소 검색';
  $('#search-screen').hidden=true; state.category='제안'; showMap();
  if(state.destinationId) parkingMap?.focus(state.destinationId);
  trackEvent('search_result',{component_id:'search_submit',result:term?(matches.length||term==='성수동'?'matched':'empty'):'cleared',result_count:term==='성수동'?dataset.lots.length:matches.length});
}
async function searchPlaces() {
  const request=++placeRequest;
  const term=$('#search').value.trim();
  if(!term || term==='성수동'){submitSearch(term);return;}
  if(term.length<2 || term.length>80){$('#place-search-status').textContent='가게 이름을 2~80자로 입력해 주세요.';return;}
  placeResults=[];$('#place-results').replaceChildren();
  $('#place-search-status').textContent='네이버에서 장소를 검색하고 있습니다…';
  $('#place-results').setAttribute('aria-busy','true');
  try {
    const places=await placeSearch.search(term);
    if(places===null)return;
    placeResults=places;
    $('#place-search-status').textContent=places.length ? '네이버 장소 검색 · 목적지를 선택해 주세요.' : '네이버 장소 검색 결과가 없습니다. 지역명과 가게 이름을 함께 입력해 주세요.';
    $('#place-results').innerHTML=places.map((place,index)=>`<button class="search-result" data-place-index="${index}"><span aria-hidden="true">⌖</span><div><strong>${escape(place.name)}</strong><small>${escape(place.address)}</small><small>${escape(place.category??'')}</small></div></button>`).join('');
    trackEvent('search_result',{component_id:'search_submit',result:places.length?'matched':'empty',result_count:places.length});
  } catch(error) {
    $('#place-search-status').textContent=error.message==='PLACE_SEARCH_NOT_CONFIGURED' ? '장소 검색을 준비 중입니다. 등록 주차장 검색은 이용할 수 있습니다.' : error.message==='PLACE_SEARCH_LIMITED' ? '검색 요청이 많습니다. 잠시 후 다시 검색해 주세요.' : '장소를 검색하지 못했습니다. 잠시 후 다시 검색해 주세요.';
    trackEvent('search_result',{component_id:'search_submit',result:'error',reason:'lookup_failed'});
  } finally {if(request===placeRequest)$('#place-results').setAttribute('aria-busy','false');}
}
function selectPlace(place) {
  if(!place)return;
  placeRequest++;placeSearch.cancel();selectedPlace=place;
  state.destinationId=null;state.query=place.name;state.sort='distance';state.category='제안';
  state.selectedId=null;state.selectedProductId=null;state.expanded=false;
  $('#destination-label').textContent=place.name;$('#search-screen').hidden=true;
  parkingMap?.setDestination(place);showMap();
  trackEvent('search_result',{component_id:'search_suggestion',result:'selected',result_count:candidateLots().length});
}
function renderCalendar() {
  const days=monthDays(calendarMonth,koreaDate());
  const [year,month]=calendarMonth.split('-').map(Number);
  $('.month strong').textContent=`${year}년 ${month}월`;
  $('#previous-month').disabled=calendarMonth<=koreaDate().slice(0,7);
  $('#calendar').innerHTML=['일','월','화','수','목','금','토'].map((s,i)=>`<span class="weekday ${i===0?'sun':''}">${s}</span>`).join('')+'<span></span>'.repeat(days[0].weekday)+days.map(day=>`<button data-date="${day.iso}" ${day.disabled?'disabled':''} class="${draftDate===day.iso?'active':''} ${day.weekday===0?'sun':''}">${day.day}</button>`).join('');
  $('#durations').innerHTML=['1시간','2시간','3시간','5시간','8시간','12시간','종일','2일 이상'].map(value=>`<button data-duration="${value}" class="${draftDuration===value?'active':''}">${value}</button>`).join('');
}
function readRecords() {
  const cutoff = Date.now() - 7 * 86400000;
  return JSON.parse(localStorage.getItem(storageKey) || '[]').filter(r => Number.isFinite(Date.parse(r.recorded_at)) && Date.parse(r.recorded_at) >= cutoff);
}
function finishTest(productId=state.selectedProductId) {
  if (state.completed) return;
  const lot = dataset.lots.find(l => l.id === state.selectedId), product = lot ? selectedProductById(productsFor(lot),productId) : null;
  if (!product) { toast('확인된 주차권이 없습니다.'); trackEvent('prototype_selection_failed',{component_id:'product_select_finish',reason:'missing_product'}); return; }
  if (!saleOpen(product)) { toast(saleLabel(product)); trackEvent('prototype_selection_failed',{component_id:'product_select_finish',reason:'sale_not_open'}); return; }
  state.selectedProductId=product.id;
  const result = {id:crypto.randomUUID(),parking_id:lot.id,parking_name:lot.name,product_name:product.name,price_won:product.price_won,selected_date:selectedDate(),duration:state.duration,recorded_at:new Date().toISOString(),data_as_of:dataset.as_of,test_only:true};
  try { const records=readRecords(); records.push(result); localStorage.setItem(storageKey,JSON.stringify(records)); }
  catch { toast('선택 기록을 저장하지 못했습니다. 다시 시도해 주세요.'); trackEvent('prototype_selection_failed',{component_id:'product_select_finish',reason:'storage_failed'}); return; }
  $('#completion-detail').innerHTML=`<strong>${escape(lot.name)}</strong><br>${escape(product.name)} · ${money(product.price_won)}원<br>${escape(dateLabel(selectedDate()))} · ${escape(state.duration)}<br><small>실제 결제·예약·주차권 발급은 이루어지지 않았습니다.</small>`;
  state.completed=true; renderDetail(); $('#completion').hidden=false;
  trackEvent('prototype_selection_saved',{component_id:'product_select_finish',...analyticsContext(lot.id),product_type:productType(product),result:'success'});
  $('#restart').focus({preventScroll:true});
}
function reset() {
  placeRequest++;placeSearch.cancel();selectedPlace=null;parkingMap?.setDestination(null);
  searchFilters=defaultSearchFilters();
  sharedLayer=true;
  $('#shared-toggle').setAttribute('aria-pressed','true'); $('#shared-toggle b').textContent='ON';
  Object.assign(state,{selectedId:null,selectedProductId:null,detailOrigin:'map',destinationId:null,query:'',sort:'name',expanded:false,category:'제안',duration:'1시간',date:koreaDate(),followToday:true,scenario:participantView ? participantScenario : 'normal',returnY:0,zoom:1,tickets:true,completed:false});
  $('#search').value = ''; $('#destination-label').textContent = '목적지 또는 주소 검색'; $('#open-date').textContent = '오늘 · 1시간';
  ['#facility-action-screen','#ai-screen','#search-screen','#date-screen','#filter-screen','#filter-options-screen','#share-screen','#completion','#toast','#favorites-screen','#tickets-screen','#ticket-history-screen'].forEach(s => $(s).hidden = true); $('#ticket-toggle').setAttribute('aria-pressed','true'); $('#ticket-toggle b').textContent = 'ON'; changeMode(participantView || isLive() ? 'improved' : 'baseline'); setService('parking');
  trackEvent('prototype_restarted',{component_id:'prototype_restart',result:'success'});
}
const refreshPolicy = createRefreshPolicy({load: performLiveRefresh});
function refreshLive(options) { return refreshPolicy.refresh(options); }
async function performLiveRefresh({origin='auto'}={}) {
  const version = ++requestVersion;

  try {
    const res = await fetch('/api/parking', {cache:'no-store', signal:AbortSignal.timeout(25000)});
    if (!res.ok) throw new Error('LIVE_READ_FAILED');
    const snapshot = connectCatalog(await res.json(), catalog);
    if (version !== requestVersion || !isLive()) return;
    firstReadPending=false; readError=false;
    dataset = snapshot; liveLoadedAt = performance.now(); liveLoadedWallAt = Date.now();
    refreshVisibleViews();
    $('#load-message').textContent = '';
    trackEvent('parking_refresh_result',{component_id:'parking_refresh',origin,result:'success',result_count:dataset.lots.length});
    return true;
  } catch {
    if (version !== requestVersion || !isLive()) return;
    firstReadPending=false; readError=true;
    refreshVisibleViews();
    $('#load-message').textContent = '';
    trackEvent('parking_refresh_result',{component_id:'parking_refresh',origin,result:'error',reason:'read_failed'});
    return false;
  }
}
async function init() {
  try {
    const response=await fetch('./data/facilities.json', {cache:'no-store'}); if(!response.ok) throw new Error('CATALOG_FAILED');
    catalog=await response.json();
    analytics.setParkingIds(catalog.lots.map(lot=>lot.id));
    dataset=connectCatalog({data_origin:'LIVE',as_of:new Date().toISOString(),lots:[]},catalog);
    liveLoadedAt=performance.now(); liveLoadedWallAt=Date.now();
    const mapReady = createParkingMap(document.querySelector('#naver-map'), openDetail, () => {
      if(state.destinationId || selectedPlace) { if(state.destinationId)parkingMap?.focus(state.destinationId); renderList(); }
    }).then(map => { parkingMap=map; if(selectedPlace)parkingMap?.setDestination(selectedPlace); renderMarkers(); trackEvent('map_load_result',{component_id:'map',result:map?'success':'error',...(map?{}:{reason:'sdk_failed'})}); });
    renderList(); renderCalendar(); showMap();
    $('#detail-content').addEventListener('click',event=>{
      const target=event.target.closest('button');if(!target)return;
      if(target.hasAttribute('data-refresh-parking')) refreshLive({force:true,origin:'manual'});
      if(target.dataset.buyProduct) finishTest(target.dataset.buyProduct);
      if(target.dataset.facilityAction) handleFacilityAction(target.dataset.facilityAction);
      if(target.hasAttribute('data-request-pass')){toast('현재 이 주차장은 앱 주차권을 판매하지 않습니다. 실제 요청은 전송되지 않았습니다.');trackEvent('pass_request_previewed',{component_id:'pass_request_preview',result:'preview_only'});return;}
      if(target.hasAttribute('data-all-products')){if(!state.expanded)trackSheet('detail_height','expand','click');state.expanded=true;renderDetail();$('#detail-content').scrollTo({top:0,behavior:'smooth'});}
    });
    $('#detail-directions').addEventListener('click',()=>handleFacilityAction('directions'));
    $('#close-facility-action').addEventListener('click',()=>{$('#facility-action-screen').hidden=true;});
    new ResizeObserver(()=>measureDetailPeek()).observe($('.phone'));
    $('#parking-list').addEventListener('click', event => { const button = event.target.closest('[data-lot]'); if (button) openDetail(button.dataset.lot,button.dataset.product); });
    $('#monthly-mode').addEventListener('click',()=>setService(state.service==='monthly'?'parking':'monthly'));
    $('#carwash-mode').addEventListener('click',()=>setService(state.service==='carwash'?'parking':'carwash'));
    $('#open-filters').addEventListener('click',()=>{
      showFilterDraft({...searchFilters,monthlyOnly:state.service==='monthly'});
      $('#filter-screen').hidden=false;
      $('#close-filters').focus({preventScroll:true});
    });
    $('#close-filters').addEventListener('click',()=>{$('#filter-screen').hidden=true;$('#open-filters').focus({preventScroll:true});});
    $('#reset-filters').addEventListener('click',()=>showFilterDraft(defaultSearchFilters()));
    document.querySelectorAll('[data-search-filter]').forEach(input=>input.addEventListener('change',updateFilterSummary));
    $('#apply-filters').addEventListener('click',()=>{
      searchFilters=readFilterDraft();
      $('#filter-screen').hidden=true;
      const defaults=defaultSearchFilters();
      const active=Object.keys(defaults).some(key=>defaults[key]!==searchFilters[key]);
      $('#open-filters').classList.toggle('active',active);
      $('#open-filters').setAttribute('aria-pressed',String(active));
      setService(searchFilters.monthlyOnly?'monthly':state.service==='monthly'?'parking':state.service);
      trackEvent('filters_applied',{component_id:'filters_apply',result_count:candidateLots().length});
    });
    document.querySelectorAll('[data-filter-selector]').forEach(button=>button.addEventListener('click',()=>{
      $('#filter-options-title').textContent=button.dataset.filterSelector;
      $('#filter-options-screen').hidden=false;
    }));
    for(const selector of ['#close-filter-options','#confirm-filter-options']) $(selector).addEventListener('click',()=>{$('#filter-options-screen').hidden=true;});
    $('#open-list').addEventListener('click', showList); $('#close-list').addEventListener('click', () => { const expanded=$('#results').classList.toggle('expanded'); $('#close-list').setAttribute('aria-expanded',String(expanded)); trackSheet('list_height',expanded?'expand':'collapse','click'); }); $('#back').addEventListener('click', backToList);
    $('#list-map').addEventListener('click',showMap);
    attachBottomSheet($('#results'), {onClose:()=>{trackSheet('list_height','close','gesture');showMap();},onExpand:expanded => {if($('#results').classList.contains('expanded')!==expanded)trackSheet('list_height',expanded?'expand':'collapse','gesture');$('#results').classList.toggle('expanded',expanded); $('#close-list').setAttribute('aria-expanded',String(expanded));}});
    attachBottomSheet($('#detail'), {onClose:()=>{trackSheet('detail_height','close','gesture');backToList();},onExpand:expanded=>{if(state.expanded!==expanded)trackSheet('detail_height',expanded?'expand':'collapse','gesture');state.expanded=expanded;if(!expanded)$('#detail-content').scrollTop=0;renderDetail();if(!expanded)requestAnimationFrame(()=>{$('#detail-content').scrollTop=0;measureDetailPeek();});},getCollapsedHeight:()=>parseFloat($('#detail').style.getPropertyValue('--detail-peek-height'))||$('.phone').clientHeight*.5,getExpandedHeight:()=>$('.phone').clientHeight,onDrag:applyDetailProgress,expandOnContentSwipe:true});
    $('#expand').addEventListener('click', toggleExpanded); $('#detail-heading').addEventListener('click', toggleExpanded);
    $('#sort-distance').addEventListener('click', () => { state.sort='distance'; renderList(); }); $('#sort-price').addEventListener('click', () => { state.sort='price'; renderList(); });
    document.querySelectorAll('[data-category]').forEach(b => b.addEventListener('click', () => { state.category=b.dataset.category; renderList(); }));
    document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => changeMode(b.dataset.mode)));
    const closeAi=()=>{$('#ai-screen').hidden=true;$('#open-ai').focus({preventScroll:true});};
    $('#open-ai').addEventListener('click',()=>{$('#ai-screen').hidden=false;$('#close-ai').focus({preventScroll:true});});
    $('#close-ai').addEventListener('click',closeAi);
    $('#ai-screen').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeAi();}});
    $('#open-tickets').addEventListener('click',()=>{$('#tickets-screen').hidden=false;});
    const shareFlow=initShareFlow($('#share-screen'));
    $('#open-share').addEventListener('click',()=>shareFlow.open());
    $('#close-tickets').addEventListener('click',()=>{$('#tickets-screen').hidden=true;});
    $('#open-ticket-history').addEventListener('click',()=>{$('#ticket-history-screen').hidden=false;});
    $('#close-ticket-history').addEventListener('click',()=>{$('#ticket-history-screen').hidden=true;});
    document.querySelectorAll('[data-history-tab]').forEach(button=>button.addEventListener('click',()=>{
      document.querySelectorAll('[data-history-tab]').forEach(tab=>tab.setAttribute('aria-selected',String(tab===button)));
      $('#ticket-history-content').setAttribute('aria-label',button.textContent);
      $('#ticket-history-content p').innerHTML=button.dataset.historyTab==='mpass'?'MPASS 이용 내역이 없습니다.':'구매한 주차권이 없습니다.<br>주차권을 구매하고 이용해 보세요.';
      $('#ticket-history-content>span').textContent=button.dataset.historyTab==='mpass'?'PASS':'P';
    }));
    $('#open-favorites').addEventListener('click',()=>{renderFavorites(); $('#favorites-screen').hidden=false;});
    $('#close-favorites').addEventListener('click',()=>{$('#favorites-screen').hidden=true;});
    $('#favorites-list').addEventListener('click',event=>{const button=event.target.closest('[data-favorite-lot]');if(button){$('#favorites-screen').hidden=true;openDetail(button.dataset.favoriteLot,null,'favorites');}});
    $('#open-search').addEventListener('click', () => { $('#search-screen').hidden=false; $('#search').value=state.query; renderSearch(); $('#search').focus(); });
    $('#close-search').addEventListener('click', () => {placeRequest++;placeSearch.cancel();$('#search-screen').hidden=true;}); $('#search').addEventListener('input', renderSearch);
    $('#search-form').addEventListener('submit', event => { event.preventDefault(); searchPlaces(); });
    $('#place-results').addEventListener('click',event=>{const button=event.target.closest('[data-place-index]');if(button)selectPlace(placeResults[Number(button.dataset.placeIndex)]);});
    $('#search-results').addEventListener('click', event => { const b=event.target.closest('[data-search]'); if (b) submitSearch(b.dataset.search); });
    $('#open-date').addEventListener('click',()=>{draftDate=selectedDate();draftDuration=state.duration;calendarMonth=draftDate.slice(0,7);$('#date-error').textContent='';renderCalendar();$('#date-screen').hidden=false;});
    $('#previous-month').addEventListener('click',()=>{calendarMonth=shiftMonth(calendarMonth,-1);renderCalendar();});
    $('#next-month').addEventListener('click',()=>{calendarMonth=shiftMonth(calendarMonth,1);renderCalendar();});
    $('#calendar').addEventListener('click', event => { const b=event.target.closest('[data-date]'); if(b){ $('#date-error').textContent=''; draftDate=b.dataset.date; $('#calendar').querySelectorAll('button').forEach(x => x.classList.toggle('active',x===b)); }});
    $('#durations').addEventListener('click', event => { const b=event.target.closest('[data-duration]'); if(b){ draftDuration=b.dataset.duration; $('#durations').querySelectorAll('button').forEach(x => x.classList.toggle('active',x===b)); }});
    $('#close-date').addEventListener('click', () => $('#date-screen').hidden=true);
    $('#confirm-date').addEventListener('click', () => {
      if (!selectableDate(draftDate)) {
        renderCalendar();
        $('#date-error').textContent='날짜가 지났습니다. 오늘 이후 날짜를 선택해 주세요.';
        trackEvent('date_rejected',{component_id:'date_apply',reason:'past_date'});
        return;
      }
      $('#date-error').textContent='';
      state.date=draftDate; state.followToday=draftDate===koreaDate(); state.duration=draftDuration; $('#open-date').textContent=`${dateLabel(selectedDate())} · ${state.duration}`; $('#date-screen').hidden=true; renderList(); if (!$('#detail').hidden) renderDetail();
      trackEvent('date_applied',{component_id:'date_apply',date_bucket:draftDate===koreaDate()?'today':'future',duration_bucket:durationBucket(draftDuration)});
    });
    $('#ticket-toggle').addEventListener('click', () => { state.tickets=!state.tickets; $('#ticket-toggle b').textContent=state.tickets?'ON':'OFF'; $('#ticket-toggle').setAttribute('aria-pressed',String(state.tickets)); renderMarkers(); });
    $('#shared-toggle').addEventListener('click',()=>{sharedLayer=!sharedLayer;$('#shared-toggle b').textContent=sharedLayer?'ON':'OFF';$('#shared-toggle').setAttribute('aria-pressed',String(sharedLayer));refreshVisibleViews();});
    $('#zoom-in').addEventListener('click', () => { parkingMap?.zoom(1); }); $('#zoom-out').addEventListener('click', () => { parkingMap?.zoom(-1); });
    $('#recenter').addEventListener('click', () => { parkingMap?.reset(); }); $('#search-here').addEventListener('click', () => isLive() ? refreshLive({force:true,origin:'manual'}) : toast('현재 테스트 목적지의 고정 가상 목록입니다. 실제 위치 검색과 연결되지 않았습니다.'));
    $('#restart').addEventListener('click', reset);
    document.querySelectorAll('[data-startup-control]').forEach(button=>{button.disabled=false;});
    $('.phone').setAttribute('aria-busy','false');
    $('#load-message').textContent='';
    trackEvent('app_ready',{component_id:'app',result:'success'});
    startRefreshLoop({refresh:options=>refreshLive(options)});
    // 새 네트워크 호출 없이 경과 시간만 반영한다. 20분을 넘긴 값을 현재로 고정하지 않는다.
    setInterval(() => { if (!document.hidden && isLive()) { refreshVisibleViews(); } },30000);

  } catch(error) { $('#load-message').textContent='데이터를 불러오지 못했습니다. README의 실행 방법을 확인해 주세요.'; trackEvent('app_error',{component_id:'app',reason:catalog?'init_failed':'catalog_load_failed'}); console.error(error); }
}
installUiAnalytics({getContext:analyticsContext});
init();
