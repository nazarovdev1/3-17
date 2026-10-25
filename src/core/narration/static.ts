import type { GameState, PlayerProfile } from '../state/types'
import { evaluateCondition } from '../engine/conditions'
import { EngineError, type Line } from '../engine/types'
import type { NarrationProvider } from './types'

export const KNOWN_PLACEHOLDERS = ['name', 'fear', 'door', 'time'] as const

/**
 * Replaces {name}, {fear}, {door} and {time}. `{time}` prefers the story flag
 * `time` (nodes set it as the night progresses, e.g. "3:16"); default "3:17".
 */
export function resolvePlaceholders(
  text: string,
  profile: PlayerProfile | null,
  flags: GameState['flags'],
): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => {
    switch (key) {
      case 'name':
        return profile?.name ?? ''
      case 'fear':
        return profile?.fear ?? ''
      case 'door':
        return profile?.doorAtNight ?? ''
      case 'time':
        return typeof flags['time'] === 'string' ? flags['time'] : '3:17'
      default:
        return whole
    }
  })
}

function pickVariant(line: Line, state: GameState) {
  const fallback = line.variants[line.variants.length - 1]
  if (!fallback) throw new EngineError('Line has no variants')
  for (const variant of line.variants) {
    if (!variant.when || evaluateCondition(variant.when, state)) {
      return variant
    }
  }
  // The validator requires an unconditional last variant; this is only a
  // defensive fallback so runtime can never crash on content bugs.
  return fallback
}

export class StaticNarrationProvider implements NarrationProvider {
  async resolveLine(line: Line, state: GameState): Promise<string> {
    return this.resolveLineSync(line, state)
  }

  /** Synchronous fast path for presenters that render immediately (text UI). */
  resolveLineSync(line: Line, state: GameState): string {
    const variant = pickVariant(line, state)
    return resolvePlaceholders(variant.text, state.profile, state.flags)
  }
}
