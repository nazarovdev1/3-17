import { clampSanity } from '../state/sanity'
import type { GameState } from '../state/types'
import type { Effect, EngineEvent } from './types'

/**
 * Applies one effect to the state (immutably) and returns the side-effect events
 * the presenter must execute (sfx/fx/haptics are never state).
 */
export function applyEffect(
  state: GameState,
  effect: Effect,
): { state: GameState; event: EngineEvent | null } {
  switch (effect.type) {
    case 'sanity': {
      const sanity = clampSanity(state.sanity + effect.delta)
      return { state: { ...state, sanity }, event: null }
    }
    case 'flag': {
      const flags = { ...state.flags, [effect.key]: effect.value }
      return { state: { ...state, flags }, event: null }
    }
    case 'item': {
      const inventory = [...state.inventory, effect.id]
      return { state: { ...state, inventory }, event: null }
    }
    case 'sfx': {
      return { state, event: { kind: 'sfx', id: effect.id } }
    }
    case 'fx': {
      return {
        state,
        event: {
          kind: 'fx',
          id: effect.id,
          ...(effect.intensity !== undefined ? { intensity: effect.intensity } : {}),
          ...(effect.durationMs !== undefined ? { durationMs: effect.durationMs } : {}),
        },
      }
    }
    case 'haptic': {
      return { state, event: { kind: 'haptic', pattern: effect.pattern } }
    }
  }
}

export function applyEffects(
  state: GameState,
  effects: readonly Effect[] | undefined,
): { state: GameState; events: EngineEvent[] } {
  let current = state
  const events: EngineEvent[] = []
  for (const effect of effects ?? []) {
    const result = applyEffect(current, effect)
    current = result.state
    if (result.event) events.push(result.event)
  }
  return { state: current, events }
}
