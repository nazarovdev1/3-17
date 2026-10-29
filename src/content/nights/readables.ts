import type { TextKey } from '@/core/director/types'

/**
 * Paper the player holds up to read (Inspect): the landlord's note and Sardor's diary pages.
 * Only these words are shown; nothing summarises them.
 */
export interface Readable {
  kind: 'note' | 'diary' | 'calendar' | 'passport'
  lines: TextKey[]
  /** Index of the first line written later, in a different pen. */
  otherInkFrom?: number
  /** Written in the player's own hand (the rental-form signature's hand). */
  ownHand?: boolean
}

export const READABLES: Record<string, Readable> = {
  note: { kind: 'note', lines: ['N1-09', 'N1-10', 'N1-11'], otherInkFrom: 2 },
  diary_1: { kind: 'diary', lines: ['K-1'] },
  diary_2: { kind: 'diary', lines: ['K-2'] },
  diary_3: { kind: 'diary', lines: ['K-3'] },
  diary_4: { kind: 'diary', lines: ['K-4'], ownHand: true },
  diary_5: { kind: 'diary', lines: ['K-5'] },
  diary_6: { kind: 'diary', lines: ['K-6'] },
  diary_7: { kind: 'diary', lines: ['K-7'] },
  // In 48 (night 4): December crossed out up to yesterday; the player's own passport.
  calendar: { kind: 'calendar', lines: ['N4-07'] },
  passport: { kind: 'passport', lines: ['N4-08.1', 'N4-08.2'] },
}
