import { line, ui } from '@/content/text'
import { useEffect, useState } from 'react'
import { onDirectorEvents, useGame } from '../gameStore'
import { RentalForm } from '../RentalForm'
import './play.css'

/**
 * What may appear over the world during play (REDESIGN §1.7): words someone says out loud,
 * the rental form when it is handed over, and darkness. Nothing else.
 */
export function PlayOverlays({ controls }: { controls: boolean }) {
  const world = useGame((s) => s.world)
  const name = useGame((s) => s.run?.profile?.name ?? '')
  return (
    <>
      <Fade />
      {controls && <ControlsCard />}
      {world?.subtitle && (
        <p
          className={`subtitle-line speaker-${world.subtitle.speaker}`}
          key={`${world.subtitle.line}:${world.subtitle.until}`}
          aria-live="polite"
        >
          {line(world.subtitle.line, name)}
        </p>
      )}
      {world?.form && <RentalForm />}
    </>
  )
}

/** Fades to and from black when the Director asks (a night's dawn, an ending). */
function Fade() {
  const [fade, setFade] = useState<{ black: boolean; ms: number }>({ black: false, ms: 0 })
  useEffect(
    () =>
      onDirectorEvents((events) => {
        for (const event of events)
          if (event.type === 'fade') setFade({ black: event.to === 'black', ms: event.ms })
      }),
    [],
  )
  return (
    <div
      className="play-fade"
      aria-hidden="true"
      style={{ opacity: fade.black ? 1 : 0, transitionDuration: `${fade.ms}ms` }}
    />
  )
}

/** Controls, for the first 15 s of night 1 only, then gone (REDESIGN §2). */
function ControlsCard() {
  const night = useGame((s) => s.world?.night)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 15_000)
    return () => clearTimeout(timer)
  }, [])
  if (night !== 1 || !visible) return null
  return (
    <aside className="controls-card">
      {ui('desktop.controls')
        .split(' · ')
        .map((row) => (
          <span key={row}>{row}</span>
        ))}
    </aside>
  )
}
