import { describe, expect, it } from 'vitest'
import { evaluateCondition } from '@/core/engine/conditions'
import type { GameState } from '@/core/state/types'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    profile: {
      name: 'Dilnoza',
      livesAlone: 'ha',
      fear: 'qorongʻulik',
      doorAtNight: 'yopiq',
    },
    currentNodeId: null,
    night: 1,
    sanity: 100,
    flags: { answered: true, knocks: 2, mood: 'jim' },
    inventory: ['diary_1', 'diary_2', 'tea'],
    visitedNodes: [],
    finished: false,
    startedAt: '2026-01-01T00:00:00.000Z',
    lastPlayedAt: '2026-01-01T00:00:00.000Z',
    metaHints: {
      realClock317Fired: false,
      returnCommentFired: false,
      lateNightCommentFired: false,
    },
    ...overrides,
  }
}

describe('evaluateCondition', () => {
  it('all: true only when every sub-condition holds', () => {
    const state = makeState()
    expect(evaluateCondition({ all: [{ flag: 'answered' }, { sanityGte: 50 }] }, state)).toBe(true)
    expect(evaluateCondition({ all: [{ flag: 'answered' }, { sanityGte: 101 }] }, state)).toBe(
      false,
    )
  })

  it('any: true when at least one sub-condition holds', () => {
    const state = makeState({ sanity: 10 })
    expect(evaluateCondition({ any: [{ sanityGte: 50 }, { sanityLt: 15 }] }, state)).toBe(true)
    expect(evaluateCondition({ any: [{ sanityGte: 50 }, { flag: 'nope' }] }, state)).toBe(false)
  })

  it('not: inverts', () => {
    expect(evaluateCondition({ not: { flag: 'answered' } }, makeState())).toBe(false)
    expect(evaluateCondition({ not: { flag: 'nope' } }, makeState())).toBe(true)
  })

  it('flag with eq compares values', () => {
    const state = makeState()
    expect(evaluateCondition({ flag: 'answered' }, state)).toBe(true)
    expect(evaluateCondition({ flag: 'answered', eq: true }, state)).toBe(true)
    expect(evaluateCondition({ flag: 'answered', eq: false }, state)).toBe(false)
    expect(evaluateCondition({ flag: 'knocks', eq: 2 }, state)).toBe(true)
    expect(evaluateCondition({ flag: 'knocks', eq: 3 }, state)).toBe(false)
    expect(evaluateCondition({ flag: 'mood', eq: 'jim' }, state)).toBe(true)
    expect(evaluateCondition({ flag: 'missing' }, state)).toBe(false)
  })

  it('sanityGte / sanityLt use band boundaries', () => {
    expect(evaluateCondition({ sanityGte: 70 }, makeState({ sanity: 70 }))).toBe(true)
    expect(evaluateCondition({ sanityGte: 71 }, makeState({ sanity: 70 }))).toBe(false)
    expect(evaluateCondition({ sanityLt: 40 }, makeState({ sanity: 40 }))).toBe(false)
    expect(evaluateCondition({ sanityLt: 40 }, makeState({ sanity: 39 }))).toBe(true)
  })

  it('hasItem checks inventory', () => {
    const state = makeState()
    expect(evaluateCondition({ hasItem: 'diary_1' }, state)).toBe(true)
    expect(evaluateCondition({ hasItem: 'diary_3' }, state)).toBe(false)
  })

  it('itemCountGte counts by prefix', () => {
    const state = makeState()
    expect(evaluateCondition({ itemCountGte: { prefix: 'diary_', count: 2 } }, state)).toBe(true)
    expect(evaluateCondition({ itemCountGte: { prefix: 'diary_', count: 3 } }, state)).toBe(false)
  })

  it('profile compares profile fields', () => {
    const state = makeState()
    expect(evaluateCondition({ profile: 'fear', eq: 'qorongʻulik' }, state)).toBe(true)
    expect(evaluateCondition({ profile: 'fear', eq: 'yolgʻizlik' }, state)).toBe(false)
    expect(evaluateCondition({ profile: 'name', eq: 'Dilnoza' }, state)).toBe(true)
  })

  it('profile is false without a profile', () => {
    const state = makeState({ profile: null })
    expect(evaluateCondition({ profile: 'fear', eq: 'qorongʻulik' }, state)).toBe(false)
  })

  it('defensively returns false for an unknown condition shape', () => {
    const bogus = { nonsense: true } as unknown as Parameters<typeof evaluateCondition>[0]
    expect(evaluateCondition(bogus, makeState())).toBe(false)
  })
})
