import { describe, expect, it } from 'vitest'
import { applyEffect, applyEffects } from '@/core/engine/effects'
import type { GameState } from '@/core/state/types'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    profile: null,
    currentNodeId: null,
    night: 1,
    sanity: 100,
    flags: {},
    inventory: [],
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

describe('applyEffect', () => {
  it('sanity: clamps to 0..100 and never mutates the original', () => {
    const state = makeState()
    const raised = applyEffect(state, { type: 'sanity', delta: -30 })
    expect(raised.state.sanity).toBe(70)
    expect(raised.event).toBeNull()
    expect(state.sanity).toBe(100)

    const floored = applyEffect(makeState({ sanity: 5 }), { type: 'sanity', delta: -50 })
    expect(floored.state.sanity).toBe(0)
    const ceiled = applyEffect(makeState({ sanity: 95 }), { type: 'sanity', delta: 50 })
    expect(ceiled.state.sanity).toBe(100)
  })

  it('flag: sets boolean, number and string values', () => {
    const base = makeState()
    const b = applyEffect(base, { type: 'flag', key: 'answered', value: true })
    expect(b.state.flags['answered']).toBe(true)
    const n = applyEffect(base, { type: 'flag', key: 'knocks', value: 3 })
    expect(n.state.flags['knocks']).toBe(3)
    const s = applyEffect(base, { type: 'flag', key: 'time', value: '3:16' })
    expect(s.state.flags['time']).toBe('3:16')
  })

  it('item: appends to inventory without duplicates issues', () => {
    const result = applyEffect(makeState(), { type: 'item', id: 'diary_1' })
    expect(result.state.inventory).toEqual(['diary_1'])
    expect(result.event).toBeNull()
  })

  it('sfx: emits an event and leaves state untouched', () => {
    const state = makeState()
    const result = applyEffect(state, { type: 'sfx', id: 'knock_triple' })
    expect(result.state).toBe(state)
    expect(result.event).toEqual({ kind: 'sfx', id: 'knock_triple' })
  })

  it('fx: carries optional intensity and duration', () => {
    const full = applyEffect(state0(), {
      type: 'fx',
      id: 'chromatic',
      intensity: 0.5,
      durationMs: 900,
    })
    expect(full.event).toEqual({ kind: 'fx', id: 'chromatic', intensity: 0.5, durationMs: 900 })
    const bare = applyEffect(state0(), { type: 'fx', id: 'grain' })
    expect(bare.event).toEqual({ kind: 'fx', id: 'grain' })
  })

  it('haptic: emits the pattern', () => {
    const result = applyEffect(state0(), { type: 'haptic', pattern: 'heartbeat' })
    expect(result.event).toEqual({ kind: 'haptic', pattern: 'heartbeat' })
  })
})

function state0(): GameState {
  return makeState()
}

describe('applyEffects', () => {
  it('applies in order and collects side-effect events', () => {
    const result = applyEffects(makeState(), [
      { type: 'sanity', delta: -10 },
      { type: 'flag', key: 'answered', value: true },
      { type: 'item', id: 'diary_1' },
      { type: 'sfx', id: 'knock' },
      { type: 'haptic', pattern: 'knock' },
    ])
    expect(result.state.sanity).toBe(90)
    expect(result.state.flags['answered']).toBe(true)
    expect(result.state.inventory).toEqual(['diary_1'])
    expect(result.events).toEqual([
      { kind: 'sfx', id: 'knock' },
      { kind: 'haptic', pattern: 'knock' },
    ])
  })

  it('handles undefined effect lists', () => {
    const result = applyEffects(makeState(), undefined)
    expect(result.state.sanity).toBe(100)
    expect(result.events).toEqual([])
  })
})
