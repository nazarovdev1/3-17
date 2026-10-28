import { ui } from '@/content/text'
import { useEffect, useState } from 'react'
import { onDirectorEvents, useGame } from './gameStore'
import { useSettings } from './settingsStore'
import './horror.css'

/**
 * The night-4 fake glitch (REDESIGN §5): a short picture tear with no words, never a modal
 * or an input blocker. Reduce flashing removes it entirely.
 */
export function HorrorEffects() {
  const [active, setActive] = useState(false)
  const screen = useGame((state) => state.screen)
  const reduced = useSettings((state) => state.settings.reduceFlashing)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = onDirectorEvents((events) => {
      const event = events.find((e) => e.type === 'fx' && e.id === 'glitch_fake')
      if (!event || event.type !== 'fx' || useSettings.getState().settings.reduceFlashing) return
      if (timer) clearTimeout(timer)
      setActive(true)
      timer = setTimeout(() => setActive(false), Math.min(3000, Math.max(0, event.ms ?? 2500)))
    })
    const hide = () => {
      if (document.hidden) {
        if (timer) clearTimeout(timer)
        setActive(false)
      }
    }
    document.addEventListener('visibilitychange', hide)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', hide)
      if (timer) clearTimeout(timer)
    }
  }, [])
  if (!active || reduced || screen !== 'game') return null
  return <div className="signal-loss" role="presentation" aria-label={ui('shell.glitch_label')} />
}
