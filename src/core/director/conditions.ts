import type { GameState } from '../state/types'
import type { Condition } from './types'

/** Flags, sanity, items and the rental-form profile decide whether a beat may fire. */
export function evaluateCondition(condition: Condition, state: GameState): boolean {
  if ('all' in condition) return condition.all.every((c) => evaluateCondition(c, state))
  if ('any' in condition) return condition.any.some((c) => evaluateCondition(c, state))
  if ('not' in condition) return !evaluateCondition(condition.not, state)
  if ('flag' in condition) {
    const value = state.flags[condition.flag]
    if ('eq' in condition) return value === condition.eq
    return Boolean(value)
  }
  if ('sanityGte' in condition) return state.sanity >= condition.sanityGte
  if ('sanityLt' in condition) return state.sanity < condition.sanityLt
  if ('hasItem' in condition) return state.inventory.includes(condition.hasItem)
  if ('itemCountGte' in condition) {
    const { prefix, count } = condition.itemCountGte
    return state.inventory.filter((id) => id.startsWith(prefix)).length >= count
  }
  if ('profile' in condition) return state.profile?.[condition.profile] === condition.eq
  return false
}
