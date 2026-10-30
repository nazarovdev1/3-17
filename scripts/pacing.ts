/**
 * npm run metrics:pacing — R6: what an idle player perceives, night by night. Lists the longest
 * stretches with nothing to hear or see, and the event rate in each part of the night, against
 * the tension curve of docs/BEATS.md (quiet → unease → build → peak → release).
 */
import { SEQUENCES } from '../src/content/nights'
import { wordsOf } from '../src/content/text'
import { simulate, newRun, STILL } from '../src/core/director/simulate'
import type { Action } from '../src/core/director/types'
import type { PlayerProfile } from '../src/core/state/types'

const profile: PlayerProfile = {
  name: 'Dilnoza',
  livesAlone: 'ha',
  fear: 'qorongʻulik',
  doorAtNight: 'yopiq',
}
const PERCEIVED = new Set<Action['type']>([
  'sound',
  'say',
  'object',
  'phone',
  'door',
  'windows',
  'figure',
  'light',
  'power',
  'camera',
  'haptic',
])
/** The longest quiet the curve allows: the opening hold is longer than the build. */
const MAX_GAP_S = { quiet: 75, unease: 50, build: 35 }
const errors: string[] = []

for (const night of [1, 2, 3, 4, 5]) {
  const id = `n${night}`
  const run = newRun(profile)
  run.night = night as 1
  const sensors = { ...STILL, zones: night === 1 ? ['landing'] : ['room'] }
  const { director } = simulate(SEQUENCES, {
    start: id,
    run,
    wordsOf,
    maxMs: 12 * 60_000,
    stepMs: 100,
    script: {
      sensors: () => sensors,
      inputs: [{ at: 25_000, input: (d) => (d.world.form ? { type: 'form', profile } : null) }],
      until: (d) => d.sequenceId !== id,
    },
  })
  const cut =
    director.log.find((l) => l.action.type === 'power' && !l.action.on)?.t ?? director.elapsed
  const times = [
    ...new Set(
      director.log
        .filter((l) => PERCEIVED.has(l.action.type) && l.t <= cut + 40_000)
        .map((l) => Math.round(l.t / 1000)),
    ),
  ].sort((a, b) => a - b)
  const phase = (t: number) => (t < cut * 0.4 ? 'quiet' : t < cut * 0.85 ? 'unease' : 'build')
  const gaps: string[] = []
  let worst = 0
  for (let i = 0; i + 1 < times.length; i++) {
    const gap = times[i + 1]! - times[i]!
    const p = phase(times[i]! * 1000)
    if (gap > worst) worst = gap
    if (gap > MAX_GAP_S[p]) {
      gaps.push(`${times[i]}–${times[i + 1]} s (${gap} s, ${p})`)
      errors.push(
        `${id}: ${gap} s with nothing perceivable at ${times[i]} s (${p}, limit ${MAX_GAP_S[p]} s)`,
      )
    }
  }
  const rate = (a: number, b: number) =>
    (times.filter((t) => t * 1000 >= a && t * 1000 < b).length / ((b - a) / 60_000)).toFixed(1)
  console.log(
    `${id}: 3:17 at ${(cut / 1000).toFixed(0)} s · events/min quiet ${rate(0, cut * 0.4)} → unease ${rate(cut * 0.4, cut * 0.85)} → build ${rate(cut * 0.85, cut)} · longest gap ${worst} s${gaps.length ? ' · GAPS ' + gaps.join(', ') : ''}`,
  )
  const u = Number(rate(cut * 0.4, cut * 0.85))
  const b = Number(rate(cut * 0.85, cut))
  if (b < u)
    errors.push(`${id}: the build (${b}/min) is calmer than the unease before it (${u}/min)`)
}
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`)
  process.exit(1)
}
console.log('✓ metrics:pacing passes')
