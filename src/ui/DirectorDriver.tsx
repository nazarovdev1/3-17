import { useEffect, useRef } from 'react'
import { useGame } from './gameStore'

/**
 * Time passes by itself (REDESIGN §1.4): one frame loop advances the Director while a night
 * is running, whatever the presenter. Paused, hidden or in a menu, the world waits.
 */
export function DirectorDriver({ paused }: { paused: boolean }) {
  // One loop for the shell's whole life: pausing must not re-register it, or it would run
  // after the presenters' frame callbacks instead of before them.
  const stopped = useRef(paused)
  useEffect(() => {
    stopped.current = paused
  }, [paused])
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      // A long gap (tab hidden, debugger) must not fire a minute of beats at once.
      const dt = Math.min(now - last, 100)
      last = now
      if (!stopped.current && !document.hidden) useGame.getState().step(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return null
}
