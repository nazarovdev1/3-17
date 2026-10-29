import { describe, expect, it } from 'vitest'
import { walkFeet } from '@/content/world/walk'
import { zonesAt } from '@/content/world/zones'
import { LANDING3_Y, HALF_LANDING_Y, stairHeight } from '@/content/world/stairwell'
import { Director } from '@/core/director/director'
import { STILL, newRun } from '@/core/director/simulate'
import type { Sequence } from '@/core/director/types'

/** R3: the stairwell down to the 3rd floor (owner decision 8) and the Director's new verbs. */
const options = { flat48: false, extension: 0 }

function walkLine(
  from: [number, number, number],
  dx: number,
  dz: number,
  steps: number,
): [number, number, number] {
  let [x, feet, z] = from
  for (let i = 0; i < steps; i++) [x, feet, z] = walkFeet(x, feet, z, dx, dz, options)
  return [x, feet, z]
}

describe('the stairwell', () => {
  it('walks down flight A to the half-landing and on down flight B to the 3rd floor', () => {
    const half = walkLine([0.9, 0, 6.6], 0, 0.02, 200)
    expect(half[1]).toBeCloseTo(HALF_LANDING_Y, 5)
    expect(half[2]).toBeGreaterThan(9.3)
    const across = walkLine(half, 0.02, 0, 80)
    expect(across[0]).toBeGreaterThan(2.2)
    const down = walkLine(across, 0, -0.02, 200)
    expect(down[1]).toBeCloseTo(LANDING3_Y, 5)
    expect(down[2]).toBeLessThan(7.2)
    expect(zonesAt(down[0], down[2], down[1])).toEqual(
      expect.arrayContaining(['stairwell', 'landing3']),
    )
  })

  it('the 4th-floor landing does not open onto the shaft over flight B', () => {
    const edge = walkLine([2.4, 0, 6.8], 0, 0.02, 60)
    expect(edge[1]).toBe(0)
    expect(edge[2]).toBeLessThan(7.2)
  })

  it('moving boxes block the next flight down from the 3rd floor', () => {
    const stopped = walkLine([0.9, LANDING3_Y, 5.6], 0, 0.02, 120)
    expect(stopped[1]).toBe(LANDING3_Y)
    expect(stopped[2]).toBeLessThan(6.75)
  })

  it('floors one storey apart are told apart by the feet', () => {
    expect(stairHeight(0.5, 6.0, 0)).toBeNull()
    expect(stairHeight(0.5, 6.0, LANDING3_Y)).toBe(LANDING3_Y)
    expect(zonesAt(0.5, 6.0, 0)).toContain('landing')
    expect(zonesAt(0.5, 6.0, LANDING3_Y)).not.toContain('landing')
  })
})

describe('Director verbs for R3', () => {
  const one = (beats: Sequence['beats']): Record<string, Sequence> => ({
    t: {
      id: 't',
      night: 1,
      start: '03:00',
      spawn: { position: [0, 1.6, 0], yaw: 0 },
      realSecondsPerGameMinute: 60,
      beats,
      ambient: [],
      ambientEveryMs: [1e9, 1e9],
    },
  })
  const director = (beats: Sequence['beats']) =>
    new Director({ sequences: one(beats), run: newRun(), wordsOf: () => 4 }, 't')

  it('onlyIn holds a beat until the player is in one of its zones', () => {
    const d = director([
      { id: 'a', trigger: { type: 'start' }, actions: [] },
      {
        id: 'b',
        trigger: { type: 'after', beat: 'a' },
        onlyIn: ['by_43'],
        actions: [{ type: 'flag', key: 'b', value: true }],
      },
    ])
    d.tick(100, STILL)
    d.tick(100, STILL)
    expect(d.run.flags['b']).toBeUndefined()
    d.tick(100, { ...STILL, zones: ['by_43'] })
    expect(d.run.flags['b']).toBe(true)
  })

  it('hush drops the current and queued speech; place moves the body', () => {
    const d = director([
      {
        id: 'talk',
        trigger: { type: 'start' },
        actions: [
          { type: 'say', speaker: 'muhabbat', line: 'N2-02' },
          { type: 'say', speaker: 'muhabbat', line: 'N2-03' },
          { type: 'say', speaker: 'muhabbat', line: 'N2-04', delayMs: 5000 },
        ],
      },
      {
        id: 'leave',
        trigger: { type: 'after', beat: 'talk', delayMs: 1000 },
        actions: [{ type: 'hush' }, { type: 'place', position: [1, 1.6, 2], yaw: 0.5 }],
      },
    ])
    d.tick(100, STILL)
    expect(d.world.subtitle?.line).toBe('N2-02')
    const events = [...d.tick(1000, STILL)]
    expect(d.world.subtitle).toBeNull()
    expect(events).toContainEqual({ type: 'place', position: [1, 1.6, 2], yaw: 0.5 })
    for (let t = 0; t < 10_000; t += 100) d.tick(100, STILL)
    expect(d.world.subtitle).toBeNull()
  })
})
