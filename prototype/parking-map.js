// Client ID는 웹 도메인 제한이 적용되는 공개 식별자다. Client Secret은 사용하지 않는다.
const CLIENT_ID = '7xmbdz57t0';
let sdkPromise;
export function loadSdk() {
  if (window.naver?.maps?.Service) return Promise.resolve(window.naver.maps);
  return sdkPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${CLIENT_ID}&submodules=geocoder`;
    script.onload = () => {
      const maps = window.naver?.maps;
      if (!maps) return reject(new Error('MAP_AUTH_FAILED'));
      if (maps.Service) return resolve(maps);
      maps.onJSContentLoaded = () => resolve(maps);
      setTimeout(() => reject(new Error('GEOCODER_LOAD_TIMEOUT')), 15000);
    };
    script.onerror = () => reject(new Error('MAP_LOAD_FAILED'));
    document.head.append(script);
  });
}
export async function createParkingMap(element, onSelect, onLocations = () => {}) {
  try {
    const maps = await loadSdk();
    // 성수동 탐색 시작 지점이며 개별 주차장의 위치로 사용하지 않는다.
    const center = new maps.LatLng(37.5445, 127.0557);
    const map = new maps.Map(element, {center, zoom:15, minZoom:10, maxZoom:20});
    element.addEventListener('click', event => {
      const pin=event.target.closest('[data-parking-id]');
      if(pin){ event.preventDefault(); event.stopPropagation(); onSelect(pin.dataset.parkingId); }
    }, {capture:true});
    const markers = new Map();
    const locations = new Map(), pending = new Set(), addressMatches = [];
    let latest = [], shown = true, focusedId = null, selected = null;
    function resolveLocation(lot) {
      if (locations.has(lot.id) || pending.has(lot.id)) return;
      pending.add(lot.id);
      const query = lot.address.startsWith('성동구') ? `서울특별시 ${lot.address}` : `서울특별시 성동구 ${lot.address}`;
      maps.Service.geocode({query}, (status, response) => {
        const candidates = response?.v2?.addresses ?? [];
        element.dataset.geocodeLastResult = JSON.stringify({query,status,addresses:candidates.map(item=>item.jibunAddress)});
        // 여러 결과나 주소 불일치는 자동으로 임의 선택하지 않는다.
        const normalize = address => address.replace(/서울특별시|성동구/g, '').trim().replace(/\s+/g, ' ');
        const expected = normalize(query);
        const exact = candidates.filter(item => normalize(item.jibunAddress) === expected || normalize(item.jibunAddress).startsWith(expected + ' '));
        if (status === maps.Service.Status.OK && exact.length === 1) {
          const point = exact[0];
          if (Number.isFinite(Number(point.y)) && Number.isFinite(Number(point.x))) {
            locations.set(lot.id, {lat:Number(point.y),lng:Number(point.x)});
            addressMatches.push({id:lot.id,name:lot.name,jibun_address:point.jibunAddress,road_address:point.roadAddress});
            element.dataset.addressMatches=JSON.stringify(addressMatches);
          }
        }
        draw();
        onLocations();
      });
    }
    function draw() {
      const activeIds = new Set();
      if (shown) for (const lot of latest) {
        if (!locations.has(lot.id)) continue;
        activeIds.add(lot.id);
        const point = locations.get(lot.id);
        const label = String(lot.map_label ?? 'P');
        const caption=String(lot.map_caption ?? '');
        const kind=['ticket','onsite','shared'].includes(lot.map_kind)?lot.map_kind:'onsite';
        const signature = JSON.stringify([point.lat, point.lng, lot.name, label,caption,kind,selected===lot.id]);
        const current = markers.get(lot.id);
        if (current?.signature === signature) continue;
        const safe = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const icon = {content:`<button type="button" class="parking-map-pin" data-kind="${kind}" aria-pressed="${selected===lot.id}" data-parking-id="${safe(lot.id)}" aria-label="${safe(lot.name)} ${safe(label)}" title="${safe(lot.name)}${caption?' · '+safe(caption):' · 현장 1시간 요금'}">${caption?`<span class="map-pin-caption">${safe(caption)}</span>`:''}${kind==='ticket'?'<span class="map-type">제휴</span>':''}<span>${safe(label)}</span></button>`,anchor:new maps.Point(26,caption?50:34)};
        if (current) {
          current.marker.setPosition(new maps.LatLng(point.lat, point.lng));
          current.marker.setIcon(icon);
          current.signature = signature;
        } else {
          markers.set(lot.id, {signature, marker:new maps.Marker({map, position:new maps.LatLng(point.lat, point.lng), title:lot.name, icon})});
        }
      }
      for (const [id, entry] of markers) {
        if (!activeIds.has(id)) { entry.marker.setMap(null); markers.delete(id); }
      }
      element.dataset.verifiedLocations = String(locations.size);
    }
    return {
      getLocation: id => locations.get(id) ?? null,
      zoom: delta => map.setZoom(map.getZoom() + delta, true),
      reset: () => { focusedId = null; map.setCenter(center); map.setZoom(15); },
      focus: id => {
        const point = locations.get(id);
        if (point && focusedId !== id) { map.panTo(new maps.LatLng(point.lat,point.lng)); focusedId=id; }
      },
      setLots(lots, selectedId, visible) {
        latest = lots; shown = visible; selected = selectedId;
        lots.forEach(lot => {
          if (Number.isFinite(lot.location?.lat) && Number.isFinite(lot.location?.lng) && lot.location_verified_at) locations.set(lot.id, lot.location);
          else resolveLocation(lot);
        });
        draw();
        if (selectedId && selectedId !== focusedId && locations.has(selectedId)) {
          const point = locations.get(selectedId);
          map.panTo(new maps.LatLng(point.lat,point.lng)); focusedId=selectedId;
        }
      },
    };
  } catch {
    document.querySelector('#map-error').hidden = false;
    return null;
  }
}
