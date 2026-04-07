const APP_STATE_KEY_PREFIX = 'moviesphere-app-state'

export function getAppStateStorageKey(userId: string) {
  return `${APP_STATE_KEY_PREFIX}:${userId}`
}

export function readStoredAppState<T>(userId: string): T | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawState = window.localStorage.getItem(getAppStateStorageKey(userId))

    if (!rawState) {
      return null
    }

    return JSON.parse(rawState) as T
  } catch {
    return null
  }
}

export function writeStoredAppState<T>(userId: string, value: T) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(getAppStateStorageKey(userId), JSON.stringify(value))
}

export function clearStoredAppState(userId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(getAppStateStorageKey(userId))
}
