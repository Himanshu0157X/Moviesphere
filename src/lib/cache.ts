export type CacheEntry<T> = {
  value: T
  expiresAt: number
  touchedAt: number
}

export function createCacheEntry<T>(value: T, ttlMs: number, now = Date.now()): CacheEntry<T> {
  return {
    value,
    expiresAt: now + ttlMs,
    touchedAt: now,
  }
}

export function getCachedValue<K, T>(
  cache: Map<K, CacheEntry<T>>,
  key: K,
  now = Date.now(),
) {
  const entry = cache.get(key)

  if (!entry) {
    return null
  }

  if (entry.expiresAt <= now) {
    cache.delete(key)
    return null
  }

  entry.touchedAt = now
  return entry.value
}

export function pruneExpiredEntries<K, T>(cache: Map<K, CacheEntry<T>>, now = Date.now()) {
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key)
    }
  }
}

export function setCachedValue<K, T>(
  cache: Map<K, CacheEntry<T>>,
  key: K,
  value: T,
  ttlMs: number,
  maxEntries: number,
  now = Date.now(),
) {
  pruneExpiredEntries(cache, now)
  cache.set(key, createCacheEntry(value, ttlMs, now))

  while (cache.size > maxEntries) {
    let stalestKey: K | null = null
    let stalestTouch = Number.POSITIVE_INFINITY

    for (const [entryKey, entry] of cache.entries()) {
      if (entry.touchedAt < stalestTouch) {
        stalestKey = entryKey
        stalestTouch = entry.touchedAt
      }
    }

    if (stalestKey === null) {
      break
    }

    cache.delete(stalestKey)
  }
}
