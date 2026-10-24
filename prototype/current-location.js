export function locationErrorMessage(error) {
  if(error?.code===1) return '위치 사용이 차단되었습니다. 브라우저 권한을 확인하거나 주소로 검색해 주세요.';
  if(error?.code===3 || error?.message==='LOCATION_TIMEOUT') return '위치를 확인하는 데 시간이 걸립니다. 다시 시도하거나 주소로 검색해 주세요.';
  if(error?.message==='LOCATION_UNSUPPORTED') return '이 브라우저에서 위치를 확인할 수 없습니다. 주소로 검색해 주세요.';
  return '현재 위치의 주소를 불러오지 못했습니다. 다시 시도하거나 주소로 검색해 주세요.';
}
export async function requestCurrentAddress({geolocation=globalThis.navigator?.geolocation,reverse,isCurrent=()=>true}={}) {
  if(!geolocation) throw new Error('LOCATION_UNSUPPORTED');
  const position=await new Promise((resolve,reject)=>{
    // 브라우저의 timeout은 권한 선택 대기 시간을 제외한다.
    // 별도 타이머로 사용자가 허용하기 전에 실패 처리하지 않는다.
    geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:10000,maximumAge:0});
  });
  // 화면을 닫거나 다른 검색을 시작했으면 뒤늦게 받은 좌표를 외부로 보내지 않는다.
  if(!isCurrent()) throw new Error('LOCATION_CANCELLED');
  const {latitude:lat,longitude:lng}=position.coords??{};
  if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180) throw new Error('LOCATION_INVALID');
  return reverse({lat,lng},isCurrent);
}
