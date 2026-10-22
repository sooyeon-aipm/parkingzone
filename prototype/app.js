import { buildView, sourceTimeLabel } from './model.js';
import { connectCatalog } from './catalog.js';
import {straightDistance,distanceLabel} from './geo.js';
import { createParkingMap } from './parking-map.js';
let parkingMap;

const todayParts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
const today = Object.fromEntries(todayParts.filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
// 화면 선택(state) / 원본 데이터(dataset) / 화면용 데이터(view)를 분리합니다.
const state = { mode: 'improved', selectedId: null, selectedProductId:null, destinationId:null, query: '', sort: 'name', expanded: false, category: '제안', duration: '1시간', date: today.day, scenario: 'normal', returnY: 0, zoom: 1, tickets: true, completed: false };
const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('ko-KR').format(value);
const storageKey = 'parkingzone-ut-selections-v1';
const participantView = true;
const participantScenario = 'normal';
let dataset, catalog, toastTimer, liveLoadedAt=0, liveLoadedWallAt=Date.now(), requestVersion=0;
const isLive = () => true;
const displayAsOf = () => new Date(Date.parse(dataset.as_of)+Math.max(performance.now()-liveLoadedAt,Date.now()-liveLoadedWallAt)).toISOString();
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3200); }
const view = lot => buildView(lot, displayAsOf());
const selectedDate = () => `${today.year}-${String(today.month).padStart(2,'0')}-${String(state.date).padStart(2,'0')}`;
const saleOpen = product => product && (!product.sale_starts_at || Date.parse(displayAsOf()) >= Date.parse(product.sale_starts_at));
const saleLabel = product => saleOpen(product) ? '' : `${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(product.sale_starts_at))} 판매예정`;
function productsFor(lot) {
  const requestedMinutes = {'1시간':60,'2시간':120,'3시간':180,'5시간':300,'8시간':480,'12시간':720}[state.duration];
  return lot.products.filter(product => product.available_dates?.includes(selectedDate()) &&
    (['제안',product.category].includes(state.category)) &&
    (requestedMinutes ? product.duration_minutes >= requestedMinutes : product.category === '당일권'));
}
const distanceTo = lot => straightDistance(parkingMap?.getLocation(state.destinationId),parkingMap?.getLocation(lot.id));
function candidateLots() {
  const term=state.query.trim();
  return dataset.lots.filter(lot=>state.destinationId || !term || term==='성수동' || `${lot.name} ${lot.address}`.includes(term));
}
function visibleLots() {
  const filtered=candidateLots().filter(lot=>productsFor(lot).length);
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
  $('#parking-list').innerHTML = lots.length ? lots.map(lot => {
    const item = view(lot), products = productsFor(lot);
    const tickets = products.length ? products.map(p => `<button class="ticket" data-lot="${lot.id}" data-product="${escape(p.id)}"><span><span class="ticket-name">${escape(p.name)}</span><span class="ticket-time">${escape(p.hours_label)}${saleLabel(p) ? ` · ${escape(saleLabel(p))}` : ""}</span></span><strong>${money(p.price_won)}원</strong></button>`).join('') : `<button class="ticket" data-lot="${lot.id}"><span><span class="ticket-name">주차장 정보</span><span class="ticket-time">확인된 주차권 정보가 없습니다</span></span><strong>상세 보기</strong></button>`;
    return `<article class="parking-row ${lot.id === (state.selectedId ?? lots[0]?.id) ? 'selected' : ''}">${rowHeading(lot,item)}${tickets}</article>`;
  }).join('') : isLive() && !dataset.lots.length ? '<p class="empty">표시할 실제 DB 현황이 없습니다.<br>현황 새로고침으로 다시 확인해 주세요.</p>' : '<p class="empty">선택 조건에 맞는 확인된 주차권이 없습니다.<br>다른 날짜·이용시간·주차권 종류를 선택해 주세요.</p>';
  const destination=dataset.lots.find(lot=>lot.id===state.destinationId);
  const ready=Boolean(parkingMap?.getLocation(state.destinationId));
  $('#sort-distance').disabled=!ready;
  $('#sort-distance').textContent=ready?'✓ 거리순':'목적지 선택 후 거리순';
  $('#distance-basis').textContent=destination ? `${destination.name} 기준 · 직선거리${ready?'':' · 좌표 확인 중'}` : '검색에서 목적지를 선택하면 직선거리를 표시합니다.';
  $('#sort-distance').classList.toggle('active', state.sort === 'distance');
  $('#sort-price').classList.toggle('active', state.sort === 'price');
  document.querySelectorAll('[data-category]').forEach(button => button.classList.toggle('active', state.category === button.dataset.category));
  renderMarkers();
}
function renderMarkers() {
  parkingMap?.setLots(candidateLots().map(lot=>({...lot,map_label:productsFor(lot)[0] ? money(productsFor(lot)[0].price_won) : 'P'})), state.selectedId, state.tickets);
}
function showList() {
  $('#results').hidden = false; $('#detail').hidden = true; $('#map-header').hidden = true; $('#home-footer').hidden = true; renderList();
}
function showMap() {
  $('#results').hidden = true; $('#detail').hidden = true; $('#map-header').hidden = false; $('#home-footer').hidden = false; renderMarkers();
}
function statusPanel(item) {
  if (state.mode === 'baseline') return '';
  const record = item.latest_record;
  return `<section class="status-panel" aria-label="주차 상태"><div class="panel-heading"><strong>${item.display.mode === 'CURRENT' ? '주차장 현재 상태' : item.display.mode === 'NO_DATA' ? '주차 정보' : '마지막 기록'}</strong></div>${record ? `<div class="space-count">${record.available_spaces}면 <small>/ 전체 ${record.total_spaces}면</small></div>` : ''}<p>${escape(item.display.warning)}</p>${isLive() && record ? `<p>수집 ${escape(new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(new Date(record.collected_at)))}</p>` : ''}</section>`;
}
const selectedProduct = lot => productsFor(lot).find(p=>p.id===state.selectedProductId) ?? productsFor(lot)[0];
function renderDetail() {
  const lot = dataset.lots.find(lot => lot.id === state.selectedId); if (!lot) return;
  const item = view(lot), p = selectedProduct(lot);
  $('#purchase').hidden = !p;
  $('#purchase').disabled = state.completed || !saleOpen(p);
  $('#purchase').textContent = p && !saleOpen(p) ? saleLabel(p) : '구매하기';
  $('#detail').classList.toggle('expanded', state.expanded);
  $('#expand').setAttribute('aria-expanded', String(state.expanded));
  $('#expand').setAttribute('aria-label', state.expanded ? '상품 상세 접기' : '상품 상세 펼치기');
  $('#detail-heading').innerHTML = `${state.mode === 'improved' ? badge(item) : ''}<span class="detail-heading-name" title="${escape(lot.name)}">${escape(lot.name)}</span>`;
  $('#detail-updated').hidden = state.mode !== 'improved';
  $('#detail-updated').textContent = item.latest_record ? sourceTimeLabel(item.latest_record) : '최근 기록 없음';
  $('#detail-content').innerHTML = `<h2 class="product-title">${escape(p?.name ?? "주차장 정보")} ${p ? money(p.price_won)+"원" : "상세 보기"}</h2><p class="product-time">${escape(p?.hours_label ?? "확인된 주차권 정보가 없습니다")}</p>${statusPanel(item)}<section class="conditions"><h3>🚨 결제 전 유의사항</h3><ul>${(p?.conditions ?? []).map(text => `<li>${escape(text)}</li>`).join('')}</ul></section>${state.expanded ? `<div class="photo-placeholder"><div>주차장 입구 사진<br>자료 확인 대기</div><div>시설 내부 사진<br>자료 확인 대기</div></div><section class="info-block"><h3>${escape(lot.name)}</h3><p>${escape(lot.address)}</p><h4>현장 요금 정보</h4><p>${lot.facility_info ? `1시간 기준 ${money(lot.facility_info.hourly_fee_won)}원 · 운영 ${escape(lot.facility_info.operating_hours)}` : "확인된 현장 요금 정보가 없습니다."}</p></section><section class="info-block"><h3>입출차 주의사항</h3><p>${p ? '선택한 주차권의 결제 전 유의사항을 확인해 주세요.' : '확인된 시설별 차량 제한·입출차 정보가 없습니다.'}</p><h4>주차권 공통 안내사항</h4><ul><li>만차 혹은 현장 사정에 따라 주차가 어려울 수 있습니다.</li><li>주차 상태는 표시된 갱신 시점 기준입니다.</li><li>이 프로토타입의 상품은 실제 입차에 사용할 수 없습니다.</li></ul><details><summary>공통 안내 전체 보기</summary><p>유효 시간과 입출차 횟수 등 선택한 주차권의 이용 조건을 확인해 주세요.</p><p>이 화면의 구매하기는 선택 결과를 기록하고 테스트를 종료합니다.</p></details></section>` : '<button id="more-detail" class="more">상세 정보 펼쳐 보기 ⌃</button>'}`;
  $('#more-detail')?.addEventListener('click', toggleExpanded);
}
function openDetail(id, productId=null) {
  state.selectedProductId = productId;
  state.returnY = $('#parking-list').scrollTop; state.selectedId = id; state.expanded = false;
  $('#results').hidden = true; $('#detail').hidden = false; $('#map-header').hidden = true; $('#home-footer').hidden = true;
  renderMarkers(); renderDetail(); $('#detail-content').scrollTop = 0;
}
function toggleExpanded() { state.expanded = !state.expanded; renderDetail(); }
function backToList() { showList(); $('#parking-list').scrollTop = state.returnY; }
function changeMode(mode) {
  state.mode = mode;
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  renderList(); if (!$('#detail').hidden) renderDetail();
}
function renderSearch() {
  const term = $('#search').value.trim();
  const matches = dataset.lots.filter(lot => !term || `${lot.name} ${lot.address}`.includes(term));
  $('#search-results').innerHTML = (!term || '성수동'.includes(term) ? '<button class="search-result" data-search="성수동"><span>⌕</span><div><strong>성수동</strong><small>서울특별시 성동구</small></div></button>' : '') + matches.map(lot => `<button class="search-result" data-search="${escape(lot.name)}"><span>⌖</span><div><strong>${escape(lot.name)}</strong><small>${escape(lot.address)}</small></div></button>`).join('');
  if (!$('#search-results').innerHTML) $('#search-results').innerHTML = '<p class="empty">검색 결과가 없습니다. 성수동 지역이나 주차장 이름을 확인해 주세요.</p>';
}
function submitSearch(term) {
  const matches=dataset.lots.filter(lot=>`${lot.name} ${lot.address}`.includes(term));
  state.destinationId=term && term!=='성수동' && matches.length===1 ? matches[0].id : null;
  state.query=term; state.sort=state.destinationId?'distance':'name';
  $('#destination-label').textContent=term || '목적지 또는 주소 검색';
  $('#search-screen').hidden=true; state.category='제안'; showMap();
  if(state.destinationId) parkingMap?.focus(state.destinationId);
  toast(state.destinationId ? `${matches[0].name}을 목적지로 선택했습니다.` : `${candidateLots().length}개 주차장을 찾았습니다.`);
}
function renderCalendar() {
  const firstDay = new Date(Date.UTC(today.year,today.month-1,1)).getUTCDay();
  const days = new Date(Date.UTC(today.year,today.month,0)).getUTCDate();
  $('.month strong').textContent = `${today.year}년 ${today.month}월`;
  $('#calendar').innerHTML = ['일','월','화','수','목','금','토'].map((s,i) => `<span class="weekday ${i===0?'sun':''}">${s}</span>`).join('') + '<span></span>'.repeat(firstDay) + Array.from({length:days},(_,i) => `<button data-date="${i+1}" ${i+1<today.day?'disabled':''} class="${state.date===i+1?'active':''} ${(i+firstDay)%7===0?'sun':''}">${i+1}</button>`).join('');
  $('#durations').innerHTML = ['1시간','2시간','3시간','5시간','8시간','12시간','종일','2일 이상'].map(s => `<button data-duration="${s}" class="${state.duration===s?'active':''}">${s}</button>`).join('');
}
function readRecords() {
  const cutoff = Date.now() - 7 * 86400000;
  return JSON.parse(localStorage.getItem(storageKey) || '[]').filter(r => Number.isFinite(Date.parse(r.recorded_at)) && Date.parse(r.recorded_at) >= cutoff);
}
function finishTest() {
  if (state.completed) return;
  const lot = dataset.lots.find(l => l.id === state.selectedId), product = lot ? selectedProduct(lot) : null;
  if (!product) { toast('확인된 주차권이 없습니다.'); return; }
  if (!saleOpen(product)) { toast(saleLabel(product)); return; }
  const result = {id:crypto.randomUUID(),parking_id:lot.id,parking_name:lot.name,product_name:product.name,price_won:product.price_won,selected_date:`${today.year}-${String(today.month).padStart(2,'0')}-${String(state.date).padStart(2,'0')}`,duration:state.duration,recorded_at:new Date().toISOString(),data_as_of:dataset.as_of,test_only:true};
  try { const records=readRecords(); records.push(result); localStorage.setItem(storageKey,JSON.stringify(records)); }
  catch { toast('선택 기록을 저장하지 못했습니다. 다시 시도해 주세요.'); return; }
  $('#completion-detail').innerHTML=`<strong>${escape(lot.name)}</strong><br>${escape(product.name)} · ${money(product.price_won)}원<br>${today.month}월 ${state.date}일 · ${escape(state.duration)}<br><small>실제 결제·예약·주차권 발급은 이루어지지 않았습니다.</small>`;
  state.completed=true; $('#purchase').disabled=true; $('#completion').hidden=false;
  $('#restart').focus({preventScroll:true});
}
function reset() {
  Object.assign(state,{selectedId:null,selectedProductId:null,destinationId:null,query:'',sort:'name',expanded:false,category:'제안',duration:'1시간',date:today.day,scenario:participantView ? participantScenario : 'normal',returnY:0,zoom:1,tickets:true,completed:false});
  $('#purchase').disabled = false;
  $('#search').value = ''; $('#destination-label').textContent = '목적지 또는 주소 검색'; $('#open-date').textContent = '오늘 · 1시간';
  ['#search-screen','#date-screen','#completion','#toast'].forEach(s => $(s).hidden = true); $('#ticket-toggle').setAttribute('aria-pressed','true'); $('#ticket-toggle b').textContent = 'ON'; changeMode(participantView || isLive() ? 'improved' : 'baseline'); showMap();
}
function updateDataLabels(message='') {
  if(message) toast(message);
  $('.statusbar span').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(displayAsOf()));
}
async function refreshLive() {
  const version = ++requestVersion;

  updateDataLabels('실제 DB 현황 조회 중…');
  try {
    const res = await fetch('/api/parking', {cache:'no-store', signal:AbortSignal.timeout(25000)});
    if (!res.ok) throw new Error('LIVE_READ_FAILED');
    const snapshot = connectCatalog(await res.json(), catalog);
    if (version !== requestVersion || !isLive()) return;
    dataset = snapshot; liveLoadedAt = performance.now(); liveLoadedWallAt = Date.now();
    renderList(); if (!$('#detail').hidden) renderDetail(); updateDataLabels();
    $('#load-message').textContent = snapshot.lots.length ? '' : '등록된 실데이터 시설이 없습니다.';
  } catch {
    if (version !== requestVersion || !isLive()) return;
    dataset = {...dataset, lots:dataset.lots.map(lot => ({...lot, latest_collection:{result_status:'READ_ERROR'}}))};
    renderList(); if (!$('#detail').hidden) renderDetail();
    updateDataLabels('조회 실패 · 더미값으로 대체하지 않았습니다. 새로고침해 주세요.');
    $('#load-message').textContent = dataset.lots.length ? '' : '실제 DB 조회 실패 · 현황 새로고침으로 다시 시도해 주세요.';
  } finally {

  }
}
async function init() {
  try {
    const response=await fetch('./data/facilities.json', {cache:'no-store'}); if(!response.ok) throw new Error('CATALOG_FAILED');
    catalog=await response.json();
    dataset=connectCatalog({data_origin:'LIVE',as_of:new Date().toISOString(),lots:[]},catalog);
    liveLoadedAt=performance.now(); liveLoadedWallAt=Date.now();
    const mapReady = createParkingMap(document.querySelector('#naver-map'), openDetail, () => {
      if(state.destinationId) { parkingMap?.focus(state.destinationId); renderList(); }
    }).then(map => { parkingMap=map; renderMarkers(); });
    renderList(); renderCalendar(); showMap();
    $('#parking-list').addEventListener('click', event => { const button = event.target.closest('[data-lot]'); if (button) openDetail(button.dataset.lot,button.dataset.product); });
    $('#open-list').addEventListener('click', showList); $('#close-list').addEventListener('click', showMap); $('#back').addEventListener('click', backToList);
    $('#expand').addEventListener('click', toggleExpanded); $('#detail-heading').addEventListener('click', toggleExpanded);
    $('#sort-distance').addEventListener('click', () => { state.sort='distance'; renderList(); }); $('#sort-price').addEventListener('click', () => { state.sort='price'; renderList(); });
    document.querySelectorAll('[data-category]').forEach(b => b.addEventListener('click', () => { state.category=b.dataset.category; renderList(); }));
    document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => changeMode(b.dataset.mode)));
    document.querySelectorAll('[data-unsupported]').forEach(b => b.addEventListener('click', () => toast(`${b.dataset.unsupported}은 화면 참고 영역입니다. 이번 테스트는 당일 주차권 선택 흐름입니다.`)));
    $('#open-search').addEventListener('click', () => { $('#search-screen').hidden=false; $('#search').value=state.query; renderSearch(); $('#search').focus(); });
    $('#close-search').addEventListener('click', () => $('#search-screen').hidden=true); $('#search').addEventListener('input', renderSearch);
    $('#search-form').addEventListener('submit', event => { event.preventDefault(); submitSearch($('#search').value.trim()); });
    $('#search-results').addEventListener('click', event => { const b=event.target.closest('[data-search]'); if (b) submitSearch(b.dataset.search); });
    $('#open-date').addEventListener('click', () => { renderCalendar(); $('#date-screen').hidden=false; });
    let draftDate=today.day, draftDuration='1시간';
    $('#open-date').addEventListener('click', () => { draftDate=state.date; draftDuration=state.duration; });
    $('#calendar').addEventListener('click', event => { const b=event.target.closest('[data-date]'); if(b){ draftDate=Number(b.dataset.date); $('#calendar').querySelectorAll('button').forEach(x => x.classList.toggle('active',x===b)); }});
    $('#durations').addEventListener('click', event => { const b=event.target.closest('[data-duration]'); if(b){ draftDuration=b.dataset.duration; $('#durations').querySelectorAll('button').forEach(x => x.classList.toggle('active',x===b)); }});
    $('#close-date').addEventListener('click', () => $('#date-screen').hidden=true);
    $('#confirm-date').addEventListener('click', () => { state.date=draftDate; state.duration=draftDuration; $('#open-date').textContent=`${state.date===today.day?'오늘':`${today.month}.${state.date}`} · ${state.duration}`; $('#date-screen').hidden=true; renderList(); if (!$('#detail').hidden) renderDetail(); toast('선택 조건에 맞는 확인된 주차권을 표시합니다.'); });
    $('#ticket-toggle').addEventListener('click', () => { state.tickets=!state.tickets; $('#ticket-toggle b').textContent=state.tickets?'ON':'OFF'; $('#ticket-toggle').setAttribute('aria-pressed',String(state.tickets)); renderMarkers(); });
    $('#zoom-in').addEventListener('click', () => { parkingMap?.zoom(1); }); $('#zoom-out').addEventListener('click', () => { parkingMap?.zoom(-1); });
    $('#recenter').addEventListener('click', () => { parkingMap?.reset(); }); $('#search-here').addEventListener('click', () => isLive() ? refreshLive() : toast('현재 테스트 목적지의 고정 가상 목록입니다. 실제 위치 검색과 연결되지 않았습니다.'));
    $('#purchase').addEventListener('click', finishTest); $('#restart').addEventListener('click', reset);
    if (isLive()) await refreshLive();
    // 화면을 열어 둔 동안에도 새 DB 관측값을 가져온다. 숨긴 탭에서는 요청하지 않는다.
    setInterval(() => { if (!document.hidden) refreshLive(); }, 60000);
    // 새 네트워크 호출 없이 경과 시간만 반영한다. 20분을 넘긴 값을 현재로 고정하지 않는다.
    setInterval(() => { if (isLive()) { renderList(); if (!$('#detail').hidden) renderDetail(); } },30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshLive(); });
  } catch(error) { $('#load-message').textContent='데이터를 불러오지 못했습니다. README의 실행 방법을 확인해 주세요.'; console.error(error); }
}
init();
