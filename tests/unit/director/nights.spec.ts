import { describe, expect, it } from 'vitest'
import { Director } from '@/core/director/director'
import { STILL, newRun } from '@/core/director/simulate'
import type { DirectorEvent, Sensors } from '@/core/director/types'
import { SEQUENCES } from '@/content/nights'
import { wordsOf } from '@/content/text'

/** R3: nights 2–5 as built from docs/BEATS.md. */
const profile = {
  name: 'Dilnoza',
  livesAlone: 'ha' as const,
  fear: 'qorongʻulik' as const,
  doorAtNight: 'yopiq' as const,
}

function start(id: string) {
  const d = new Director({ sequences: SEQUENCES, run: newRun(profile), wordsOf, record: true }, id)
  d.run.night = Number(id[1]) as 1
  return d
}
function run(d: Director, ms: number, sensors: Sensors | ((t: number) => Sensors) = STILL) {
  const events: DirectorEvent[] = []
  for (let t = 0; t < ms; t += 100)
    events.push(...d.tick(100, typeof sensors === 'function' ? sensors(t) : sensors))
  return events
}
const at = (zones: string[], extra: Partial<Sensors> = {}): Sensors => ({
  ...STILL,
  zones,
  ...extra,
})
const said = (d: Director) =>
  d.log.filter((l) => l.action.type === 'say').map((l) => (l.action as { line: string }).line)

describe('Night 2 — Devor', () => {
  it('waits for the night before its clock beats: the day is 13:20', () => {
    const d = start('n2')
    run(d, 5000)
    expect(d.firedBeats()).not.toContain('n2.316')
    expect(d.firedBeats()).not.toContain('n2.call')
    expect(d.world.daylight).toBe(true)
  })

  it('Muhabbat opa tells all three stages to a player who stays by 43', () => {
    const d = start('n2')
    run(d, 1000)
    run(d, 90_000, at(['stairwell', 'landing3', 'by_43']))
    expect(said(d)).toEqual(
      expect.arrayContaining(['N2-02', 'N2-05', 'N2-06', 'N2-09', 'N2-13', 'N2-14']),
    )
    expect(d.run.flags).toMatchObject({ heard_48: true, heard_sardor: true })
    expect(d.world.objects['muhabbat']).toBe('gone')
  })

  it('walking off cuts her short: she hushes, calls after them once, and Sardor is not told', () => {
    const d = start('n2')
    run(d, 1000)
    run(d, 3000, at(['stairwell', 'landing3', 'by_43']))
    run(d, 30_000, at(['stairwell', 'half_landing']))
    const lines = said(d)
    expect(lines.filter((l) => l === 'N2-14')).toHaveLength(1)
    expect(d.run.flags['heard_sardor']).toBeUndefined()
    expect(d.world.subtitle?.line ?? 'N2-14').toBe('N2-14')
  })

  it('if nobody comes down she talks at 47 and leaves the halva; then night falls', () => {
    const d = start('n2')
    run(d, 100_000, at(['room']))
    expect(said(d)).toEqual(expect.arrayContaining(['N2-02', 'N2-03', 'N2-05', 'N2-14']))
    expect(d.world.objects['halva']).toBe('threshold')
    expect(d.run.flags['night_started_n2']).toBe(true)
    expect(d.world.daylight).toBe(false)
    expect(d.world.phone).toMatchObject({ missed: 11, message: ['N2-16', 'N2-17'] })
  })

  it('the wardrobe opens on the coat; its pocket holds page 1', () => {
    const d = start('n2')
    run(d, 100_000, at(['room']))
    expect(d.input({ type: 'interact', target: 'coat_pocket' })).toBe(false)
    d.input({ type: 'interact', target: 'wardrobe' })
    expect(d.world.objects['wardrobe']).toBe('open')
    d.input({ type: 'interact', target: 'coat_pocket' })
    expect(d.world.readable).toBe('diary_1')
  })
})

describe('Night 3 — Takror', () => {
  it('the corridor: turning round raises the floorboard over page 6', () => {
    const d = start('n3')
    run(d, 120_000)
    run(d, 500, at(['corridor']))
    expect(d.run.flags['corridor_loop']).toBe(true)
    expect(d.input({ type: 'interact', target: 'floorboard' })).toBe(false)
    d.input({ type: 'interact', target: 'corridor_turned' })
    expect(d.world.objects['floorboard']).toBe('raised')
    d.input({ type: 'interact', target: 'floorboard' })
    expect(d.world.readable).toBe('diary_6')
  })

  it('running the corridor puts the player back by the sofa', () => {
    const d = start('n3')
    run(d, 120_000)
    run(d, 500, at(['corridor']))
    d.input({ type: 'interact', target: 'corridor_ran' })
    const events = run(d, 1000)
    expect(events.some((e) => e.type === 'place')).toBe(true)
    expect(d.run.flags['corridor_done']).toBe(true)
  })

  it('the TV shows someone on the sofa; looking at the real sofa leaves only static', () => {
    const d = start('n3')
    run(d, 1000)
    d.input({ type: 'interact', target: 'tv' })
    expect(d.world.objects['tv']).toBe('cam')
    expect(d.world.figure).toBe('tv_sofa')
    run(d, 1000, at(['room'], { looking: ['sofa'] }))
    expect(d.world.objects['tv']).toBe('static')
    expect(d.world.figure).toBeNull()
  })

  it('3:17 brings no knocks: a cough, then the voice with its window, then the palm', () => {
    const d = start('n3')
    run(d, 460_000)
    const sounds = d.log.filter((l) => l.action.type === 'sound' && l.t > 340_000)
    const ids = sounds.map((l) => (l.action as { id: string }).id)
    expect(ids).toContain('cough')
    expect(ids).not.toContain('knock_triple')
    expect(d.run.flags['n3_response']).toBe('silent')
    expect(d.log.some((l) => l.source === 'n3.palm')).toBe(true)
  })
})

describe('Night 4 — 48', () => {
  const after317 = () => {
    const d = start('n4')
    run(d, 1000)
    d.run.flags['power_off'] = true
    d.input({ type: 'interact', target: 'pillow' })
    return d
  }

  it('the phone is under the pillow and comes out of it', () => {
    const d = start('n4')
    run(d, 2000)
    expect(d.world.phone.place).toBe('pillow')
    d.input({ type: 'interact', target: 'pillow' })
    expect(d.world.phone.place).toBe('hand')
  })

  it('3:16 goes dark at once; one step outside, feet under the door; the door opens by itself', () => {
    const d = start('n4')
    run(d, 330_000)
    expect(d.log.find((l) => l.action.type === 'windows')?.action).toMatchObject({
      state: 'allAtOnce',
    })
    expect(d.firedBeats()).toEqual(expect.arrayContaining(['n4.step', 'n4.feet']))
    expect(d.world.doors).toMatchObject({ front_door: 'ajar', door48: 'ajar' })
    expect(d.world.objects['seal']).toBe('torn')
  })

  it('the peephole shows the figure once and leaves wet footprints', () => {
    const d = after317()
    d.input({ type: 'interact', target: 'peephole' })
    expect(d.world.figure).toBe('peephole')
    expect(d.run.flags['saw_figure']).toBe(true)
    expect(d.input({ type: 'interact', target: 'peephole' })).toBe(false)
  })

  it('chaining the door instead: the voice speaks at the door half a minute later', () => {
    const d = after317()
    d.input({ type: 'interact', target: 'chain' })
    expect(d.run.flags['retreated']).toBe(true)
    run(d, 31_000)
    expect(said(d)).toEqual(['N4-09', 'N4-10'])
    expect(d.run.flags['n4_spoke']).toBe('none')
  })

  it('in 48: the calendar and the passport are papers in the hand', () => {
    const d = after317()
    run(d, 500, at(['hall48']))
    expect(d.run.flags['entered_48']).toBe(true)
    d.input({ type: 'interact', target: 'calendar' })
    expect(d.world.readable).toBe('calendar')
    d.input({ type: 'closeReadable' })
    d.input({ type: 'interact', target: 'belongings' })
    expect(d.world.readable).toBe('passport')
  })
})

describe('Night 5 — 3:17', () => {
  it('the clock comes off the wall; page 7 is behind it; the key will not turn yet', () => {
    const d = start('n5')
    run(d, 1000)
    d.input({ type: 'interact', target: 'clock' })
    expect(d.world.objects['clock']).toBe('in_hand')
    d.input({ type: 'interact', target: 'clock_wall' })
    expect(d.world.readable).toBe('diary_7')
    expect(d.input({ type: 'interact', target: 'keyhole' })).toBe(true)
    expect(d.sequenceId).toBe('n5')
  })

  it('holds at 3:17 with knocks and "Eshikni och" until the player acts', () => {
    const d = start('n5')
    run(d, 380_000)
    expect(d.run.flags['open_the_door']).toBe(true)
    expect(d.world.phone.screen).toBe('dead')
    expect(Math.floor(d.world.clock)).toBe(197)
    expect(said(d).filter((l) => l === 'N5-07').length).toBeGreaterThanOrEqual(3)
  })

  it('taking the stairs down is ending B, at any time of the night', () => {
    const d = start('n5')
    run(d, 1000)
    run(d, 200, at(['stairwell']))
    expect(d.sequenceId).toBe('endB')
  })
})
