import { describe, expect, it } from 'vitest'
import { SEQUENCES, READABLES } from '@/content/nights'
import { scriptKeys, wordsOf } from '@/content/text'
import { objectPoint, PHONE_TARGETS } from '@/content/world/objects'
import { EXTRA_ZONES } from '@/content/world/zones'
import { WORLD } from '@/content/world/layout'
import {
  noTextShare,
  validateSequences,
  worstCaseWords,
  type ValidationContext,
} from '@/core/validate/beats'
import type { Sequence } from '@/core/director/types'

const zones = new Set([...WORLD.rooms.map((r) => r.id), ...EXTRA_ZONES.map((z) => z.id)])
const virtual = new Set([
  'sofa',
  'fridge',
  'knock_prompt',
  'rustam',
  'opposite',
  'torch',
  'landing',
])
const ctx: ValidationContext = {
  scriptKeys: new Set(scriptKeys()),
  readables: READABLES,
  objectExists: (id) => !!objectPoint(id) || PHONE_TARGETS.has(id) || virtual.has(id),
  zoneExists: (id) => zones.has(id),
  wordsOf,
}
const night = (beats: Sequence['beats']): Record<string, Sequence> => ({
  n9: {
    id: 'n9',
    night: 1,
    start: '02:00',
    spawn: { position: [0, 1.6, 0], yaw: 0 },
    realSecondsPerGameMinute: 4,
    beats,
    ambient: [],
    ambientEveryMs: [1e9, 1e9],
  },
})

describe('the nights as built', () => {
  it('pass every static check: words, objects, zones, budgets, no narrator', () => {
    expect(validateSequences(SEQUENCES, ctx)).toEqual([])
  })
  it('keep at least 70% of every night’s beats wordless', () => {
    for (const id of ['n1', 'n2', 'n3', 'n4', 'n5'])
      expect(noTextShare(SEQUENCES[id]!, { readables: READABLES }), id).toBeGreaterThanOrEqual(0.7)
  })
})

describe('validateSequences rejects', () => {
  it('a narrator, an unknown text, object or zone, and a dangling "after"', () => {
    const errors = validateSequences(
      night([
        {
          id: 'a',
          trigger: { type: 'zone', zone: 'nowhere' },
          actions: [
            { type: 'say', speaker: 'narrator' as never, line: 'N1-12' },
            { type: 'say', speaker: 'voice', line: 'N9-99' },
            { type: 'sound', id: 'knock', at: 'no_such_object' },
          ],
        },
        { id: 'b', trigger: { type: 'after', beat: 'missing' }, actions: [] },
      ]),
      ctx,
    ).join('\n')
    expect(errors).toMatch(/unknown speaker "narrator"/)
    expect(errors).toMatch(/missing script text N9-99/)
    expect(errors).toMatch(/unknown object "no_such_object"/)
    expect(errors).toMatch(/unknown zone "nowhere"/)
    expect(errors).toMatch(/waits for unknown beat "missing"/)
  })
  it('a subtitle over 10 words and a night over its word budget', () => {
    const long = { ...ctx, wordsOf: (key: string) => (key === 'N1-12' ? 11 : 200) }
    const errors = validateSequences(
      night([
        {
          id: 'a',
          trigger: { type: 'start' },
          actions: [
            { type: 'say', speaker: 'voice', line: 'N1-12' },
            { type: 'phone', set: { message: ['N1-08'] } },
          ],
        },
      ]),
      long,
    ).join('\n')
    expect(errors).toMatch(/N1-12: subtitle has 11 words/)
    expect(errors).toMatch(/n9: \d+ visible words \(budget 180\)/)
  })
  it('counts only the longest of lettered alternatives toward the budget', () => {
    const words = (key: string) => ({ 'X1-1a': 5, 'X1-1b': 9, 'X1-2': 3 })[key] ?? 0
    expect(worstCaseWords(['X1-1a', 'X1-1b', 'X1-2'], words)).toBe(12)
  })
})
