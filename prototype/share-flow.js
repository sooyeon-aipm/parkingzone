import {createAddressPicker,addressPreview} from './share-address.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function shareFormComplete(form, photos) {
  return Boolean(form.name?.trim() && form.address?.trim() && Number.isInteger(Number(form.spaces)) && Number(form.spaces)>0 && String(form.fee).trim() && Number.isFinite(Number(form.fee)) && Number(form.fee)>=0 && photos[0] && photos[1]);
}
export function shareConditionResult(external, designated) {
  return external===null || designated===null ? 'incomplete' : external && designated ? 'ready' : 'unavailable';
}

// 폼·사진은 화면 메모리에만 유지한다. 주소 검색어만 네이버 Geocoding으로 조회한다.
export function initShareFlow(root) {
  let page='home',type=null,operation=null,external=null,designated=null,dialog=null,consent=false;
  let form={},photos=[null,null],disposePreview=()=>{};
  const addressPicker=createAddressPicker(root.parentElement,value=>{
    form.address=value.label;form.addressSelection=value;
    root.querySelector('[data-share-address]').textContent=value.label;
    root.querySelector('[data-share-next]').disabled=!shareFormComplete(form,photos);
    updateAddressPreview();
  });
  async function updateAddressPreview() {
    disposePreview();disposePreview=()=>{};
    const element=root.querySelector('[data-share-address-map]');
    if(!element || !form.addressSelection) return;
    try {const cleanup=await addressPreview(element,form.addressSelection);if(element.isConnected)disposePreview=cleanup;else cleanup();}
    catch {if(element.isConnected)element.textContent='지도 표시 불가 · 주소를 확인해 주세요.';}
  }
  const title=()=>page==='home'?'내 공유주차장':page==='form'?'필수정보 입력':'주차공유';
  const choice=(key,value,label,description,selected)=>`<button class="share-choice ${selected?'selected':''}" data-share-choice="${key}" data-value="${value}" aria-pressed="${selected}"><strong>${label}</strong>${description?`<small>${description}</small>`:''}</button>`;
  const footer=(label,disabled=false)=>`<footer class="share-footer"><button data-share-next ${disabled?'disabled':''}>${label}</button></footer>`;
  function render() {
    disposePreview();disposePreview=()=>{};
    let body='',bottom='';
    if(page==='home') {
      body='<div class="share-intro"><div class="share-illustration" aria-hidden="true">⌂<span>₩</span></div><h3>빈 주차공간만 있으면<br>누구나 수익을 올릴 수 있습니다</h3><p>수익창출과 무단 주차 예방까지!</p></div>';
      bottom=footer('주차장 등록하기');
    } else if(page==='type') {
      body=`<h3>공유할 주차공간 유형을 선택해 주세요.</h3><div class="share-choices">${choice('type','resident','거주자 우선(주거지)','구청에서 배정받은 주차구획',type==='resident')}${choice('type','private','개인 소유 주차공간','집, 가게, 빌라 등의 주차 가능한 공간',type==='private')}</div>`;
      bottom=footer('다음',!type);
    } else if(page==='operation') {
      body=`<h3>희망하는 운영방식을 선택해 주세요.</h3><div class="share-choices">${choice('operation','hourly','시간제 운영','30분 단위 요금으로 운영합니다.',operation==='hourly')}${choice('operation','monthly','월주차 운영','비워두는 시간이 규칙적인 경우만 가능합니다.',operation==='monthly')}</div>`;
      bottom=footer('다음',!operation);
    } else if(page==='conditions') {
      body=`<h3>공유 조건을 만족하는지 확인해 주세요.</h3><h4>외부인이 주차 가능한 곳인가요?</h4><div class="share-pair">${choice('external','yes','외부인 주차 가능','',external===true)}${choice('external','no','아니오','',external===false)}</div><h4>지정 주차면이 있나요?</h4><div class="share-pair">${choice('designated','yes','지정주차면','',designated===true)}${choice('designated','no','아니오','',designated===false)}</div>`;
      bottom=footer('다음',shareConditionResult(external,designated)==='incomplete');
    } else if(page==='form') {
      body=`<form class="share-form" autocomplete="off"><label>주차공간 이름<input name="name" value="${escape(form.name)}" placeholder="모두의주차장" required></label><div class="share-address-field"><span>주소</span><button type="button" data-share-address>${escape(form.address||'주소 검색')}</button><div data-share-address-map class="share-address-preview" aria-label="등록 주소 지도"></div></div><label>주차 면 수<input name="spaces" type="number" min="1" step="1" value="${escape(form.spaces)}" placeholder="- 면" required></label><label>30분당 주차 요금<input name="fee" type="number" min="0" value="${escape(form.fee)}" placeholder="- 원" required></label><label>주차장 설명(선택)<textarea name="description" placeholder="주차공간을 찾기 쉽게 설명해 주시면 더 많은 운전자가 주차합니다.">${escape(form.description)}</textarea></label><h4>주차장 사진</h4><label class="share-photo">(필수) 주차환경 파악 가능한 전경사진<input type="file" accept="image/*" data-photo-slot="0"><span data-photo-name="0">${escape(photos[0]?.name??'＋')}</span></label><label class="share-photo">(필수) 토지·건물 관계증빙 서류사진<input type="file" accept="image/*" data-photo-slot="1"><span data-photo-name="1">${escape(photos[1]?.name??'＋')}</span></label><p class="share-local-note">입력 내용과 사진은 실제 등록 신청으로 전송되지 않습니다.</p></form>`;
      bottom=footer('등록',!shareFormComplete(form,photos));
    } else if(page==='review') {
      body=`<div class="share-review"><h3>입력 내용을 확인했어요</h3><p>실제 주차장이 등록되거나 신청이 전송되지 않았습니다.</p><dl><dt>주차공간</dt><dd>${escape(form.name)}</dd><dt>주소</dt><dd>${escape(form.address)}</dd><dt>면 수</dt><dd>${escape(form.spaces)}면</dd><dt>30분 요금</dt><dd>${escape(form.fee)}원</dd></dl></div>`;
      bottom=footer('내 공유주차장으로 돌아가기');
    }
    root.innerHTML=`<header class="share-nav"><button data-share-back aria-label="내 공유 뒤로가기">〈</button><h2>${title()}</h2><span></span></header><div class="share-scroll">${body}</div>${bottom}${renderDialog()}`;
    if(page==='form') updateAddressPreview();
  }
  function renderDialog() {
    if(!dialog) return '';
    let content='';
    if(dialog==='unavailable') content='<h3>공유 등록 불가합니다</h3><p>공유 조건을 모두 만족하는 경우에만 등록 가능합니다.</p><button data-share-dismiss>확인</button>';
    if(dialog==='photos') content='<h3>사진을 준비해 주세요</h3><p>주차환경 사진과 토지·건물 관계를 확인할 수 있는 서류사진이 필요합니다.</p><div><button data-share-dismiss>닫기</button><button data-share-continue>계속하기</button></div>';
    if(dialog==='monthly') content='<p>신청서 작성을 위해 웹페이지로 이동합니다.</p><div><button data-share-dismiss>닫기</button><button data-share-boundary>계속하기</button></div><p class="share-boundary-note" hidden>이 프로토타입에서는 외부 신청을 진행하지 않습니다.</p>';
    if(dialog==='resident') content=`<h3>개인정보 수집 및 이용 안내</h3><p>주차장 공유를 위해 주차면의 배정 정보를 해당 지자체에서 조회합니다.</p><ul><li>수집 목적: 배정 정보 유효성 확인</li><li>수집 항목: 차량번호, 생년월일, 연락처</li><li>이용 기간: 공유 기간 동안 보유, 만료 시 폐기</li></ul><p>대리등록의 경우 반드시 당사자에게 동의를 받고 진행해 주세요.</p><label><input type="checkbox" data-share-consent ${consent?'checked':''}> 위 내용 동의 후 배정정보를 등록합니다.</label><button data-share-boundary ${consent?'':'disabled'}>배정 정보 등록하기</button><p class="share-boundary-note" hidden>이 프로토타입에서는 배정정보를 조회하거나 실제 동의를 전송하지 않습니다.</p><button data-share-dismiss>닫기</button>`;
    return `<div class="share-dialog-layer"><section class="share-dialog" role="dialog" aria-modal="true" aria-label="${dialog==='resident'?'개인정보 수집 및 이용 안내':'주차공유 안내'}">${content}</section></div>`;
  }
  function back() {
    if(dialog) {dialog=null;render();return;}
    if(page==='home') {root.hidden=true;disposePreview();form={};photos=[null,null];return;}
    page=({type:'home',operation:'type',conditions:'operation',form:'conditions',review:'form'})[page];render();
  }
  root.addEventListener('click',event=>{
    const target=event.target.closest('button');if(!target) return;
    if(target.hasAttribute('data-share-address')) {addressPicker.open(form.addressSelection,target);return;}
    if(target.hasAttribute('data-share-back')) return back();
    if(target.dataset.shareChoice) {
      const {shareChoice:key,value}=target.dataset;
      if(key==='type') type=value;
      if(key==='operation') operation=value;
      if(key==='external') external=value==='yes';
      if(key==='designated') designated=value==='yes';
      render();return;
    }
    if(target.hasAttribute('data-share-dismiss')) {dialog=null;render();return;}
    if(target.hasAttribute('data-share-continue')) {dialog=null;page='form';render();return;}
    if(target.hasAttribute('data-share-boundary')) {root.querySelector('.share-boundary-note').hidden=false;return;}
    if(!target.hasAttribute('data-share-next')) return;
    if(page==='home') page='type';
    else if(page==='type' && type) {if(type==='resident') dialog='resident';else page='operation';}
    else if(page==='operation' && operation) {if(operation==='monthly') dialog='monthly';else page='conditions';}
    else if(page==='conditions') dialog=shareConditionResult(external,designated)==='ready'?'photos':'unavailable';
    else if(page==='form' && shareFormComplete(form,photos)) page='review';
    else if(page==='review') {page='home';form={};photos=[null,null];}
    render();
  });
  root.addEventListener('submit',event=>event.preventDefault());
  root.addEventListener('input',event=>{
    if(event.target.name) form[event.target.name]=event.target.value;
    if(page==='form') root.querySelector('[data-share-next]').disabled=!shareFormComplete(form,photos);
  });
  root.addEventListener('change',event=>{
    if(event.target.hasAttribute('data-photo-slot')) {
      const slot=Number(event.target.dataset.photoSlot);photos[slot]=event.target.files[0]??null;
      root.querySelector(`[data-photo-name="${slot}"]`).textContent=photos[slot]?.name??'＋';
      root.querySelector('[data-share-next]').disabled=!shareFormComplete(form,photos);
    }
    if(event.target.hasAttribute('data-share-consent')) {consent=event.target.checked;root.querySelector('[data-share-boundary]').disabled=!consent;}
  });
  return {open(){page='home';type=null;operation=null;external=null;designated=null;dialog=null;consent=false;form={};photos=[null,null];render();root.hidden=false;}};
}
