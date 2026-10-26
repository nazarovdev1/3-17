/**
 * Hotspot registry for the mobile presenter. Coordinates are normalized
 * (0..1) inside the scene area. A hotspot is rendered only when the current
 * node has a visible choice with the same id, so no dead buttons can exist. The
 * visible label is always the choice's own text from the YAML.
 */
export interface HotspotDef {
  x: number
  y: number
}

export const HOTSPOTS: Record<string, HotspotDef> = {
  listen: { x: 0.92, y: 0.72 },
  bathroom: { x: 0.1, y: 0.72 },
  kitchen: { x: 0.9, y: 0.51 },
  corridor: { x: 0.1, y: 0.46 },
  diary: { x: 0.32, y: 0.66 },
  clock: { x: 0.5, y: 0.38 },
  shifted_clock: { x: 0.66, y: 0.38 },
  note: { x: 0.24, y: 0.62 },
  radiator: { x: 0.78, y: 0.66 },
  tv: { x: 0.22, y: 0.44 },
  window: { x: 0.5, y: 0.3 },
  kitchen_door: { x: 0.86, y: 0.5 },
  kettle: { x: 0.4, y: 0.62 },
  gas_stove: { x: 0.6, y: 0.62 },
  bread_bin: { x: 0.3, y: 0.58 },
  wardrobe: { x: 0.8, y: 0.42 },
  mirror: { x: 0.5, y: 0.3 },
  vent: { x: 0.82, y: 0.24 },
  shared_wall: { x: 0.9, y: 0.5 },
  carpet: { x: 0.5, y: 0.8 },
  front_door: { x: 0.16, y: 0.46 },
  corridor_length: { x: 0.6, y: 0.5 },
  muhabbat_door: { x: 0.5, y: 0.42 },
  peephole: { x: 0.16, y: 0.42 },
  figure: { x: 0.5, y: 0.44 },
  door48: { x: 0.78, y: 0.48 },
  calendar: { x: 0.74, y: 0.2 },
  belongings: { x: 0.32, y: 0.6 },
  chair: { x: 0.32, y: 0.66 },
  lamp: { x: 0.66, y: 0.26 },
  opposite_building: { x: 0.34, y: 0.34 },
  bathroom_door: { x: 0.14, y: 0.52 },
}

/** Vignette ids the story uses, for the presenter's completeness check. */
export const VIGNETTE_IDS = [
  'room_entry',
  'room',
  'room_shifted',
  'room_dark',
  'window',
  'kitchen',
  'bathroom',
  'corridor',
  'stairwell',
  'landing48',
  'flat48',
  'wall',
  'peephole',
  'ending_a',
  'ending_b',
  'ending_c',
] as const
