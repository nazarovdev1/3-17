import type { HotspotTarget } from './hotspots'
import type { MobileDoorId } from './doors'

/**
 * Mobile fallback viewpoints (R1): the HD stills of the real flat, one per spot, linked by
 * edge arrows. The same Director runs; a viewpoint stands for the zones the player is in and
 * the objects they can see. R5 replaces this with the magic-window 3D view.
 */
export type Edge = 'left' | 'right' | 'back' | 'forward' | 'aside'

export interface MobileView {
  /** Still camera (still-scenes.ts) shown for this viewpoint. */
  still: string
  zones: string[]
  objects: HotspotTarget[]
  exits: Partial<Record<Edge, string>>
  /** Exits that cross a hinged door: the arrow shows only while that leaf stands open. */
  gates?: Partial<Record<Edge, MobileDoorId>>
  /** Exits that exist only while a door stands open (e.g. 48's, nights 4–5). */
  doorExits?: Partial<Record<Edge, { to: string; door: string }>>
}

export const MOBILE_VIEWS: Record<string, MobileView> = {
  landing: {
    still: 'stairwell',
    zones: ['landing', 'door47'],
    objects: [
      { id: 'front_door', anchor: 'front_door' },
      { id: 'rustam_hand', at: { x: 0.62, y: 0.58 } },
      { id: 'key_ring', at: { x: 0.56, y: 0.6 } },
      // Night 2's halva left on the threshold; night 4's parcel from home.
      { id: 'halva_47', at: { x: 0.5, y: 0.86 } },
      { id: 'parcel', at: { x: 0.56, y: 0.84 } },
    ],
    exits: { forward: 'hall', back: 'stairs' },
    doorExits: { left: { to: 'flat48', door: 'door48' } },
    gates: { forward: 'front_door' },
  },
  flat48: {
    still: 'flat48',
    zones: ['hall48', 'room48'],
    objects: [
      { id: 'chair48', anchor: 'chair' },
      { id: 'calendar', at: { x: 0.3, y: 0.32 } },
      { id: 'belongings', at: { x: 0.82, y: 0.78 } },
      { id: 'party_wall48', at: { x: 0.72, y: 0.45 } },
    ],
    exits: { back: 'landing' },
    gates: { back: 'door48' },
  },
  stairs: {
    still: 'stairwell',
    // Standing at the head of the flight down is taking the stairs (ending B on night 5).
    zones: ['landing', 'stairs_down', 'stairwell'],
    objects: [],
    exits: { forward: 'landing' },
  },
  hall: {
    still: 'corridor',
    zones: ['hall', 'corridor'],
    objects: [
      { id: 'front_door', anchor: 'front_door' },
      { id: 'chain', at: { x: 0.44, y: 0.47 } },
      { id: 'peephole', at: { x: 0.5, y: 0.4 } },
    ],
    // The coat hooks and the wardrobe are along the hall's side wall: a closer look.
    exits: { back: 'room', left: 'bathroom', right: 'kitchen', forward: 'landing', aside: 'coat' },
    gates: { back: 'room_door', left: 'bath_door', right: 'kitchen_door', forward: 'front_door' },
  },
  coat: {
    still: 'coat',
    zones: ['hall', 'corridor'],
    objects: [
      { id: 'wardrobe', at: { x: 0.2, y: 0.5 } },
      { id: 'coat_pocket', at: { x: 0.24, y: 0.58 } },
    ],
    exits: { back: 'hall' },
  },
  room: {
    still: 'room',
    zones: ['room'],
    objects: [
      { id: 'note', anchor: 'note' },
      { id: 'phone', anchor: 'phone' },
      { id: 'room_radiator', anchor: 'radiator' },
      { id: 'room_window', anchor: 'window' },
      { id: 'floorboard', at: { x: 0.42, y: 0.88 } },
      { id: 'floor_rug', at: { x: 0.55, y: 0.85 } },
    ],
    exits: { left: 'wall', right: 'entry', back: 'hall' },
    gates: { back: 'room_door' },
  },
  entry: {
    still: 'room_entry',
    zones: ['room'],
    objects: [
      { id: 'clock', anchor: 'clock' },
      { id: 'keyhole', anchor: 'clock' },
      { id: 'sofa', at: { x: 0.3, y: 0.7 } },
      { id: 'pillow', at: { x: 0.16, y: 0.66 } },
      { id: 'clock_wall', at: { x: 0.62, y: 0.3 } },
      { id: 'tv', at: { x: 0.78, y: 0.62 } },
    ],
    exits: { left: 'room', back: 'hall' },
    gates: { back: 'room_door' },
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
    gates: { back: 'kitchen_door' },
  },
  bathroom: {
    still: 'bathroom',
    zones: ['bathroom'],
    objects: [{ id: 'bathtub', at: { x: 0.35, y: 0.75 } }],
    exits: { back: 'hall' },
    gates: { back: 'bath_door' },
  },
}

/** Where each night begins on the phone (the desktop spawn's nearest viewpoint). */
export function mobileStart(sequence: string): string {
  if (sequence === 'n1' || sequence === 'endB') return 'landing'
  if (sequence === 'endA') return 'flat48'
  return sequence === 'endC' ? 'entry' : 'room'
}
