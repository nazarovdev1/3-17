import { useEffect, useState } from 'react'
import { useGame } from './gameStore'
import { ContentWarning } from './ContentWarning'
import { TitleScreen } from './TitleScreen'
import { RentalForm } from './RentalForm'
import { SettingsScreen } from './SettingsScreen'
import { GameScreen } from './GameScreen'
import { MobilePresenter } from '@/presenters/mobile/MobilePresenter'
import { EndingScreen } from './EndingScreen'
import { GalleryScreen } from './GalleryScreen'
import { DebugOverlay } from '@/debug/DebugOverlay'
import { useSettings } from './settingsStore'
import { detectMode, type GameMode } from '@/platform/device/mode'
import { checkGpu } from '@/platform/device/gpu'
import './shell.css'

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

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const webglOk = hasWebGL()
      const gpuOk = webglOk ? await checkGpu() : false
      if (cancelled) return
      const next = detectMode({
        setting: settingsMode,
        pointerFine: window.matchMedia('(pointer: fine)').matches,
        viewportWidth: window.innerWidth,
        webglAvailable: webglOk,
        gpuOk,
      })
      setMode(next)
      setBootDone(true)
    }
    void boot()
    const onResize = () => {
      setMode((current) =>
        settingsMode !== 'auto'
          ? current
          : detectMode({
              setting: 'auto',
              pointerFine: window.matchMedia('(pointer: fine)').matches,
              viewportWidth: window.innerWidth,
              webglAvailable: hasWebGL(),
              gpuOk: true,
            }),
      )
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
    }
  }, [settingsMode])

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
    const timer = window.setInterval(() => {
      const now = new Date()
      if (now.getHours() === 3 && now.getMinutes() === 17) {
        useGame.getState().showRealClock317()
      }
    }, 20_000)
    return () => window.clearInterval(timer)
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
    <div className={`text-${useSettings.getState().settings.textSize.toLowerCase()} phones`}>
      <div className="phone-frame">
        {screen === 'warning' && <ContentWarning />}
        {screen === 'title' && <TitleScreen mode={mode} />}
        {screen === 'form' && <RentalForm />}
        {(screen === 'game' || screen === 'paused') &&
          (mode === 'mobile' ? (
            <MobilePresenter paused={screen === 'paused'} />
          ) : (
            <GameScreen paused={screen === 'paused'} />
          ))}
        {screen === 'settings' && <SettingsScreen onBack={() => setScreen('title')} mode={mode} />}
        {screen === 'ending' && <EndingScreen />}
        {screen === 'gallery' && <GalleryScreen />}
        <DebugOverlay />
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
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
