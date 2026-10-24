import test from 'node:test';
import assert from 'node:assert/strict';
import {attachBottomSheet} from './bottom-sheet.js';
function fixture(scrollTop=0) {
 const content=new EventTarget(),handle=new EventTarget(),changes=[];
 content.scrollTop=scrollTop;
 const sheet={parentElement:{clientHeight:800},querySelector:s=>s==='.sheet-handle'?handle:content,classList:{contains:()=>true,add(){},remove(){}},style:{removeProperty(){}}};
 attachBottomSheet(sheet,{onExpand:value=>changes.push(value),onClose:()=>changes.push('close')});
 const touch=(type,y)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{touches:type==='touchend'?[]:[{clientY:y}],changedTouches:[{clientY:y}]});content.dispatchEvent(event);};
 return {touch,changes};
}
test('중간 이동 이벤트가 빠진 빠른 본문 터치도 종료 위치로 시트를 접는다',()=>{
 const {touch,changes}=fixture();touch('touchstart',100);touch('touchend',180);assert.deepEqual(changes,[false]);
});
test('스크롤 중 시작한 터치와 제자리 탭은 시트 높이를 바꾸지 않는다',()=>{
 const scrolling=fixture(100);scrolling.touch('touchstart',100);scrolling.touch('touchend',180);assert.deepEqual(scrolling.changes,[]);
 const tap=fixture();tap.touch('touchstart',100);tap.touch('touchend',103);assert.deepEqual(tap.changes,[]);
});
