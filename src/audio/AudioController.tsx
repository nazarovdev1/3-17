import { ui } from '@/content/text'
import { useEffect, useSyncExternalStore } from 'react'
import { audio } from './engine'
import { SOUND_IDS } from './synthesis'
import { useGame, onDirectorEvents } from '@/ui/gameStore'
import { useSettings } from '@/ui/settingsStore'
import { getWebApp, TelegramAdapter } from '@/platform/telegram/adapter'
import type { GameMode } from '@/platform/device/mode'
import type { SfxId } from '@/core/state/types'
import type { AudioScene } from './engine'
import type { Screen } from '@/ui/gameStore'
import type { WorldState } from '@/core/director/types'
import { SHARED_WALL, soundPosition } from './positions'

const KNOWN = new Set<string>(SOUND_IDS)
/** Sounds the Director asks for that have no recording yet are skipped, never faked. */
const isSfx = (id: string): id is SfxId => KNOWN.has(id)

/** The ambient bed: the menu's hum, or whatever the world's current scene is. */
export function audioScene(screen: Screen, world: WorldState | null): AudioScene {
  if (screen === 'title' || screen === 'gallery') return 'title'
  if (screen !== 'game' || !world) return 'off'
  return world.scene
}

/** One audio owner across presenters; the Director decides what plays and where. */
export function AudioController({ mode }: { mode: GameMode }) {
  const status = useSyncExternalStore(audio.subscribe, audio.getSnapshot)
  const screen = useGame((s) => s.screen)

  useEffect(() => {
    audio.setSpatial(mode === 'desktop')
  }, [mode])
  useEffect(() => {
    audio.initialize()
    const telegram = new TelegramAdapter()
    let listening = false
    const sync = () => {
      const game = useGame.getState()
      audio.setPaused('menu', game.screen === 'paused' || game.screen === 'settings')
      audio.setScene(audioScene(game.screen, game.world), game.run?.sanity)
      const wantsListening = game.screen === 'game' && !!game.world?.listening
      if (wantsListening !== listening) {
        listening = wantsListening
        audio.setListening(wantsListening, SHARED_WALL)
      }
    }
    const visibility = () => {
      audio.setPaused('hidden', document.visibilityState === 'hidden')
      if (document.visibilityState === 'hidden') useGame.getState().saveNow()
    }
    const gesture = () => audio.unlock()
    const deactivated = () => {
      audio.setPaused('telegram', true)
      useGame.getState().saveNow()
    }
    const activated = () => audio.setPaused('telegram', false)
    const pagehide = () => {
      audio.setPaused('pagehide', true)
      useGame.getState().saveNow()
    }
    const pageshow = () => audio.setPaused('pagehide', false)
    const unsubscribeGame = useGame.subscribe(sync)
    const unsubscribeSettings = useSettings.subscribe((settings) =>
      audio.setVolumes(settings.settings),
    )
    const unsubscribeEvents = onDirectorEvents((events, world) => {
      if (useGame.getState().screen !== 'game') return
      for (const event of events) {
        if (event.type === 'scene') audio.setScene(event.scene, useGame.getState().run?.sanity)
        if (event.type === 'haptic') telegram.haptic(event.pattern)
        if (event.type !== 'sound' || !isSfx(event.id)) continue
        audio.play(event.id, soundPosition(event.at), event.volume ?? 1)
      }
      void world
    })
    audio.setVolumes(useSettings.getState().settings)
    sync()
    visibility()
    document.addEventListener('pointerdown', gesture, true)
    document.addEventListener('keydown', gesture, true)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', pagehide)
    window.addEventListener('pageshow', pageshow)
    const app = getWebApp()
    app?.onEvent?.('deactivated', deactivated)
    app?.onEvent?.('activated', activated)
    return () => {
      unsubscribeGame()
      unsubscribeSettings()
      unsubscribeEvents()
      document.removeEventListener('pointerdown', gesture, true)
      document.removeEventListener('keydown', gesture, true)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', pagehide)
      window.removeEventListener('pageshow', pageshow)
      app?.offEvent?.('deactivated', deactivated)
      app?.offEvent?.('activated', activated)
      audio.dispose()
    }
  }, [])

  return status === 'locked' && ['title', 'game'].includes(screen) ? (
    <button
      className="audio-unlock"
      aria-label={ui('shell.audio_unlock_label')}
      onClick={audio.unlock}
    >
      {ui('shell.audio_unlock')}
    </button>
  ) : null
}
