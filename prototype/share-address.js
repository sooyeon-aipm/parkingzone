import {loadSdk} from './parking-map.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function normalizeAddress(item) {
  const lat=Number(item?.y),lng=Number(item?.x);
  const jibun=String(item?.jibunAddress??'').trim(),road=String(item?.roadAddress??'').trim();
  if(!String(item?.y??'').trim() || !String(item?.x??'').trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180 || !(jibun||road)) return null;
  return {lat,lng,jibun,road};
}
export function confirmedAddress(point,detail='') {
  if(!point || !normalizeAddress({y:point.lat,x:point.lng,jibunAddress:point.jibun,roadAddress:point.road})) return null;
  return {...point,detail:detail.trim(),label:[point.jibun||point.road,detail.trim()].filter(Boolean).join(' ')};
}
async function searchAddresses(query) {
  const maps=await loadSdk();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('ADDRESS_TIMEOUT')),15000);
    maps.Service.geocode({query,count:20},(status,response)=>{
      clearTimeout(timer);
      if(status!==maps.Service.Status.OK) return reject(new Error('ADDRESS_FAILED'));
      resolve((response?.v2?.addresses??[]).map(normalizeAddress).filter(Boolean));
    });
  });
}
export async function addressPreview(element,point) {
  if(!point) return ()=>{};
  const maps=await loadSdk();
  if(!element.isConnected) return ()=>{};
  const center=new maps.LatLng(point.lat,point.lng);
  const map=new maps.Map(element,{center,zoom:17,draggable:false,scrollWheel:false,disableDoubleClickZoom:true,keyboardShortcuts:false});
  const marker=new maps.Marker({map,position:center,icon:{content:'<span class="address-arrow" aria-hidden="true">⬇</span>',anchor:new maps.Point(16,32)}});
  return ()=>{marker.setMap(null);map.destroy();};
}
// 검색 화면을 분리해 주소 선택 중에도 폼과 사진 입력 DOM을 유지한다.
export function createAddressPicker(parent,onConfirm) {
  const root=document.createElement('section');
  root.className='full-screen address-screen';root.hidden=true;root.setAttribute('aria-label','등록할 주소 검색');
  parent.append(root);
  let page='search',query='',results=[],selected=null,detail='',request=0,dispose=()=>{},returnFocus=null;
  const close=()=>{request++;dispose();dispose=()=>{};root.hidden=true;returnFocus?.focus({preventScroll:true});};
  async function renderMap() {
    const element=root.querySelector('.address-map');if(!element) return;
    try {const cleanup=await addressPreview(element,selected);if(element.isConnected&&!root.hidden) dispose=cleanup;else cleanup();}
    catch {if(element.isConnected) element.textContent='지도를 불러오지 못했습니다. 선택한 주소를 확인해 주세요.';}
  }
  function render() {
    dispose();dispose=()=>{};
    root.innerHTML=`<header class="address-nav"><button data-address-back aria-label="주소 검색 뒤로가기">〈</button>${page==='search'?`<form data-address-search><input aria-label="등록할 주소 검색" placeholder="등록할 주소 검색" value="${escape(query)}" autocomplete="off"><button type="submit">검색</button></form>`:'<h2>상세 주소</h2>'}</header>${page==='search'?`<div class="address-search-body"><button class="address-locate" disabled title="현재 위치 검색은 아직 연결되지 않았습니다">◎ 현재 위치로 검색하기</button><p class="address-search-note">도로명 또는 지번 주소로 검색해 주세요.</p><p data-address-status role="status"></p><div class="address-results">${results.map((item,i)=>`<button data-address-result="${i}"><strong>${escape(item.road||item.jibun)}</strong><small>${escape(item.jibun)}</small></button>`).join('')}</div></div>`:`<div class="address-map" aria-label="선택한 주소 지도"></div><div class="address-confirm"><p>${escape(selected.jibun||selected.road)}</p><input data-address-detail aria-label="상세 주소" placeholder="상세 주소를 입력해 주세요." value="${escape(detail)}"><button data-address-confirm>위치 확정하기</button></div>`}`;
    if(page==='detail') renderMap();
  }
  root.addEventListener('submit',async event=>{
    event.preventDefault();query=root.querySelector('[data-address-search] input').value.trim();results=[];
    const version=++request;
    root.querySelector('.address-results').replaceChildren();
    const status=root.querySelector('[data-address-status]');
    if(!query){status.textContent='검색할 주소를 입력해 주세요.';return;}
    status.textContent='검색 중…';
    try {const found=await searchAddresses(query);if(version!==request||root.hidden)return;results=found;render();root.querySelector('[data-address-status]').textContent=found.length?'':'검색 결과가 없습니다. 도로명 또는 지번을 확인해 주세요.';}
    catch {if(version===request&&!root.hidden) status.textContent='주소를 검색하지 못했습니다. 잠시 후 다시 검색해 주세요.';}
  });
  root.addEventListener('input',event=>{
    if(event.target.matches('[data-address-search] input')) {request++;query=event.target.value;results=[];root.querySelector('.address-results').replaceChildren();root.querySelector('[data-address-status]').textContent='';}
    if(event.target.matches('[data-address-detail]')) detail=event.target.value;
  });
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button) return;
    if(button.hasAttribute('data-address-back')) {if(page==='detail'){request++;page='search';render();}else close();}
    if(button.hasAttribute('data-address-result')) {const result=results[Number(button.dataset.addressResult)];if(!result)return;request++;selected=result;detail='';page='detail';render();}
    if(button.hasAttribute('data-address-confirm')) {const value=confirmedAddress(selected,detail);if(value){onConfirm(value);close();}}
  });
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
  return {open(current,focus){request++;returnFocus=focus;query='';results=[];selected=current??null;detail=current?.detail??'';page='search';root.hidden=false;render();root.querySelector('[data-address-search] input').focus({preventScroll:true});},close};
}
