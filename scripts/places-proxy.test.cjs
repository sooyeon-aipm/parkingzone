const test=require('node:test');
const assert=require('node:assert/strict');
const {createHandler}=require('../api/places.js');
const req={method:'POST',headers:{'content-type':'application/json',host:'parkingzone.vercel.app',origin:'https://parkingzone.vercel.app'},body:{query:'테스트'}};
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.code=v;return this;},json(v){this.body=v;return this;}});
test('Vercel은 네이버 키 없이 고정된 기존 Supabase 프로젝트로만 검색을 전달한다',async()=>{
  const handler=createHandler({fetchImpl:async(url,options)=>{
    assert.equal(url,'https://ksuzhoeahgqbvrbchwpb.supabase.co/functions/v1/search-places');
    assert.equal(options.method,'POST');assert(!JSON.stringify(options.headers).includes('NAVER'));
    assert.deepEqual(JSON.parse(options.body),{query:'테스트'});
    return {ok:true,json:async()=>({places:[],source:'naver'})};
  }});
  const res=response();await handler(req,res);assert.equal(res.code,200);assert.deepEqual(res.body,{places:[],source:'naver'});
});
test('오류 원문을 반환하지 않고 입력·호출 방법·출처를 제한한다',async()=>{
  let calls=0;const handler=createHandler({fetchImpl:async()=>{calls++;throw Error('SECRET');}});
  for(const [request,status] of [[{...req,method:'GET'},405],[{...req,body:{query:'a'}},400],[{...req,headers:{...req.headers,origin:'https://other.example'}},403],[req,502]]){
    const res=response();await handler(request,res);assert.equal(res.code,status);assert(!JSON.stringify(res.body).includes('SECRET'));
  }assert.equal(calls,1);
});
