import type { PhoneWorld } from '@/core/director/types'

/**
 * The player's phone as an object. The Director decides where it lies and what its screen
 * shows (`PhoneWorld`); Phone.tsx draws exactly that.
 */
export type PhoneScreen = PhoneWorld['screen']

/** The lock-screen clock: the night's time, or the player's own after midnight (meta). */
export function phoneTime(
  phone: PhoneWorld,
  nightClock: string,
  lateNight: boolean,
  now = new Date(),
): string {
  if (phone.time) return phone.time
  if (lateNight)
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return nightClock
}
