// Shape of src/assets/manifest.gen.json, written by scripts/assets/build.ts.

export type AssetGroup = 'flat47' | 'stairwell' | 'flat48'

export interface ManifestFile {
  /** Path relative to the site root (served from public/). */
  path: string
  bytes: number
  /** First 16 hex chars of the SHA-256, for cache-busting and integrity checks. */
  sha256: string
}

export interface ManifestAsset {
  id: string
  kind: 'model' | 'texture' | 'hdri' | 'sound'
  group: AssetGroup
  tier: 'hero' | 'normal' | 'small'
  purpose: string
  title: string
  author: string
  source: 'polyhaven' | 'ambientcg' | 'sketchfab' | 'original' | 'freesound'
  sourceUrl: string
  license: 'CC0-1.0' | 'CC-BY-4.0' | 'CC-BY-3.0' | 'CC-BY-2.5' | 'CC-BY-2.0' | 'CC-BY-1.0'
  /** Sound only: each file is a variation of this cue, decoded outside initial JS. */
  audio?: { cue: string; loop: boolean }
  /** Real-world size in metres (width, height, depth) when the source publishes it. */
  dimensionsM?: [number, number, number]
  /** Model only: bounding-box size of the shipped file in its own units (x, y, z). */
  boundsM?: [number, number, number]
  /** Model only: names of nodes with meshes (for packs placed piece by piece). */
  nodes?: string[]
  /** model: { model }, texture: { color, normal, orm }, hdri: { hdr }. */
  files: Record<string, ManifestFile>
  bytes: number
}

export interface AssetManifest {
  assets: ManifestAsset[]
}
