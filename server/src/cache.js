// Tiny in-memory TTL cache so repeated navigation does not hammer the upstream catalog.
const store = new Map();

export function cached(key, ttlMs, producer) {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value;
  const value = producer().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, { value, expires: now + ttlMs });
  if (store.size > 2000) {
    for (const [k, v] of store) if (v.expires <= now) store.delete(k);
  }
  return value;
}

export const TTL = {
  short: 5 * 60 * 1000,
  medium: 15 * 60 * 1000,
  long: 60 * 60 * 1000,
};
