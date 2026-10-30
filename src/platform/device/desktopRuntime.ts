/** Scalar diagnostics keep Three.js out of the mobile entry graph. */
export const desktopRuntime = {
  mounted: false,
  worldReady: false,
  software: false,
  shadows: false,
  context: 'idle',
  tier: 'high',
  fps: 0,
  frames: 0,
  calls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  position: [0, 1.6, 0] as number[],
  /** Counts deliberate one-frame GPU uploads (each night's start): not a slow GPU. */
  primes: 0,
  /** Floor height under the player: 0 on the 4th floor, below on the stairs. */
  feet: 0,
  yaw: 0,
  pitch: 0,
  control: 'drag',
  flashlight: false,
  corridorLength: 1,
  mirrorDelay: 0,
  mirrorOffset: 0,
  mirrorYaw: 0,
  mirrorPitch: 0,
  clockShifted: false,
  windowsLit: 0,
  renderHeight: 0,
  lastInteraction: '',
  /** The figure's current appearance id ('' when it is nowhere). */
  figure: '',
  /** Where the phone is and what its screen shows, e.g. 'table:off:down', 'hand:playing'. */
  phone: '',
  /** A paper is held up for reading; mouse drags turn it instead of the head. */
  inspecting: false,
  /** Unobserved changes now in place, comma-separated (e.g. 'chair,coat'). */
  changes: '',
  inspectYaw: 0,
  inspectPitch: 0,
  /** Whether each flat's entrance leaf stands open at all (Doors writes it every frame). */
  entrances: { front_door: false, front_door48: false } as Record<string, boolean>,
  doorLeaves: {} as Record<string, { x0: number; z0: number; x1: number; z1: number }>,
  doorAngles: {} as Record<string, number>,
  doorChoices: {} as Record<string, boolean>,
  doorLocks: {} as Record<string, boolean>,
  wardrobeChoice: undefined as boolean | undefined,
  wardrobeAngle: 0,
  /** Flats whose furniture is drawn this frame (out of sight behind shut doors otherwise). */
  flatsDrawn: '',
  /** Debug/test builds only: a requested jump [x, z, yaw], consumed by the camera rig. */
  teleport: null as number[] | null,
}
export const getDesktopState = () => ({ ...desktopRuntime, position: [...desktopRuntime.position] })
