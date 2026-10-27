import { useEffect, useRef, useState } from 'react'
import type { GameState } from '@/core/state/types'
import { phoneTime } from '../desktop/phone'
import { coverPoint, type StillMotion } from './still-renderer'

/** The captured phone keeps its clock area blank; live story time is drawn over that area. */
export function PhoneClock({
  state,
  width,
  height,
  motion,
  reduced,
  paused,
}: {
  state: GameState
  width: number
  height: number
  motion: { current: StillMotion }
  reduced: boolean
  paused: boolean
}) {
  const [, minute] = useState(0)
  const label = useRef<HTMLSpanElement>(null)
  const point = coverPoint(0.505, 0.349, width, height)
  const scale = Math.max(width / 1080, height / 1920)
  useEffect(() => {
    const timer = setInterval(() => minute((value) => value + 1), 60_000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (reduced || paused) {
      if (label.current) label.current.style.transform = 'translate(-50%,-50%) rotate(-2.29deg)'
      return
    }
    let raf = 0
    const follow = () => {
      const m = motion.current
      if (label.current)
        label.current.style.transform = `translate(calc(-50% - ${m.x * 0.00065 * 1080 * scale * 0.98}px),calc(-50% - ${m.y * 0.00065 * 1920 * scale * 0.98}px)) rotate(-2.29deg)`
      raf = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(raf)
  }, [motion, reduced, paused, scale])
  return (
    <span
      ref={label}
      className="phone-clock"
      aria-hidden="true"
      style={{ left: point.x, top: point.y, fontSize: 102 * scale }}
    >
      {phoneTime(state)}
    </span>
  )
}
