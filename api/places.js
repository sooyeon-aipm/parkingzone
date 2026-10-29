// Vercel needs no new environment variables: the existing Supabase backend holds NAVER keys.
const config = require('../config/parking-public.json');
const ENDPOINT = 'https://ksuzhoeahgqbvrbchwpb.supabase.co/functions/v1/search-places';
function createHandler({fetchImpl = globalThis.fetch} = {}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const fail=(status,error)=>res.status(status).json({error});
    if(req.method!=='POST'){res.setHeader('Allow','POST');return fail(405,'METHOD_NOT_ALLOWED');}
    if(!(req.headers['content-type']??'').toLowerCase().startsWith('application/json'))return fail(415,'JSON_REQUIRED');
    if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return fail(403,'ORIGIN_REJECTED');}catch{return fail(403,'ORIGIN_REJECTED');}}
    let body=req.body;
    try {if(typeof body==='string'){if(body.length>2048)return fail(400,'INVALID_QUERY');body=JSON.parse(body);}}catch{return fail(400,'INVALID_QUERY');}
    const query=body?.query;
    if(typeof query!=='string'||query.trim().length<2||query.length>80||/[\u0000-\u001f]/.test(query))return fail(400,'INVALID_QUERY');
    try {
      const upstream=await fetchImpl(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.anon_key}`,apikey:config.anon_key},body:JSON.stringify({query:query.trim()}),signal:AbortSignal.timeout(10_000),redirect:'error'});
      const data=await upstream.json();
      if(!upstream.ok)return fail([429,503].includes(upstream.status)?upstream.status:502,['PLACE_SEARCH_LIMITED','PLACE_SEARCH_NOT_CONFIGURED'].includes(data.error)?data.error:'PLACE_SEARCH_FAILED');
      if(data.source!=='naver'||!Array.isArray(data.places)||data.places.length>5)return fail(502,'PLACE_SEARCH_FAILED');
      return res.status(200).json({places:data.places,source:'naver'});
    }catch{return fail(502,'PLACE_SEARCH_FAILED');}
  };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
