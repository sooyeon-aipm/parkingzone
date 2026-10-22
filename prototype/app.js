import { buildView, sourceTimeLabel } from './model.js';

// 화면 선택(state) / 원본 데이터(dataset) / 화면용 데이터(view)를 분리합니다.
const state = { mode: 'baseline', selectedId: null, query: '', sort: 'distance', expanded: false, category: '제안', duration: '1시간', date: 22, scenario: 'normal', returnY: 0, zoom: 1, tickets: true, completed: false };
const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('ko-KR').format(value);
const storageKey = 'parkingzone-ut-selections-v1';
const entryParams = new URLSearchParams(location.search);
const participantView = entryParams.get('participant') === '1';
const participantScenario = ({'1':'normal','2':'stale','3':'missing'})[entryParams.get('case')] ?? 'normal';
let dataset, toastTimer;
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3200); }
function scenarioLot(lot) {
  const copy = structuredClone(lot);
  if (state.scenario === 'stale') copy.observation.source_updated_at = '2026-10-22T02:30:00Z';
  if (state.scenario === 'missing') { copy.observation.source_updated_at = null; copy.observation.quality_status = 'SOURCE_TIME_MISSING'; }
  if (state.scenario === 'failed') copy.latest_collection.result_status = 'FETCH_ERROR';
  if (state.scenario === 'empty') copy.observation = null;
  return copy;
}
const view = lot => buildView(scenarioLot(lot), dataset.as_of);
function visibleLots() {
  const term = state.query.trim();
  const lots = dataset.lots.filter(lot => !term || term === '성수동' || `${lot.name} ${lot.address}`.includes(term));
  if (!['제안','당일권'].includes(state.category)) return [];
  return lots.sort((a,b) => state.sort === 'price' ? a.demo_product.price_won - b.demo_product.price_won : a.demo_product.distance_m - b.demo_product.distance_m);
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
  const distance = `<span class="row-distance">${item.demo_product.distance_m}m</span>`;
  if (state.mode === 'baseline') return `<div class="row-heading">${name}${distance}</div>`;
  const time = `<span class="status-time" title="${escape(item.latest_record ? sourceTimeLabel(item.latest_record) : item.display.warning)}">${escape(listTimeLabel(item))}</span>`;
  return `<div class="row-heading with-status layout-name">${badge(item)}<div class="name-and-time">${name}${time}</div>${distance}</div>`;
}
function renderList() {
  const lots = visibleLots();
  $('#parking-list').innerHTML = lots.length ? lots.map(lot => {
    const item = view(lot), p = item.demo_product;
    return `<article class="parking-row ${lot.id === (state.selectedId ?? lots[0]?.id) ? 'selected' : ''}">${rowHeading(lot, item)}<button class="ticket" data-lot="${lot.id}"><span><span class="ticket-name">${escape(p.name)}</span><span class="ticket-time">${escape(p.hours_label)}</span></span><strong>${money(p.price_won)}원</strong></button></article>`;
  }).join('') : '<p class="empty">조건에 맞는 테스트 상품이 없습니다.<br>제안 또는 당일권을 선택해 주세요.</p>';
  $('#sort-distance').classList.toggle('active', state.sort === 'distance');
  $('#sort-price').classList.toggle('active', state.sort === 'price');
  document.querySelectorAll('[data-category]').forEach(button => button.classList.toggle('active', state.category === button.dataset.category));
  renderMarkers();
}
function renderMarkers() {
  $('#map-markers').innerHTML = (state.tickets ? visibleLots() : []).map((lot,i) => `<button class="marker ${state.selectedId === lot.id ? 'selected' : ''}" style="left:${[66,28,52,82,17,73,38,48,19,87,64,43,14,80,57][i]}%;top:${[28,38,44,49,57,54,51,35,45,36,48,57,33,37,52][i]}%" data-marker="${lot.id}" aria-label="${escape(lot.name)} 선택"><small>${escape(lot.demo_product.name)}</small><strong>${money(lot.demo_product.price_won)}</strong></button>`).join('');
  $('#map-markers').style.transform = `scale(${state.zoom})`;
  $('.map-image').style.transform = `scale(${state.zoom})`;
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
  return `<section class="status-panel" aria-label="주차 상태"><div class="panel-heading"><strong>${item.display.mode === 'CURRENT' ? '주차장 현재 상태' : item.display.mode === 'NO_DATA' ? '주차 정보' : '마지막 기록'}</strong></div>${record ? `<div class="space-count">${record.available_spaces}면 <small>/ 전체 ${record.total_spaces}면</small></div>` : ''}<p>${escape(item.display.warning)}</p></section>`;
}
function renderDetail() {
  const lot = dataset.lots.find(lot => lot.id === state.selectedId); if (!lot) return;
  const item = view(lot), p = item.demo_product;
  $('#detail').classList.toggle('expanded', state.expanded);
  $('#expand').setAttribute('aria-expanded', String(state.expanded));
  $('#expand').setAttribute('aria-label', state.expanded ? '상품 상세 접기' : '상품 상세 펼치기');
  $('#detail-heading').innerHTML = `${state.mode === 'improved' ? badge(item) : ''}<span class="detail-heading-name" title="${escape(lot.name)}">${escape(lot.name)}</span>`;
  $('#detail-updated').hidden = state.mode !== 'improved';
  $('#detail-updated').textContent = item.latest_record ? sourceTimeLabel(item.latest_record) : '최근 기록 없음';
  $('#detail-content').innerHTML = `<h2 class="product-title">${escape(p.name)} ${money(p.price_won)}원</h2><p class="product-time">${escape(p.hours_label)}</p>${statusPanel(item)}<section class="conditions"><h3>🚨 결제 전 유의사항</h3><ul>${p.conditions.map(text => `<li>${escape(text)}</li>`).join('')}</ul></section>${state.expanded ? `<div class="photo-placeholder"><div>주차장 입구 사진<br>자료 확인 대기</div><div>시설 내부 사진<br>자료 확인 대기</div></div><section class="info-block"><h3>${escape(lot.name)}</h3><p>${escape(lot.address)}</p><h4>현장 요금 정보</h4><p>실제 현장 요금 확인 전입니다.<br>표시된 주차권 가격은 테스트용 가상값입니다.</p></section><section class="info-block"><h3>입출차 주의사항</h3><p>시설별 차량 제한·입출차 방법은 아직 확인되지 않았습니다. 캡처 속 다른 주차장의 조건을 이 시설에 적용하지 않습니다.</p><h4>주차권 공통 안내사항</h4><ul><li>만차 혹은 현장 사정에 따라 주차가 어려울 수 있습니다.</li><li>주차 상태는 표시된 갱신 시점 기준입니다.</li><li>이 프로토타입의 상품은 실제 입차에 사용할 수 없습니다.</li></ul><details><summary>공통 안내 전체 보기</summary><p>기존 캡처에서는 구매 전 이용 조건·만차 가능성·환불 안내를 확인할 수 있습니다. 성수동 시설의 실제 판매·환불 조건은 미확인이므로 해당 정책을 임의로 옮기지 않았습니다.</p><p>이 화면의 구매하기는 선택 결과를 기록하고 테스트를 종료합니다.</p></details></section>` : '<button id="more-detail" class="more">상세 정보 펼쳐 보기 ⌃</button>'}`;
  $('#more-detail')?.addEventListener('click', toggleExpanded);
}
function openDetail(id) {
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
  $('#search-results').innerHTML = (!term || '성수동'.includes(term) ? '<button class="search-result" data-search="성수동"><span>⌕</span><div><strong>성수동</strong><small>서울특별시 성동구 · 테스트 목적지</small></div></button>' : '') + matches.map(lot => `<button class="search-result" data-search="${escape(lot.name)}"><span>⌖</span><div><strong>${escape(lot.name)}</strong><small>${escape(lot.address)}</small></div></button>`).join('');
  if (!$('#search-results').innerHTML) $('#search-results').innerHTML = '<p class="empty">테스트 목록에서 검색 결과를 찾지 못했습니다.</p>';
}
function submitSearch(term) {
  state.query = term; $('#destination-label').textContent = term || '목적지 또는 주소 검색'; $('#search-screen').hidden = true; state.category = '제안'; showMap();
  toast(`${visibleLots().length}개 테스트 주차장을 찾았습니다.`);
}
function renderCalendar() {
  $('#calendar').innerHTML = ['일','월','화','수','목','금','토'].map((s,i) => `<span class="weekday ${i===0?'sun':''}">${s}</span>`).join('') + [27,28,29,30].map(n => `<span class="muted">${n}</span>`).join('') + Array.from({length:31},(_,i) => `<button data-date="${i+1}" class="${state.date===i+1?'active':''} ${(i+4)%7===0?'sun':''}">${i+1}</button>`).join('');
  $('#durations').innerHTML = ['1시간','2시간','3시간','5시간','8시간','12시간','종일','2일 이상'].map(s => `<button data-duration="${s}" class="${state.duration===s?'active':''}">${s}</button>`).join('');
}
function readRecords() {
  const cutoff = Date.now() - 7 * 86400000;
  return JSON.parse(localStorage.getItem(storageKey) || '[]').filter(r => Number.isFinite(Date.parse(r.recorded_at)) && Date.parse(r.recorded_at) >= cutoff);
}
function updateRecordSummary() {
  try { const records = readRecords(); localStorage.setItem(storageKey, JSON.stringify(records)); $('#record-summary').textContent = `최근 7일 테스트 선택 ${records.length}건 · 이 브라우저에만 저장`; }
  catch { $('#record-summary').textContent = '브라우저 기록 저장을 사용할 수 없습니다.'; }
}
function finishTest() {
  if (state.completed) return;
  const lot = dataset.lots.find(l => l.id === state.selectedId); if (!lot) return;
  const result = { id: crypto.randomUUID(), parking_id: lot.id, parking_name: lot.name, mode: state.mode, scenario: state.scenario, product_name: lot.demo_product.name, price_won: lot.demo_product.price_won, selected_date: `2026-10-${String(state.date).padStart(2,'0')}`, duration: state.duration, recorded_at: new Date().toISOString(), data_as_of: dataset.as_of, test_only: true };
  try { const records = readRecords(); records.push(result); localStorage.setItem(storageKey, JSON.stringify(records)); }
  catch { toast('기록 저장에 실패했습니다. 브라우저 저장 공간 설정을 확인해 주세요.'); return; }
  $('#completion-detail').innerHTML = `<strong>${escape(lot.name)}</strong><br>${escape(result.product_name)} · ${money(result.price_won)}원<br>${participantView ? '' : `${state.mode === 'improved' ? '개선안' : '기존안'} · ${escape($('#scenario').selectedOptions[0].textContent)}<br>`}선택한 조건: 10월 ${state.date}일 · ${escape(state.duration)}<br><small>상품 이용시간은 상품 상세 표시 기준입니다.</small>`;
  state.completed = true;
  $('#purchase').disabled = true;
  $('#completion').hidden = false; updateRecordSummary();
  $('#restart').focus({ preventScroll: true });
}
function reset() {
  Object.assign(state,{selectedId:null,query:'',sort:'distance',expanded:false,category:'제안',duration:'1시간',date:22,scenario:participantView ? participantScenario : 'normal',returnY:0,zoom:1,tickets:true,completed:false});
  $('#purchase').disabled = false;
  $('#scenario').value = state.scenario; $('#search').value = ''; $('#destination-label').textContent = '목적지 또는 주소 검색'; $('#open-date').textContent = '오늘 · 1시간';
  ['#search-screen','#date-screen','#completion','#toast'].forEach(s => $(s).hidden = true); $('#ticket-toggle').setAttribute('aria-pressed','true'); $('#ticket-toggle b').textContent = 'ON'; changeMode(participantView ? 'improved' : 'baseline'); showMap();
}
async function init() {
  try {
    const response = await fetch('./data/parking.json'); if (!response.ok) throw new Error('데이터 응답 오류'); dataset = await response.json();
    if (participantView) { state.mode = 'improved'; state.scenario = participantScenario; $('#scenario').value = state.scenario; }
    renderList(); renderCalendar(); updateRecordSummary(); $('#load-message').textContent = '';
    const previewLayout = new URLSearchParams(location.search).get('layout');
    if (participantView) { changeMode('improved'); showMap(); }
    else if (['1','2'].includes(previewLayout)) { changeMode('improved'); showList(); }
    $('#parking-list').addEventListener('click', event => { const button = event.target.closest('[data-lot]'); if (button) openDetail(button.dataset.lot); });
    $('#map-markers').addEventListener('click', event => { const button = event.target.closest('[data-marker]'); if (button) openDetail(button.dataset.marker); });
    $('#open-list').addEventListener('click', showList); $('#close-list').addEventListener('click', showMap); $('#back').addEventListener('click', backToList);
    $('#expand').addEventListener('click', toggleExpanded); $('#detail-heading').addEventListener('click', toggleExpanded);
    $('#sort-distance').addEventListener('click', () => { state.sort='distance'; renderList(); }); $('#sort-price').addEventListener('click', () => { state.sort='price'; renderList(); });
    document.querySelectorAll('[data-category]').forEach(b => b.addEventListener('click', () => { state.category=b.dataset.category; renderList(); }));
    document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => changeMode(b.dataset.mode)));
    document.querySelectorAll('[data-unsupported]').forEach(b => b.addEventListener('click', () => toast(`${b.dataset.unsupported}은 화면 참고 영역입니다. 이번 테스트는 당일 주차권 선택 흐름입니다.`)));
    $('#scenario').addEventListener('change', () => { state.scenario=$('#scenario').value; renderList(); if (!$('#detail').hidden) renderDetail(); });
    $('#open-search').addEventListener('click', () => { $('#search-screen').hidden=false; $('#search').value=state.query; renderSearch(); $('#search').focus(); });
    $('#close-search').addEventListener('click', () => $('#search-screen').hidden=true); $('#search').addEventListener('input', renderSearch);
    $('#search-form').addEventListener('submit', event => { event.preventDefault(); submitSearch($('#search').value.trim()); });
    $('#search-results').addEventListener('click', event => { const b=event.target.closest('[data-search]'); if (b) submitSearch(b.dataset.search); });
    $('#open-date').addEventListener('click', () => { renderCalendar(); $('#date-screen').hidden=false; });
    let draftDate=22, draftDuration='1시간';
    $('#open-date').addEventListener('click', () => { draftDate=state.date; draftDuration=state.duration; });
    $('#calendar').addEventListener('click', event => { const b=event.target.closest('[data-date]'); if(b){ draftDate=Number(b.dataset.date); $('#calendar').querySelectorAll('button').forEach(x => x.classList.toggle('active',x===b)); }});
    $('#durations').addEventListener('click', event => { const b=event.target.closest('[data-duration]'); if(b){ draftDuration=b.dataset.duration; $('#durations').querySelectorAll('button').forEach(x => x.classList.toggle('active',x===b)); }});
    $('#close-date').addEventListener('click', () => $('#date-screen').hidden=true);
    $('#confirm-date').addEventListener('click', () => { state.date=draftDate; state.duration=draftDuration; $('#open-date').textContent=`${state.date===22?'오늘':`10.${state.date}`} · ${state.duration}`; $('#date-screen').hidden=true; toast('테스트 조건을 저장했습니다. 상품별 판매 가능 여부는 연결 전입니다.'); });
    $('#ticket-toggle').addEventListener('click', () => { state.tickets=!state.tickets; $('#ticket-toggle b').textContent=state.tickets?'ON':'OFF'; $('#ticket-toggle').setAttribute('aria-pressed',String(state.tickets)); renderMarkers(); });
    $('#zoom-in').addEventListener('click', () => { state.zoom=Math.min(1.6,state.zoom+.2); renderMarkers(); }); $('#zoom-out').addEventListener('click', () => { state.zoom=Math.max(.8,state.zoom-.2); renderMarkers(); });
    $('#recenter').addEventListener('click', () => { state.zoom=1; renderMarkers(); toast('예시 표식을 초기 위치로 돌렸습니다.'); }); $('#search-here').addEventListener('click', () => toast('현재 테스트 목적지의 고정 가상 목록입니다. 실제 위치 검색과 연결되지 않았습니다.'));
    $('#purchase').addEventListener('click', finishTest); $('#reset').addEventListener('click', reset); $('#restart').addEventListener('click', reset);
  } catch(error) { $('#load-message').textContent='데이터를 불러오지 못했습니다. README의 실행 방법을 확인해 주세요.'; console.error(error); }
}
init();
