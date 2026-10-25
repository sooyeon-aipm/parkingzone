// Public page data only. No login, purchase, arbitrary URL, or client write access.
export type Source = {parking_id:string;provider_id:number;expected_name:string;expected_address:string};
export type Pass = {id:string;provider_product_id:number;name:string;price_won:number;hours_label:string;sale_status:string;sale_starts_at:string|null;stock:number|null;category:string;duration_minutes:number|null;source_url:string;query_date:string};
export const koreaDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const normalized=(s:string)=>s.replace(/서울특별시|서울시|서울 |성동구/g,'').replace(/\s/g,'').trim();
export function parsePage(html:string,source:Source,date:string):Pass[]{
 if(html.length>2_000_000)throw Error('SOURCE_TOO_LARGE');
 const chunks:string[]=[];
 for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){
  const m=script[1].match(/^self\.__next_f\.push\(([\s\S]*)\)$/);if(!m)continue;
  try{const a=JSON.parse(m[1]);if(a[0]===1&&typeof a[1]==='string')chunks.push(a[1]);}catch{throw Error('FLIGHT_PARSE_ERROR');}
 }
 const payloads:Record<string,any>[]=[];
 const walk=(v:any,depth=0)=>{if(depth>60)return;if(Array.isArray(v)){for(const x of v)walk(x,depth+1);}else if(v&&typeof v==='object'){if(String(v.id)===String(source.provider_id)&&v.pin&&Array.isArray(v.tickets))payloads.push(v);for(const x of Object.values(v))walk(x,depth+1);}};
 for(const line of chunks.join('').split('\n')){const i=line.indexOf(':');if(i<0)continue;const value=line.slice(i+1);if(!['[','{'].includes(value[0]))continue;try{walk(JSON.parse(value));}catch{/* unrelated streamed fragments */}}
 if(payloads.length!==1)throw Error('FACILITY_PAYLOAD_MISSING_OR_DUPLICATE');
 const p=payloads[0],basic=p.pin.basic;
 if(Number(p.pin.seq)!==source.provider_id||normalized(String(basic?.name))!==normalized(source.expected_name)||normalized(String(basic?.address))!==normalized(source.expected_address)||basic.partnerStatus!==true)throw Error('FACILITY_IDENTITY_MISMATCH');
 if(p.tickets.length>100)throw Error('TOO_MANY_PRODUCTS');
 const ids=new Set<number>();
 return p.tickets.map((t:any)=>{
  if(!Number.isSafeInteger(t.couponSeq)||t.couponSeq<1||ids.has(t.couponSeq)||typeof t.couponName!=='string'||!t.couponName.trim()||!Number.isSafeInteger(t.price)||t.price<0||typeof t.usagePeriodLabel!=='string')throw Error('INVALID_PRODUCT');
  ids.add(t.couponSeq);
  const status=String(t.purchaseAvailability?.status);
  if(!['AVAILABLE','CLOSED','SOLD_OUT','BEFORE_OPEN','NOT_YET_OPEN','UPCOMING','EXPIRED','UNAVAILABLE','OPEN_PENDING'].includes(status))throw Error('UNKNOWN_SALE_STATUS');
  const rawOpen=t.purchaseAvailability?.purchaseOpenDateTime;
  // Provider UI uses Asia/Seoul; its timezone-less local values are explicitly converted.
  const open=typeof rawOpen==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(rawOpen)?rawOpen+'+09:00':rawOpen;
  // Never use the execution host timezone for source-local values.
  if(open!==null&&open!==undefined&&(!/T.*(?:Z|[+-]\d\d:\d\d)$/.test(String(open))||!Number.isFinite(Date.parse(open))))throw Error('INVALID_SALE_TIME');
  const duration=t.couponName.match(/(\d+)시간권/);
  const period=String(t.usingTimeLabel??'').match(/(\d{2}):(\d{2})\s*~\s*(익일)?\s*(\d{2}):(\d{2})/);
  const periodMinutes=period?(Number(period[4])*60+Number(period[5])+(period[3]?1440:0))-(Number(period[1])*60+Number(period[2])):null;
  let category=String(t.couponTypeName??'');if(/당일권/.test(t.couponName))category='당일권';else if(/심야|야간/.test(t.couponName))category='야간권';else if(duration)category='시간권';
  return {id:`modu-${t.couponSeq}`,provider_product_id:t.couponSeq,name:t.couponName.trim(),price_won:t.price,hours_label:t.usagePeriodLabel,sale_status:t.isSoldOut===true?'SOLD_OUT':status,sale_starts_at:open??null,stock:Number.isSafeInteger(t.stock)&&t.stock>=0?t.stock:null,category,duration_minutes:duration?Number(duration[1])*60:category==='당일권'?1440:periodMinutes!==null&&periodMinutes>0?periodMinutes:null,source_url:`https://app.modu.kr/t/${t.couponSeq}?parkingDate=${date}&durationId=PT1H`,query_date:date};
 });
}
export async function collectOne(source:Source,date:string,fetcher:typeof fetch=fetch){
 const startDate=koreaDate();
 if(date!==startDate)throw Error('ONLY_TODAY_COLLECTION');
 const url=`https://app.modu.kr/p/${source.provider_id}?parkingDate=${date}&durationId=PT1H`;
 const res=await fetcher(url,{headers:{Accept:'text/html','Cache-Control':'no-cache'},signal:AbortSignal.timeout(20_000),redirect:'error'});
 if(!res.ok){await res.body?.cancel();throw Error(res.status===429?'SOURCE_RATE_LIMITED':`SOURCE_HTTP_${res.status}`);}
 if(!res.headers.get('content-type')?.includes('text/html')){await res.body?.cancel();throw Error('SOURCE_NOT_HTML');}
 const reader=res.body?.getReader();if(!reader)throw Error('EMPTY_BODY');
 let size=0;const parts:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000)throw Error('SOURCE_TOO_LARGE');parts.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 const products=parsePage(new TextDecoder().decode(bytes),source,date);
 if(koreaDate()!==date)throw Error('DAY_ROLLOVER');
 return {parking_id:source.parking_id,status:'SUCCESS',products,collected_at:new Date().toISOString(),source_url:url};
}
const keys=()=>{let modern:Record<string,string>={};try{modern=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}');}catch{/* validated below */}return [modern.default,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')].filter(Boolean) as string[];};
async function rpc(name:string,args:unknown){const key=keys()[0],base=Deno.env.get('SUPABASE_URL');if(!key||!base)throw Error('SERVER_CONFIG_MISSING');const res=await fetch(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})},body:JSON.stringify(args),signal:AbortSignal.timeout(15_000)});if(!res.ok){await res.body?.cancel();throw Error(`DB_RPC_${name}_${res.status}`);}return res.json();}
export async function handler(req:Request){
 const headers={'Cache-Control':'no-store'};
 if(!keys().some(k=>req.headers.get('apikey')===k||req.headers.get('Authorization')===`Bearer ${k}`))return Response.json({error:'UNAUTHORIZED'},{status:401,headers});
 if(req.method!=='POST')return Response.json({error:'METHOD_NOT_ALLOWED'},{status:405,headers});
 if(new URL(req.url).search||!['','{}'].includes((await req.text()).trim()))return Response.json({error:'PARAMETERS_NOT_ALLOWED'},{status:400,headers});
 try{
  const begun=await rpc('parking_pass_begin',{});if(begun.busy)return Response.json({skipped:'ACTIVE_COLLECTION'},{status:409,headers});
  const date=begun.query_date as string,sources=begun.sources as Source[],results:any[]=[];let next=0,rateLimited=false;
  await Promise.all(Array.from({length:Math.min(2,sources.length)},async()=>{while(next<sources.length){const source=sources[next++];try{if(rateLimited)throw Error('BACKOFF_RATE_LIMITED');results.push(await collectOne(source,date));}catch(e){const code=e instanceof Error&&/^[A-Z][A-Z_0-9]+$/.test(e.message)?e.message:'SOURCE_FETCH_ERROR';if(code==='SOURCE_RATE_LIMITED')rateLimited=true;results.push({parking_id:source.parking_id,status:'ERROR',error_code:code});}}}));
  const finished=await rpc('parking_pass_finish',{p_run_id:begun.run_id,p_query_date:date,p_results:results});return Response.json({...finished,query_date:date},{headers});
 }catch(e){return Response.json({error:e instanceof Error&&/^DB_RPC_|^SERVER_CONFIG_MISSING$/.test(e.message)?e.message:'PASS_COLLECTION_FAILED'},{status:500,headers});}
}
if(Deno.env.get('PARKING_TEST_MODE')!=='1')Deno.serve(handler);
