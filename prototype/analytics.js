import {analyticsConfig} from './analytics-config.js';

const slots = new Set(['P01','P02','P03','P04','P05']);
const traffic = new Set(['technical_test','rehearsal']);
const events = new Set(['page_view','app_ready','app_error','map_load_result','map_interaction','ui_click','ui_change','ui_field_commit','ui_submit','ui_validation','ui_view','ui_impression','ui_scroll','search_result','filters_applied','date_applied','date_rejected','facility_opened','sheet_changed','parking_refresh_result','favorite_result','clipboard_result','edit_previewed','pass_request_previewed','prototype_selection_saved','prototype_selection_failed','prototype_restarted','address_search_result','location_result','address_confirmed','share_preview_completed','share_boundary_shown']);
const enums = {
  screen_id: 'map list detail search date filters filter_options favorites tickets ticket_history ai facility_action share address completion',
  result: 'success error matched empty cleared selected confirmed preview_only checked unchecked ready cancelled',
  reason: 'catalog_load_failed init_failed sdk_failed lookup_failed read_failed timeout denied unsupported invalid cancelled missing_product sale_not_open storage_failed past_date required empty_query unavailable no_products no_records loading unconfirmed stale source_time_missing invalid_time clipboard_failed',
  service: 'parking monthly carwash',
  origin: 'map list favorites initial manual auto resume click gesture wheel search detail',
  display_mode: 'CURRENT LAST_RECORD NO_DATA',
  freshness: 'FRESH STALE NO_RECORD SOURCE_TIME_MISSING INVALID_TIME',
  congestion: '여유 보통 혼잡 매우혼잡 만차 확인 필요',
  product_type: 'day hourly night overnight monthly carwash unknown',
  duration_bucket: 'h1 h2 h3 h5 h8 h12 day multi_day',
  date_bucket: 'today future',
  field_id: 'name spaces fee description message search address_search address_detail',
  share_step: 'home type operation conditions form review',
  address_step: 'search detail',
  dialog_type: 'none unavailable photos monthly resident share edit directions',
};
const enumSets = Object.fromEntries(Object.entries(enums).map(([k,v])=>[k,new Set(v.split(' '))]));
enumSets.congestion=new Set(['여유','보통','혼잡','매우혼잡','만차','확인 필요']);
// Only fixed UI actions are permitted. Never accept visible labels or arbitrary input.
const actions = new Set(('on off in out previous next open close expand collapse pan zoom distance price add remove share edit favorite directions parking monthly carwash map list favorites tickets mpass search ai filters date filter_options completion recommended day hourly night overnight type_resident type_private operation_hourly operation_monthly external_yes external_no designated_yes designated_no overview_selected proof_selected overview_cleared proof_cleared charger_type operator monthlyOnly partner public card nonMechanical free cafe restaurant mart ev reset submit select back confirm next_step').split(' '));

export function participantContext(href, config=analyticsConfig) {
  const url = new URL(href);
  const single = key => url.searchParams.getAll(key).length===1 ? url.searchParams.get(key) : null;
  const production = config.productionHosts.includes(url.hostname);
  const environment = ['localhost','127.0.0.1','[::1]'].includes(url.hostname) ? 'local' : production ? 'production' : 'preview';
  const qa = single('qa');
  // QA overrides a participant code; invalid/duplicate values never become participant IDs.
  const utSlot = !url.searchParams.has('qa') && slots.has(single('ut')) ? single('ut') : 'unassigned';
  const trafficType = traffic.has(qa) ? qa : url.searchParams.has('qa') || environment!=='production' ? 'technical_test' : utSlot!=='unassigned' ? 'ut' : 'general';
  return Object.freeze({schema_version:'pz_ut_v1',app_version:config.appVersion,study_round:config.studyRound,environment,traffic_type:trafficType,ut_slot:utSlot,data_mode:'live'});
}

export function cleanPage(href, referrer='') {
  const url=new URL(href);
  let origin='';
  try {origin=new URL(referrer).origin;} catch {}
  return {page_location:url.origin+url.pathname,page_referrer:origin,page_title:'모두의주차장'};
}

export function createAnalytics({config=analyticsConfig,win=globalThis.window,doc=globalThis.document,href=win?.location?.href??'http://localhost/',sink}={}) {
  const context=participantContext(href,config);
  const page=cleanPage(href,doc?.referrer);
  const validId=/^G-[A-Z0-9]{4,20}$/.test(config.measurementId);
  let status=sink?'ready':validId&&win&&doc?'loading':'not_configured';
  let pending=[],provider=()=>({}),componentIds=new Set(['app','page','parking_refresh','map','share_flow','address_flow']),parkingIds=new Set();
  let emit=sink,loaderTimer;
  const debug=context.traffic_type==='technical_test' && new URL(href).searchParams.get('debug')==='1';
  function build(name,properties={}) {
    if(!events.has(name)) return null;
    const payload={...context,screen_id:'map',component_id:'app'};
    const values={...provider(),...properties};
    for(const [key,value] of Object.entries(values)) {
      if(Object.keys(payload).length>=20&&!Object.hasOwn(payload,key))continue;
      if(enumSets[key]?.has(value)) payload[key]=value;
      else if(key==='action'&&actions.has(value)) payload[key]=value;
      else if(key==='component_id'&&componentIds.has(value)) payload[key]=value;
      else if(key==='parking_id'&&parkingIds.has(value)) payload[key]=value;
      else if(['enabled','input_present'].includes(key)&&typeof value==='boolean') payload[key]=value;
      else if(key==='result_count'&&Number.isInteger(value)&&value>=0&&value<=100) payload[key]=value;
      else if(key==='progress'&&[25,50,75,100].includes(value)) payload[key]=value;
    }
    if(debug) payload.debug_mode=true;
    return {...payload,...page,send_to:config.measurementId};
  }
  function track(name,properties) {
    try {
      if(['not_configured','unavailable'].includes(status)) return false;
      const payload=build(name,properties);
      if(!payload) return false;
      if(status==='loading') {if(pending.length<100) pending.push([name,payload]);return true;}
      emit(name,payload);
      return true;
    } catch {return false;}
  }
  if(status==='loading') {
    try {
      win.dataLayer=win.dataLayer||[];
      const gtag=function(){win.dataLayer.push(arguments);};
      win.gtag=gtag;
      gtag('js',new Date());
      gtag('config',config.measurementId,{...context,...page,send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,...(debug?{debug_mode:true}:{})});
      emit=(name,payload)=>gtag('event',name,payload);
      const script=doc.createElement('script');
      script.async=true;script.referrerPolicy='origin';
      script.src=`https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`;
      loaderTimer=setTimeout(fail,8000);
      function fail(){if(status==='loading'){status='unavailable';pending=[];}}
      script.onerror=()=>{clearTimeout(loaderTimer);fail();};
      script.onload=()=>{
        clearTimeout(loaderTimer);
        if(status!=='loading')return;
        status='ready';const queued=pending;pending=[];
        for(const [name,payload] of queued){try{emit(name,payload);}catch{}}
      };
      doc.head.append(script);
    } catch {clearTimeout(loaderTimer);status='unavailable';pending=[];}
  }
  const api={
    track,context,
    get status(){return status;},
    setContextProvider(fn){provider=fn;},
    setComponentIds(ids){componentIds=new Set([...componentIds,...ids]);},
    setParkingIds(ids){parkingIds=new Set(ids);},
  };
  track('page_view',{component_id:'page'});
  return api;
}

export const analytics=createAnalytics();
export const trackEvent=(name,properties)=>analytics.track(name,properties);
export const productType=product=>({'당일권':'day','시간권':'hourly','야간권':'night','연박권':'overnight','월주차':'monthly','세차':'carwash'}[product?.category]??'unknown');
export const durationBucket=value=>({'1시간':'h1','2시간':'h2','3시간':'h3','5시간':'h5','8시간':'h8','12시간':'h12','종일':'day','2일 이상':'multi_day'}[value]);
