import { describe, expect, it } from 'vitest'
import { advance, choose, startGame, visibleChoices, type Step } from '@/core/engine'
import { story } from '@/content/story'
import { MOTHER_MESSAGE_COUNT, motherMessage } from '@/content/story/features'
import type { PlayerProfile } from '@/core/state/types'
import { pickChoice, type EndingTarget } from '../../routes'

const PROFILE: PlayerProfile = {
  name: 'Dilnoza',
  livesAlone: 'ha',
  fear: 'yolgʻizlik',
  doorAtNight: 'yopiq',
}

/** Plays the real story with the shared route; `override` can force a choice by node. */
function play(
  target: EndingTarget,
  override: (step: Step, ids: string[]) => string | null = () => null,
): { step: Step; path: string[] } {
  let step = startGame(story, PROFILE, '2026-10-26T20:00:00.000Z')
  const path = [step.node.id]
  for (let i = 0; i < 600 && step.phase !== 'ending'; i++) {
    if (step.phase === 'next') step = advance(story, step.state)
    else {
      const ids = visibleChoices(step.node, step.state).map((c) => c.id)
      step = choose(story, step.state, override(step, ids) ?? pickChoice(target, ids))
    }
    path.push(step.node.id)
  }
  return { step, path }
}

describe('real story playthroughs', () => {
  it.each(['A', 'B', 'C'] as const)('reaches ending %s through all five nights', (target) => {
    const { step, path } = play(target)
    expect(step.node.ending).toBe(target)
    const nights = new Set(path.map((id) => id.slice(0, 2)).filter((p) => /^n\d$/.test(p)))
    expect([...nights].sort()).toEqual(['n1', 'n2', 'n3', 'n4', 'n5'])
  })

  it('ending C route meets every requirement exactly', () => {
    const { step } = play('C')
    const { state } = step
    expect(state.inventory.filter((i) => i.startsWith('diary_')).sort()).toEqual([
      'diary_1',
      'diary_2',
      'diary_3',
      'diary_4',
      'diary_5',
      'diary_6',
      'diary_7',
    ])
    for (let night = 1; night <= MOTHER_MESSAGE_COUNT; night++)
      expect(state.inventory).toContain(motherMessage(night))
    expect(state.sanity).toBeGreaterThanOrEqual(40)
    expect(state.flags['answered_n3']).toBeUndefined()
  })

  it('hides "wind the clock" when one of the mother’s messages was never heard', () => {
    const { step } = play('C', (s, ids) =>
      s.node.id === 'n2_night_hub' && ids.includes('phone') ? 'wait317' : null,
    )
    // The route falls back to another ending because "wind" never appears.
    expect(step.node.ending).not.toBe('C')
    expect(step.state.inventory).not.toContain(motherMessage(2))
  })

  it('hides "wind the clock" when the voice was answered on night 3', () => {
    const { step } = play('C', (s) => (s.node.id === 'n3_voice_echo' ? 'answer' : null))
    expect(step.state.flags['answered_n3']).toBe(true)
    expect(step.node.ending).not.toBe('C')
  })

  it('the voice says the mother’s words — and admits it heard a message the player skipped', () => {
    let reached: Step | null = null
    play('A', (s) => {
      if (s.node.id === 'n4_voice_identity') reached = s
      return null
    })
    expect(reached).not.toBeNull()
    const lines = reached!.node.lines
    expect(lines[1]!.speaker).toBe('voice')
    expect(lines[1]!.variants[0]!.text).toBe(story.nodes['n3_message']!.lines[0]!.variants[0]!.text)
    // Route A never listens to messages, so the "you never heard it" variant applies.
    expect(reached!.state.inventory).not.toContain(motherMessage(3))
    expect(lines[3]!.variants[0]!.when).toEqual({ not: { hasItem: motherMessage(3) } })
  })

  it('keeps the voice on "siz" in nights 1–2 and switches to "sen" from night 3', () => {
    const voice = (night: number) =>
      Object.values(story.nodes)
        .filter((n) => n.night === night && !n.ending)
        .flatMap((n) => n.lines.filter((l) => l.speaker === 'voice'))
        .flatMap((l) => l.variants.map((v) => v.text))
    const informal = /\b(sen|seni|senga|esingdami|deysan)\b/i
    for (const text of [...voice(1), ...voice(2)]) expect(text).not.toMatch(informal)
    expect(voice(3).some((t) => informal.test(t))).toBe(true)
  })
})
