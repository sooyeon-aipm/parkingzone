import {analytics,durationBucket} from './analytics.js';
import {controls,impressions} from './analytics-catalog.js';

const screenSelectors = [
  ['completion','#completion'],['address','.address-screen'],['facility_action','#facility-action-screen'],
  ['filter_options','#filter-options-screen'],['filters','#filter-screen'],['date','#date-screen'],
  ['share','#share-screen'],['ai','#ai-screen'],['ticket_history','#ticket-history-screen'],
  ['tickets','#tickets-screen'],['favorites','#favorites-screen'],['search','#search-screen'],
  ['detail','#detail'],['list','#results'],
];
const idActions={'zoom-in':'in','zoom-out':'out','previous-month':'previous','next-month':'next','sort-distance':'distance','sort-price':'price','open-share':'share','open-favorites':'favorites','open-tickets':'tickets','monthly-mode':'monthly','carwash-mode':'carwash','facility-show-on-map':'map'};
const categories={'제안':'recommended','당일권':'day','시간권':'hourly','야간권':'night','연박권':'overnight'};

function shown(element) {
  return Boolean(element?.isConnected&&!element.closest('[hidden],[inert],[aria-hidden="true"]')&&(element.checkVisibility?element.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}):element.getClientRects().length>0));
}

export function activeScreen(doc=document) {
  for(const [screen_id,selector] of screenSelectors) {
    const root=doc.querySelector(selector);
    if(!root||root.hidden)continue;
    const dialog=screen_id==='share'?root.querySelector('.share-dialog'):null;
    return {screen_id,root:dialog??root,share_step:root.dataset.shareStep,address_step:root.dataset.addressStep,dialog_type:root.dataset.dialogType??'none'};
  }
  return {screen_id:'map',root:doc.querySelector('.phone'),dialog_type:'none'};
}

export function installUiAnalytics({client=analytics,doc=document,getContext=()=>({})}={}) {
  client.setComponentIds([...controls,...impressions].map(item=>item.component_id));
  const current=()=>{const {root,...view}=activeScreen(doc);return {...getContext(),...view};};
  client.setContextProvider(current);
  if(client.status==='not_configured')return ()=>{};
  const track=(name,props)=>client.track(name,{...current(),...props});
  function inActiveSurface(element) {
    const active=activeScreen(doc);
    return active.root?.contains(element)||['detail','list'].includes(active.screen_id)&&Boolean(element.closest('.map,#map-header'));
  }
  const dirty=new WeakSet(),dragStarts=new WeakMap(),dragged=new WeakSet();
  const listeners=[];
  const listen=(name,fn,options=true)=>{doc.addEventListener(name,fn,options);listeners.push(()=>doc.removeEventListener(name,fn,options));};
  function controlFor(element) {
    if(!element?.matches)return null;
    for(const entry of controls)for(const selector of entry.selectors)if(element.matches(selector))return entry;
    return null;
  }
  function propsFor(element,entry) {
    const row=element.closest('[data-parking-row]');
    const props={component_id:entry.component_id};
    const parking=element.dataset.parkingId??element.dataset.lot??element.dataset.favoriteLot??row?.dataset.parkingRow;
    if(parking)props.parking_id=parking;
    const action=idActions[element.id]??categories[element.dataset.category]??element.dataset.facilityAction??element.dataset.historyTab??element.dataset.searchFilter;
    if(action)props.action=action;
    if(element.dataset.shareChoice)props.action=element.dataset.shareChoice+'_'+element.dataset.value;
    if(element.hasAttribute('data-filter-selector'))props.action=element.dataset.filterSelector==='충전기 타입'?'charger_type':'operator';
    if(element.hasAttribute('data-duration'))props.duration_bucket=durationBucket(element.dataset.duration);
    if(element.hasAttribute('data-date'))props.date_bucket=element.dataset.date===new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date())?'today':'future';
    if(['shared_toggle','ticket_toggle'].includes(entry.component_id))props.action=element.getAttribute('aria-pressed')==='true'?'off':'on';
    if(entry.component_id==='service_toggle'&&element.getAttribute('aria-pressed')==='true')props.action='parking';
    if(entry.component_id==='screen_close')props.action=element.id==='confirm-filter-options'?'confirm':'close';
    if(entry.component_id==='share_back'||entry.component_id==='address_back')props.action='back';
    if(entry.component_id==='share_next')props.action='next_step';
    return props;
  }
  function commitField(element) {
    if(!dirty.has(element))return;
    dirty.delete(element);
    const entry=controlFor(element);
    if(entry)track('ui_field_commit',{...propsFor(element,entry),input_present:Boolean(element.value?.trim()),field_id:element.name||({'search_field':'search','address_search_field':'address_search','address_detail_field':'address_detail'}[entry.component_id])});
  }
  listen('pointerdown',event=>{
    const handle=event.target.closest?.('.sheet-handle');
    if(handle){dragStarts.set(handle,event.clientY);dragged.delete(handle);}
  });
  listen('pointerup',event=>{
    const handle=event.target.closest?.('.sheet-handle');
    if(handle&&Math.abs(event.clientY-dragStarts.get(handle))>=8)dragged.add(handle);
  });
  listen('click',event=>{
    if(doc.activeElement&&doc.activeElement!==event.target)commitField(doc.activeElement);
    const element=event.target.closest?.('button,input,textarea,summary');
    if(!element||element.disabled||!shown(element)||!inActiveSurface(element))return;
    if(element.matches('summary,input[type=checkbox],input[type=file]')||element.matches('textarea,input:not([readonly])'))return;
    if(element.matches('button[type=submit]')||element.matches('.sheet-handle')&&event.detail!==0&&dragged.has(element))return;
    const entry=controlFor(element);
    if(entry)track('ui_click',propsFor(element,entry));
  });
  listen('change',event=>{
    const element=event.target,entry=controlFor(element);
    if(!entry||element.disabled)return;
    const props=propsFor(element,entry);
    if(element.type==='checkbox')track('ui_change',{...props,result:element.checked?'checked':'unchecked'});
    else if(element.type==='file')track('ui_change',{...props,action:(element.dataset.photoSlot==='0'?'overview':'proof')+(element.files?.length?'_selected':'_cleared')});
  });
  listen('input',event=>{
    if(event.target.matches?.('input:not([type=checkbox]):not([type=file]):not([readonly]),textarea'))dirty.add(event.target);
  });
  listen('focusout',event=>commitField(event.target));
  listen('submit',event=>{
    if(doc.activeElement)commitField(doc.activeElement);
    const entry=controlFor(event.target);
    if(entry&&entry.component_id!=='share_form_validation')track('ui_submit',{component_id:entry.component_id});
  });
  listen('invalid',event=>{
    const entry=controlFor(event.target);
    if(entry)track('ui_validation',{component_id:entry.component_id,field_id:event.target.name,reason:'required'});
  });
  const detailStates=new Map();
  listen('toggle',event=>{
    if(!event.target.matches?.('details')||!shown(event.target))return;
    const summary=event.target.querySelector('summary'),entry=controlFor(summary);
    if(!entry)return;
    const key=entry.component_id+':'+(summary.closest('[data-product]')?.dataset.product??current().parking_id??'');
    const open=event.target.open;
    if((detailStates.get(key)??false)===open)return;
    detailStates.set(key,open);
    track('ui_change',{component_id:entry.component_id,action:open?'open':'close'});
  });

  let visit=0,signature='',frame=null,disposed=false;
  const seen=new Set(),observed=new Map(),scrollSeen=new Set();
  function eligible(element) {
    const active=activeScreen(doc);
    if(doc.hidden||!shown(element))return false;
    if(element.matches('#toast'))return !element.hidden;
    return active.root?.contains(element);
  }
  function cancel(meta){if(meta.timer!==null)clearTimeout(meta.timer);meta.timer=null;}
  function consider(element,meta) {
    if(meta.ratio<.5||seen.has(meta.key)||!eligible(element)){cancel(meta);return;}
    if(meta.timer!==null)return;
    meta.timer=setTimeout(()=>{
      meta.timer=null;
      if(meta.ratio>=.5&&eligible(element)&&!seen.has(meta.key)){
        seen.add(meta.key);track('ui_impression',meta.props);
      }
    },1000);
  }
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
    for(const entry of entries){const meta=observed.get(entry.target);if(meta){meta.ratio=entry.intersectionRatio;consider(entry.target,meta);}}
  },{threshold:[0,.5,1]}):null;
  function clearObserved(){for(const meta of observed.values())cancel(meta);observed.clear();observer?.disconnect();}
  function scan() {
    frame=null;if(disposed)return;
    const active=activeScreen(doc);
    const next=[active.screen_id,active.share_step,active.address_step,active.dialog_type,current().parking_id].join(':');
    if(next!==signature){signature=next;visit++;seen.clear();scrollSeen.clear();detailStates.clear();clearObserved();track('ui_view',{component_id:'page'});}
    for(const [element,meta] of observed){if(!eligible(element)){cancel(meta);observer?.unobserve(element);observed.delete(element);}}
    if(!observer||doc.hidden)return;
    for(const entry of impressions)for(const element of doc.querySelectorAll(entry.selectors.join(','))){
      if(!eligible(element))continue;
      if(['error_notice','toast'].includes(entry.component_id)&&!element.textContent.trim())continue;
      const row=element.closest('[data-parking-row]');
      const context=row?getContext(row.dataset.parkingRow):getContext();
      const props={...context,component_id:entry.component_id};
      if(entry.component_id==='disabled_control'){
        const control=controlFor(element);if(!control)continue;
        props.action=propsFor(element,control).action;props.enabled=false;props.reason='unavailable';
      }
      const instance=element.closest('[data-product]')?.dataset.product??element.closest('[data-lot]')?.dataset.product??'';
      const key=JSON.stringify([visit,entry.component_id,context.parking_id,instance,context.display_mode,context.freshness,context.congestion,element.disabled]);
      const old=observed.get(element);
      // One observer entry per element; selector overlaps must not double-send.
      if(old?.key===key){consider(element,old);continue;}
      if(old){cancel(old);observer.unobserve(element);}
      const meta={key,props,timer:null,ratio:0};observed.set(element,meta);observer.observe(element);
    }
  }
  function schedule(){if(frame===null&&!disposed)frame=requestAnimationFrame(scan);}
  const mutations=new MutationObserver(schedule);
  const root=doc.querySelector('.phone');
  if(root)mutations.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','class','open','disabled','aria-hidden','data-share-step','data-address-step','data-dialog-type']});
  listen('scroll',event=>{
    const element=event.target;
    if(!element.matches?.('.list-scroll,.detail-scroll,.share-scroll,.filter-scroll')||!eligible(element))return;
    const maximum=element.scrollHeight-element.clientHeight;if(maximum<=0)return;
    const progress=Math.min(100,Math.round(element.scrollTop/maximum*100));
    for(const threshold of [25,50,75,100])if(progress>=threshold){
      const key=visit+':'+threshold;
      if(!scrollSeen.has(key)){scrollSeen.add(key);track('ui_scroll',{component_id:'page',progress:threshold});}
    }
  });
  listen('visibilitychange',()=>{clearObserved();schedule();});
  scan();
  return ()=>{disposed=true;if(frame!==null)cancelAnimationFrame(frame);mutations.disconnect();clearObserved();listeners.forEach(remove=>remove());};
}
