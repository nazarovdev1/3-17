/**
 * The world in metres (FIX_PROMPT §4.1–4.2): flat 47 (a one-room flat in a nine-storey
 * Chilonzor panel block), the 4th-floor landing, and flat 48 as a mirrored, decayed copy.
 *
 * Axes: x to the right, y up, z toward the entrance. The player stands in the room facing
 * the façade window (−z). Floor at y = 0, ceiling 2.6 m. Everything here is plain data:
 * the desktop renderer, the floor-plan SVG, the walk/collision code and validate:world all
 * read it. Nothing is placed anywhere else.
 */
export type Vec3 = [number, number, number]
export type Surface =
  | 'parquet'
  | 'boards'
  | 'tiles'
  | 'wallpaper47'
  | 'wallpaper48'
  | 'whitewash'
  | 'stairwell'
  | 'concrete'
  | 'door_paint'

export type RoomId =
  | 'room'
  | 'kitchen'
  | 'bathroom'
  | 'corridor'
  | 'hall'
  | 'closet'
  | 'balcony'
  | 'landing'
  | 'stairs'
  | 'room48'
  | 'kitchen48'
  | 'bathroom48'
  | 'corridor48'
  | 'hall48'
  | 'closet48'

export interface Rect {
  x0: number
  x1: number
  z0: number
  z1: number
}

export interface Room {
  id: RoomId
  flat: '47' | '48' | 'common'
  /** Floor area as one or more rectangles (L-shapes are two). */
  rects: Rect[]
  floor: Surface
  walls: Surface
  ceiling: Surface
  height: number
  /** Story location this room belongs to (desktop viewpoints and lighting circuits). */
  location: 'room' | 'kitchen' | 'bathroom' | 'corridor' | 'balcony' | 'stairwell' | 'flat48'
  /** Lit by the light on this switch circuit (null: no ceiling light of its own). */
  circuit: number | null
}

export interface Opening {
  kind: 'door' | 'window' | 'balcony_door' | 'closet' | 'arch'
  /** Centre along the wall's long axis. */
  at: number
  width: number
  bottom: number
  top: number
  /** Door leaf id when the opening has a door (rendered and animated separately). */
  door?: string
}

export interface Wall {
  id: string
  box: Rect
  height: number
  /** Long axis: 'x' walls run along x (constant z), 'z' walls along z. */
  axis: 'x' | 'z'
  openings: Opening[]
  /** Structural walls are thicker and darker on the plan. */
  kind: 'exterior' | 'party' | 'partition' | 'stair' | 'shaft'
}

export type Support =
  | { on: 'floor' }
  | { on: 'wall'; wall: string }
  | { on: 'ceiling' }
  | { on: 'object'; object: string }

export interface WorldObject {
  id: string
  room: RoomId
  /** Model id from the asset manifest, or a procedural piece built by the renderer. */
  asset: string
  /** Centre of the footprint at the object's base (y = bottom). */
  position: Vec3
  /** Rotation about y in radians; 0 = the model's front faces +z. */
  rotation: number
  /**
   * Fix-up rotation (Euler XYZ) applied to the model before `rotation`, for source files
   * that are not upright or front-facing (+z). `size` is measured after it.
   */
  orient?: Vec3
  /** Real-world size in metres, in the object's own axes (width x, height y, depth z). */
  size: Vec3
  support: Support
  /** Why it is here. */
  purpose: string
  /** Interaction anchor id the story refers to (OBJECTS key in the desktop presenter). */
  interaction?: string
  /** Blocks walking (floor-standing furniture). Wall and ceiling items never block. */
  blocks?: boolean
  /** Intentionally overlaps these objects (e.g. a kettle sitting on the stove). */
  contains?: string[]
  /** Optional per-object tint for decay (multiplied into the material colour). */
  tint?: string
}

export interface LightDef {
  id: string
  room: RoomId
  position: Vec3
  kind: 'ceiling' | 'street' | 'moon' | 'landing'
  circuit: number | null
}

export const CEILING = 2.6
export const FLOOR_THICKNESS = 0.2
/** Party wall between 47 and 48 is centred here; flat 48 is the mirror image about it. */
export const PARTY_X = -2.09
export const mirrorX = (x: number) => 2 * PARTY_X - x

const r = (x0: number, x1: number, z0: number, z1: number): Rect => ({ x0, x1, z0, z1 })

/* ------------------------------------------------------------------ flat 47 */

const ROOMS_47: Room[] = [
  {
    id: 'room',
    flat: '47',
    rects: [r(-2.0, 3.0, -3.3, 0.0)],
    floor: 'parquet',
    walls: 'wallpaper47',
    ceiling: 'whitewash',
    height: CEILING,
    location: 'room',
    circuit: 0,
  },
  {
    id: 'kitchen',
    flat: '47',
    rects: [r(0.7, 3.0, 0.1, 2.9)],
    floor: 'boards',
    walls: 'whitewash',
    ceiling: 'whitewash',
    height: CEILING,
    location: 'kitchen',
    circuit: 1,
  },
  {
    id: 'bathroom',
    flat: '47',
    rects: [r(-2.0, -0.7, 1.9, 4.6)],
    floor: 'tiles',
    walls: 'tiles',
    ceiling: 'whitewash',
    height: CEILING,
    location: 'bathroom',
    circuit: 2,
  },
  {
    id: 'corridor',
    flat: '47',
    rects: [r(-0.6, 0.6, 0.1, 3.0)],
    floor: 'boards',
    walls: 'wallpaper47',
    ceiling: 'whitewash',
    height: CEILING,
    location: 'corridor',
    circuit: 3,
  },
  {
    id: 'hall',
    flat: '47',
    rects: [r(-0.6, 1.6, 3.0, 4.6)],
    floor: 'boards',
    walls: 'wallpaper47',
    ceiling: 'whitewash',
    height: CEILING,
    location: 'corridor',
    circuit: 3,
  },
  {
    id: 'closet',
    flat: '47',
    rects: [r(-2.0, -0.7, 0.1, 1.8)],
    floor: 'boards',
    walls: 'whitewash',
    ceiling: 'whitewash',
    height: CEILING,
    location: 'corridor',
    circuit: null,
  },
  {
    id: 'balcony',
    flat: '47',
    rects: [r(0.4, 2.9, -4.8, -3.6)],
    floor: 'concrete',
    walls: 'stairwell',
    ceiling: 'concrete',
    height: CEILING,
    location: 'balcony',
    circuit: null,
  },
]

const WALLS_47: Wall[] = [
  {
    id: 'facade',
    kind: 'exterior',
    axis: 'x',
    box: r(-2.0, 3.3, -3.6, -3.3),
    height: CEILING,
    openings: [
      { kind: 'window', at: 0.3, width: 1.4, bottom: 0.9, top: 2.3 },
      { kind: 'balcony_door', at: 1.7, width: 0.8, bottom: 0, top: 2.3, door: 'balcony_door' },
    ],
  },
  {
    id: 'party',
    kind: 'party',
    axis: 'z',
    box: r(-2.18, -2.0, -3.6, 4.78),
    height: CEILING,
    openings: [],
  },
  {
    id: 'east',
    kind: 'exterior',
    axis: 'z',
    box: r(3.0, 3.3, -3.3, 4.78),
    height: CEILING,
    openings: [{ kind: 'window', at: 1.5, width: 1.28, bottom: 0.9, top: 2.15 }],
  },
  {
    id: 'stair_wall',
    kind: 'stair',
    axis: 'x',
    box: r(-2.0, 3.0, 4.6, 4.78),
    height: CEILING,
    openings: [{ kind: 'door', at: 0, width: 0.9, bottom: 0, top: 2.05, door: 'front_door' }],
  },
  {
    id: 'room_south',
    kind: 'partition',
    axis: 'x',
    box: r(-2.0, 3.0, 0.0, 0.1),
    height: CEILING,
    openings: [{ kind: 'door', at: 0, width: 0.8, bottom: 0, top: 2.0, door: 'room_door' }],
  },
  {
    id: 'corridor_west',
    kind: 'partition',
    axis: 'z',
    box: r(-0.7, -0.6, 0.1, 4.6),
    height: CEILING,
    openings: [
      { kind: 'closet', at: 0.95, width: 1.3, bottom: 0, top: 2.1, door: 'closet_doors' },
      { kind: 'door', at: 2.5, width: 0.7, bottom: 0, top: 2.0, door: 'bath_door' },
    ],
  },
  {
    id: 'corridor_east',
    kind: 'partition',
    axis: 'z',
    box: r(0.6, 0.7, 0.1, 3.0),
    height: CEILING,
    openings: [{ kind: 'door', at: 1.4, width: 0.8, bottom: 0, top: 2.0, door: 'kitchen_door' }],
  },
  {
    id: 'closet_bath',
    kind: 'partition',
    axis: 'x',
    box: r(-2.0, -0.7, 1.8, 1.9),
    height: CEILING,
    openings: [],
  },
  {
    id: 'kitchen_south',
    kind: 'partition',
    axis: 'x',
    box: r(0.7, 3.0, 2.9, 3.0),
    height: CEILING,
    openings: [],
  },
  // Ventilation shaft and risers: the solid corner between kitchen, hall and stair wall.
  {
    id: 'shaft',
    kind: 'shaft',
    axis: 'z',
    box: r(1.6, 3.0, 3.0, 4.6),
    height: CEILING,
    openings: [],
  },
]

const ON_FLOOR: Support = { on: 'floor' }
const wall = (w: string): Support => ({ on: 'wall', wall: w })
const on = (object: string): Support => ({ on: 'object', object })
const HALF_PI = Math.PI / 2

const OBJECTS_47: WorldObject[] = [
  // Room — sofa-bed under the wall carpet on the shared wall, TV opposite.
  {
    id: 'wall_carpet',
    room: 'room',
    asset: 'wall_carpet',
    position: [-1.99, 0.75, -1.65],
    rotation: HALF_PI,
    orient: [HALF_PI, HALF_PI, 0],
    size: [2.3, 1.32, 0.01],
    support: wall('party'),
    purpose: 'carpet on the shared wall; the knocks come through it',
    interaction: 'carpet',
  },
  {
    id: 'sofa',
    room: 'room',
    asset: 'sofa_03',
    position: [-1.53, 0, -1.65],
    rotation: HALF_PI,
    size: [2.73, 1.12, 0.93],
    support: ON_FLOOR,
    purpose: 'sofa-bed the player sleeps on',
    interaction: 'bed',
    blocks: true,
  },
  {
    id: 'floor_rug',
    room: 'room',
    asset: 'wall_carpet',
    position: [0.3, 0, -1.4],
    rotation: 0,
    orient: [0, HALF_PI, 0],
    size: [1.6, 0.0066, 0.92],
    support: ON_FLOOR,
    purpose: 'rug in the middle of the room; diary page 6 under its corner',
  },
  {
    id: 'tv_stand',
    room: 'room',
    asset: 'painted_wooden_nightstand',
    position: [2.74, 0, -1.65],
    rotation: -HALF_PI,
    size: [0.5, 0.62, 0.51],
    support: ON_FLOOR,
    purpose: 'TV stand',
    blocks: true,
  },
  {
    id: 'tv',
    room: 'room',
    asset: 'Television_01',
    position: [2.76, 0.62, -1.65],
    rotation: -HALF_PI,
    size: [0.6, 0.46, 0.47],
    support: on('tv_stand'),
    purpose: 'CRT TV: static, then the room on screen',
    interaction: 'tv',
  },
  {
    id: 'sideboard',
    room: 'room',
    asset: 'vintage_cabinet_01',
    position: [1.9, 0, -0.34],
    rotation: Math.PI,
    size: [2.02, 2.24, 0.67],
    support: ON_FLOOR,
    purpose: 'glass-front sideboard along the corridor wall',
    blocks: true,
  },
  {
    id: 'books',
    room: 'room',
    asset: 'book_encyclopedia_set_01',
    position: [1.6, 1.32, -0.4],
    rotation: Math.PI,
    size: [0.55, 0.24, 0.16],
    support: on('sideboard'),
    purpose: 'encyclopaedia left by the previous tenant',
    contains: ['sideboard'],
  },
  {
    id: 'table',
    room: 'room',
    asset: 'wooden_table_02',
    position: [0.55, 0, -2.45],
    rotation: 0,
    size: [1.13, 0.8, 0.71],
    support: ON_FLOOR,
    purpose: "table by the window with the landlord's note",
    blocks: true,
  },
  {
    id: 'room_chair',
    room: 'room',
    asset: 'painted_wooden_chair_02',
    position: [-0.36, 0, -2.45],
    rotation: HALF_PI,
    size: [0.64, 1.26, 0.66],
    support: ON_FLOOR,
    purpose: 'chair at the table',
    blocks: true,
  },
  {
    id: 'note',
    room: 'room',
    asset: 'proc:paper',
    position: [0.35, 0.8, -2.5],
    rotation: 0.3,
    size: [0.21, 0.002, 0.3],
    support: on('table'),
    purpose: "Rustam aka's note (night 1)",
    interaction: 'note',
  },
  {
    id: 'phone',
    room: 'room',
    asset: 'proc:phone',
    position: [0.86, 0.8, -2.3],
    rotation: -0.35,
    size: [0.075, 0.009, 0.155],
    support: on('table'),
    purpose: "the player's phone: the mother's missed calls and voice messages",
    interaction: 'phone',
  },
  {
    id: 'clock',
    room: 'room',
    asset: 'wall_clock',
    position: [-1.3, 1.79, -3.276],
    rotation: 0,
    size: [0.32, 0.32, 0.047],
    support: wall('facade'),
    purpose: 'the clock stopped at 3:17; diary page 7 behind it',
    interaction: 'clock',
  },
  {
    id: 'room_window',
    room: 'room',
    asset: 'window',
    position: [0.3, 0.92, -3.45],
    rotation: 0,
    size: [1.4, 1.37, 0.07],
    support: wall('facade'),
    purpose: 'window to the courtyard and the block opposite',
    interaction: 'window',
  },
  {
    id: 'room_radiator',
    room: 'room',
    asset: 'radiator',
    position: [0.3, 0.1, -3.17],
    rotation: 0,
    size: [1.0, 0.84, 0.25],
    support: wall('facade'),
    purpose: 'cast-iron radiator under the window; knocks at night',
    interaction: 'radiator',
  },
  {
    id: 'chandelier',
    room: 'room',
    asset: 'chandelier',
    position: [0.5, 2.02, -1.65],
    rotation: 0,
    size: [0.66, 0.58, 0.66],
    support: { on: 'ceiling' },
    purpose: 'room light (circuit 0)',
  },
  {
    id: 'room_switch',
    room: 'room',
    asset: 'proc:switch',
    position: [0.6, 0.97, -0.01],
    rotation: Math.PI,
    size: [0.07, 0.11, 0.04],
    support: wall('room_south'),
    purpose: 'room light switch by the door at 1.0 m',
    interaction: 'lamp',
  },
  // Kitchen — fridge and stove on the room side, sink run on the hall side, table by the window.
  {
    id: 'fridge',
    room: 'kitchen',
    asset: 'fridge',
    position: [1.06, 0, 0.42],
    rotation: 0,
    orient: [0, -HALF_PI, 0],
    size: [0.6, 1.3, 0.61],
    support: ON_FLOOR,
    purpose: 'old fridge; its hum stops at 3:17',
    blocks: true,
  },
  {
    id: 'washer',
    room: 'kitchen',
    asset: 'washing_machine',
    position: [1.75, 0, 0.41],
    rotation: 0,
    size: [0.59, 0.88, 0.61],
    support: ON_FLOOR,
    purpose: 'washing machine between fridge and stove, as in many Tashkent kitchens',
    blocks: true,
  },
  {
    id: 'trash',
    room: 'kitchen',
    asset: 'trashbag',
    position: [0.98, 0, 2.05],
    rotation: 0,
    size: [0.45, 0.49, 0.39],
    support: ON_FLOOR,
    purpose: 'rubbish nobody took out',
    blocks: true,
  },
  {
    id: 'stove',
    room: 'kitchen',
    asset: 'gas_stove',
    position: [2.6, 0, 0.34],
    rotation: 0,
    size: [0.55, 0.8, 0.4],
    support: ON_FLOOR,
    purpose: 'gas stove',
    blocks: true,
  },
  {
    id: 'kettle',
    room: 'kitchen',
    asset: 'vintage_electric_kettle',
    position: [2.47, 0.8, 0.34],
    rotation: 0,
    size: [0.32, 0.31, 0.25],
    support: on('stove'),
    purpose: 'kettle (tea beats)',
    interaction: 'kettle',
    contains: ['stove'],
  },
  {
    id: 'pot',
    room: 'kitchen',
    asset: 'pot_enamel_01',
    position: [2.76, 0.8, 0.3],
    rotation: 0,
    size: [0.26, 0.18, 0.18],
    support: on('stove'),
    purpose: 'enamel pot left on the back burner',
    contains: ['stove'],
  },
  {
    id: 'sink_run',
    room: 'kitchen',
    asset: 'kitchen_units',
    position: [1.85, 0, 2.57],
    rotation: Math.PI,
    size: [2.25, 1.37, 0.65],
    support: ON_FLOOR,
    purpose: 'sink and cupboards along the hall wall',
    blocks: true,
  },
  {
    id: 'bread_bin',
    room: 'kitchen',
    asset: 'proc:bread_bin',
    position: [1.15, 0.92, 2.62],
    rotation: Math.PI,
    size: [0.4, 0.22, 0.28],
    support: on('sink_run'),
    purpose: 'bread box (diary page 3)',
    interaction: 'bread_bin',
    contains: ['sink_run'],
  },
  {
    id: 'kitchen_table',
    room: 'kitchen',
    asset: 'wooden_table_02',
    position: [2.305, 0, 1.5],
    rotation: HALF_PI,
    size: [1.13, 0.8, 0.71],
    support: ON_FLOOR,
    purpose: 'kitchen table under the window',
    blocks: true,
  },
  {
    id: 'kitchen_chair_1',
    room: 'kitchen',
    asset: 'painted_wooden_chair_02',
    position: [1.6, 0, 1.2],
    rotation: HALF_PI,
    size: [0.64, 1.26, 0.66],
    support: ON_FLOOR,
    purpose: 'chair (one of two; it moves when not watched)',
    blocks: true,
  },
  {
    id: 'kitchen_chair_2',
    room: 'kitchen',
    asset: 'painted_wooden_chair_02',
    position: [1.6, 0, 1.86],
    rotation: HALF_PI,
    size: [0.64, 1.26, 0.66],
    support: ON_FLOOR,
    purpose: 'second chair',
    blocks: true,
  },
  {
    id: 'tea_set',
    room: 'kitchen',
    asset: 'tea_set_01',
    position: [2.305, 0.8, 1.5],
    rotation: HALF_PI,
    size: [0.92, 0.165, 0.48],
    support: on('kitchen_table'),
    purpose: 'cups on the table',
    contains: ['kitchen_table'],
  },
  {
    id: 'kitchen_window',
    room: 'kitchen',
    asset: 'window',
    position: [3.15, 0.9, 1.5],
    rotation: -HALF_PI,
    size: [1.28, 1.25, 0.06],
    support: wall('east'),
    purpose: 'kitchen window (end façade)',
  },
  {
    id: 'kitchen_radiator',
    room: 'kitchen',
    asset: 'radiator',
    position: [2.9, 0.1, 1.5],
    rotation: -HALF_PI,
    size: [0.8, 0.67, 0.2],
    support: wall('east'),
    purpose: 'kitchen radiator',
  },
  {
    id: 'kitchen_bulb',
    room: 'kitchen',
    asset: 'pendant_bulb',
    position: [1.85, 2.0, 1.5],
    rotation: 0,
    size: [0.12, 0.6, 0.12],
    support: { on: 'ceiling' },
    purpose: 'kitchen light (circuit 1)',
  },
  {
    id: 'kitchen_switch',
    room: 'kitchen',
    asset: 'proc:switch',
    position: [0.72, 0.97, 2.0],
    rotation: HALF_PI,
    size: [0.07, 0.11, 0.04],
    support: wall('corridor_east'),
    purpose: 'kitchen switch at 1.0 m',
  },
  // Bathroom — tub at the far end, washer and sink by the door, toilet on the shared wall.
  {
    id: 'bathtub',
    room: 'bathroom',
    asset: 'bathtub',
    position: [-1.53, 0, 3.84],
    rotation: 0,
    size: [0.94, 2.1, 1.51],
    support: ON_FLOOR,
    purpose: 'bathtub with curtain',
    blocks: true,
  },
  {
    id: 'bath_sink',
    room: 'bathroom',
    asset: 'bath_sink',
    position: [-1.65, 0, 2.21],
    rotation: 0,
    size: [0.47, 1.19, 0.62],
    support: ON_FLOOR,
    purpose: 'pedestal sink',
    blocks: true,
  },
  {
    id: 'mirror_cabinet',
    room: 'bathroom',
    asset: 'proc:mirror_cabinet',
    position: [-1.65, 1.35, 1.97],
    rotation: 0,
    size: [0.5, 0.6, 0.14],
    support: wall('closet_bath'),
    purpose: 'mirror cabinet over the sink (night 2: the reflection that lags)',
    interaction: 'mirror',
  },
  {
    id: 'toilet',
    room: 'bathroom',
    asset: 'toilet',
    position: [-1.69, 0, 2.78],
    rotation: HALF_PI,
    size: [0.48, 0.74, 0.61],
    support: ON_FLOOR,
    purpose: 'toilet against the shared wall',
    blocks: true,
  },
  {
    id: 'bleach',
    room: 'bathroom',
    asset: 'bleach_bottle',
    position: [-1.3, 0, 2.1],
    rotation: 0,
    size: [0.09, 0.29, 0.06],
    support: ON_FLOOR,
    purpose: 'bleach on the floor by the sink',
  },
  {
    id: 'vent',
    room: 'bathroom',
    asset: 'proc:vent',
    position: [-1.99, 2.05, 4.2],
    rotation: HALF_PI,
    size: [0.25, 0.25, 0.02],
    support: wall('party'),
    purpose: 'vent shared with flat 48: the voice is clearest here',
    interaction: 'vent',
  },
  {
    id: 'bath_bulb',
    room: 'bathroom',
    asset: 'pendant_bulb',
    position: [-1.35, 2.15, 3.0],
    rotation: 0,
    size: [0.1, 0.45, 0.1],
    support: { on: 'ceiling' },
    purpose: 'bathroom light (circuit 2)',
  },
  {
    id: 'bath_switch',
    room: 'corridor',
    asset: 'proc:switch',
    position: [-0.59, 0.97, 2.0],
    rotation: HALF_PI,
    size: [0.07, 0.11, 0.04],
    support: wall('corridor_west'),
    purpose: 'bathroom switch outside the door, Soviet style',
  },
  // Corridor and hall.
  {
    id: 'wardrobe',
    room: 'corridor',
    asset: 'proc:closet_doors',
    position: [-0.65, 0, 0.95],
    rotation: HALF_PI,
    size: [1.3, 2.1, 0.04],
    support: wall('corridor_west'),
    purpose: 'built-in wardrobe doors',
    interaction: 'wardrobe',
  },
  {
    id: 'mirror',
    room: 'corridor',
    asset: 'ornate_mirror_01',
    position: [0.585, 1.15, 2.45],
    rotation: -HALF_PI,
    size: [0.49, 0.74, 0.03],
    support: wall('corridor_east'),
    purpose: 'mirror by the door, the last look before going out',
  },
  {
    id: 'corridor_bulb',
    room: 'corridor',
    asset: 'pendant_bulb',
    position: [0, 2.15, 1.5],
    rotation: 0,
    size: [0.1, 0.45, 0.1],
    support: { on: 'ceiling' },
    purpose: 'corridor light (circuit 3)',
  },
  {
    id: 'hall_switch',
    room: 'hall',
    asset: 'proc:switch',
    position: [0.6, 0.97, 4.59],
    rotation: Math.PI,
    size: [0.07, 0.11, 0.04],
    support: wall('stair_wall'),
    purpose: 'hall switch by the entrance at 1.0 m',
  },
  {
    id: 'coat_hooks',
    room: 'hall',
    asset: 'coat_hooks',
    position: [1.5, 1.55, 3.8],
    rotation: 0,
    size: [0.2, 0.28, 1.2],
    support: wall('shaft'),
    purpose: "coat hooks (a coat that isn't the player's appears later)",
  },
  {
    id: 'shoe_rack',
    room: 'hall',
    asset: 'shoe_rack',
    position: [1.45, 0, 3.8],
    rotation: -HALF_PI,
    orient: [0, -HALF_PI, 0],
    size: [0.65, 1.13, 0.3],
    support: ON_FLOOR,
    purpose: 'shoe rack under the hooks',
    blocks: true,
  },
  {
    id: 'moving_box',
    room: 'hall',
    asset: 'cardboard_box_01',
    position: [-0.3, 0, 3.4],
    rotation: 0.25,
    size: [0.39, 0.34, 0.52],
    support: ON_FLOOR,
    purpose: 'unpacked moving box',
    blocks: true,
  },
  {
    id: 'hall_bulb',
    room: 'hall',
    asset: 'pendant_bulb',
    position: [0.5, 2.15, 3.8],
    rotation: 0,
    size: [0.1, 0.45, 0.1],
    support: { on: 'ceiling' },
    purpose: 'hall light (circuit 3)',
  },
]

/* --------------------------------------------------------- landing (common) */

const ROOMS_COMMON: Room[] = [
  {
    id: 'landing',
    flat: 'common',
    rects: [r(-6.4, 3.0, 4.78, 7.2)],
    floor: 'concrete',
    walls: 'stairwell',
    ceiling: 'whitewash',
    height: CEILING,
    location: 'stairwell',
    circuit: null,
  },
  {
    id: 'stairs',
    flat: 'common',
    rects: [r(0.2, 3.0, 7.2, 10.0)],
    floor: 'concrete',
    walls: 'stairwell',
    ceiling: 'whitewash',
    height: CEILING,
    location: 'stairwell',
    circuit: null,
  },
]

const WALLS_COMMON: Wall[] = [
  {
    id: 'landing_south',
    kind: 'stair',
    axis: 'x',
    box: r(-6.4, 0.2, 7.2, 7.38),
    height: CEILING,
    openings: [{ kind: 'door', at: -2.6, width: 1.0, bottom: 0, top: 2.0, door: 'lift' }],
  },
  {
    id: 'landing_west',
    kind: 'stair',
    axis: 'z',
    box: r(-6.58, -6.4, 4.78, 7.38),
    height: CEILING,
    openings: [{ kind: 'door', at: 6.0, width: 0.9, bottom: 0, top: 2.05, door: 'door46' }],
  },
  {
    id: 'stairs_west',
    kind: 'stair',
    axis: 'z',
    box: r(0.02, 0.2, 7.2, 10.18),
    height: CEILING,
    openings: [],
  },
  {
    id: 'landing_east',
    kind: 'stair',
    axis: 'z',
    box: r(3.0, 3.18, 4.78, 10.18),
    height: CEILING,
    openings: [{ kind: 'door', at: 6.0, width: 0.9, bottom: 0, top: 2.05, door: 'door49' }],
  },
  {
    id: 'stairs_south',
    kind: 'exterior',
    axis: 'x',
    box: r(0.2, 3.0, 10.0, 10.3),
    height: CEILING,
    openings: [{ kind: 'window', at: 1.6, width: 1.2, bottom: 1.1, top: 2.3 }],
  },
]

const OBJECTS_COMMON: WorldObject[] = [
  {
    id: 'stairs_window',
    room: 'stairs',
    asset: 'window',
    position: [1.6, 1.12, 10.15],
    rotation: Math.PI,
    size: [1.2, 1.17, 0.06],
    support: wall('stairs_south'),
    purpose: 'stairwell window above the radiator and half-landing',
  },
  {
    id: 'landing_bulb',
    room: 'landing',
    asset: 'pendant_bulb',
    position: [-1.6, 2.15, 6.0],
    rotation: 0,
    size: [0.1, 0.45, 0.1],
    support: { on: 'ceiling' },
    purpose: 'landing light, on a timer; off after 3:17',
  },
  {
    id: 'stairs_radiator',
    room: 'stairs',
    asset: 'radiator',
    position: [1.6, 0.1, 9.9],
    rotation: Math.PI,
    size: [0.8, 0.67, 0.2],
    support: wall('stairs_south'),
    purpose: 'stairwell radiator under the window',
  },
]

/* ------------------------------------------------------------------ flat 48 */

const ID_48: Partial<Record<RoomId, RoomId>> = {
  room: 'room48',
  kitchen: 'kitchen48',
  bathroom: 'bathroom48',
  corridor: 'corridor48',
  hall: 'hall48',
  closet: 'closet48',
}

const mirrorRect = (b: Rect): Rect => ({
  x0: mirrorX(b.x1),
  x1: mirrorX(b.x0),
  z0: b.z0,
  z1: b.z1,
})

const ROOMS_48: Room[] = ROOMS_47.filter((room) => ID_48[room.id]).map((room) => ({
  ...room,
  id: ID_48[room.id]!,
  flat: '48' as const,
  rects: room.rects.map(mirrorRect),
  walls: room.walls === 'wallpaper47' ? 'wallpaper48' : room.walls,
  location: 'flat48' as const,
  circuit: null,
}))

const WALLS_48: Wall[] = WALLS_47.filter((w) => w.id !== 'party' && w.id !== 'facade')
  .map((w) => ({
    ...w,
    id: `${w.id}48`,
    box: mirrorRect(w.box),
    // Openings along z keep their position; along x they mirror.
    openings: w.openings.map((o) => ({
      ...o,
      at: w.axis === 'x' ? mirrorX(o.at) : o.at,
      ...(o.door ? { door: `${o.door}48` } : {}),
    })),
  }))
  .concat({
    id: 'facade48',
    kind: 'exterior',
    axis: 'x',
    box: mirrorRect(r(-2.0, 3.3, -3.6, -3.3)),
    height: CEILING,
    // No balcony on 48: the old tenant glazed it in and it was bricked up.
    openings: [{ kind: 'window', at: mirrorX(0.3), width: 1.4, bottom: 0.9, top: 2.3 }],
  })

/** What is left in 48: the bare sofa frame, a chair in the middle, boxes, his things. */
const KEEP_48 = new Set([
  'wall_carpet',
  'sofa',
  'clock',
  'room_window',
  'room_radiator',
  'chandelier',
  'stove',
  'sink_run',
  'kitchen_window',
  'kitchen_radiator',
  'bathtub',
  'bath_sink',
  'toilet',
  'vent',
  'wardrobe',
  'mirror',
])

const DECAY = '#7d8478'

const OBJECTS_48: WorldObject[] = OBJECTS_47.filter((o) => KEEP_48.has(o.id))
  .map((o): WorldObject => ({
    ...o,
    id: `${o.id}48`,
    room: ID_48[o.room] ?? o.room,
    position: [mirrorX(o.position[0]), o.position[1], o.position[2]],
    rotation: -o.rotation,
    support:
      o.support.on === 'wall'
        ? { on: 'wall', wall: o.support.wall === 'party' ? 'party' : `${o.support.wall}48` }
        : o.support.on === 'object'
          ? { on: 'object', object: `${o.support.object}48` }
          : o.support,
    ...(o.contains ? { contains: o.contains.map((c) => `${c}48`) } : {}),
    tint: DECAY,
    // Story anchors in 48 are the ones below, not the copies.
    interaction: undefined,
  }))
  .concat([
    {
      id: 'chair48',
      room: 'room48',
      asset: 'painted_wooden_chair_02',
      position: [mirrorX(0.4), 0, -1.5],
      rotation: 0.4,
      size: [0.64, 1.26, 0.66],
      support: ON_FLOOR,
      purpose: 'a chair alone in the middle of the room, facing the shared wall',
      interaction: 'chair',
      blocks: true,
      tint: DECAY,
    },
    {
      id: 'stool48',
      room: 'room48',
      asset: 'painted_wooden_stool',
      position: [mirrorX(1.6), 0, -2.6],
      rotation: 0.2,
      size: [0.39, 0.58, 0.41],
      support: ON_FLOOR,
      purpose: 'stool under the window',
      blocks: true,
      tint: DECAY,
    },
    {
      id: 'calendar',
      room: 'room48',
      asset: 'proc:calendar',
      position: [mirrorX(-0.9), 1.55, -3.29],
      rotation: 0,
      size: [0.36, 0.5, 0.01],
      support: wall('facade48'),
      purpose: 'wall calendar stopped years ago',
      interaction: 'calendar',
    },
    {
      id: 'belongings',
      room: 'room48',
      asset: 'cardboard_box_01',
      position: [mirrorX(2.4), 0, -0.9],
      rotation: -0.3,
      size: [0.39, 0.34, 0.52],
      support: ON_FLOOR,
      purpose: "Sardor's things; the player's passport among them",
      interaction: 'belongings',
      blocks: true,
      tint: DECAY,
    },
    {
      id: 'cupboard48',
      room: 'kitchen48',
      asset: 'painted_wooden_cabinet',
      position: [mirrorX(1.4), 0, 0.42],
      rotation: 0,
      size: [1.2, 1.18, 0.62],
      support: ON_FLOOR,
      purpose: 'dresser left in the kitchen',
      blocks: true,
      tint: DECAY,
    },
    {
      id: 'trash48',
      room: 'hall48',
      asset: 'trashbag',
      position: [mirrorX(-0.3), 0, 3.5],
      rotation: 1.1,
      size: [0.45, 0.49, 0.39],
      support: ON_FLOOR,
      purpose: 'rubbish bag by the door',
      blocks: true,
      tint: DECAY,
    },
  ])

/* -------------------------------------------------------------------- doors */

export interface DoorDef {
  id: string
  wall: string
  /** Hinge side along the wall's long axis: the leaf swings from the low or high end. */
  hinge: 'low' | 'high'
  /** Swing direction: +1 toward +z/+x side of the wall, −1 toward −z/−x. */
  swing: 1 | -1
  kind: 'entrance' | 'interior' | 'glass' | 'closet' | 'balcony' | 'metal' | 'lift'
  /** Number plate (entrance doors). */
  label?: string
}

const DOORS_47: DoorDef[] = [
  { id: 'front_door', wall: 'stair_wall', hinge: 'high', swing: -1, kind: 'entrance', label: '47' },
  { id: 'room_door', wall: 'room_south', hinge: 'low', swing: -1, kind: 'interior' },
  { id: 'kitchen_door', wall: 'corridor_east', hinge: 'low', swing: 1, kind: 'glass' },
  { id: 'bath_door', wall: 'corridor_west', hinge: 'high', swing: 1, kind: 'interior' },
  { id: 'closet_doors', wall: 'corridor_west', hinge: 'low', swing: 1, kind: 'closet' },
  { id: 'balcony_door', wall: 'facade', hinge: 'high', swing: 1, kind: 'balcony' },
]

const DOORS_COMMON: DoorDef[] = [
  { id: 'door46', wall: 'landing_west', hinge: 'low', swing: 1, kind: 'metal', label: '46' },
  { id: 'door49', wall: 'landing_east', hinge: 'low', swing: -1, kind: 'metal', label: '49' },
  { id: 'lift', wall: 'landing_south', hinge: 'low', swing: 1, kind: 'lift' },
]

const DOORS_48: DoorDef[] = DOORS_47.filter((d) => d.id !== 'balcony_door').map((d) => ({
  ...d,
  id: `${d.id}48`,
  wall: `${d.wall}48`,
  // Mirroring flips which end of an x-axis wall the hinge sits on.
  hinge:
    WALLS_47.find((w) => w.id === d.wall)?.axis === 'x'
      ? d.hinge === 'low'
        ? 'high'
        : 'low'
      : d.hinge,
  swing: WALLS_47.find((w) => w.id === d.wall)?.axis === 'z' ? ((d.swing * -1) as 1 | -1) : d.swing,
  ...(d.label ? { label: '48' } : {}),
}))

/* ------------------------------------------------------------------- lights */

const LIGHTS: LightDef[] = [
  { id: 'room_light', room: 'room', position: [0.5, 2.25, -1.65], kind: 'ceiling', circuit: 0 },
  {
    id: 'kitchen_light',
    room: 'kitchen',
    position: [1.85, 2.05, 1.5],
    kind: 'ceiling',
    circuit: 1,
  },
  { id: 'bath_light', room: 'bathroom', position: [-1.35, 2.18, 3.0], kind: 'ceiling', circuit: 2 },
  { id: 'corridor_light', room: 'corridor', position: [0, 2.18, 1.5], kind: 'ceiling', circuit: 3 },
  { id: 'hall_light', room: 'hall', position: [0.5, 2.18, 3.8], kind: 'ceiling', circuit: 3 },
  {
    id: 'landing_light',
    room: 'landing',
    position: [-1.6, 2.18, 6.0],
    kind: 'landing',
    circuit: null,
  },
  { id: 'streetlamp', room: 'room', position: [4.5, -2.55, -16], kind: 'street', circuit: null },
  { id: 'moon', room: 'room', position: [-12, 22, -30], kind: 'moon', circuit: null },
]

/* -------------------------------------------------------------------- world */

export const WORLD = {
  rooms: [...ROOMS_47, ...ROOMS_COMMON, ...ROOMS_48],
  walls: [...WALLS_47, ...WALLS_COMMON, ...WALLS_48],
  objects: [...OBJECTS_47, ...OBJECTS_COMMON, ...OBJECTS_48],
  doors: [...DOORS_47, ...DOORS_COMMON, ...DOORS_48],
  lights: LIGHTS,
}

/** Corridor stretch (night 3): everything at or beyond this z moves by the extension. */
export const CORRIDOR_SPLIT_Z = 3.0

export const roomById = (id: RoomId) => WORLD.rooms.find((room) => room.id === id)!
export const wallById = (id: string) => WORLD.walls.find((w) => w.id === id)
export const objectById = (id: string) => WORLD.objects.find((o) => o.id === id)

export function rectArea(rect: Rect) {
  return (rect.x1 - rect.x0) * (rect.z1 - rect.z0)
}

export function roomArea(id: RoomId) {
  return roomById(id).rects.reduce((sum, rect) => sum + rectArea(rect), 0)
}

export function inRect(rect: Rect, x: number, z: number, margin = 0) {
  return (
    x >= rect.x0 + margin && x <= rect.x1 - margin && z >= rect.z0 + margin && z <= rect.z1 - margin
  )
}

/** The rectangle an opening cuts through its wall (plan view). */
export function openingRect(w: Wall, o: Opening): Rect {
  return w.axis === 'x'
    ? { x0: o.at - o.width / 2, x1: o.at + o.width / 2, z0: w.box.z0, z1: w.box.z1 }
    : { x0: w.box.x0, x1: w.box.x1, z0: o.at - o.width / 2, z1: o.at + o.width / 2 }
}

/** Plan footprint of an object, rotated by multiples of 90° (all furniture is axis-aligned). */
export function footprint(o: WorldObject): Rect {
  const quarter = Math.round(o.rotation / (Math.PI / 2))
  const swap = Math.abs(quarter) % 2 === 1
  const w = swap ? o.size[2] : o.size[0]
  const d = swap ? o.size[0] : o.size[2]
  return {
    x0: o.position[0] - w / 2,
    x1: o.position[0] + w / 2,
    z0: o.position[2] - d / 2,
    z1: o.position[2] + d / 2,
  }
}
