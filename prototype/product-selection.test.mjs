import test from 'node:test';
import assert from 'node:assert/strict';
import {initialProductId, selectedProductById} from './product-selection.js';

test('지도 상세에서 처음 선택한 상품은 재정렬 후에도 유지한다', () => {
  const first={id:'one',price_won:3000}, second={id:'two',price_won:5000};
  const id=initialProductId([first,second]);
  assert.equal(selectedProductById([second,first],id),first);
});
test('조건에서 제외된 상품을 다른 상품으로 바꾸지 않는다', () => {
  assert.equal(selectedProductById([{id:'two'}],'one'),undefined);
  assert.equal(initialProductId([{id:'two'}],'one'),'one');
  assert.equal(initialProductId([]),null);
  assert.equal(selectedProductById([{id:'two'}],null),undefined);
});
