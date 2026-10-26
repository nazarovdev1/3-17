/**
 * Hotspot registry for the mobile presenter. Coordinates are normalized
 * (0..1) inside the scene area. A hotspot is rendered only when the current
 * node has a visible choice with the same id, so no dead buttons can exist.
 */
export interface HotspotDef {
  x: number
  y: number
  /** Optional label rendered on long-press / focus; tap dispatches the choice. */
  label: string
}

export const HOTSPOTS: Record<string, HotspotDef> = {
  listen: { x: 0.92, y: 0.72, label: 'Devorni tinglash' },
  bathroom: { x: 0.1, y: 0.72, label: 'Hammom' },
  kitchen: { x: 0.9, y: 0.51, label: 'Oshxona' },
  corridor: { x: 0.1, y: 0.46, label: 'Dahliz' },
  diary: { x: 0.32, y: 0.66, label: 'Sahifa' },
  clock: { x: 0.5, y: 0.38, label: 'Soat' },
  shifted_clock: { x: 0.66, y: 0.38, label: 'Joyini oʻzgartirgan soat' },
  note: { x: 0.24, y: 0.62, label: 'Qogʻoz' },
  radiator: { x: 0.78, y: 0.66, label: 'Radiator' },
  tv: { x: 0.22, y: 0.44, label: 'Televizor' },
  window: { x: 0.5, y: 0.3, label: 'Oyna' },
  kitchen_door: { x: 0.86, y: 0.5, label: 'Oshxona' },
  kettle: { x: 0.4, y: 0.62, label: 'Choynak' },
  gas_stove: { x: 0.6, y: 0.62, label: 'Gaz plitasi' },
  bread_bin: { x: 0.3, y: 0.58, label: 'Non qutisi' },
  wardrobe: { x: 0.8, y: 0.42, label: 'Shkaf' },
  mirror: { x: 0.5, y: 0.3, label: 'Oyna (hammom)' },
  vent: { x: 0.82, y: 0.24, label: 'Ventilyator' },
  shared_wall: { x: 0.9, y: 0.5, label: 'Devor' },
  carpet: { x: 0.5, y: 0.8, label: 'Gilam' },
  front_door: { x: 0.16, y: 0.46, label: 'Old eshik' },
  corridor_length: { x: 0.6, y: 0.5, label: 'Dahliz' },
  muhabbat_door: { x: 0.5, y: 0.42, label: 'Muhabbat opa' },
  peephole: { x: 0.16, y: 0.42, label: 'Kozachok' },
  figure: { x: 0.5, y: 0.44, label: 'Soya' },
  door48: { x: 0.78, y: 0.48, label: '48' },
  calendar: { x: 0.74, y: 0.2, label: 'Kalendar' },
  belongings: { x: 0.32, y: 0.6, label: 'Buyumlar' },
  chair: { x: 0.32, y: 0.66, label: 'Stul' },
  lamp: { x: 0.66, y: 0.26, label: 'Lampa' },
  opposite_building: { x: 0.34, y: 0.34, label: 'Narigi uy' },
  bathroom_door: { x: 0.14, y: 0.52, label: 'Hammom' },
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
