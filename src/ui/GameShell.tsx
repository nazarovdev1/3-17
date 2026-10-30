import { ui } from '@/content/text'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useGame, type Screen } from './gameStore'
import { TelegramAdapter } from '@/platform/telegram/adapter'
import { ContentWarning } from './ContentWarning'
import { TitleScreen } from './TitleScreen'
import { SettingsScreen } from './SettingsScreen'
import { ErrorBoundary } from './ErrorBoundary'
import { MobilePresenter } from '@/presenters/mobile/MobilePresenter'
import { GalleryScreen } from './GalleryScreen'
import { DebugOverlay } from '@/debug/DebugOverlay'
import { useSettings } from './settingsStore'
import { detectMode, type GameMode } from '@/platform/device/mode'
import { checkGpu } from '@/platform/device/gpu'
import { magicCapable } from '@/platform/device/magic'
import { AudioController } from '@/audio/AudioController'
import { HorrorEffects } from './HorrorEffects'
import { LoadingScreen } from './LoadingScreen'
import { DirectorDriver } from './DirectorDriver'
import { useAssetLoad } from './assetLoadStore'
import './shell.css'

const DesktopPresenter = lazy(() => import('@/presenters/desktop/DesktopPresenter'))

/**
 * The shell: boot → warning → title → game, with pause, settings, the endings gallery,
 * mode routing and the debug overlay. The Director runs the world; presenters show it.
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
  // Phones: the magic window (3D, turned by the phone) unless the device is weak or it failed.
  const [magicFailed, setMagicFailed] = useState(false)
  const failMagic = useCallback(() => setMagicFailed(true), [])
  const [capable] = useState(magicCapable)
  const magic = mode === 'mobile' && capable && !magicFailed
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
        useGame.getState().realClock317()
      }
    }
    const timer = window.setInterval(checkClock, 1000)
    document.addEventListener('visibilitychange', checkClock)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', checkClock)
    }
  }, [])

  // Settings returns to wherever it was opened from (title or the pause menu).
  const settingsReturn = useRef<Screen>('title')
  const lastScreen = useRef<Screen>(screen)
  useEffect(() => {
    if (screen === 'settings' && lastScreen.current !== 'settings') {
      settingsReturn.current = lastScreen.current === 'paused' ? 'paused' : 'title'
    }
    lastScreen.current = screen
  }, [screen])

  // Telegram BackButton (spec 9): in game it opens pause; elsewhere it steps back.
  // On the warning/title screens it stays hidden so Telegram's own close applies.
  useEffect(() => {
    const target = backTarget(screen, settingsReturn.current)
    if (!target) return
    return new TelegramAdapter().onBack(() => useGame.getState().setScreen(target))
  }, [screen])

  // Desktop assets start loading as soon as the mode is known (during warning/title), so
  // the loading screen is usually short or skipped.
  const assetStatus = useAssetLoad((s) => s.status)
  useEffect(() => {
    if (bootDone && (mode === 'desktop' || magic)) useAssetLoad.getState().start()
  }, [bootDone, mode, magic])

  if (!bootDone) {
    return (
      <div className="screen">
        <p className="subtitle">{ui('common.loading')}</p>
      </div>
    )
  }

  return (
    <div
      className={`text-${useSettings.getState().settings.textSize.toLowerCase()} phones ${mode === 'desktop' ? 'desktop-mode' : ''}`}
    >
      <div className="phone-frame">
        <AudioController mode={mode} spatial={mode === 'desktop' || magic} />
        <HorrorEffects />
        <DirectorDriver paused={screen !== 'game'} />
        {screen === 'warning' && <ContentWarning />}
        {screen === 'title' && <TitleScreen mode={mode} />}
        {(screen === 'game' || screen === 'paused') &&
          (mode === 'mobile' && !magic ? (
            <MobilePresenter paused={screen === 'paused'} />
          ) : (
            <ErrorBoundary
              label={magic ? 'magic' : 'desktop'}
              onError={magic ? failMagic : fallBack}
            >
              {assetStatus === 'done' ? (
                <Suspense fallback={<LoadingScreen />}>
                  <DesktopPresenter
                    paused={screen === 'paused'}
                    onFallback={magic ? failMagic : fallBack}
                    magic={magic}
                  />
                </Suspense>
              ) : (
                <LoadingScreen />
              )}
            </ErrorBoundary>
          ))}
        {screen === 'settings' && (
          <SettingsScreen
            onBack={() => setScreen(settingsReturn.current)}
            mode={mode}
            onModeRequest={() => setRetry((value) => value + 1)}
          />
        )}
        {screen === 'gallery' && <GalleryScreen />}
        <DebugOverlay />
        {fallbackVisible && (
          <button className="realtime-banner" onClick={() => setFallbackVisible(false)}>
            {ui('shell.fallback_notice')}
          </button>
        )}
      </div>
    </div>
  )
}

/** Where the Telegram BackButton leads from each screen; null hides it. */
export function backTarget(screen: Screen, settingsReturn: Screen): Screen | null {
  switch (screen) {
    case 'game':
      return 'paused'
    case 'paused':
      return 'game'
    case 'settings':
      return settingsReturn
    case 'gallery':
      return 'title'
    default:
      return null
  }
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
