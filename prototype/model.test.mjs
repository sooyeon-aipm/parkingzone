import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildView} from './model.js';
test('최초 조회 실패는 존재하지 않는 마지막 기록을 안내하지 않는다',()=>{
  const view=buildView({id:'a',latest_collection:null,observation:null},'2026-10-24T07:00:00Z',{readError:true});
  assert.equal(view.display.mode,'NO_DATA');
  assert.equal(view.latest_record,null);
  assert.equal(view.display.warning,'현황을 불러오지 못했습니다. 다시 시도해 주세요.');
});
test('읽기 오류는 원천 수집 결과를 덮어쓰지 않고 실제 마지막 기록만 남긴다',()=>{
  const lot={id:'a',latest_collection:{result_status:'SUCCESS'},observation:{total_spaces:10,available_spaces:4,collected_at:'2026-10-24T06:59:00Z',source_updated_at:'2026-10-24T06:58:00Z'}};
  const view=buildView(lot,'2026-10-24T07:00:00Z',{readError:true});
  assert.equal(view.display.mode,'LAST_RECORD');assert.equal(view.display.congestion_label,null);
  assert.equal(view.latest_record.available_spaces,4);assert.equal(view.latest_collection.result,'SUCCESS');
  assert.equal(lot.latest_collection.result_status,'SUCCESS');
});
