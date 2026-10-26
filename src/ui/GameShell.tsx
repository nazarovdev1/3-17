import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from './gameStore'
import { ContentWarning } from './ContentWarning'
import { TitleScreen } from './TitleScreen'
import { RentalForm } from './RentalForm'
import { SettingsScreen } from './SettingsScreen'
import { ErrorBoundary } from './ErrorBoundary'
import { MobilePresenter } from '@/presenters/mobile/MobilePresenter'
import { EndingScreen } from './EndingScreen'
import { GalleryScreen } from './GalleryScreen'
import { DebugOverlay } from '@/debug/DebugOverlay'
import { useSettings } from './settingsStore'
import { detectMode, type GameMode } from '@/platform/device/mode'
import { checkGpu } from '@/platform/device/gpu'
import { AudioController } from '@/audio/AudioController'
import { HorrorEffects } from './HorrorEffects'
import './shell.css'

const DesktopPresenter = lazy(() => import('@/presenters/desktop/DesktopPresenter'))

/**
 * The shell (spec 3/4/6): boot → warning → title → form → game, with pause,
 * settings, endings, mode routing and the debug overlay. Presenters render
 * story state; the shell owns screens and platform wiring.
 */
export function GameShell() {
  const screen = useGame((s) => s.screen)
  const setScreen = useGame((s) => s.setScreen)
  const settingsMode = useSettings((s) => s.settings.mode)
  const [mode, setMode] = useState<GameMode>('mobile')
  const [bootDone, setBootDone] = useState(false)
  const failed = useRef(false)
  const [retry, setRetry] = useState(0)
  const [fallbackVisible, setFallbackVisible] = useState(false)
  const fallBack = useCallback(() => {
    failed.current = true
    setMode('mobile')
    setFallbackVisible(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    let webglAvailable: boolean | undefined
    let gpuResult: Promise<boolean> | null = null
    failed.current = false
    async function boot() {
      const candidate =
        settingsMode === 'desktop' ||
        (settingsMode === 'auto' &&
          window.matchMedia('(pointer: fine)').matches &&
          window.innerWidth >= 900)
      if (!candidate) {
        setMode('mobile')
        setBootDone(true)
        return
      }
      webglAvailable ??= hasWebGL()
      gpuResult ??= webglAvailable ? checkGpu() : Promise.resolve(false)
      const gpuOk = await gpuResult
      if (cancelled || failed.current) return
      setMode(
        detectMode({
          setting: settingsMode,
          pointerFine: window.matchMedia('(pointer: fine)').matches,
          viewportWidth: window.innerWidth,
          webglAvailable,
          gpuOk,
        }),
      )
      setBootDone(true)
    }
    void boot()
    const onResize = () => {
      if (settingsMode === 'auto' && !failed.current) void boot()
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
    }
  }, [settingsMode, retry])
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        useGame.getState().saveNow()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Real-clock 3:17 watcher (spec 5.6): one short event per run.
  useEffect(() => {
    const checkClock = () => {
      const now = new Date()
      if (!document.hidden && now.getHours() === 3 && now.getMinutes() === 17) {
        useGame.getState().showRealClock317()
      }
    }
    const timer = window.setInterval(checkClock, 1000)
    document.addEventListener('visibilitychange', checkClock)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', checkClock)
    }
  }, [])

  const realClock317Visible = useGame((s) => s.realClock317Visible)
  const dismissRealClock = useGame((s) => s.dismissRealClock317)

  if (!bootDone) {
    return (
      <div className="screen">
        <p className="subtitle">Yuklanmoqda…</p>
      </div>
    )
  }

  return (
    <div
      className={`text-${useSettings.getState().settings.textSize.toLowerCase()} phones ${mode === 'desktop' ? 'desktop-mode' : ''}`}
    >
      <div className="phone-frame">
        <AudioController mode={mode} />
        <HorrorEffects />
        {screen === 'warning' && <ContentWarning />}
        {screen === 'title' && <TitleScreen mode={mode} />}
        {screen === 'form' && <RentalForm />}
        {(screen === 'game' || screen === 'paused') &&
          (mode === 'mobile' ? (
            <MobilePresenter paused={screen === 'paused'} />
          ) : (
            <ErrorBoundary label="desktop" onError={fallBack}>
              <Suspense fallback={<p className="subtitle">Xonadon tayyorlanmoqda…</p>}>
                <DesktopPresenter paused={screen === 'paused'} onFallback={fallBack} />
              </Suspense>
            </ErrorBoundary>
          ))}
        {screen === 'settings' && (
          <SettingsScreen
            onBack={() => setScreen('title')}
            mode={mode}
            onModeRequest={() => setRetry((value) => value + 1)}
          />
        )}
        {screen === 'ending' && <EndingScreen />}
        {screen === 'gallery' && <GalleryScreen />}
        <DebugOverlay />
        {fallbackVisible && (
          <button className="realtime-banner" onClick={() => setFallbackVisible(false)}>
            Tasvir yengil rejimga oʻtdi. Davom etishingiz mumkin.
          </button>
        )}
        {realClock317Visible && (
          <button className="realtime-banner" onClick={dismissRealClock}>
            Haqiqiy soatingiz 3:17’ni koʻrsatmoqda. Devorda urish bor… yoʻqmi?
          </button>
        )}
      </div>
    </div>
  )
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
