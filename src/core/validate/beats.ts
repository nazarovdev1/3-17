import type { Action, Sequence, Speaker, TextKey, TimedAction } from '../director/types'

/**
 * Static checks of the nights (REDESIGN §4, §10): every word and object a beat names exists,
 * the text budgets hold, and most beats carry no words at all.
 */
export const SPEAKERS: readonly Speaker[] = [
  'voice',
  'muhabbat',
  'landlord',
  'mother',
  'player_spoken',
]
export const MAX_SUBTITLE_WORDS = 10
export const MAX_DIARY_WORDS = 35
export const NIGHT_WORD_BUDGET = 180
export const GAME_WORD_BUDGET = 900
export const NO_TEXT_SHARE = 0.7

export interface TextUse {
  key: TextKey
  kind: 'subtitle' | 'phone' | 'paper'
  speaker?: Speaker
  diary?: boolean
}

export interface ValidationContext {
  scriptKeys: Set<string>
  readables: Record<string, { lines: TextKey[]; kind: string }>
  objectExists: (id: string) => boolean
  zoneExists: (id: string) => boolean
  wordsOf: (key: TextKey) => number
}

const MARKS = /^(form:signed|readable:closed)$/

function walk(actions: TimedAction[] | undefined, visit: (action: Action) => void): void {
  for (const action of actions ?? []) {
    visit(action)
    if (action.type === 'if') {
      walk(action.then, visit)
      walk(action.else, visit)
    }
  }
}

/** Every action of a sequence, including response options and ambient events. */
export function actionsOf(sequence: Sequence): { beat: string; action: Action }[] {
  const out: { beat: string; action: Action }[] = []
  for (const beat of sequence.beats) {
    walk(beat.actions, (action) => out.push({ beat: beat.id, action }))
    const w = beat.waitFor
    if (w)
      for (const option of [w.answer, w.knock, w.silence])
        walk(option?.actions, (action) => out.push({ beat: beat.id, action }))
  }
  for (const event of sequence.ambient)
    walk(event.actions, (action) => out.push({ beat: `ambient:${event.id}`, action }))
  return out
}

/** The words a sequence can show, by kind (subtitles, phone transcripts, paper). */
export function textUses(
  sequence: Sequence,
  ctx: Pick<ValidationContext, 'readables'>,
): (TextUse & { beat: string })[] {
  const out: (TextUse & { beat: string })[] = []
  for (const { beat, action } of actionsOf(sequence)) {
    if (action.type === 'say')
      out.push({ beat, key: action.line, kind: 'subtitle', speaker: action.speaker })
    if (action.type === 'phone') {
      for (const key of action.set.message ?? []) out.push({ beat, key, kind: 'phone' })
      if (action.set.work) out.push({ beat, key: action.set.work, kind: 'phone' })
    }
    if (action.type === 'readable') {
      const paper = ctx.readables[action.id]
      for (const key of paper?.lines ?? [])
        out.push({ beat, key, kind: 'paper', diary: paper!.kind === 'diary' })
    }
  }
  return out
}

/**
 * Worst-case words a single playthrough can see from these keys: lettered alternatives of
 * one id (N2-19a/b/c) never show together, so only the longest counts.
 */
export function worstCaseWords(keys: Iterable<TextKey>, wordsOf: (key: TextKey) => number): number {
  const groups = new Map<string, Map<string, number>>()
  for (const key of new Set(keys)) {
    const match = /^([A-Z]+\d*-\d+)([a-z]?)/.exec(key)
    const base = match?.[1] ?? key
    const letter = match?.[2] || '-'
    const letters = groups.get(base) ?? new Map<string, number>()
    letters.set(letter, (letters.get(letter) ?? 0) + wordsOf(key))
    groups.set(base, letters)
  }
  let total = 0
  for (const letters of groups.values()) total += Math.max(...letters.values())
  return total
}

/** Share of a night's beats that show no words. */
export function noTextShare(sequence: Sequence, ctx: Pick<ValidationContext, 'readables'>): number {
  const withText = new Set(textUses(sequence, ctx).map((use) => use.beat))
  const beats = sequence.beats.filter((b) => b.trigger.type !== 'start' || b.actions.length > 0)
  return beats.filter((b) => !withText.has(b.id)).length / beats.length
}

export function validateSequences(
  sequences: Record<string, Sequence>,
  ctx: ValidationContext,
): string[] {
  const errors: string[] = []
  const allKeys = new Set<string>()
  for (const sequence of Object.values(sequences)) {
    const ids = new Set<string>()
    for (const beat of sequence.beats) {
      if (ids.has(beat.id)) errors.push(`${sequence.id}: duplicate beat id ${beat.id}`)
      ids.add(beat.id)
    }
    for (const beat of sequence.beats) {
      const t = beat.trigger
      if ('target' in t && !ctx.objectExists(t.target))
        errors.push(`${beat.id}: unknown object "${t.target}"`)
      if (t.type === 'zone' && !ctx.zoneExists(t.zone))
        errors.push(`${beat.id}: unknown zone "${t.zone}"`)
      for (const zone of beat.notIn ?? [])
        if (!ctx.zoneExists(zone)) errors.push(`${beat.id}: unknown zone "${zone}"`)
      if (t.type === 'after') {
        const target = t.beat.replace(/:resolved$/, '')
        if (!ids.has(target) && !MARKS.test(t.beat))
          errors.push(`${beat.id}: waits for unknown beat "${t.beat}"`)
      }
      for (const option of [beat.waitFor?.answer, beat.waitFor?.knock])
        if (option && !ctx.objectExists(option.target))
          errors.push(`${beat.id}: response at unknown object "${option.target}"`)
    }
    for (const { beat, action } of actionsOf(sequence)) {
      const at =
        action.type === 'sound' ? action.at : action.type === 'say' ? action.from : undefined
      if (typeof at === 'string' && !ctx.objectExists(at))
        errors.push(`${beat}: sound/speech at unknown object "${at}"`)
      if (action.type === 'say' && !SPEAKERS.includes(action.speaker))
        errors.push(`${beat}: unknown speaker "${action.speaker}" (there is no narrator)`)
      if (action.type === 'readable' && !ctx.readables[action.id])
        errors.push(`${beat}: unknown readable "${action.id}"`)
    }
    const uses = textUses(sequence, ctx)
    for (const use of uses) {
      allKeys.add(use.key)
      if (!ctx.scriptKeys.has(use.key)) errors.push(`${use.beat}: missing script text ${use.key}`)
      const words = ctx.wordsOf(use.key)
      if (use.kind === 'subtitle' && words > MAX_SUBTITLE_WORDS)
        errors.push(`${use.key}: subtitle has ${words} words (max ${MAX_SUBTITLE_WORDS})`)
      if (use.diary && words > MAX_DIARY_WORDS)
        errors.push(`${use.key}: diary page has ${words} words (max ${MAX_DIARY_WORDS})`)
    }
    if (sequence.id.startsWith('n')) {
      const words = worstCaseWords(
        uses.filter((u) => !u.diary).map((u) => u.key),
        ctx.wordsOf,
      )
      if (words > NIGHT_WORD_BUDGET)
        errors.push(`${sequence.id}: ${words} visible words (budget ${NIGHT_WORD_BUDGET})`)
    }
  }
  const total = worstCaseWords(allKeys, ctx.wordsOf)
  if (total > GAME_WORD_BUDGET)
    errors.push(`game: ${total} visible words (budget ${GAME_WORD_BUDGET})`)
  return errors
}
