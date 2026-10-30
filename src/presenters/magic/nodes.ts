import { GROUND_Y } from '@/content/world/exterior'

/**
 * Magic-window viewpoints (REDESIGN §8): the spots the phone glides between in the same 3D
 * flat the desktop walks. The head turns freely with the phone; the feet only go from one node
 * to a linked one, through the doors that are really open. Metres on the same plan as
 * layout.ts; `feet` is the floor under the node (0 on the 4th floor).
 */
export interface MagicNode {
  id: string
  x: number
  z: number
  feet: number
  /** The way the viewpoint faces on arrival (0 looks along -z). */
  yaw: number
  /** Looking a little down at what is nearby (finger-driven view; a held phone sets its own). */
  pitch?: number
  /** Night 2 begins lying on the sofa: not a place a body could stand. */
  lying?: boolean
}

export interface MagicDoor {
  /** The hinged leaf's id in the plan. */
  id: string
  /** The middle of the doorway on the floor. */
  at: [number, number]
}

export interface MagicEdge {
  to: string
  /** A hinged leaf across the way: the edge opens only while it stands open. */
  door?: MagicDoor
  /** Corners the glide turns at (around furniture), from this node's side. */
  via: [number, number][]
}

/** How far a tap reaches (metres on the floor plan): a finger is farther than a crosshair. */
export const TAP_REACH = 2.8

const FRONT: MagicDoor = { id: 'front_door', at: [0, 4.69] }
const ROOM: MagicDoor = { id: 'room_door', at: [0, 0.05] }
const KITCHEN: MagicDoor = { id: 'kitchen_door', at: [0.65, 1.4] }
const BATH: MagicDoor = { id: 'bath_door', at: [-0.65, 2.5] }
const FRONT_48: MagicDoor = { id: 'front_door48', at: [-4.18, 4.69] }

const node = (
  id: string,
  x: number,
  z: number,
  yaw: number,
  extra: Partial<MagicNode> = {},
): MagicNode => ({ id, x, z, feet: 0, yaw, ...extra })

export const MAGIC_NODES: MagicNode[] = [
  // ── Flat 47 ─────────────────────────────────────────────────────────────
  node('room_a', 0.6, -0.6, 0),
  node('room_w', -0.78, -1.75, Math.PI / 2, { lying: true }),
  node('room_t', 0.4, -1.3, -1.42),
  node('room_c', -0.55, -1.7, 0.44),
  node('corr_1', 0, 0.9, Math.PI),
  node('corr_2', 0, 2.4, Math.PI),
  node('hall', 0.3, 3.9, Math.PI),
  node('kitchen', 1.4, 1.3, -1.3),
  node('bath', -1.0, 2.6, 2.9),
  // ── The landing, flat 48 and the stairs ─────────────────────────────────
  node('landing_d', 0, 5.7, 0),
  node('landing_s', 1.7, 6.95, 0.61),
  node('landing_w', -3.6, 5.7, 0.52),
  node('h48', -4.55, 3.9, 0),
  node('c48', -4.4, 1.5, 0),
  node('room48', -4.8, -0.6, 0),
  node('room48_b', -6.0, -1.6, -Math.PI / 2),
  node('room48_c', -3.7, -1.6, 0),
  node('s_top', 0.9, 7.6, Math.PI, { feet: -0.25 }),
  node('s_a', 0.9, 8.4, Math.PI, { feet: -0.8 }),
  node('s_b', 1.6, 9.6, 0, { feet: -1.4 }),
  node('s_c', 2.3, 8.4, 0, { feet: -2.0 }),
  node('s_d', 2.3, 7.4, Math.PI, { feet: -2.8 }),
  node('s_e', 0.8, 6.0, 0, { feet: -2.8 }),
  // ── Outside (ending B) ──────────────────────────────────────────────────
  node('yard', 1.5, -5.2, -0.35, { feet: GROUND_Y }),
  node('bus_door', 6.0, -15.9, Math.PI, { feet: GROUND_Y }),
]

interface Link {
  a: string
  b: string
  door?: MagicDoor
  /** Corners from a's side to b's. */
  via?: [number, number][]
}

const LINKS: Link[] = [
  { a: 'room_a', b: 'room_w', via: [[0.2, -1.2]] },
  { a: 'room_a', b: 'room_t' },
  { a: 'room_a', b: 'room_c' },
  { a: 'room_w', b: 'room_c' },
  { a: 'room_a', b: 'corr_1', door: ROOM },
  { a: 'corr_1', b: 'corr_2' },
  { a: 'corr_2', b: 'hall' },
  { a: 'corr_1', b: 'kitchen', door: KITCHEN },
  { a: 'corr_2', b: 'bath', door: BATH },
  { a: 'hall', b: 'landing_d', door: FRONT },
  { a: 'landing_d', b: 'landing_s' },
  { a: 'landing_d', b: 'landing_w' },
  { a: 'landing_w', b: 'h48', door: FRONT_48 },
  { a: 'h48', b: 'c48' },
  {
    a: 'c48',
    b: 'room48',
    via: [
      [-4.18, 0.45],
      [-4.18, -0.3],
    ],
  },
  { a: 'room48', b: 'room48_b' },
  { a: 'room48', b: 'room48_c', via: [[-4.0, -0.8]] },
  { a: 'landing_s', b: 's_top' },
  { a: 's_top', b: 's_a' },
  { a: 's_a', b: 's_b' },
  { a: 's_b', b: 's_c' },
  { a: 's_c', b: 's_d' },
  { a: 's_d', b: 's_e' },
  { a: 'yard', b: 'bus_door' },
]

export const NODE_BY_ID: Record<string, MagicNode> = Object.fromEntries(
  MAGIC_NODES.map((n) => [n.id, n]),
)

/** Every node's outgoing edges (each link runs both ways). */
export const EDGES: Record<string, MagicEdge[]> = Object.fromEntries(
  MAGIC_NODES.map((n) => [n.id, [] as MagicEdge[]]),
)
for (const link of LINKS) {
  const via = link.via ?? []
  EDGES[link.a]!.push({ to: link.b, door: link.door, via })
  EDGES[link.b]!.push({ to: link.a, door: link.door, via: [...via].reverse() })
}

/** The floor points a glide from `from` to the end of `edge` passes through, in order. */
export function pathOf(from: MagicNode, edge: MagicEdge): [number, number][] {
  const to = NODE_BY_ID[edge.to]!
  return [[from.x, from.z], ...edge.via, ...(edge.door ? [edge.door.at] : []), [to.x, to.z]]
}

/** The node nearest to a point on the same floor (a spawn that is not exactly on one). */
export function nearestNode(x: number, z: number, feet: number): MagicNode {
  let best = MAGIC_NODES[0]!
  let bestDistance = Infinity
  for (const n of MAGIC_NODES) {
    const d = Math.hypot(n.x - x, n.z - z) + Math.abs(n.feet - feet) * 3
    if (d < bestDistance) {
      best = n
      bestDistance = d
    }
  }
  return best
}

/** The name the Director gives a hinged leaf, where it differs from the plan's. */
export const DOOR_STORY_ID: Record<string, string> = { front_door48: 'door48' }
