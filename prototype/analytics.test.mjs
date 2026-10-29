import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalytics,participantContext,cleanPage} from './analytics.js';
import {controls,impressions} from './analytics-catalog.js';
import {readFileSync} from 'node:fs';
import {createRefreshPolicy} from './refresh-policy.js';

const config={measurementId:'G-TEST12345',appVersion:'test-build',studyRound:'round_1',productionHosts:['parkingzone.vercel.app']};
const base='https://parkingzone.vercel.app/';
function client(query='?ut=P01',extra={}) {
  const calls=[];
  const api=createAnalytics({config,href:base+query,sink:(name,payload)=>calls.push({name,payload}),...extra});
  return {api,calls};
}

test('6명의 개별 링크·새로고침은 같은 회차와 테스트 코드를 유지한다',()=>{
  for(const code of ['P01','P02','P03','P04','P05','P06']) {
    const first=participantContext(base+'?ut='+code,config);
    assert.equal(first.ut_slot,code);assert.equal(first.traffic_type,'ut');
    assert.deepEqual(first,participantContext(base+'?ut='+code,config));
    const {api,calls}=client('?ut='+code);
    api.track('ui_click');
    assert(calls.every(({payload})=>payload.ut_slot===code&&payload.traffic_type==='ut'));
    const qa=participantContext(base+'?ut='+code+'&qa=technical_test',config);
    assert.equal(qa.ut_slot,'unassigned');assert.equal(qa.traffic_type,'technical_test');
  }
});
test('링크 없는 재방문·잘못된 코드·중복 코드로 이전 참여자를 이어받지 않는다',()=>{
  for(const query of ['', '?ut=P07','?ut=p01','?ut=someone@example.com','?ut=P01&ut=P02']) {
    const context=participantContext(base+query,config);
    assert.equal(context.ut_slot,'unassigned');assert.equal(context.traffic_type,'general');
  }
});
test('팀 점검·리허설은 참여자 코드보다 우선하며 개발·시험 주소는 실제 UT가 아니다',()=>{
  const qa=participantContext(base+'?ut=P01&qa=technical_test',config);
  assert.equal(qa.ut_slot,'unassigned');assert.equal(qa.traffic_type,'technical_test');
  assert.equal(participantContext(base+'?qa=rehearsal',config).traffic_type,'rehearsal');
  for(const host of ['http://localhost:8765/','https://test-deployment.vercel.app/']) {
    assert.equal(participantContext(host+'?ut=P01',config).traffic_type,'technical_test');
  }
});
test('이름·검색어가 담긴 URL·referrer는 분석 페이로드에서 제거한다',()=>{
  assert.deepEqual(cleanPage(base+'?ut=P01&search=secret#personal','https://example.com/private?email=secret'),{
    page_location:base,page_referrer:'https://example.com',page_title:'모두의주차장',
  });
  const {calls}=client('?ut=P01&name=PRIVATE_VALUE');
  assert.equal(calls.length,1);assert.equal(calls[0].name,'page_view');
  assert(!JSON.stringify(calls).includes('PRIVATE_VALUE'));
});
test('모든 명시적 이벤트가 참여자·회차·버전을 가지며 호출자가 덮어쓰지 못한다',()=>{
  const {api,calls}=client();
  api.setComponentIds(['search_submit']);
  api.track('search_result',{component_id:'search_submit',result:'empty',ut_slot:'P05',traffic_type:'general',study_round:'wrong',app_version:'wrong'});
  for(const {payload} of calls) {
    assert.equal(payload.ut_slot,'P01');assert.equal(payload.study_round,'round_1');
    assert.equal(payload.traffic_type,'ut');assert.equal(payload.app_version,'test-build');
    assert(!Object.hasOwn(payload,'user_id'));
  }
});
test('허용 속성만 수집하고 자유 입력·주소·사진·오류 원문·임의 ID를 버린다',()=>{
  const {api,calls}=client();api.setComponentIds(['search_submit']);api.setParkingIds(['public-lot']);
  api.track('search_result',{component_id:'search_submit',parking_id:'public-lot',result:'empty',result_count:0,
    search:'PRIVATE_VALUE',address:'PRIVATE_VALUE',lat:37.5,file_name:'PRIVATE_VALUE',error:'PRIVATE_VALUE',
    action:'PRIVATE_VALUE',field_id:'PRIVATE_VALUE',input_present:true});
  const result=calls.at(-1).payload;
  assert.equal(result.parking_id,'public-lot');assert.equal(result.result_count,0);assert.equal(result.input_present,true);
  assert(!JSON.stringify(calls).includes('PRIVATE_VALUE'));
  api.track('facility_opened',{parking_id:'private-address'});
  assert(!Object.hasOwn(calls.at(-1).payload,'parking_id'));
  assert.equal(api.track('arbitrary_event',{}),false);
});
test('디버그는 기술 점검에만 붙으며 명시적 이벤트는 GA4 매개변수 제한을 지킨다',()=>{
  for(const query of ['?ut=P01&debug=1','?qa=rehearsal&debug=1'])assert(!client(query).calls[0].payload.debug_mode);
  const {api,calls}=client('?qa=technical_test&debug=1');
  assert.equal(calls[0].payload.debug_mode,true);
  api.track('ui_click',{screen_id:'share',result:'success',reason:'unavailable',service:'parking',origin:'manual',display_mode:'CURRENT',freshness:'FRESH',congestion:'확인 필요',product_type:'day',duration_bucket:'h1',date_bucket:'today',field_id:'name',share_step:'form',address_step:'detail',dialog_type:'photos',progress:100,result_count:10,enabled:true,input_present:true});
  assert(Object.keys(calls.at(-1).payload).length<=25);
});
test('측정 ID가 없으면 태그·전송·새 저장소를 만들지 않는다',()=>{
  let created=0;
  const api=createAnalytics({config:{...config,measurementId:''},href:base+'?ut=P02',win:{},doc:{createElement(){created++;},referrer:''}});
  assert.equal(api.status,'not_configured');assert.equal(api.track('ui_click'),false);assert.equal(created,0);
});
test('태그 로더는 자동 페이지뷰를 끄고 허용 컨텍스트와 정제 주소를 먼저 설정한다',()=>{
  const win={};let script;
  const api=createAnalytics({config,win,href:base+'?ut=P03&email=PRIVATE_VALUE',doc:{referrer:'',createElement:()=>({}),head:{append(value){script=value;}}}});
  assert.equal(api.status,'loading');
  const setup=Array.from(win.dataLayer[1]);
  assert.equal(setup[0],'config');assert.equal(setup[2].send_page_view,false);
  assert.equal(setup[2].ut_slot,'P03');assert.equal(setup[2].page_location,base);
  script.onload();assert.equal(api.status,'ready');
  const events=win.dataLayer.map(v=>Array.from(v)).filter(v=>v[0]==='event');
  assert.equal(events.filter(v=>v[1]==='page_view').length,1);
  assert(!JSON.stringify(win.dataLayer).includes('PRIVATE_VALUE'));
});
test('태그 차단·로더 예외·전송 실패는 앱 호출에 예외를 던지지 않는다',()=>{
  const api=createAnalytics({config,win:{},href:base,doc:{referrer:'',createElement:()=>({}),head:{append(script){script.onerror();}}}});
  assert.equal(api.status,'unavailable');assert.equal(api.track('ui_click'),false);
  const broken=createAnalytics({config,win:{},href:base,doc:{referrer:'',createElement(){throw Error('blocked');}}});
  assert.equal(broken.status,'unavailable');
  assert.equal(client('',{sink:()=>{throw Error('blocked');}}).api.track('ui_click'),false);
});
test('런타임 이벤트 선택자가 준비 카탈로그와 일치한다',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../docs/ut/EVENT_CATALOG.json',import.meta.url)));
  const simplify=items=>items.map(item=>({component_id:item.component_id,selectors:item.selectors}));
  assert.deepEqual(simplify(controls),simplify(catalog.controls));assert.deepEqual(impressions,simplify(catalog.impressions));
});
test('겹친 조회는 처음 요청의 출처로 완료 이벤트를 한 번만 기록한다',async()=>{
  const {api,calls}=client();
  let complete;
  const policy=createRefreshPolicy({load:async({origin})=>{await new Promise(resolve=>{complete=resolve;});api.track('parking_refresh_result',{origin,result:'success'});}});
  const first=policy.refresh({force:true,origin:'manual'});
  const duplicate=policy.refresh({origin:'resume'});
  assert.equal(first,duplicate);
  await Promise.resolve();complete();await first;
  const results=calls.filter(e=>e.name==='parking_refresh_result');
  assert.equal(results.length,1);assert.equal(results[0].payload.origin,'manual');
});
