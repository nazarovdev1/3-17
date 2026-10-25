import type { GameState } from '../state/types'
import type { Condition } from './types'

export function evaluateCondition(condition: Condition, state: GameState): boolean {
  if ('all' in condition) {
    return condition.all.every((c) => evaluateCondition(c, state))
  }
  if ('any' in condition) {
    return condition.any.some((c) => evaluateCondition(c, state))
  }
  if ('not' in condition) {
    return !evaluateCondition(condition.not, state)
  }
  if ('flag' in condition) {
    const value = state.flags[condition.flag]
    if ('eq' in condition) return value === condition.eq
    return Boolean(value)
  }
  if ('sanityGte' in condition) {
    return state.sanity >= condition.sanityGte
  }
  if ('sanityLt' in condition) {
    return state.sanity < condition.sanityLt
  }
  if ('hasItem' in condition) {
    return state.inventory.includes(condition.hasItem)
  }
  if ('itemCountGte' in condition) {
    const count = state.inventory.filter((id) =>
      id.startsWith(condition.itemCountGte.prefix),
    ).length
    return count >= condition.itemCountGte.count
  }
  if ('profile' in condition) {
    const value = state.profile?.[condition.profile]
    return value === condition.eq
  }
  return false
}
