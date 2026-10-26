import type { Step } from '@/core/engine/types'
import type { Screen } from '@/ui/gameStore'
import type { AudioScene } from './engine'

/** Presentation mapping only: no flags, choices or story state are changed. */
export function audioScene(screen: Screen, step: Step | null): AudioScene {
  if (screen === 'boot' || screen === 'warning' || screen === 'paused' || screen === 'settings')
    return 'off'
  if (screen === 'title' || screen === 'form' || screen === 'gallery') return 'title'
  if (!step) return 'off'
  if (step.node.ending === 'B') return 'street'
  if (step.node.ending === 'C') return 'clock'
  if (step.node.ending === 'A') return 'silence'
  const { state, node } = step
  // The time flag persists across nights. The current night's outage marker
  // reconstructs the correct ambience on save/reload without changing saves.
  if (
    state.visitedNodes.includes(`n${state.night}_317`) ||
    ['room_dark', 'wall', 'flat48', 'peephole', 'landing48'].includes(node.mobile?.vignette ?? '')
  )
    return 'silence'
  return node.location === 'stairwell' ? 'day' : 'flat'
}
