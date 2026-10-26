import { useEffect, useState } from 'react'
import { onEngineEvents, useGame } from './gameStore'
import { useSettings } from './settingsStore'
import './horror.css'

/** A finite visual cue, never a modal or an input blocker. */
export function HorrorEffects() {
  const [active, setActive] = useState<{ node: string } | null>(null)
  const screen = useGame((state) => state.screen)
  const node = useGame((state) => state.currentStep?.node.id)
  const reduced = useSettings((state) => state.settings.reduceFlashing)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = onEngineEvents((events, step, previous) => {
      if (step.state.night !== 4 || previous?.state.flags['glitch_done']) return
      const event = events.find((event) => event.kind === 'fx' && event.id === 'glitch_fake')
      if (!event || event.kind !== 'fx' || useSettings.getState().settings.reduceFlashing) return
      const duration = Math.min(3000, Math.max(0, event.durationMs ?? 2500))
      if (timer) clearTimeout(timer)
      setActive({ node: step.node.id })
      timer = setTimeout(() => setActive(null), duration)
    })
    const hide = () => {
      if (document.hidden) {
        if (timer) clearTimeout(timer)
        setActive(null)
      }
    }
    document.addEventListener('visibilitychange', hide)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', hide)
      if (timer) clearTimeout(timer)
    }
  }, [])
  if (!active || reduced || screen !== 'game' || node !== active.node) return null
  return (
    <div className="signal-loss" role="status" aria-label="Xona tasviri buzildi">
      <span>47 / 48</span>
      <strong>Signal yoʻqoldi</strong>
      <span>3:17</span>
    </div>
  )
}
