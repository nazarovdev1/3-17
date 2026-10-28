import { useEffect, useState } from 'react'
import { emitDirectorEvents, getDirector, useGame } from '@/ui/gameStore'
import { getLog } from '@/ui/errorLog'
import { audio } from '@/audio/engine'
import { formatClock } from '@/core/director/clock'
import type { DirectorEvent, PlayerInput } from '@/core/director/types'
import { desktopRuntime, getDesktopState } from '@/platform/device/desktopRuntime'

const DEBUG_KEY = 'g317:debug'
const GAME_API_KEY = '__game' as const
/** Test builds only (`VITE_GAME_API=1`, see `npm run e2e`). Production builds compile
 * the window.__game API out entirely (spec 11); the overlay itself stays available. */
const GAME_API_ENABLED = import.meta.env.VITE_GAME_API === '1'

function isDebug(): boolean {
  try {
    return (
      new URLSearchParams(window.location.search).get('debug') === '1' ||
      window.localStorage.getItem(DEBUG_KEY) === '1'
    )
  } catch {
    return false
  }
}

/**
 * Debug view (REDESIGN §2): the night clock, the beats that fired, flags, sanity and items,
 * with speed controls — the development view that replaces the text presenter. In a test
 * build it also attaches the window.__game API.
 */
export function DebugOverlay() {
  const [active] = useState(isDebug)
  const [fps, setFps] = useState(0)
  const [open, setOpen] = useState(true)
  const [, refresh] = useState(0)

  useEffect(() => {
    if (!active) return
    let frames = 0
    let last = performance.now()
    let raf = 0
    const loop = () => {
      frames++
      const now = performance.now()
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)))
        refresh((n) => n + 1)
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])

  const screen = useGame((s) => s.screen)
  const world = useGame((s) => s.world)
  const run = useGame((s) => s.run)
  const speed = useGame((s) => s.speed)
  const errors = getLog().slice(-5)
  const desktop = getDesktopState()
  const director = getDirector()

  useEffect(() => {
    if (!GAME_API_ENABLED || !active) return
    const game = () => useGame.getState()
    ;(window as unknown as Record<string, unknown>)[GAME_API_KEY] = {
      getState: () => game().run,
      getWorld: () => (getDirector() ? { ...getDirector()!.world } : null),
      getSequence: () => getDirector()?.sequenceId ?? null,
      getClock: () => (getDirector() ? formatClock(getDirector()!.world.clock) : null),
      firedBeats: () => getDirector()?.firedBeats() ?? [],
      interactables: () => [...(getDirector()?.interactables() ?? [])],
      input: (input: PlayerInput) => game().input(input),
      setClock: (clock: string) => game().debug.setClock(clock),
      startNight: (night: number) => game().debug.startNight(night),
      playSequence: (id: string) => game().debug.playSequence(id),
      setSpeed: (value: number) => game().debug.setSpeed(value),
      setSanity: (n: number) => game().debug.setSanity(n),
      setFlag: (k: string, v: boolean | number | string) => game().debug.setFlag(k, v),
      setTime: (iso: string) => {
        const run = game().run
        if (run) run.lastPlayedAt = iso
      },
      getScreen: () => game().screen,
      /** Test builds: place the desktop camera (x, z[, yaw]) without walking there. */
      teleport: (x: number, z: number, yaw?: number) => {
        desktopRuntime.teleport = yaw === undefined ? [x, z] : [x, z, yaw]
      },
      /** Test builds: deliver Director events (an effect) as the Director would. */
      emit: (events: DirectorEvent[]) => emitDirectorEvents(events),
      getAudioState: () => audio.inspect(),
      getDesktopState,
    }
    return () => {
      delete (window as unknown as Record<string, unknown>)[GAME_API_KEY]
    }
  }, [active])

  if (!active || !open) {
    return active ? (
      <button
        onClick={() => setOpen(true)}
        style={{ position: 'fixed', top: 4, left: 4, width: 'auto', zIndex: 9999 }}
      >
        dbg
      </button>
    ) : null
  }

  const fired = director?.firedBeats() ?? []
  return (
    <div className="debug-overlay">
      <div>
        <button onClick={() => setOpen(false)}>—</button> FPS {fps} · ekran {screen}
      </div>
      <div>
        {world
          ? `${world.sequence} · ${formatClock(world.clock)}${world.frozen ? ' (to‘xtagan)' : ''} · ×${world.timeScale * speed}`
          : '—'}
      </div>
      <div>
        presenter: {desktop.mounted ? 'desktop' : 'mobile'}
        {desktop.mounted && ` · ${desktop.tier} · ${desktop.fps.toFixed(0)} FPS`}
      </div>
      <div>es-hush: {run?.sanity ?? '—'}</div>
      <div>inv: {run && run.inventory.length > 0 ? run.inventory.join(', ') : '—'}</div>
      <div>flags: {run && Object.keys(run.flags).length > 0 ? JSON.stringify(run.flags) : '—'}</div>
      <div>beats: {fired.slice(-8).join(' · ') || '—'}</div>
      {errors.map((e, i) => (
        <div key={i} style={{ color: '#e8a0a0' }}>
          {e.kind}: {e.message.slice(0, 90)}
        </div>
      ))}
      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
        {[1, 8, 60].map((value) => (
          <button key={value} onClick={() => useGame.getState().debug.setSpeed(value)}>
            ×{value}
          </button>
        ))}
        {[1, 2, 3, 4, 5].map((night) => (
          <button key={night} onClick={() => useGame.getState().debug.startNight(night)}>
            {night}
          </button>
        ))}
      </div>
    </div>
  )
}
