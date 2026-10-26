// Every external asset the game ships, pinned by source id. `npm run assets` downloads them
// into `.asset-cache/` and writes optimised copies to `public/assets/` (FIX_PROMPT §3).
//
// Rules: CC0 or CC-BY only; no stylised / low-poly packs; every entry says why it exists.
// `tier` sets the texture size (hero 2K, normal 1K, small 512). `group` sets load order:
// flat47 must be loaded before play starts, the others stream in the background.

export type AssetKind = 'model' | 'texture' | 'hdri'
export type AssetSource = 'polyhaven' | 'ambientcg' | 'sketchfab'
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
  /** Keep this fraction of triangles (meshopt simplifier) for over-detailed source meshes. */
  simplify?: number
  /**
   * For packs with several objects: keep only mesh nodes whose name matches and whose
   * world-space centre x lies in the range (source units). The rest is removed at build.
   */
  keep?: { name?: RegExp; x?: [number, number] }
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

/** Sketchfab CC-BY model: attribution is required and comes from the API (author, URL). */
const sf = (
  id: string,
  uid: string,
  tier: AssetTier,
  group: AssetGroup,
  purpose: string,
  options: Pick<AssetSourceEntry, 'simplify' | 'keep'> = {},
): AssetSourceEntry => ({
  id,
  kind: 'model',
  source: 'sketchfab',
  remoteId: uid,
  tier,
  group,
  license: 'CC-BY-4.0',
  purpose,
  ...options,
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
  ph('wooden_table_02', 'model', 'normal', 'flat47', 'kitchen: table'),
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
  // Sketchfab (CC-BY): what Poly Haven does not have
  sf('fridge', '68d173f205344455933f861042b99fe3', 'normal', 'flat47', 'kitchen: old white fridge'),
  sf('gas_stove', '0958b0ab4e2344cc847e14355f196512', 'normal', 'flat47', 'kitchen: gas stove', {
    keep: { name: /^Object_6$/ },
  }),
  sf('kitchen_units', '4b765920f7c34676acda91c0bfd87abd', 'normal', 'flat47', 'kitchen: sink run', {
    keep: { x: [5.1, 7.45] },
  }),
  sf('bathtub', '22e187363dd14bc3a3e1b4611830236a', 'normal', 'flat47', 'bathroom: tub, curtain', {
    keep: { name: /^(?!BathTiles)/ },
  }),
  sf('bath_sink', 'a278d63585494921906ab3500c421ff7', 'small', 'flat47', 'bathroom: pedestal sink'),
  sf('toilet', '132a8ee2af3a40d39d270fbed3d3666c', 'small', 'flat47', 'bathroom: toilet'),
  sf(
    'washing_machine',
    '681661800df842c5bf3086e8888714b7',
    'normal',
    'flat47',
    'bathroom: old washer',
    {
      keep: { name: /^01_(Washing-machine|Door|Drum)/ },
    },
  ),
  sf(
    'radiator',
    '657795450eb54753ba59826d67b6ad2d',
    'normal',
    'flat47',
    'cast-iron radiator under windows',
    { simplify: 0.15, keep: { name: /^Object_[45]$/ } },
  ),
  sf(
    'wall_carpet',
    'fe13eecfc9b8405dab1fe76c5dd28a4c',
    'hero',
    'flat47',
    'room: carpet on the shared wall',
  ),
  sf('chandelier', 'ba27e3421b264d6d8d93ed3cdd8654ad', 'normal', 'flat47', 'room: three-arm lamp', {
    simplify: 0.3,
  }),
  sf(
    'pendant_bulb',
    '5747a012d6df466ca0e93665d67f5ac3',
    'small',
    'flat47',
    'corridor/kitchen/bath: bare bulb pendant',
  ),
  sf('window', 'c60a6fe181e1482d96f9412a20c4a390', 'normal', 'flat47', 'old painted window frame', {
    keep: { name: /^WINDOW3/ },
  }),
  sf('coat_hooks', 'a8bdbea2931841b0b1a8163e7abdae53', 'small', 'flat47', 'corridor: coat hooks'),
  sf('shoe_rack', '6f13df8908214ad69675300e83289ebf', 'small', 'flat47', 'corridor: shoe rack'),
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
