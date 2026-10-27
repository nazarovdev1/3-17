import { objectById } from '@/content/world/layout'
import type { SfxId } from '@/core/state/types'
import type { Point } from './layout'

/**
 * Sounds from where they should not be (fear-design.md, global rules), placed in the
 * flat for HRTF panning: steps on the landing after the night-4 power cut, someone
 * walking in the empty flat above, a knock from inside the wardrobe. Seconds after the
 * beat begins; each plays once per visit.
 */
export interface ScriptedSound {
  at: number
  id: SfxId
  position: Point
}

const wardrobe = objectById('wardrobe')!
const ABOVE = 2.85

export const SCRIPTED_SOUNDS: Record<string, ScriptedSound[]> = {
  // "No knocks. One step on the landing, then silence again."
  n4_317: [{ at: 4.5, id: 'step_concrete', position: [0.3, 0.05, 5.6] }],
  // Night 2: the flat above (57) is empty, and someone crosses it, slowly.
  n2_night_hub: [0, 1, 2, 3, 4].map((i) => ({
    at: 38 + i * 0.9,
    id: 'step_board' as const,
    position: [1.6 - i * 0.55, ABOVE, -1.2 - i * 0.2] as Point,
  })),
  // Night 3: one knock from inside the built-in wardrobe.
  n3_hub: [
    {
      at: 44,
      id: 'knock_soft',
      position: [wardrobe.position[0], 1.1, wardrobe.position[2]],
    },
  ],
}
