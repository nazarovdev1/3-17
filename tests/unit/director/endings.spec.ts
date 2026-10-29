import { describe, expect, it } from 'vitest'
import { Director } from '@/core/director/director'
import { STILL, newRun } from '@/core/director/simulate'
import type { DirectorEvent, Sensors } from '@/core/director/types'
import { SEQUENCES } from '@/content/nights'
import { wordsOf } from '@/content/text'
import { canWalk } from '@/content/world/walk'
import { objectPoint } from '@/content/world/objects'
import { REACH } from '@/presenters/desktop/layout'

/** R4: the endings as set pieces (docs/BEATS.md "Endings"). */
function play(id: string) {
  const run = newRun({ name: 'Dilnoza', livesAlone: 'ha', fear: 'kuzatuv', doorAtNight: 'yopiq' })
  run.night = 5
  return new Director({ sequences: SEQUENCES, run, wordsOf, record: true }, id)
}
function tick(d: Director, ms: number, sensors: Sensors | (() => Sensors) = STILL) {
  const events: DirectorEvent[] = []
  for (let t = 0; t < ms && !d.world.finished; t += 100)
    events.push(...d.tick(100, typeof sensors === 'function' ? sensors() : sensors))
  return events
}
const said = (d: Director) =>
  d.log.filter((l) => l.action.type === 'say').map((l) => (l.action as { line: string }).line)

describe('Ending A — Qoʻshni', () => {
  it('the door shuts, weeks pass in 48, the light dies, and only then the knock is offered', () => {
    const d = play('endA')
    const events = tick(d, 9000)
    expect(d.world.doors['door48']).toBe('closed')
    expect(events).toContainEqual(expect.objectContaining({ type: 'place' }))
    expect(d.world.control).toBe('shuffle')
    expect(d.world.daylight).toBe(true)
    expect(d.input({ type: 'knock3', target: 'party_wall48' })).toBe(false)
    tick(d, 40_000)
    expect(said(d)).toContain('EA-01')
    expect(d.world.daylight).toBe(false)
    expect(d.world.daylightMs).toBe(10_000)
    expect(d.world.objects['knock_prompt']).toBe('shown')
  })

  it('weeks later the player stands where the wall toward 47 is within reach', () => {
    const d = play('endA')
    const events = tick(d, 9000)
    const place = events.find((e) => e.type === 'place')
    if (place?.type !== 'place') throw new Error('no place event')
    const [x, , z] = place.position
    const wall = objectPoint('party_wall48')!
    expect(canWalk(x, z, { flat48: true, extension: 0 })).toBe(true)
    expect(Math.hypot(x - wall[0], z - wall[2])).toBeLessThan(REACH)
  })

  it('the player knocks from this side and says the line that is now theirs', () => {
    const d = play('endA')
    tick(d, 50_000)
    expect(d.input({ type: 'knock3', target: 'party_wall48' })).toBe(true)
    tick(d, 15_000)
    expect(said(d)).toContain('EA-02')
    expect(d.world.finished).toBe(true)
  })

  it('a player who never knocks is not left there: the knock comes by itself', () => {
    const d = play('endA')
    tick(d, 150_000)
    expect(d.world.finished).toBe(true)
  })
})

describe('Ending B — Ketish', () => {
  it('down the stairs, out into the snow, onto the bus; the call has no answer button', () => {
    const d = play('endB')
    tick(d, 3500, { ...STILL, zones: ['stairwell', 'landing3'] })
    expect(d.run.flags['outside']).toBe(true)
    tick(d, 1000, { ...STILL, zones: ['yard', 'bus_door'] })
    expect(d.run.flags['on_bus']).toBe(true)
    tick(d, 5000)
    expect(d.world.phone).toMatchObject({ place: 'hand', screen: 'incoming', canAnswer: false })
    tick(d, 12_000)
    expect(d.world.objects['bus']).toBe('moving')
    expect(d.log.some((l) => l.action.type === 'figure' && l.action.placement === 'bus_back')).toBe(
      true,
    )
    tick(d, 10_000)
    expect(d.world.finished).toBe(true)
    expect(said(d)).toEqual([])
  })

  it('without stairs to walk (the phone fallback) it still goes out and boards', () => {
    const d = play('endB')
    tick(d, 120_000)
    expect(d.world.finished).toBe(true)
  })
})

describe('Ending C — 3:18', () => {
  it('the key is turned by hand; the clock reaches 3:18; power and the phone come back', () => {
    const d = play('endC')
    tick(d, 1000)
    expect(d.world.objects['clock']).toBe('winding')
    expect(d.world.control).toBe('locked')
    tick(d, 20_000)
    expect(d.world.objects['clock']).toBe('winding')
    d.input({ type: 'interact', target: 'clock_wound' })
    tick(d, 2500)
    expect(d.world.objects['clock']).toBe('3:18')
    expect(d.world.scene).toBe('clock')
    tick(d, 7000)
    expect(d.world.power).toBe(true)
    expect(d.world.phone).toMatchObject({ screen: 'incoming', canAnswer: true })
  })

  it('on the phone fallback six taps on the key wind it instead of circles', () => {
    const d = play('endC')
    tick(d, 500)
    for (let i = 0; i < 5; i++) d.input({ type: 'interact', target: 'keyhole' })
    tick(d, 1000)
    expect(d.world.objects['clock']).toBe('winding')
    d.input({ type: 'interact', target: 'keyhole' })
    tick(d, 3000)
    expect(d.world.objects['clock']).toBe('3:18')
  })

  it('the call: black, two ringback tones, then her voice as text, then credits', () => {
    const d = play('endC')
    tick(d, 500)
    d.input({ type: 'interact', target: 'clock_wound' })
    tick(d, 10_000)
    d.input({ type: 'interact', target: 'phone_call' })
    tick(d, 16_000)
    const rings = d.log.filter((l) => l.action.type === 'sound' && l.action.id === 'ringback')
    expect(rings).toHaveLength(2)
    expect(said(d)).toEqual(['EC-02'])
    expect(d.world.finished).toBe(true)
  })
})
