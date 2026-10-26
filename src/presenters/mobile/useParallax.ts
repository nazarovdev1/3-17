import { useEffect, useRef } from 'react'
import { getWebApp } from '@/platform/telegram/adapter'

/** Mutable offsets avoid rerendering React for every sensor sample. */
export function useParallax(enabled: boolean) {
  const parallax = useRef({ x: 0, y: 0 })
  const gyroActive = useRef(false)
  const requested = useRef(false)
  const drag = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!enabled) return
    const orientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return
      gyroActive.current = true
      parallax.current = {
        x: Math.max(-8, Math.min(8, event.gamma / 5)),
        y: Math.max(-8, Math.min(8, (event.beta - 35) / 8)),
      }
    }
    window.addEventListener('deviceorientation', orientation)
    return () => window.removeEventListener('deviceorientation', orientation)
  }, [enabled])

  const requestGyro = () => {
    if (requested.current || !enabled) return
    requested.current = true
    const app = getWebApp()
    if (app?.isVersionAtLeast?.('8.0') && app.Gyroscope?.start) {
      try {
        app.Gyroscope.start({ refresh_rate: 30 }, (started) => {
          gyroActive.current = started
        })
      } catch {
        /* Touch drag remains available. */
      }
    }
    const api = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>
    }
    if (api?.requestPermission) void api.requestPermission().catch(() => undefined)
  }

  useEffect(() => {
    if (!enabled) return
    const app = getWebApp()
    const sensor = app?.isVersionAtLeast?.('8.0') ? app.Gyroscope : undefined
    const update = () => {
      if (!sensor?.isStarted) return
      gyroActive.current = true
      parallax.current = {
        x: Math.max(-8, Math.min(8, sensor.y * 10)),
        y: Math.max(-8, Math.min(8, sensor.x * 10)),
      }
    }
    app?.onEvent?.('gyroscopeChanged', update)
    return () => {
      app?.offEvent?.('gyroscopeChanged', update)
      try {
        sensor?.stop?.()
      } catch {
        /* Best-effort cleanup. */
      }
      gyroActive.current = false
      requested.current = false
    }
  }, [enabled])

  return {
    parallax,
    requestGyro,
    onPointerDown: (event: React.PointerEvent) => {
      requestGyro()
      if (!gyroActive.current) drag.current = { x: event.clientX, y: event.clientY }
    },
    onPointerMove: (event: React.PointerEvent) => {
      if (!drag.current || gyroActive.current) return
      parallax.current = {
        x: Math.max(-8, Math.min(8, (event.clientX - drag.current.x) / 15)),
        y: Math.max(-8, Math.min(8, (event.clientY - drag.current.y) / 15)),
      }
    },
    onPointerUp: () => {
      drag.current = null
    },
  }
}
