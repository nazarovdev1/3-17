import manifestJson from './manifest.gen.json' with { type: 'json' }
import type { AssetGroup, AssetManifest, ManifestAsset, ManifestFile } from './types'

/**
 * Same-origin asset preloader (FIX_PROMPT §3). Files are fetched as streams so progress is
 * real bytes, kept in memory as ArrayBuffers, and handed to the 3D loaders by path. No
 * three.js here: the shell uses this before the desktop chunk exists.
 */
export const manifest = manifestJson as unknown as AssetManifest

export interface LoadProgress {
  loaded: number
  total: number
}

const buffers = new Map<string, ArrayBuffer>()
const inflight = new Map<string, Promise<ArrayBuffer>>()

export function assetsIn(group: AssetGroup): ManifestAsset[] {
  return manifest.assets.filter((a) => a.group === group)
}

export function asset(id: string): ManifestAsset {
  const found = manifest.assets.find((a) => a.id === id)
  if (!found) throw new Error(`unknown asset: ${id}`)
  return found
}

export function filesIn(group: AssetGroup): ManifestFile[] {
  // Recordings load independently: missing audio must leave the synth fallback playable.
  return assetsIn(group)
    .filter((a) => a.kind !== 'sound')
    .flatMap((a) => Object.values(a.files))
}

export const bytesIn = (group: AssetGroup) => filesIn(group).reduce((sum, f) => sum + f.bytes, 0)

/** URL for a manifest file: base-relative, with the content hash for cache-busting. */
export function assetUrl(file: ManifestFile): string {
  return `${import.meta.env.BASE_URL}${file.path}?v=${file.sha256}`
}

/** The preloaded bytes of a file, or null when it has not been fetched yet. */
export function cachedBuffer(file: ManifestFile): ArrayBuffer | null {
  return buffers.get(file.path) ?? null
}

async function fetchOnce(file: ManifestFile, onBytes: (n: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(assetUrl(file))
  if (!res.ok) throw new Error(`${res.status} ${file.path}`)
  if (!res.body) {
    const data = await res.arrayBuffer()
    onBytes(data.byteLength)
    return data
  }
  const out = new Uint8Array(file.bytes)
  const reader = res.body.getReader()
  let offset = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (offset + value.byteLength > out.byteLength) throw new Error(`size mismatch: ${file.path}`)
    out.set(value, offset)
    offset += value.byteLength
    onBytes(value.byteLength)
  }
  if (offset !== file.bytes) throw new Error(`size mismatch: ${file.path}`)
  return out.buffer
}

/** Fetches one file (deduplicated), retrying twice. Progress callbacks receive byte deltas. */
export function fetchFile(
  file: ManifestFile,
  onBytes: (n: number) => void = () => {},
): Promise<ArrayBuffer> {
  const done = buffers.get(file.path)
  if (done) {
    onBytes(file.bytes)
    return Promise.resolve(done)
  }
  const pending = inflight.get(file.path)
  if (pending) return pending.then((data) => (onBytes(file.bytes), data))
  const run = async () => {
    for (let attempt = 1; ; attempt++) {
      let counted = 0
      try {
        const data = await fetchOnce(file, (n) => {
          counted += n
          onBytes(n)
        })
        buffers.set(file.path, data)
        return data
      } catch (error) {
        onBytes(-counted)
        if (attempt >= 3) throw error
        await new Promise((r) => setTimeout(r, 400 * attempt))
      }
    }
  }
  const promise = run().finally(() => inflight.delete(file.path))
  inflight.set(file.path, promise)
  return promise
}

/** Preloads every file of a group, four at a time, reporting total bytes loaded. */
export async function preloadGroup(
  group: AssetGroup,
  onProgress: (p: LoadProgress) => void = () => {},
): Promise<void> {
  const files = filesIn(group)
  const total = files.reduce((sum, f) => sum + f.bytes, 0)
  let loaded = 0
  onProgress({ loaded, total })
  const queue = [...files]
  const worker = async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      await fetchFile(file, (n) => {
        loaded += n
        onProgress({ loaded, total })
      })
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
}

/** Test hook: forget everything that was preloaded. */
export function resetAssetCache() {
  buffers.clear()
  inflight.clear()
}
