/** Small finite-key, success-only cache. No polling; failures invalidate old data. */
export function publicReadCache<K extends string, T>(
  load: (key: K, signal: AbortSignal) => Promise<T>,
) {
  const cached = new Map<K, { value: T; expires: number }>();
  const pending = new Map<K, Promise<T>>();
  return (key: K, force = false): Promise<T> => {
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;
    const entry = cached.get(key);
    if (!force && entry && entry.expires > Date.now())
      return Promise.resolve(entry.value);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const request = load(key, controller.signal)
      .then((value) => {
        cached.set(key, { value, expires: Date.now() + 60_000 });
        return value;
      })
      .catch((error: unknown) => {
        cached.delete(key);
        throw error;
      })
      .finally(() => {
        clearTimeout(timeout);
        if (pending.get(key) === request) pending.delete(key);
      });
    pending.set(key, request);
    return request;
  };
}
