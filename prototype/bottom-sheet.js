// 높이 비율은 화면 영역 기준. 드래그와 본문 스크롤의 책임을 분리한다.
export function attachBottomSheet(sheet, {onExpand,onClose,getCollapsedHeight,getExpandedHeight,onDrag=()=>{},expandOnContentSwipe=false}) {
  const handle = sheet.querySelector('.sheet-handle');
  const content = sheet.querySelector('.list-scroll, .detail-scroll');
  let start = null, moved = false;
  const begin = y => {
    start = {y,expanded:sheet.classList.contains('expanded'),height:sheet.getBoundingClientRect?.().height};
    moved = false;
  };
  const move = y => {
    if (!start) return;
    const delta = y - start.y;
    if (Math.abs(delta) < 8) return;
    moved = true;
    const height = sheet.parentElement.clientHeight;
    const collapsed=getCollapsedHeight?.()??height*.5;
    const maximum=getExpandedHeight?.()??height*.9;
    const resting=start.height??(start.expanded?maximum:collapsed);
    sheet.classList.add('dragging');
    const next=Math.max(height*.1,Math.min(maximum,resting-delta));
    sheet.style.height=`${next}px`;
    onDrag(Math.max(0,Math.min(1,(next-collapsed)/Math.max(1,maximum-collapsed))));
  };
  const end = y => {
    if (!start) return;
    const delta = y - start.y;
    const previous = start;
    start = null;
    sheet.classList.remove('dragging');
    sheet.style.removeProperty('height');
    // 빠른 터치에서는 move 이벤트가 합쳐지거나 생략돼도 종료 좌표로 이동을 판단한다.
    moved = moved || Math.abs(delta) >= 8;
    if (!moved){onDrag(previous.expanded?1:0);return;}
    if (delta > 90 && !previous.expanded) onClose();
    else if (delta > 45) onExpand(false);
    else if (delta < -45) onExpand(true);
    else onDrag(previous.expanded?1:0);
  };
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    begin(event.clientY);
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => move(event.clientY));
  handle.addEventListener('pointerup', event => end(event.clientY));
  handle.addEventListener('pointercancel', () => {
    start = null;
    sheet.classList.remove('dragging');
    sheet.style.removeProperty('height');
    onDrag(sheet.classList.contains('expanded')?1:0);
  });
  // 드래그 직후 발생하는 클릭으로 높이가 다시 바뀌지 않게 한다.
  handle.addEventListener('click', event => {
    if (moved) {event.preventDefault(); event.stopImmediatePropagation(); moved=false;}
  }, true);
  content.addEventListener('touchstart', event => {
    if (event.touches.length === 1 && content.scrollTop <= 0) begin(event.touches[0].clientY);
  }, {passive:true});
  content.addEventListener('touchmove', event => {
    if (!start || event.touches.length !== 1) return;
    const y = event.touches[0].clientY;
    const upward=expandOnContentSwipe&&!start.expanded&&y<start.y;
    if(y<=start.y&&!moved&&!upward){start=null;return;}
    if (Math.abs(y-start.y)>8 || moved) {event.preventDefault(); move(y);}
  }, {passive:false});
  content.addEventListener('touchend', event => {
    if (start) end(event.changedTouches[0].clientY);
  });
  if(expandOnContentSwipe)content.addEventListener('wheel',event=>{
    if(!sheet.classList.contains('expanded')&&event.deltaY>12){event.preventDefault();onExpand(true);}
  },{passive:false});
  content.addEventListener('touchcancel', () => {
    start=null;
    sheet.classList.remove('dragging');
    sheet.style.removeProperty('height');
    onDrag(sheet.classList.contains('expanded')?1:0);
  });
}
