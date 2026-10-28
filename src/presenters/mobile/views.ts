import type { HotspotTarget } from './hotspots'

/**
 * Mobile fallback viewpoints (R1): the HD stills of the real flat, one per spot, linked by
 * edge arrows. The same Director runs; a viewpoint stands for the zones the player is in and
 * the objects they can see. R5 replaces this with the magic-window 3D view.
 */
export interface MobileView {
  /** Still camera (still-scenes.ts) shown for this viewpoint. */
  still: string
  zones: string[]
  objects: HotspotTarget[]
  exits: Partial<Record<'left' | 'right' | 'back' | 'forward', string>>
  /** Exits that exist only while a door stands open (e.g. 48's, nights 4–5). */
  doorExits?: Partial<Record<'left' | 'right' | 'back' | 'forward', { to: string; door: string }>>
}

export const MOBILE_VIEWS: Record<string, MobileView> = {
  landing: {
    still: 'stairwell',
    zones: ['landing', 'door47'],
    objects: [
      { id: 'front_door', anchor: 'front_door' },
      { id: 'rustam_hand', at: { x: 0.62, y: 0.58 } },
      { id: 'key_ring', at: { x: 0.56, y: 0.6 } },
    ],
    exits: { forward: 'hall', back: 'stairs' },
    doorExits: { left: { to: 'flat48', door: 'door48' } },
  },
  flat48: {
    still: 'flat48',
    zones: ['hall48', 'room48'],
    objects: [
      { id: 'chair48', anchor: 'chair' },
      { id: 'party_wall48', at: { x: 0.72, y: 0.45 } },
    ],
    exits: { back: 'landing' },
  },
  stairs: {
    still: 'stairwell',
    zones: ['landing', 'stairs_down'],
    objects: [],
    exits: { forward: 'landing' },
  },
  hall: {
    still: 'corridor',
    zones: ['hall', 'corridor'],
    objects: [
      { id: 'front_door', anchor: 'front_door' },
      { id: 'chain', at: { x: 0.44, y: 0.47 } },
    ],
    exits: { back: 'room', left: 'bathroom', right: 'kitchen', forward: 'landing' },
  },
  room: {
    still: 'room',
    zones: ['room'],
    objects: [
      { id: 'note', anchor: 'note' },
      { id: 'phone', anchor: 'phone' },
      { id: 'room_radiator', anchor: 'radiator' },
      { id: 'room_window', anchor: 'window' },
    ],
    exits: { left: 'wall', right: 'entry', back: 'hall' },
  },
  entry: {
    still: 'room_entry',
    zones: ['room'],
    objects: [
      { id: 'clock', anchor: 'clock' },
      { id: 'keyhole', anchor: 'clock' },
      { id: 'sofa', at: { x: 0.3, y: 0.7 } },
      { id: 'tv', at: { x: 0.78, y: 0.62 } },
    ],
    exits: { left: 'room', back: 'hall' },
  },
  wall: {
    still: 'wall',
    zones: ['room'],
    objects: [{ id: 'party_wall', anchor: 'shared_wall' }],
    exits: { back: 'room' },
  },
  kitchen: {
    still: 'kitchen',
    zones: ['kitchen'],
    objects: [
      { id: 'kettle', at: { x: 0.5, y: 0.6 } },
      { id: 'bread_bin', at: { x: 0.28, y: 0.6 } },
    ],
    exits: { back: 'hall' },
  },
  bathroom: {
    still: 'bathroom',
    zones: ['bathroom'],
    objects: [{ id: 'bathtub', at: { x: 0.35, y: 0.75 } }],
    exits: { back: 'hall' },
  },
}

/** Where each night begins on the phone (the desktop spawn's nearest viewpoint). */
export function mobileStart(sequence: string): string {
  if (sequence === 'n1' || sequence === 'endB') return 'landing'
  if (sequence === 'endA') return 'flat48'
  return sequence === 'endC' ? 'entry' : 'room'
}
