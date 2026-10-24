import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFavorites,saveFavorites} from './favorites.js';
test('삭제되거나 알 수 없는 시설을 즐겨찾기로 되살리지 않는다',()=>{
  const storage={getItem:()=>JSON.stringify(['a','a','old',null,3])};
  assert.deepEqual(readFavorites(storage,new Set(['a'])),['a']);
});
test('손상된 저장소는 빈 목록으로 읽고 저장 실패는 숨기지 않는다',()=>{
  assert.deepEqual(readFavorites({getItem:()=>'{broken'},new Set()),[]);
  assert.throws(()=>saveFavorites({setItem:()=>{throw Error('quota');}},['a']));
});
