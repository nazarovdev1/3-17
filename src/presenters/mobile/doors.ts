import { appearanceFor } from '../desktop/figure'

/**
 * Doors of the fixed-view fallback. A move that crosses a door needs that door open, exactly
 * as on the desktop: the story's word wins (held shut, held open), then the player's own
 * choice, then how the leaf rests. A closed door shows a door control instead of the arrow.
 */
export type MobileDoorId = 'front_door' | 'bath_door' | 'kitchen_door' | 'room_door' | 'door48'

export interface DoorWorld {
  doors: Record<string, 'open' | 'ajar' | 'closed'>
  figure: string | null
}

export interface DoorPass {
  /** The leaf stands open far enough to walk through. */
  open: boolean
  /** The story holds it shut: a tap rattles it and nothing moves. */
  locked: boolean
}

export function doorPass(
  id: MobileDoorId,
  world: DoorWorld,
  choices: Partial<Record<string, boolean>>,
): DoorPass {
  const story = world.doors[id]
  // Entrance 48: it only opens once the story has left it ajar or open.
  if (id === 'door48') {
    const passable = story === 'ajar' || story === 'open'
    return { open: passable, locked: !passable }
  }
  const held =
    (id === 'front_door' && story === 'closed') ||
    (appearanceFor(world.figure)?.closedDoors ?? []).includes(id)
  if (held) return { open: false, locked: true }
  if (story === 'open') return { open: true, locked: false }
  // A story-ajar or story-closed leaf stays shut for walking, but a tap opens it.
  const rests = id === 'room_door' && story === undefined
  return { open: choices[id] ?? rests, locked: false }
}
