import type { Condition, Effect } from '@/core/engine/types'
import type { HapticPattern, Night, SfxId } from '@/core/state/types'
import type { DraftChoice, DraftLine, DraftNode } from './build'

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

/** One voice message from the mother per night; each listened message is an inventory item. */
export const MOTHER_MESSAGE_PREFIX = 'mom_msg_'
export const MOTHER_MESSAGE_COUNT = 5
export const motherMessage = (night: number) => `${MOTHER_MESSAGE_PREFIX}${night}`

/**
 * Ending C (FIX_PROMPT 6.2): all 7 diary pages, sanity >= 40, never answered the voice on
 * night 3, and listened to every one of the mother's voice messages.
 */
export const ENDING_C_CONDITION: Condition = {
  all: [
    { itemCountGte: { prefix: 'diary_', count: 7 } },
    { sanityGte: 40 },
    { not: { flag: 'answered_n3' } },
    { itemCountGte: { prefix: MOTHER_MESSAGE_PREFIX, count: MOTHER_MESSAGE_COUNT } },
  ],
}

interface PhoneDraft {
  phone: DraftLine[]
  message: DraftLine[]
  /** When present, the message ends in these choices instead of returning to the hub. */
  messageChoices?: DraftChoice[]
}

/**
 * The phone on the table: `n<N>_phone` shows the missed calls and offers the night's voice
 * message; `n<N>_message` plays it. Leaving it for later keeps it available until the night
 * moves on — after that it is gone.
 */
export function phoneNodes(night: Night, hub: string, draft: PhoneDraft): DraftNode[] {
  const phoneId = `n${night}_phone`
  const messageId = `n${night}_message`
  const phone: DraftNode = {
    id: phoneId,
    night,
    location: 'room',
    onEnter: [haptic('light')],
    desktop: { trigger: 'interact', objectId: 'phone' },
    mobile: { vignette: 'room' },
    lines: draft.phone,
    choices: [
      { id: 'hear', to: messageId },
      { id: 'later', to: hub },
    ],
  }
  const message: DraftNode = {
    id: messageId,
    night,
    location: 'room',
    onEnter: [item(motherMessage(night)), sanity(3)],
    mobile: { vignette: 'room' },
    lines: draft.message,
  }
  if (draft.messageChoices) message.choices = draft.messageChoices
  else message.next = hub
  return [phone, message]
}
