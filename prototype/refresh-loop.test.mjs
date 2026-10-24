import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startRefreshLoop} from './refresh-loop.js';
const settle=async()=>{for(let i=0;i<8;i++) await Promise.resolve();};
test('응답 완료 후 다음 타이머를 만들고 숨긴 탭에서는 멈춘다',async()=>{
  let listener, complete, calls=0, timer=null, sequence=0;
  const visibility={hidden:false,addEventListener:(_,fn)=>{listener=fn;},removeEventListener:()=>{listener=null;}};
  const stop=startRefreshLoop({visibility,refresh:()=>{calls++;return new Promise(resolve=>{complete=resolve;});},setTimer:fn=>{timer=fn;return ++sequence;},clearTimer:()=>{timer=null;}});
  await settle();assert.equal(calls,1);assert.equal(timer,null);
  visibility.hidden=true;listener();complete();await settle();assert.equal(timer,null);
  visibility.hidden=false;listener();await settle();assert.equal(calls,2);
  complete();await settle();assert.equal(typeof timer,'function');
  stop();assert.equal(timer,null);assert.equal(listener,null);
});
test('실패 후 재시도를 예약하고 종료 후 응답해도 재시작하지 않는다',async()=>{
  let callback, complete;
  const visibility={hidden:false,addEventListener(){},removeEventListener(){}};
  const stop=startRefreshLoop({visibility,refresh:async()=>{throw Error('offline');},setTimer:fn=>{callback=fn;return 1;},clearTimer:()=>{callback=null;}});
  await settle();assert.equal(typeof callback,'function');stop();assert.equal(callback,null);
  const stopPending=startRefreshLoop({visibility,refresh:()=>new Promise(resolve=>{complete=resolve;}),setTimer:fn=>{callback=fn;return 2;},clearTimer:()=>{callback=null;}});
  await settle();stopPending();complete();await settle();assert.equal(callback,null);
});
