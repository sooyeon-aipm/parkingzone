import test from 'node:test';
import assert from 'node:assert/strict';
import {shareFormComplete,shareConditionResult} from './share-flow.js';
test('필수 입력과 두 사진이 갖춰지기 전에 등록 검토를 허용하지 않는다',()=>{
  const form={name:'확인용',address:'성수동',spaces:'1',fee:'1000'};
  assert.equal(shareFormComplete(form,[{},null]),false);
  assert.equal(shareFormComplete({...form,address:' '},[{},{}]),false);
  assert.equal(shareFormComplete({...form,spaces:'0'},[{},{}]),false);
  assert.equal(shareFormComplete({...form,fee:'잘못된 값'},[{},{}]),false);
  assert.equal(shareFormComplete(form,[{},{}]),true);
});
test('공유 조건을 모두 만족해야 입력 단계로 진행한다',()=>{
  assert.equal(shareConditionResult(null,true),'incomplete');
  assert.equal(shareConditionResult(false,true),'unavailable');
  assert.equal(shareConditionResult(true,false),'unavailable');
  assert.equal(shareConditionResult(true,true),'ready');
});
