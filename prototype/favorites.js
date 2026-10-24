const key = 'parkingzone-favorites-v1';

export function readFavorites(storage, allowedIds) {
  try {
    const values = JSON.parse(storage.getItem(key) || '[]');
    if (!Array.isArray(values)) return [];
    return [...new Set(values.filter(id => typeof id === 'string' && allowedIds.has(id)))];
  } catch { return []; }
}

export function saveFavorites(storage, ids) {
  storage.setItem(key, JSON.stringify([...new Set(ids)]));
}
