// Every external asset the game ships, pinned by source id. `npm run assets` downloads them
// into `.asset-cache/` and writes optimised copies to `public/assets/` (FIX_PROMPT §3).
//
// Rules: CC0 or CC-BY only; no stylised / low-poly packs; every entry says why it exists.
// `tier` sets the texture size (hero 2K, normal 1K, small 512). `group` sets load order:
// flat47 must be loaded before play starts, the others stream in the background.

export type AssetKind = 'model' | 'texture' | 'hdri'
export type AssetSource = 'polyhaven' | 'ambientcg'
export type AssetTier = 'hero' | 'normal' | 'small'
export type AssetGroup = 'flat47' | 'stairwell' | 'flat48'
export type AssetLicense = 'CC0-1.0' | 'CC-BY-4.0'

export interface AssetSourceEntry {
  /** Local id, also the output file name. */
  id: string
  kind: AssetKind
  source: AssetSource
  /** Id on the source site. */
  remoteId: string
  tier: AssetTier
  group: AssetGroup
  license: AssetLicense
  /** Why the asset is in the game (where it goes, what it is for). */
  purpose: string
}

export const ALLOWED_LICENSES: readonly AssetLicense[] = ['CC0-1.0', 'CC-BY-4.0']

/** Stylised packs FIX_PROMPT §3 forbids; the pipeline refuses any id or author matching these. */
export const FORBIDDEN_PATTERNS = [/kenney/i, /quaternius/i, /low.?poly/i, /toon/i, /cartoon/i]

export const TIER_SIZE: Record<AssetTier, number> = { hero: 2048, normal: 1024, small: 512 }

const ph = (
  id: string,
  kind: AssetKind,
  tier: AssetTier,
  group: AssetGroup,
  purpose: string,
): AssetSourceEntry => ({
  id,
  kind,
  source: 'polyhaven',
  remoteId: id,
  tier,
  group,
  license: 'CC0-1.0',
  purpose,
})

const acg = (
  id: string,
  tier: AssetTier,
  group: AssetGroup,
  purpose: string,
): AssetSourceEntry => ({
  id,
  kind: 'texture',
  source: 'ambientcg',
  remoteId: id,
  tier,
  group,
  license: 'CC0-1.0',
  purpose,
})

export const ASSET_SOURCES: AssetSourceEntry[] = [
  // Room (flat 47)
  ph('sofa_03', 'model', 'hero', 'flat47', 'room: the sofa-bed the player sleeps on'),
  ph('Television_01', 'model', 'hero', 'flat47', 'room: old CRT TV (static, the room on screen)'),
  ph('painted_wooden_nightstand', 'model', 'normal', 'flat47', 'room: TV stand'),
  ph('vintage_cabinet_01', 'model', 'normal', 'flat47', 'room: glass-front sideboard ("servant")'),
  ph('book_encyclopedia_set_01', 'model', 'small', 'flat47', 'room: books in the sideboard'),
  ph('wall_clock', 'model', 'hero', 'flat47', 'room: the clock stopped at 3:17'),
  ph('lightbulb_01', 'model', 'small', 'flat47', 'room/kitchen: bare ceiling bulb'),
  // Kitchen
  ph('electric_stove', 'model', 'normal', 'flat47', 'kitchen: white enamel stove'),
  ph('painted_wooden_table', 'model', 'normal', 'flat47', 'kitchen: table'),
  ph('painted_wooden_chair_02', 'model', 'normal', 'flat47', 'kitchen: chair (x2, one moves)'),
  ph('painted_wooden_stool', 'model', 'small', 'flat47', 'kitchen: stool'),
  ph('painted_wooden_cabinet', 'model', 'normal', 'flat47', 'kitchen: cupboard, bread box'),
  ph('vintage_electric_kettle', 'model', 'normal', 'flat47', 'kitchen: kettle (tea beats)'),
  ph('pot_enamel_01', 'model', 'small', 'flat47', 'kitchen: enamel pot on the stove'),
  ph('tea_set_01', 'model', 'small', 'flat47', 'kitchen: cups (piyola beats)'),
  // Clutter, corridor, bathroom
  ph('cardboard_box_01', 'model', 'small', 'flat47', 'corridor: unpacked moving box'),
  ph('trashbag', 'model', 'small', 'flat47', 'kitchen: rubbish by the door'),
  ph('bleach_bottle', 'model', 'small', 'flat47', 'bathroom: bleach under the sink'),
  ph('ornate_mirror_01', 'model', 'normal', 'flat47', 'corridor: mirror by the door'),
  // Surfaces
  acg('WoodFloor014', 'hero', 'flat47', 'room floor: herringbone parquet'),
  acg('Wallpaper001C', 'hero', 'flat47', 'flat 47 walls: cracked pale wallpaper'),
  acg('PaintedPlaster017', 'normal', 'flat47', 'ceilings: whitewashed plaster'),
  acg('PaintedWood005', 'normal', 'flat47', 'kitchen floor: dark painted boards'),
  acg('Tiles107', 'normal', 'flat47', 'bathroom walls: white square tiles'),
  acg('PaintedWood007C', 'normal', 'flat47', 'interior and entrance doors'),
  acg('PaintedPlaster010', 'hero', 'stairwell', 'stairwell and flat 48 walls: two-tone flaking'),
  acg('Concrete034', 'normal', 'stairwell', 'stairwell: steps and landing'),
  acg('Wallpaper002C', 'normal', 'flat48', 'flat 48 walls: stained wallpaper'),
  // Environment
  ph('dikhololo_night', 'hdri', 'small', 'flat47', 'night sky for window light and reflections'),
]
