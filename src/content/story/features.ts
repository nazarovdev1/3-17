import type { Effect } from '@/core/engine/types'
import type { HapticPattern, SfxId } from '@/core/state/types'

/** Tea is a once-per-night sanity restore (spec 5.4), gated on per-night flags. */
export const teaFlag = (night: number) => `tea_n${night}`

export const sanity = (delta: number): Effect => ({ type: 'sanity', delta })
export const flag = (key: string, value: boolean | number | string): Effect => ({
  type: 'flag',
  key,
  value,
})
export const item = (id: string): Effect => ({ type: 'item', id })
export const sfx = (id: SfxId): Effect => ({ type: 'sfx', id })
export const haptic = (pattern: HapticPattern): Effect => ({ type: 'haptic', pattern })
