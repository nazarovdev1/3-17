import { describe, expect, it } from 'vitest'
import { resolvePlaceholders, StaticNarrationProvider } from '@/core/narration/static'
import type { Line } from '@/core/engine/types'
import type { GameState } from '@/core/state/types'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    profile: {
      name: 'Sardor',
      livesAlone: 'ha',
      fear: 'unutilish',
      doorAtNight: 'ochiq',
    },
    currentNodeId: null,
    night: 2,
    sanity: 80,
    flags: { time: '3:16' },
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

describe('resolvePlaceholders', () => {
  it('resolves name, fear, door and time', () => {
    const state = makeState()
    expect(resolvePlaceholders('{name}, {fear}, {door}', state.profile, state.flags)).toBe(
      'Sardor, unutilish, ochiq',
    )
    expect(resolvePlaceholders('Soat {time}', state.profile, state.flags)).toBe('Soat 3:16')
  })

  it('defaults {time} to 3:17 when the flag is absent', () => {
    const state = makeState({ flags: {} })
    expect(resolvePlaceholders('{time}', state.profile, state.flags)).toBe('3:17')
  })

  it('keeps unknown placeholders and handles a missing profile', () => {
    expect(resolvePlaceholders('{week}', null, {})).toBe('{week}')
    expect(resolvePlaceholders('{name}', null, {})).toBe('')
  })
})

describe('StaticNarrationProvider', () => {
  const provider = new StaticNarrationProvider()

  it('picks the first matching variant', async () => {
    const line: Line = {
      speaker: 'voice',
      variants: [
        { when: { sanityLt: 40 }, text: 'Ogʻir variant' },
        { when: { sanityGte: 40 }, text: 'Yengil variant' },
        { text: 'Fallback' },
      ],
    }
    expect(await provider.resolveLine(line, makeState())).toBe('Yengil variant')
    expect(await provider.resolveLine(line, makeState({ sanity: 10 }))).toBe('Ogʻir variant')
  })

  it('falls back to the unconditional last variant', async () => {
    const line: Line = {
      speaker: 'narrator',
      variants: [{ when: { flag: 'never_set' }, text: 'Maxsus' }, { text: 'Oddiy matn' }],
    }
    expect(await provider.resolveLine(line, makeState())).toBe('Oddiy matn')
  })

  it('throws EngineError on a line with no variants', async () => {
    const line: Line = { speaker: 'narrator', variants: [] }
    await expect(provider.resolveLine(line, makeState())).rejects.toThrow('no variants')
  })

  it('resolves placeholders after choosing the variant', async () => {
    const line: Line = {
      speaker: 'voice',
      variants: [{ text: 'Yolgʻiz yashaysiz-a, {name}? Men ham.' }],
    }
    expect(await provider.resolveLine(line, makeState())).toBe(
      'Yolgʻiz yashaysiz-a, Sardor? Men ham.',
    )
  })
})
