type Point = [number, number, number]
export interface StillCamera {
  position: Point
  yaw: number
  pitch: number
  fov: number
}
const cam = (position: Point, yaw: number, pitch = -0.12, fov = 82): StillCamera => ({
  position,
  yaw,
  pitch,
  fov,
})
/** Metres in the same floor plan as the desktop. No renderer imports in mobile code. */
export const STILL_CAMERAS: Record<string, StillCamera> = {
  room: cam([0.6, 1.6, -0.6], 0, -0.15, 92),
  room_shifted: cam([0.6, 1.6, -0.6], 0.815, 0.06, 90),
  room_entry: cam([0, 1.6, 0.15], 0, -0.13, 94),
  kitchen: cam([1.04, 1.6, 1.55], -2.0, -0.18, 96),
  kitchen_glass: cam([-0.32, 1.6, 1.62], -1.42, -0.06, 82),
  bathroom: cam([-0.92, 1.6, 2.75], 0.75, -0.08, 96),
  corridor: cam([0, 1.6, 1.0], Math.PI, -0.1, 88),
  corridor_changed: cam([0, 1.6, 1.0], Math.PI, -0.1, 88),
  coat: cam([0.3, 1.6, 2.95], -1.82, -0.15),
  stairwell: cam([-5.3, 1.6, 5.6], -1.8, -0.08, 94),
  landing48: cam([0.4, 1.6, 6.4], 1.264, -0.3, 92),
  flat48: cam([-4.8, 1.6, -0.6], 0, -0.15, 92),
  wall: cam([-0.8, 1.6, -0.45], Math.PI / 2, -0.08),
  peephole: cam([0, 1.6, 4.75], Math.PI, 0, 100),
  peephole_close: cam([0, 1.6, 4.75], Math.PI + 0.35, -0.03, 155),
  window: cam([0.6, 1.6, -1.1], 0, 0, 84),
  phone: cam([0.6, 1.6, -0.6], 0, -0.36, 40),
  tv: cam([1.85, 1.6, -1.5], -1.42, -0.62, 76),
  ending_a: cam([-0.2, 1.6, -0.4], 0, -0.1, 88),
  ending_b: cam([1.8, -7, -9.5], -0.35, 0.03, 82),
  ending_c: cam([-0.6, 1.6, -1.9], 0.47, 0.23, 66),
}
export interface StillRecipe {
  id: string
  camera: string
  nodes: string[]
  flags?: Record<string, boolean>
  tense?: boolean
  time: string
}
const EXPORT_CAMERA: Record<string, string> = {
  'room-changed': 'room_shifted',
  'kitchen-figure': 'kitchen_glass',
  'corridor-changed': 'corridor_changed',
  'peephole-close': 'peephole_close',
}
const shot = (
  camera: string,
  state: string,
  nodes: string[],
  flags?: Record<string, boolean>,
): StillRecipe => ({
  id: `${camera}-${state}`,
  camera: EXPORT_CAMERA[`${camera}-${state}`] ?? camera,
  nodes,
  flags,
  time:
    camera === 'ending_c'
      ? '3:18'
      : camera === 'window' && state === 'off'
        ? '3:16'
        : state === 'off' || nodes.some((node) => node.endsWith('_317'))
          ? '3:17'
          : '02:41',
  tense: state === 'off' || state === 'figure' || state === 'close',
})
export const STILL_RECIPES: StillRecipe[] = [
  shot('room', 'on', ['n1_hub']),
  shot('room', 'off', ['n1_317']),
  shot('room', 'changed', ['n3_hub'], { clock_shifted: true }),
  shot('room', 'return', ['n1_tea', 'n1_hub']),
  shot('room_entry', 'on', ['n1_start']),
  shot('room_entry', 'off', ['n1_317', 'n1_hub']),
  shot('kitchen', 'on', ['n1_tea']),
  shot('kitchen', 'off', ['n1_317', 'n1_tea']),
  shot('kitchen', 'figure', ['n3_corridor_loop']),
  shot('bathroom', 'on', ['n2_mirror']),
  shot('bathroom', 'off', ['n2_317', 'n2_mirror']),
  shot('bathroom', 'changed', ['n2_mirror']),
  shot('corridor', 'on', ['n1_hub']),
  shot('corridor', 'off', ['n4_317', 'n4_hub']),
  shot('corridor', 'changed', ['n3_corridor_loop']),
  shot('corridor', 'cleared', ['n4_317', 'n4_peephole', 'n4_hub'], { saw_figure: true }),
  shot('corridor', 'cold', ['n5_start']),
  shot('coat', 'changed', ['n3_hub']),
  shot('stairwell', 'on', ['n1_hub']),
  shot('stairwell', 'off', ['n4_317', 'n4_hub']),
  shot('stairwell', 'figure', ['n1_hub', 'n2_day_start']),
  shot('landing48', 'on', ['n4_hub']),
  shot('landing48', 'off', ['n4_317', 'n4_hub']),
  shot('landing48', 'changed', ['n4_317', 'n4_peephole', 'n4_hub'], { saw_figure: true }),
  shot('flat48', 'on', ['n4_inside48']),
  shot('flat48', 'off', ['n4_317', 'n4_inside48']),
  shot('flat48', 'changed', ['n4_317', 'n4_glitch']),
  shot('wall', 'on', ['n2_listen']),
  shot('wall', 'off', ['n2_317', 'n2_listen']),
  shot('peephole', 'on', ['n1_hub']),
  shot('peephole', 'off', ['n4_317', 'n4_peephole', 'n4_hub']),
  shot('peephole', 'figure', ['n4_317', 'n4_peephole']),
  shot('peephole', 'close', ['n5_317', 'n5_voice_final']),
  shot('window', 'on', ['n1_window']),
  shot('window', 'off', ['n5_316']),
  ...[1, 2, 3, 4, 5].map((night) => shot('phone', `night${night}`, [`n${night}_phone`])),
  shot('phone', 'dead', ['n5_317', 'n5_phone']),
  shot('tv', 'figure', ['n3_tv']),
  shot('ending_a', 'on', ['n1_start']),
  shot('ending_b', 'on', ['n1_window']),
  shot('ending_c', 'on', ['n5_clock']),
]
/**
 * The still for a mobile viewpoint in the current world: lights on or off, and the
 * persistent revisit changes of later nights (never a random frame choice).
 */
export function stillFor(view: string, night: number, power: boolean): string {
  if (view === 'phone') return night === 5 && !power ? 'phone-dead' : `phone-night${night}`
  const off = !power
  if (view === 'corridor' && !off && night === 5) return 'corridor-cold'
  // The coat on its hooks (a closer look off the hall) is the changed state of the wall.
  if (view === 'coat') return 'coat-changed'
  const variant = view === 'room' && !off && night >= 3 ? 'changed' : off ? 'off' : 'on'
  const id = `${view}-${variant}`
  return STILL_RECIPES.some((recipe) => recipe.id === id) ? id : `${view}-on`
}
