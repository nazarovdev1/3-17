import type { StorageAdapter } from '@/core/save/types'

/** localStorage-backed adapter; every access is guarded (private mode, quota). */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly storage: Storage | null = safeLocalStorage()) {}

  get(key: string): string | null {
    if (!this.storage) return null
    try {
      return this.storage.getItem(key)
    } catch {
      return null
    }
  }

  set(key: string, value: string): void {
    if (!this.storage) return
    try {
      this.storage.setItem(key, value)
    } catch {
      // Quota exceeded or disabled storage: non-fatal.
    }
  }

  remove(key: string): void {
    if (!this.storage) return
    try {
      this.storage.removeItem(key)
    } catch {
      // ignore
    }
  }
}

function safeLocalStorage(): Storage | null {
  try {
    const probe = '__g317_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}
