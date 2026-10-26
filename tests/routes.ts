/**
 * Routes through the real story by choice id, shared by unit and E2E playthroughs.
 * Ids are stable while the owner edits the Uzbek text, so tests never match on labels.
 */
export type EndingTarget = 'A' | 'B' | 'C'

const PROGRESS = [
  'calendar',
  'glitch',
  'no_talk',
  'enter',
  'corridor',
  'peephole',
  'wait',
  'wait317',
  'sleep',
  'stay',
  'leavetalk',
  'silent',
  'stop',
  'shifted_clock',
  'later',
  'down',
]

/**
 * Ending C needs every diary page, every voice message, silence on night 3 and sanity >= 40,
 * so it collects everything before progressing and avoids optional scares.
 */
const C_ROUTE = [
  'wind',
  'hear',
  'phone',
  'down',
  'tea',
  'asksardor',
  'leavetalk',
  'wardrobe',
  'mirror',
  'bathroom',
  'kitchen',
  'stop',
  'corridor',
  'carpet',
  'shifted_clock',
  'diary',
  'clock',
  'calendar',
  'glitch',
  'no_talk',
  'enter',
  'peephole',
  'wait',
  'wait317',
  'silent',
  'stay',
]

export const ROUTES: Record<EndingTarget, string[]> = {
  A: ['open48', ...PROGRESS],
  B: ['leave_early', ...PROGRESS],
  C: C_ROUTE,
}

/** Choices a route must never take (they would break ending C's conditions). */
export const AVOID: Record<EndingTarget, string[]> = {
  A: [],
  B: [],
  C: ['answer', 'leave_early', 'open48', 'leave', 'retreat', 'sleep'],
}

export function pickChoice(target: EndingTarget, available: readonly string[]): string {
  for (const id of ROUTES[target]) if (available.includes(id)) return id
  const allowed = available.filter((id) => !AVOID[target].includes(id))
  const pick = allowed[0] ?? available[0]
  if (!pick) throw new Error('no choice available')
  return pick
}
