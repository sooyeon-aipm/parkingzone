export function startRefreshLoop({refresh, visibility=document, delay=60000, setTimer=setTimeout, clearTimer=clearTimeout}) {
  let timer=null, running=null, disposed=false;
  const cancel=()=>{if(timer!==null) clearTimer(timer); timer=null;};
  const schedule=()=>{
    cancel();
    if(!disposed && !visibility.hidden) timer=setTimer(run,delay);
  };
  function run() {
    cancel();
    if(disposed || visibility.hidden || running) return running;
    running=Promise.resolve().then(()=>refresh()).catch(()=>false).finally(()=>{running=null;schedule();});
    return running;
  }
  const onVisibility=()=>{cancel();if(!visibility.hidden) run();};
  visibility.addEventListener('visibilitychange',onVisibility);
  run();
  return ()=>{disposed=true;cancel();visibility.removeEventListener('visibilitychange',onVisibility);};
}
