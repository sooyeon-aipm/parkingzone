import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {connectCatalog} from './catalog.js';
const catalog=JSON.parse(await readFile(new URL('./data/facilities.json',import.meta.url)));
const snapshot={data_origin:'LIVE',as_of:'2026-10-23T00:00:00Z',lots:[]};
test('15곳 원문을 유지하고 미연결 현황·좌표·상품을 생성하지 않는다',()=>{
  const result=connectCatalog(snapshot,{...catalog,lots:catalog.lots.map(l=>({...l,products:[]}))});
  assert.equal(result.lots.length,15);
  assert.ok(result.lots.every(l=>l.observation===null&&l.location===null&&l.products.length===0));
});
test('실제 관측값만 동일 UUID에 연결하고 잘못된 연결을 거절한다',()=>{
  const lot={id:catalog.lots[0].id,observation:{parking_id:catalog.lots[0].id,available_spaces:2}};
  assert.equal(connectCatalog({...snapshot,lots:[lot]},catalog).lots[0].observation.available_spaces,2);
  assert.throws(()=>connectCatalog({...snapshot,lots:[lot,lot]},catalog));
  assert.throws(()=>connectCatalog({...snapshot,lots:[{...lot,observation:{parking_id:'wrong'}}]},catalog));
});
test('출처·확인일이 없는 상품은 화면 연결에서 제외한다',()=>{
  const copy=structuredClone(catalog);
  copy.lots[0].products=[{name:'미확인 상품',price_won:1000}];
  assert.equal(connectCatalog(snapshot,copy).lots[0].products.length,0);
});
