/** Scalar diagnostics keep Three.js out of the mobile entry graph. */
export const desktopRuntime = {
  mounted: false,
  context: 'idle',
  tier: 'high',
  fps: 0,
  frames: 0,
  calls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  position: [0, 1.6, 0] as number[],
  yaw: 0,
  pitch: 0,
  control: 'drag',
  flashlight: false,
  corridorLength: 1,
  mirrorDelay: 0,
  mirrorOffset: 0,
  windowsLit: 0,
  renderHeight: 0,
  lastInteraction: '',
}
export const getDesktopState = () => ({ ...desktopRuntime, position: [...desktopRuntime.position] })
