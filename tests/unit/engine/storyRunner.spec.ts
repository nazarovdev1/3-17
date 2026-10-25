import { describe, expect, it } from 'vitest'
import {
  advance,
  choose,
  createInitialState,
  getNode,
  goTo,
  is317,
  isLateNight,
  nodePhase,
  resume,
  startGame,
  visibleChoices,
  EngineError,
} from '@/core/engine'
import type { Story, StoryNode } from '@/core/engine/types'
import type { GameState } from '@/core/state/types'

const NOW = '2026-01-10T21:00:00.000Z'

function node(id: string, extra: Partial<StoryNode> = {}): StoryNode {
  return {
    id,
    night: 1,
    location: 'room',
    lines: [{ speaker: 'narrator', variants: [{ text: `Line ${id}` }] }],
    ...extra,
  }
}

/** chain: start -> mid(choice hub) -> two branches -> shared tail -> endA/endB */
const story: Story = {
  start: 'start',
  nodes: {
    start: node('start', {
      next: 'mid',
      checkpoint: true,
      onEnter: [{ type: 'flag', key: 'entered', value: true }],
    }),
    mid: node('mid', {
      choices: [
        { id: 'left', label: 'Chapga', to: 'left', effects: [{ type: 'sanity', delta: -5 }] },
        { id: 'right', label: 'Oʻngga', to: 'right', when: { sanityGte: 50 } },
        { id: 'hidden', label: 'Yashirin', to: 'left', when: { flag: 'secret' } },
      ],
    }),
    left: node('left', { next: 'tail' }),
    right: node('right', { next: 'tail', ending: undefined }),
    tail: node('tail', {
      choices: [
        { id: 'a', label: 'A', to: 'endA' },
        { id: 'b', label: 'B', to: 'endB' },
      ],
    }),
    endA: node('endA', {
      ending: 'A',
      lines: [{ speaker: 'narrator', variants: [{ text: 'A' }] }],
    }),
    endB: node('endB', { ending: 'B' }),
  },
}

function started(): GameState {
  return startGame(story, profile(), NOW).state
}

function profile() {
  return {
    name: 'Ali',
    livesAlone: 'ha' as const,
    fear: 'qorongʻulik' as const,
    doorAtNight: 'yopiq' as const,
  }
}

describe('nodePhase', () => {
  it('classifies ending, choices and next', () => {
    expect(nodePhase(story.nodes['endA']!)).toBe('ending')
    expect(nodePhase(story.nodes['mid']!)).toBe('choices')
    expect(nodePhase(story.nodes['start']!)).toBe('next')
  })

  it('throws on a node with no exit', () => {
    const broken: Story = { start: 'x', nodes: { x: node('x') } }
    expect(() => nodePhase(broken.nodes['x']!)).toThrow(EngineError)
  })
})

describe('startGame / enter effects', () => {
  it('starts at story.start, applies onEnter, records visit and night event', () => {
    const step = startGame(story, profile(), NOW)
    expect(step.state.currentNodeId).toBe('start')
    expect(step.state.flags['entered']).toBe(true)
    expect(step.state.visitedNodes).toEqual(['start'])
    expect(step.events).toContainEqual({ kind: 'autosave' })
    expect(step.events).toContainEqual({ kind: 'night', night: 1 })
  })

  it('initializes sanity at 100 and the profile', () => {
    const state = started()
    expect(state.sanity).toBe(100)
    expect(state.profile?.name).toBe('Ali')
    expect(state.night).toBe(1)
  })
})

describe('advance', () => {
  it('follows next and does not duplicate visits', () => {
    const state = started()
    const step = advance(story, state)
    expect(step.state.currentNodeId).toBe('mid')
    expect(step.phase).toBe('choices')
  })

  it('refuses to advance from a choices node', () => {
    expect(() => advance(story, goTo(story, started(), 'mid').state)).toThrow(EngineError)
  })

  it('refuses to advance without a current node', () => {
    expect(() => advance(story, { ...started(), currentNodeId: null })).toThrow(EngineError)
  })
})

describe('choose', () => {
  it('applies choice effects and moves to the target', () => {
    const atMid = goTo(story, started(), 'mid').state
    const step = choose(story, atMid, 'left')
    expect(step.state.currentNodeId).toBe('left')
    expect(step.state.sanity).toBe(95)
  })

  it('hides choices whose condition fails', () => {
    const atMid = goTo(story, started(), 'mid').state
    expect(visibleChoices(story.nodes['mid']!, atMid).map((c) => c.id)).toEqual(['left', 'right'])
    const lowSanity = { ...atMid, sanity: 40 }
    expect(visibleChoices(story.nodes['mid']!, lowSanity).map((c) => c.id)).toEqual(['left'])
  })

  it('rejects unknown or hidden choices', () => {
    const atMid = goTo(story, started(), 'mid').state
    expect(() => choose(story, atMid, 'nope')).toThrow(EngineError)
    expect(() => choose(story, atMid, 'hidden')).toThrow(EngineError)
  })

  it('refuses to choose on a node that is not a choice hub', () => {
    expect(() => choose(story, started(), 'whatever')).toThrow(EngineError)
  })

  it('refuses to choose without a current node', () => {
    expect(() => choose(story, { ...started(), currentNodeId: null }, 'left')).toThrow(EngineError)
  })

  it('returns all choices for a node without conditions', () => {
    const tail = story.nodes['tail']!
    expect(visibleChoices(tail, started()).map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('returns no choices for a node without choices', () => {
    expect(visibleChoices(story.nodes['start']!, started())).toEqual([])
  })
})

describe('resume / goTo', () => {
  it('resume never re-applies onEnter effects', () => {
    const saved = started()
    const step = resume(story, saved)
    expect(step.state.sanity).toBe(100)
    expect(step.events).toEqual([])
    expect(step.phase).toBe('next')
  })

  it('resume refuses without a current node', () => {
    expect(() => resume(story, { ...started(), currentNodeId: null })).toThrow(EngineError)
  })

  it('goTo applies onEnter of the destination (debug jumper)', () => {
    const step = goTo(story, started(), 'endA')
    expect(step.state.finished).toBe(true)
    expect(step.events).toContainEqual({ kind: 'ending', id: 'A' })
  })

  it('goTo throws for an unknown node', () => {
    expect(() => goTo(story, started(), 'ghost')).toThrow(EngineError)
  })
})

describe('ending handling', () => {
  it('marks the run finished and emits the ending event once', () => {
    const atTail = goTo(story, started(), 'tail').state
    const step = choose(story, atTail, 'a')
    expect(step.state.finished).toBe(true)
    expect(step.phase).toBe('ending')
    expect(step.events).toContainEqual({ kind: 'ending', id: 'A' })
  })
})

describe('getNode', () => {
  it('throws EngineError for unknown ids', () => {
    expect(() => getNode(story, 'ghost')).toThrow(EngineError)
  })
})

describe('meta time helpers', () => {
  it('isLateNight: 00:00–04:59 is late, 05:00 is not', () => {
    expect(isLateNight(new Date(2026, 0, 10, 0, 0))).toBe(true)
    expect(isLateNight(new Date(2026, 0, 10, 4, 59))).toBe(true)
    expect(isLateNight(new Date(2026, 0, 10, 5, 0))).toBe(false)
    expect(isLateNight(new Date(2026, 0, 10, 23, 59))).toBe(false)
  })

  it('is317: only the exact minute', () => {
    expect(is317(new Date(2026, 0, 10, 3, 17))).toBe(true)
    expect(is317(new Date(2026, 0, 10, 3, 16))).toBe(false)
    expect(is317(new Date(2026, 0, 10, 3, 18))).toBe(false)
    expect(is317(new Date(2026, 0, 10, 15, 17))).toBe(false)
  })
})

describe('createInitialState', () => {
  it('records timestamps and meta hints', () => {
    const state = createInitialState(profile(), NOW)
    expect(state.startedAt).toBe(NOW)
    expect(state.lastPlayedAt).toBe(NOW)
    expect(state.metaHints.realClock317Fired).toBe(false)
    expect(state.night).toBe(0)
    expect(state.currentNodeId).toBeNull()
  })
})
