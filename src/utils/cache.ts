// In-memory stale-while-revalidate cache: pages render the last known data
// instantly and refresh it silently in the background.
const store = new Map<string, unknown>()

export function cacheGet<T>(key: string): T | undefined {
  return store.get(key) as T | undefined
}

export function cacheSet<T>(key: string, value: T): void {
  store.set(key, value)
}
