import { describe, expect, it } from 'vitest'
import {
  clearStoredAppState,
  getAppStateStorageKey,
  readStoredAppState,
  writeStoredAppState,
} from './appState'

describe('app state persistence helpers', () => {
  it('namespaces keys by user id', () => {
    expect(getAppStateStorageKey('user-123')).toBe('moviesphere-app-state:user-123')
  })

  it('writes, reads, and clears user-scoped state', () => {
    const state = { view: 'catalog', selectedMovieId: 42 }

    writeStoredAppState('user-123', state)

    expect(readStoredAppState<typeof state>('user-123')).toEqual(state)

    clearStoredAppState('user-123')

    expect(readStoredAppState<typeof state>('user-123')).toBeNull()
  })
})
