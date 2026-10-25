import { describe, expect, it } from 'vitest'
import { validateStory } from '@/core/validate/validate'
import type { Story, StoryNode } from '@/core/engine/types'

function node(id: string, extra: Partial<StoryNode> = {}): StoryNode {
  return {
    id,
    night: 1,
    location: 'room',
    lines: [{ speaker: 'narrator', variants: [{ text: `Matn ${id}` }] }],
    ...extra,
  }
}

/**
 * The validator enforces the 7-diary-page rule on every story, so fixtures must
 * satisfy it. Grafts 7 single-page nodes reachable from the start node.
 */
function withDiary(story: Story): Story {
  const nodes = { ...story.nodes }
  const startChoices = [...(nodes[story.start]!.choices ?? [])]
  for (let i = 1; i <= 7; i++) {
    const id = `diary_node_${i}`
    nodes[id] = node(id, { next: story.start, onEnter: [{ type: 'item', id: `diary_${i}` }] })
    startChoices.push({ id: `find_diary_${i}`, label: `Sahifa ${i}`, to: id })
  }
  nodes[story.start] = { ...nodes[story.start]!, choices: startChoices }
  return { ...story, nodes }
}

function cleanStory(): Story {
  return {
    start: 'a',
    nodes: {
      a: node('a', {
        choices: [{ id: 'go', label: 'Davom', to: 'end' }],
      }),
      end: node('end', { ending: 'A' }),
    },
  }
}

/** The validator requires all three endings, so valid fixtures declare all of them. */
function threeEndingStory(): Story {
  return {
    start: 'a',
    nodes: {
      a: node('a', {
        choices: [
          { id: 'a', label: 'A', to: 'endA' },
          { id: 'b', label: 'B', to: 'endB' },
          { id: 'c', label: 'C', to: 'endC' },
        ],
      }),
      endA: node('endA', { ending: 'A' }),
      endB: node('endB', { ending: 'B' }),
      endC: node('endC', { ending: 'C' }),
    },
  }
}

describe('validateStory — happy path', () => {
  it('accepts a small valid story', () => {
    const outcome = validateStory(withDiary(threeEndingStory()))
    expect(outcome.ok).toBe(true)
    expect(outcome.errors).toEqual([])
  })

  it('rejects an empty story', () => {
    expect(validateStory({ start: 'x', nodes: {} }).ok).toBe(false)
  })

  it('rejects a missing start node', () => {
    const outcome = validateStory({ start: 'ghost', nodes: { a: node('a', { ending: 'A' }) } })
    expect(outcome.errors.some((e) => e.includes('start'))).toBe(true)
  })
})

describe('validateStory — structural rules', () => {
  it('fails on a missing edge target', () => {
    const story = cleanStory()
    story.nodes['a']!.choices = [{ id: 'go', label: 'X', to: 'ghost' }]
    expect(validateStory(story).errors.some((e) => e.includes('ghost'))).toBe(true)
  })

  it('fails on a node with no exit', () => {
    const story = cleanStory()
    story.nodes['a']!.choices = undefined
    expect(validateStory(story).errors.some((e) => e.includes('neither choices'))).toBe(true)
  })

  it('fails on a node with both next and ending', () => {
    const story = cleanStory()
    story.nodes['end']!.next = 'a'
    expect(validateStory(story).errors.some((e) => e.includes('more than one'))).toBe(true)
  })

  it('fails on an unreachable node', () => {
    const story = cleanStory()
    story.nodes['orphan'] = node('orphan', { next: 'end' })
    const outcome = validateStory(story)
    expect(outcome.errors.some((e) => e.includes('orphan') && e.includes('unreachable'))).toBe(true)
  })

  it('fails on a cycle with no exit', () => {
    const story: Story = {
      start: 'a',
      nodes: {
        a: node('a', { next: 'b' }),
        b: node('b', { next: 'a' }),
        end: node('end', { ending: 'A' }),
      },
    }
    const outcome = validateStory(story)
    expect(outcome.errors.some((e) => e.includes('cycle') || e.includes('cannot reach'))).toBe(true)
  })

  it('fails on duplicate or empty choice ids', () => {
    const story = cleanStory()
    story.nodes['a']!.choices = [
      { id: 'go', label: '1', to: 'end' },
      { id: 'go', label: '2', to: 'end' },
    ]
    expect(validateStory(story).errors.some((e) => e.includes('duplicate choice'))).toBe(true)
  })

  it('fails on empty labels and placeholder labels', () => {
    const story = cleanStory()
    story.nodes['a']!.choices = [{ id: 'go', label: '  ', to: 'end' }]
    expect(validateStory(story).errors.some((e) => e.includes('empty label'))).toBe(true)
    story.nodes['a']!.choices = [{ id: 'go', label: 'Salom {name}', to: 'end' }]
    expect(validateStory(story).errors.some((e) => e.includes('placeholders'))).toBe(true)
  })
})

describe('validateStory — line rules', () => {
  it('fails when the last variant is conditional', () => {
    const story = cleanStory()
    story.nodes['a']!.lines = [
      {
        speaker: 'voice',
        variants: [
          { when: { flag: 'x' }, text: 'Shartli' },
          { when: { flag: 'y' }, text: 'Shartsiz oxirgi emas' },
        ],
      },
    ]
    expect(validateStory(story).errors.some((e) => e.includes('fallback'))).toBe(true)
  })

  it('fails on empty text', () => {
    const story = cleanStory()
    story.nodes['a']!.lines = [{ speaker: 'narrator', variants: [{ text: '   ' }] }]
    expect(validateStory(story).errors.some((e) => e.includes('empty text'))).toBe(true)
  })

  it('fails on unknown placeholders', () => {
    const story = cleanStory()
    story.nodes['a']!.lines = [
      { speaker: 'narrator', variants: [{ text: 'Salom {unknown_thing}' }] },
    ]
    expect(validateStory(story).errors.some((e) => e.includes('placeholder'))).toBe(true)
  })

  it('accepts known placeholders', () => {
    const story = threeEndingStory()
    story.nodes['a']!.lines = [
      { speaker: 'voice', variants: [{ text: '{name}, {fear}, {door}, {time}' }] },
    ]
    expect(validateStory(withDiary(story)).ok).toBe(true)
  })
})

describe('validateStory — endings', () => {
  it('fails when an ending is missing', () => {
    const story: Story = {
      start: 'a',
      nodes: { a: node('a', { next: 'end' }), end: node('end', { ending: 'A' }) },
    }
    const outcome = validateStory(story)
    expect(outcome.errors.filter((e) => e.startsWith('ending')).length).toBeGreaterThanOrEqual(2)
  })

  it('fails when an ending is unreachable', () => {
    const story = cleanStory()
    story.nodes['endB'] = node('endB', { ending: 'B' })
    const outcome = validateStory(story)
    expect(outcome.errors.some((e) => e.includes('endB') && e.includes('unreachable'))).toBe(true)
  })

  it('accepts all three endings when reachable', () => {
    const story: Story = {
      start: 'a',
      nodes: {
        a: node('a', {
          choices: [
            { id: 'a', label: 'A', to: 'endA' },
            { id: 'b', label: 'B', to: 'endB' },
            { id: 'c', label: 'C', to: 'endC' },
          ],
        }),
        endA: node('endA', { ending: 'A' }),
        endB: node('endB', { ending: 'B' }),
        endC: node('endC', { ending: 'C' }),
      },
    }
    expect(validateStory(withDiary(story)).ok).toBe(true)
  })
})

describe('validateStory — diary pages', () => {
  function storyWithDiary(count: number): Story {
    const nodes: Record<string, StoryNode> = {
      a: node('a', { next: 'end' }),
      end: node('end', { ending: 'A' }),
    }
    for (let i = 1; i <= count; i++) {
      nodes[`d${i}`] = node(`d${i}`, { next: 'end', onEnter: [{ type: 'item', id: `diary_${i}` }] })
      nodes['a']!.choices = [
        ...(nodes['a']!.choices ?? []),
        { id: `d${i}`, label: `Sahifa ${i}`, to: `d${i}` },
      ]
    }
    return { start: 'a', nodes }
  }

  it('requires exactly 7 diary pages', () => {
    expect(validateStory(storyWithDiary(6)).errors.some((e) => e.includes('diary'))).toBe(true)
    expect(validateStory(storyWithDiary(8)).errors.some((e) => e.includes('diary'))).toBe(true)
    expect(validateStory(storyWithDiary(7)).errors.some((e) => e.includes('diary'))).toBe(false)
  })

  it('fails when the same diary page is granted twice', () => {
    const story = storyWithDiary(7)
    story.nodes['end']!.onEnter = [{ type: 'item', id: 'diary_3' }]
    expect(
      validateStory(story).errors.some(
        (e) => e.includes('diary_3') && e.includes('more than once'),
      ),
    ).toBe(true)
  })
})

describe('validateStory — warnings', () => {
  it('warns about flags read but never set', () => {
    const story = threeEndingStory()
    story.nodes['a']!.lines = [
      {
        speaker: 'narrator',
        variants: [{ when: { flag: 'ghost_flag' }, text: 'X' }, { text: 'Y' }],
      },
    ]
    const outcome = validateStory(withDiary(story))
    expect(outcome.ok).toBe(true)
    expect(outcome.warnings.some((w) => w.includes('ghost_flag'))).toBe(true)
  })
})
