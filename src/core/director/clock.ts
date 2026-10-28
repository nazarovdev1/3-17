/** In-game clock: minutes since 00:00 of the current segment (day or night). */
export type GameClock = `${number}:${number}`

export function parseClock(clock: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock)
  if (!match) throw new Error(`clock: bad time "${clock}"`)
  return Number(match[1]) * 60 + Number(match[2])
}

/** 197.4 → "03:17" (always two-digit hours, as the phone shows it). */
export function formatClock(minutes: number): string {
  const whole = Math.floor(minutes)
  const h = Math.floor(whole / 60) % 24
  const m = whole % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
