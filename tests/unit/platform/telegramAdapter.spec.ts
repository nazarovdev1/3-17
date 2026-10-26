import { afterEach, describe, expect, it, vi } from 'vitest'
import { TelegramAdapter, type TelegramWebApp } from '@/platform/telegram/adapter'

function setWebApp(app: TelegramWebApp | undefined): void {
  ;(window as unknown as Record<string, unknown>)['Telegram'] = app ? { WebApp: app } : undefined
}

afterEach(() => {
  setWebApp(undefined)
})

describe('TelegramAdapter outside Telegram', () => {
  it('is a no-op everywhere', () => {
    const adapter = new TelegramAdapter(null)
    expect(adapter.isTelegram).toBe(false)
    expect(adapter.firstName).toBeNull()
    expect(() => adapter.onReady()).not.toThrow()
    expect(() => adapter.haptic('knock')).not.toThrow()
    expect(adapter.cloudStorage()).toBeNull()
    const off = adapter.onBack(() => undefined)
    expect(() => off()).not.toThrow()
  })
})

describe('TelegramAdapter with a mocked window.Telegram', () => {
  const makeApp = (overrides: Partial<TelegramWebApp> = {}): TelegramWebApp => ({
    ready: vi.fn(),
    expand: vi.fn(),
    requestFullscreen: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    lockOrientation: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
    isVersionAtLeast: (v) => v <= '9.0',
    initDataUnsafe: { user: { first_name: 'Malika' } },
    HapticFeedback: { impactOccurred: vi.fn(), notificationOccurred: vi.fn() },
    ...overrides,
  })

  it('onReady calls ready + expand and sets colors', () => {
    const app = makeApp()
    const adapter = new TelegramAdapter(app)
    adapter.onReady()
    expect(app.ready).toHaveBeenCalled()
    expect(app.expand).toHaveBeenCalled()
    expect(app.setHeaderColor).toHaveBeenCalledWith('#0B0B0C')
  })

  it('feature detection never calls unsupported methods', () => {
    const app = makeApp({ requestFullscreen: undefined, isVersionAtLeast: () => false })
    const adapter = new TelegramAdapter(app)
    expect(() => adapter.onReady()).not.toThrow()
    expect(app.disableVerticalSwipes).not.toHaveBeenCalled()
  })

  it('errors in Telegram APIs are swallowed', () => {
    const app = makeApp({
      ready: () => {
        throw new Error('boom')
      },
    })
    const adapter = new TelegramAdapter(app)
    expect(() => adapter.onReady()).not.toThrow()
  })

  it('firstName comes from initDataUnsafe', () => {
    expect(new TelegramAdapter(makeApp()).firstName).toBe('Malika')
    expect(new TelegramAdapter(makeApp({ initDataUnsafe: {} })).firstName).toBeNull()
  })

  it('haptic maps knock to rigid impact', () => {
    const impact = vi.fn()
    const notify = vi.fn()
    const adapter = new TelegramAdapter(
      makeApp({ HapticFeedback: { impactOccurred: impact, notificationOccurred: notify } }),
    )
    adapter.haptic('knock')
    expect(impact).toHaveBeenCalledWith('rigid')
    adapter.haptic('heartbeat')
    expect(notify).toHaveBeenCalledWith('warning')
  })

  it('BackButton registers and unregisters', () => {
    const onClick = vi.fn()
    const offClick = vi.fn()
    const show = vi.fn()
    const hide = vi.fn()
    const adapter = new TelegramAdapter(makeApp({ BackButton: { onClick, offClick, show, hide } }))
    const handler = () => undefined
    const off = adapter.onBack(handler)
    expect(onClick).toHaveBeenCalledWith(handler)
    expect(show).toHaveBeenCalled()
    off()
    expect(offClick).toHaveBeenCalledWith(handler)
    expect(hide).toHaveBeenCalled()
  })

  it('cloudStorage wraps the callback API into promises', async () => {
    const storage = new Map<string, string>()
    const adapter = new TelegramAdapter(
      makeApp({
        CloudStorage: {
          setItem: (key, value, cb) => {
            storage.set(key, value)
            cb?.(null, true)
          },
          getItem: (key, cb) => {
            cb?.(null, storage.get(key) ?? '')
          },
          removeItem: (key, cb) => {
            storage.delete(key)
            cb?.(null, true)
          },
        },
      }),
    )
    const cloud = adapter.cloudStorage()
    expect(cloud).not.toBeNull()
    await cloud!.store('k', 'v')
    expect(await cloud!.load('k')).toBe('v')
    await cloud!.delete('k')
    expect(await cloud!.load('k')).toBe('')
  })

  it('cloudStorage rejects on error callbacks', async () => {
    const adapter = new TelegramAdapter(
      makeApp({
        CloudStorage: {
          getItem: (_key, cb) => cb?.('denied', ''),
          setItem: (_k, _v, cb) => cb?.(null, true),
          removeItem: (_k, cb) => cb?.(null, true),
        },
      }),
    )
    const cloud = adapter.cloudStorage()
    await expect(cloud!.load('k')).rejects.toThrow('CloudStorage error')
  })
})
