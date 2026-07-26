const DEFAULT_TTL = 30 * 60 * 1000;

export async function cachedFetch<T>(
  url: string,
  cacheKey: string,
  ttl: number = DEFAULT_TTL,
): Promise<T | null> {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && Date.now() - cached.ts < ttl) {
        return cached.data as T;
      }
    }
  } catch {}

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const data = (await res.json()) as T;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
    } catch {}
    return data;
  } catch {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) return JSON.parse(raw).data as T;
    } catch {}
    return null;
  }
}
