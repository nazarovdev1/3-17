import type { GameState } from '@/core/state/types'
import { motherMessage } from '@/content/story/features'

/**
 * The player's phone as an object (fear-design.md, "The phone — escalation table"). Pure:
 * which screen it shows and where it lies, from the story state. Phone.tsx draws it.
 */
export type PhonePlace = 'table' | 'pillow' | 'hand'
export type PhoneScreen = 'off' | 'messages' | 'playing' | 'dead'

export interface PhoneState {
  place: PhonePlace
  screen: PhoneScreen
  /** Missed calls from "Onam" tonight. */
  missed: number
  /** Tonight's voice message has been listened to. */
  heard: boolean
  /** Length of tonight's voice message, seconds. */
  messageSeconds: number
  /** Night 1, after the kitchen: lying face down (it turns over only while nobody looks). */
  faceDown: boolean
  /** Unanswered calls: the notification light blinks and the phone buzzes now and then. */
  calling: boolean
}

export const MISSED_CALLS: Record<number, number> = { 1: 3, 2: 11, 3: 24, 4: 40, 5: 52 }
/** Night 1's message "lasted eleven seconds" (night-1.yaml); the others to their text. */
export const MESSAGE_SECONDS: Record<number, number> = { 1: 11, 2: 19, 3: 31, 4: 24, 5: 9 }

export function phoneState(nodeId: string, state: GameState): PhoneState {
  const night = state.night
  const visited = (id: string) => state.visitedNodes.includes(id)
  const inHand = nodeId === `n${night}_phone` || nodeId === `n${night}_message`
  const dead = night === 5 && visited('n5_317')
  return {
    place: inHand ? 'hand' : night === 4 ? 'pillow' : 'table',
    screen: dead
      ? 'dead'
      : nodeId === `n${night}_message`
        ? 'playing'
        : inHand
          ? 'messages'
          : 'off',
    missed: MISSED_CALLS[night] ?? 0,
    heard: state.inventory.includes(motherMessage(night)),
    messageSeconds: MESSAGE_SECONDS[night] ?? 10,
    faceDown: night === 1 && visited('n1_tea') && !inHand,
    calling: !dead && !inHand,
  }
}

/** The clock on the lock screen: the story's time once it is set, the player's own otherwise. */
export function phoneTime(state: GameState, now = new Date()): string {
  const story = state.flags['time']
  if (typeof story === 'string') return story
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
}
