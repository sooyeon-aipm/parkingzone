import {straightDistance} from './geo.js';
export const NEARBY_METERS = 1000;
export function nearbyLots(lots, destination, locate = lot => lot.location, radius = NEARBY_METERS) {
  return lots.map(lot => ({lot, meters: straightDistance(destination?.location, locate(lot))}))
    .filter(item => item.meters !== null && item.meters <= radius)
    .sort((a, b) => a.meters - b.meters).map(item => item.lot);
}
// Results are transient. Input changes/close cancel requests and invalidate late responses.
export function createPlaceSearch({fetchImpl = globalThis.fetch} = {}) {
  let version = 0, controller;
  function cancel() { version++; controller?.abort(); controller = null; }
  return {
    cancel,
    async search(query) {
      cancel(); const current = version;
      const active = controller = new AbortController();
      const timer = setTimeout(() => active.abort(), 10_000);
      try {
        const response = await fetchImpl('/api/places', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({query}), signal: active.signal, cache: 'no-store'});
        if (current !== version) return null;
        const body = await response.json();
        if (current !== version) return null;
        if (!response.ok) throw new Error(['PLACE_SEARCH_NOT_CONFIGURED','PLACE_SEARCH_LIMITED'].includes(body.error) ? body.error : 'PLACE_SEARCH_FAILED');
        if (!Array.isArray(body.places)) throw new Error('PLACE_SEARCH_FAILED');
        return body.places.filter(place => typeof place.name === 'string' && typeof place.address === 'string' && straightDistance(place.location, place.location) === 0).slice(0, 5);
      } catch (error) { if (current !== version) return null; throw error; }
      finally { clearTimeout(timer); if (current === version) controller = null; }
    },
  };
}
