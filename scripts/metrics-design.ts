/**
 * npm run metrics:design — plays every night headlessly with accelerated time and checks the
 * redesign's gates (REDESIGN §10). Fails the build when the design regresses into a book.
 */
import { SEQUENCES, READABLES, ENDING_C } from '../src/content/nights'
import { wordsOf } from '../src/content/text'
import { simulate, newRun, STILL } from '../src/core/director/simulate'
import { evaluateCondition } from '../src/core/director/conditions'
import { noTextShare, textUses, worstCaseWords, NO_TEXT_SHARE } from '../src/core/validate/beats'
import type { Action, Sensors } from '../src/core/director/types'
import type { PlayerProfile } from '../src/core/state/types'

const profile: PlayerProfile = {
  name: 'Dilnoza',
  livesAlone: 'ha',
  fear: 'qorongʻulik',
  doorAtNight: 'yopiq',
}
const errors: string[] = []
const rows: string[] = []
const VISIBLE = new Set<Action['type']>([
  'sound',
  'say',
  'object',
  'phone',
  'form',
  'door',
  'windows',
  'figure',
  'light',
  'power',
])

for (const night of [1, 2, 3, 4, 5]) {
  const id = `n${night}`
  const sequence = SEQUENCES[id]!
  const run = newRun(profile)
  run.night = night as 1
  const zone = night === 1 ? ['landing'] : ['room']
  const sensors: Sensors = { ...STILL, zones: zone }
  const { director } = simulate(SEQUENCES, {
    start: id,
    run,
    wordsOf,
    maxMs: 12 * 60_000,
    stepMs: 100,
    script: {
      sensors: () => sensors,
      // The idle player signs the rental form when it is pressed into their hands.
      inputs: [{ at: 25_000, input: (d) => (d.world.form ? { type: 'form', profile } : null) }],
      until: (d) => d.sequenceId !== id,
    },
  })
  const log = director.log
  // Idle: at least two things happen in the first 90 s of standing still.
  const early = new Set(
    log.filter((l) => l.t <= 90_000 && VISIBLE.has(l.action.type)).map((l) => l.source),
  )
  if (early.size < 2)
    errors.push(`${id}: only ${early.size} event source(s) in the first 90 s of idling`)
  // 3:17 by itself, within 9 real minutes.
  const cut = log.find((l) => l.action.type === 'power' && !l.action.on)
  if (!cut) errors.push(`${id}: the power never goes off for an idle player`)
  else if (cut.t > 9 * 60_000)
    errors.push(`${id}: 3:17 only after ${(cut.t / 60_000).toFixed(1)} min`)
  // Real silence before whatever comes from the wall.
  const next =
    cut && log.find((l) => l.t > cut.t && (l.action.type === 'sound' || l.action.type === 'say'))
  const silence = cut && next ? (next.t - cut.t) / 1000 : 0
  if (cut && silence < 6)
    errors.push(`${id}: only ${silence.toFixed(1)} s of silence after the power cut`)
  // Words, reading time and beats without text.
  const uses = textUses(sequence, { readables: READABLES })
  const words = worstCaseWords(
    uses.filter((u) => !u.diary).map((u) => u.key),
    wordsOf,
  )
  const share = noTextShare(sequence, { readables: READABLES })
  if (share < NO_TEXT_SHARE)
    errors.push(`${id}: only ${(share * 100).toFixed(0)}% of beats carry no text`)
  const end =
    log.find((l) => l.action.type === 'endNight' || l.action.type === 'ending')?.t ??
    director.elapsed
  const reading = (words / 180) * 60
  rows.push(
    `${id}: 3:17 at ${cut ? (cut.t / 1000).toFixed(0) : '—'} s · silence ${silence.toFixed(1)} s · ` +
      `idle events ${early.size} · words ${words} · reading ${reading.toFixed(0)} s of ${(end / 1000).toFixed(0)} s ` +
      `(${((reading / (end / 1000)) * 100).toFixed(0)}%) · no-text beats ${(share * 100).toFixed(0)}%`,
  )
}

// Endings: each reachable from night 5, and each keeps non-text key events.
const reach: Record<string, () => Sensors> = {
  A: () => ({ ...STILL, zones: ['room48'] }),
  B: () => ({ ...STILL, zones: ['stairwell'] }),
  C: () => STILL,
}
for (const ending of ['A', 'B', 'C'] as const) {
  const run = newRun(profile)
  run.night = 5
  if (ending === 'C') {
    for (let i = 1; i <= 7; i++) run.inventory.push(`diary_${i}`)
    for (let i = 1; i <= 5; i++) run.inventory.push(`mom_msg_${i}`)
    if (!evaluateCondition(ENDING_C, run))
      errors.push('ending C: test run does not meet its own conditions')
  }
  const { director } = simulate(SEQUENCES, {
    start: 'n5',
    run,
    wordsOf,
    maxMs: 12 * 60_000,
    script: {
      sensors: (_t, d) => (d.run.flags['open_the_door'] ? reach[ending]!() : STILL),
      inputs: [
        { at: 1000, input: { type: 'interact', target: 'front_door' } },
        { at: 2000, input: { type: 'interact', target: 'clock' } },
        ...Array.from({ length: 40 }, (_, i) => ({
          at: 240_000 + i * 5000,
          input: (d: typeof director) =>
            ending === 'C' && d.run.flags['open_the_door']
              ? ({ type: 'interact', target: 'keyhole' } as const)
              : null,
        })),
        ...Array.from({ length: 60 }, (_, i) => ({
          at: 250_000 + i * 2000,
          input: (d: typeof director) =>
            d.sequenceId === `end${ending}`
              ? ending === 'A'
                ? ({ type: 'knock3', target: 'party_wall48' } as const)
                : ending === 'C' && d.world.phone.screen === 'incoming'
                  ? ({ type: 'interact', target: 'phone_call' } as const)
                  : null
              : null,
        })),
      ],
      until: (d) => d.world.finished,
    },
  })
  if (director.sequenceId !== `end${ending}` || !director.world.finished)
    errors.push(`ending ${ending}: not reached from night 5 (stopped in ${director.sequenceId})`)
  const actions = director.log
    .filter((l) => l.source.startsWith(`end${ending}`))
    .map((l) => l.action.type)
  const keyEvents = actions.filter((t) =>
    ['sound', 'door', 'phone', 'object', 'power', 'scene', 'figure'].includes(t),
  )
  if (keyEvents.length < 2)
    errors.push(`ending ${ending}: key events are not carried by sound or picture`)
  rows.push(`end${ending}: reached · ${keyEvents.length} non-text key events`)
}

const totalWords = worstCaseWords(
  Object.values(SEQUENCES).flatMap((s) => textUses(s, { readables: READABLES }).map((u) => u.key)),
  wordsOf,
)
rows.push(`whole game: ${totalWords} visible words (budget 900)`)
if (totalWords > 900) errors.push(`game: ${totalWords} visible words`)

for (const row of rows) console.log(row)
if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`)
  process.exit(1)
}
console.log('✓ metrics:design gates pass')
