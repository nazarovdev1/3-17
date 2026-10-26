/**
 * Telegram WebApp adapter (spec 9). Every call is feature-detected; the game
 * must work identically outside Telegram with all of this simply absent.
 */
import type { CloudStorageAdapter } from '@/core/save/types'
import type { HapticPattern } from '@/core/state/types'

interface TgHaptic {
  impactOccurred?: (style: string) => void
  notificationOccurred?: (type: string) => void
}
interface TgCloud {
  setItem?: (key: string, value: string, cb?: (err: unknown, ok: boolean) => void) => void
  getItem?: (key: string, cb?: (err: unknown, value: string) => void) => void
  removeItem?: (key: string, cb?: (err: unknown, ok: boolean) => void) => void
}
export interface TelegramWebApp {
  Gyroscope?: {
    isStarted?: boolean
    x: number
    y: number
    start?: (options: { refresh_rate: number }, callback: (started: boolean) => void) => void
    stop?: () => void
  }
  onEvent?: (event: string, callback: () => void) => void
  offEvent?: (event: string, callback: () => void) => void
  ready?: () => void
  expand?: () => void
  requestFullscreen?: () => void
  disableVerticalSwipes?: () => void
  lockOrientation?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  isVersionAtLeast?: (version: string) => boolean
  initDataUnsafe?: { user?: { first_name?: string } }
  HapticFeedback?: TgHaptic
  CloudStorage?: TgCloud
  BackButton?: {
    show?: () => void
    hide?: () => void
    onClick?: (cb: () => void) => void
    offClick?: (cb: () => void) => void
  }
  version?: string
  platform?: string
}

export function getWebApp(): TelegramWebApp | null {
  const w = window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }
  return w.Telegram?.WebApp ?? null
}

const HAPTIC_STYLE: Record<HapticPattern, { impact?: string; notify?: string }> = {
  light: { impact: 'light' },
  medium: { impact: 'medium' },
  heavy: { impact: 'heavy' },
  knock: { impact: 'rigid' },
  heartbeat: { notify: 'warning' },
}

export class TelegramAdapter {
  private app: TelegramWebApp | null
  private backCallbacks = new Set<() => void>()

  constructor(app: TelegramWebApp | null = getWebApp()) {
    this.app = app
  }

  get isTelegram(): boolean {
    return this.app !== null
  }

  get firstName(): string | null {
    const name = this.app?.initDataUnsafe?.user?.first_name
    return name && name.trim().length > 0 ? name.trim() : null
  }

  private supports(fn: keyof TelegramWebApp, minVersion?: string): boolean {
    if (!this.app) return false
    if (typeof this.app[fn] !== 'function') return false
    if (minVersion && typeof this.app.isVersionAtLeast === 'function') {
      return this.app.isVersionAtLeast(minVersion)
    }
    return true
  }

  /** Called once after the first frame renders. */
  onReady(): void {
    if (!this.app) return
    try {
      this.app.ready?.()
      this.app.expand?.()
      if (this.supports('requestFullscreen', '8.0')) this.app.requestFullscreen?.()
      if (this.supports('disableVerticalSwipes', '7.7')) this.app.disableVerticalSwipes?.()
      if (this.supports('lockOrientation')) this.app.lockOrientation?.()
      this.app.setHeaderColor?.('#0B0B0C')
      this.app.setBackgroundColor?.('#0B0B0C')
    } catch {
      // Any Telegram API failure must never break the game.
    }
  }

  haptic(pattern: HapticPattern): void {
    const hapticApi = this.app?.HapticFeedback
    if (!hapticApi) return
    const { impact, notify } = HAPTIC_STYLE[pattern]
    try {
      if (impact) hapticApi.impactOccurred?.(impact)
      if (notify) hapticApi.notificationOccurred?.(notify)
    } catch {
      // ignore
    }
  }

  /** navigator.vibrate fallback for Android browsers outside Telegram. */
  vibrateFallback(pattern: HapticPattern): void {
    if (pattern === 'light' || pattern === 'medium') return
    const nav = navigator as unknown as { vibrate?: (p: number | number[]) => boolean }
    const ms = pattern === 'heartbeat' ? [60, 80, 60] : 40
    try {
      nav.vibrate?.(ms)
    } catch {
      // ignore
    }
  }

  cloudStorage(): CloudStorageAdapter | null {
    const app = this.app
    if (!app) return null
    // The official script logs a console.error when unsupported members are
    // merely accessed, so gate on the version before touching CloudStorage.
    if (typeof app.isVersionAtLeast === 'function' && !app.isVersionAtLeast('6.9')) return null
    const cloud = app.CloudStorage
    if (!cloud || !cloud.setItem || !cloud.getItem || !cloud.removeItem) return null
    const call = <T>(fn: (cb: (err: unknown, value: T) => void) => void): Promise<T> =>
      new Promise((resolve, reject) => {
        fn((err, value) => {
          if (err !== null && err !== undefined) {
            reject(err instanceof Error ? err : new Error('CloudStorage error'))
          } else {
            resolve(value)
          }
        })
      })
    return {
      async load(key) {
        return call<string>((cb) => cloud.getItem!(key, cb))
      },
      async store(key, value) {
        await call<boolean>((cb) => cloud.setItem!(key, value, cb))
      },
      async delete(key) {
        await call<boolean>((cb) => cloud.removeItem!(key, cb))
      },
    }
  }

  /** Registers a BackButton handler; returns the unregister function. */
  onBack(callback: () => void): () => void {
    this.backCallbacks.add(callback)
    const back = this.app?.BackButton
    if (back && back.onClick) {
      try {
        back.onClick(callback)
        back.show?.()
      } catch {
        // ignore
      }
    }
    return () => {
      this.backCallbacks.delete(callback)
      try {
        back?.offClick?.(callback)
        if (this.backCallbacks.size === 0) back?.hide?.()
      } catch {
        // ignore
      }
    }
  }
}
