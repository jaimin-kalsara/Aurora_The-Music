import { useEffect, useRef, useState } from 'react';

interface CacheEntry {
  value: unknown;
  time: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const STALE_MS = 10 * 60 * 1000;

export interface QueryState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * Minimal cached async hook. Keyed results are kept in memory for fast back navigation and
 * reused across components; a `null` key disables the query.
 */
export function useQuery<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[] = []): QueryState<T> {
  const hit = key ? (cache.get(key) as CacheEntry | undefined) : undefined;
  const fresh = hit && Date.now() - hit.time < STALE_MS;
  const [data, setData] = useState<T | null>(fresh ? (hit!.value as T) : null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(key) && !fresh);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!key) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const cachedEntry = cache.get(key);
    if (cachedEntry && Date.now() - cachedEntry.time < STALE_MS && tick === 0) {
      setData(cachedEntry.value as T);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    let promise = inflight.get(key) as Promise<T> | undefined;
    if (!promise) {
      promise = fetcherRef.current(controller.signal);
      inflight.set(key, promise);
      promise.finally(() => inflight.delete(key)).catch(() => undefined);
    }
    promise
      .then((value) => {
        cache.set(key, { value, time: Date.now() });
        if (!cancelled) {
          setData(value);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick, ...deps]);

  return { data, error, loading, refetch: () => setTick((t) => t + 1) };
}

export function invalidateQueries(prefix = '') {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
}
