import type { GameState } from '../state/types'
import type { Line } from '../engine/types'

/**
 * Narration source (spec 4.2). All presenters get text exclusively through this
 * interface so an AiNarrationProvider can replace the static one later.
 */
export interface NarrationProvider {
  resolveLine(line: Line, state: GameState): Promise<string>
}
