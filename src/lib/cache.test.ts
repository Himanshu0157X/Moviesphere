import { describe, expect, it } from 'vitest'
import { getCachedValue, setCachedValue } from './cache'
import type { CacheEntry } from './cache'

describe('cache helpers', () => {
  it('returns cached values until they expire', () => {
    const cache = new Map<string, CacheEntry<string>>()

    setCachedValue(cache, 'movie', 'Arrival', 1000, 5, 100)

    expect(getCachedValue(cache, 'movie', 500)).toBe('Arrival')
    expect(getCachedValue(cache, 'movie', 1101)).toBeNull()
  })

  it('evicts the least recently touched entry when max size is exceeded', () => {
    const cache = new Map<string, CacheEntry<string>>()

    setCachedValue(cache, 'first', 'A', 1000, 2, 100)
    setCachedValue(cache, 'second', 'B', 1000, 2, 110)
    expect(getCachedValue(cache, 'first', 120)).toBe('A')

    setCachedValue(cache, 'third', 'C', 1000, 2, 130)

    expect(getCachedValue(cache, 'first', 140)).toBe('A')
    expect(getCachedValue(cache, 'second', 140)).toBeNull()
    expect(getCachedValue(cache, 'third', 140)).toBe('C')
  })
})
