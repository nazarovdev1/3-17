import { useEffect, useSyncExternalStore } from 'react'
import { audio } from './engine'
import { audioScene } from './presentation'
import { useGame, onEngineEvents } from '@/ui/gameStore'
import { useSettings } from '@/ui/settingsStore'
import { getWebApp } from '@/platform/telegram/adapter'
import type { GameMode } from '@/platform/device/mode'

/** One audio owner across presenters; all hooks/listeners are cleaned up. */
export function AudioController({ mode }: { mode: GameMode }) {
  const status = useSyncExternalStore(audio.subscribe, audio.getSnapshot)
  const screen = useGame((s) => s.screen)

  useEffect(() => {
    audio.setSpatial(mode === 'desktop')
  }, [mode])
  useEffect(() => {
    audio.initialize()
    const sync = () => {
      const game = useGame.getState()
      audio.setPaused('menu', game.screen === 'paused' || game.screen === 'settings')
      audio.setScene(audioScene(game.screen, game.currentStep), game.run?.sanity)
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
    let lastClockBanner = useGame.getState().realClock317Visible
    const unsubscribeGame = useGame.subscribe((game) => {
      sync()
      if (game.realClock317Visible && !lastClockBanner) audio.play('knock_soft', [1.5, 0, -1])
      lastClockBanner = game.realClock317Visible
    })
    const unsubscribeSettings = useSettings.subscribe((settings) =>
      audio.setVolumes(settings.settings),
    )
    const unsubscribeEvents = onEngineEvents((events, step, previous) => {
      const game = useGame.getState()
      const active = game.screen === 'game' || game.screen === 'form' || game.screen === 'ending'
      if (!active) return
      // The committed step's ambient state is in place before its sounds play.
      audio.setScene(audioScene(step.node.ending ? 'ending' : 'game', step), step.state.sanity)
      for (const event of events) {
        if (event.kind !== 'sfx') continue
        // Ticking exists only in Ending C's loop. The authored inspection cues
        // stay silent and the winding cue is represented by that same loop.
        if (event.id === 'clock_tick') continue
        audio.play(event.id, event.id.startsWith('knock') ? [1.5, 0, -1] : undefined)
      }
      if (
        step.node.lines.some((line) => line.speaker === 'voice') &&
        !events.some((event) => event.kind === 'sfx' && event.id === 'whisper')
      )
        audio.play('whisper')
      const before = previous?.node.location
      if (
        before &&
        before !== step.node.location &&
        !step.node.ending &&
        !events.some((event) => event.kind === 'sfx' && event.id.startsWith('step_'))
      ) {
        audio.play(
          ['kitchen', 'bathroom', 'stairwell'].includes(step.node.location)
            ? 'step_tile'
            : 'step_wood',
        )
      }
      if (step.node.ending === 'A') audio.play('knock_triple', [1.5, 0, -1])
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

  return status === 'locked' && ['title', 'game', 'form', 'ending'].includes(screen) ? (
    <button className="audio-unlock" aria-label="Tovushni yoqish" onClick={audio.unlock}>
      Davom etish uchun bosing
    </button>
  ) : null
}
