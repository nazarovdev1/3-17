// Downloads every asset in sources.ts into .asset-cache/ (git-ignored). Idempotent: an asset
// whose cache folder holds a complete meta.json is skipped. Poly Haven files are checked
// against the md5 the API publishes. Run: npm run assets:fetch [-- --force]
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, normalize } from 'node:path'
import { unzipSync } from 'fflate'
import { ASSET_SOURCES, FORBIDDEN_PATTERNS, type AssetSourceEntry } from './sources'

export const CACHE = join(import.meta.dirname, '..', '..', '.asset-cache')
const UA = { 'User-Agent': 'game-3-17-asset-pipeline' }

export interface CacheMeta {
  id: string
  title: string
  author: string
  sourceUrl: string
  /** Real-world size in metres (models only, when the source publishes it). */
  dimensionsM?: [number, number, number]
  /** Files in the cache folder, relative to it. */
  files: string[]
}

async function get(url: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: UA })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (error) {
      if (attempt >= 5) throw new Error(`download failed: ${url}`, { cause: error })
      await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
}

async function json<T>(url: string): Promise<T> {
  return JSON.parse((await get(url)).toString('utf8')) as T
}

/** Writes a file inside `root`, refusing paths that would escape it. */
function writeInside(root: string, relative: string, data: Buffer | Uint8Array) {
  const target = normalize(join(root, relative))
  if (!target.startsWith(normalize(root))) throw new Error(`unsafe path in download: ${relative}`)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, data)
}

const md5 = (data: Buffer) => createHash('md5').update(data).digest('hex')

interface PhFile {
  url: string
  md5: string
  size: number
  include?: Record<string, PhFile>
}
interface PhInfo {
  name: string
  authors: Record<string, string>
  dimensions?: [number, number, number]
}

async function fetchPolyHaven(entry: AssetSourceEntry, dir: string): Promise<CacheMeta> {
  const info = await json<PhInfo>(`https://api.polyhaven.com/info/${entry.remoteId}`)
  const files = await json<Record<string, Record<string, Record<string, PhFile>>>>(
    `https://api.polyhaven.com/files/${entry.remoteId}`,
  )
  const written: string[] = []
  const save = async (relative: string, file: PhFile) => {
    const data = await get(file.url)
    if (md5(data) !== file.md5) throw new Error(`md5 mismatch for ${entry.id}: ${relative}`)
    writeInside(dir, relative, data)
    written.push(relative)
  }
  if (entry.kind === 'hdri') {
    const hdr = files.hdri?.['1k']?.hdr
    if (!hdr) throw new Error(`no 1k hdr for ${entry.id}`)
    await save(`${entry.id}.hdr`, hdr)
  } else {
    // Download one size above or at the target; build.ts resizes down.
    const res = entry.tier === 'hero' ? '2k' : '1k'
    const gltf = files.gltf?.[res]?.gltf
    if (!gltf) throw new Error(`no ${res} glTF for ${entry.id}`)
    await save(`${entry.id}.gltf`, gltf)
    for (const [relative, file] of Object.entries(gltf.include ?? {})) await save(relative, file)
  }
  const dims = info.dimensions
  return {
    id: entry.id,
    title: info.name,
    author: Object.keys(info.authors).join(', '),
    sourceUrl: `https://polyhaven.com/a/${entry.remoteId}`,
    ...(dims && entry.kind === 'model'
      ? { dimensionsM: dims.map((mm) => Math.round(mm) / 1000) as [number, number, number] }
      : {}),
    files: written,
  }
}

interface AcgAsset {
  assetId: string
  displayName: string
  downloadFolders: {
    default: {
      downloadFiletypeCategories: {
        zip: { downloads: { attribute: string; downloadLink: string; size: number }[] }
      }
    }
  }
}

/** Maps of ambientCG zip entries we keep (others: displacement, previews, .usda, .mtlx). */
const ACG_MAPS: Record<string, string> = {
  Color: 'color',
  NormalGL: 'normal',
  Roughness: 'roughness',
  AmbientOcclusion: 'ao',
  Metalness: 'metalness',
}

async function fetchAmbientCg(entry: AssetSourceEntry, dir: string): Promise<CacheMeta> {
  const res = await json<{ foundAssets: AcgAsset[] }>(
    `https://ambientcg.com/api/v2/full_json?id=${entry.remoteId}&include=downloadData`,
  )
  const asset = res.foundAssets[0]
  if (!asset) throw new Error(`ambientCG asset not found: ${entry.remoteId}`)
  const attribute = entry.tier === 'hero' ? '2K-JPG' : '1K-JPG'
  const download = asset.downloadFolders.default.downloadFiletypeCategories.zip.downloads.find(
    (d) => d.attribute === attribute,
  )
  if (!download) throw new Error(`no ${attribute} zip for ${entry.id}`)
  const zip = await get(download.downloadLink)
  if (zip.length !== download.size) throw new Error(`size mismatch for ${entry.id} zip`)
  const written: string[] = []
  for (const [name, data] of Object.entries(unzipSync(new Uint8Array(zip)))) {
    const match = /_([A-Za-z]+)\.jpg$/.exec(basename(name))
    const map = match ? ACG_MAPS[match[1]!] : undefined
    if (!map) continue
    writeInside(dir, `${map}.jpg`, data)
    written.push(`${map}.jpg`)
  }
  if (!written.includes('color.jpg') || !written.includes('normal.jpg')) {
    throw new Error(`${entry.id}: zip has no Color or NormalGL map`)
  }
  return {
    id: entry.id,
    title: asset.displayName,
    author: 'ambientCG (Lennart Demes)',
    sourceUrl: `https://ambientcg.com/view?id=${entry.remoteId}`,
    files: written,
  }
}

export function readMeta(id: string): CacheMeta | null {
  const path = join(CACHE, id, 'meta.json')
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as CacheMeta) : null
}

async function main() {
  const force = process.argv.includes('--force')
  let fetched = 0
  for (const entry of ASSET_SOURCES) {
    if (FORBIDDEN_PATTERNS.some((p) => p.test(entry.remoteId))) {
      throw new Error(`forbidden asset: ${entry.remoteId}`)
    }
    if (!force && readMeta(entry.id)) continue
    const dir = join(CACHE, entry.id)
    process.stdout.write(`↓ ${entry.id} (${entry.source}) … `)
    const meta =
      entry.source === 'polyhaven'
        ? await fetchPolyHaven(entry, dir)
        : await fetchAmbientCg(entry, dir)
    if (FORBIDDEN_PATTERNS.some((p) => p.test(meta.author))) {
      throw new Error(`forbidden author for ${entry.id}: ${meta.author}`)
    }
    writeInside(dir, 'meta.json', Buffer.from(JSON.stringify(meta, null, 2)))
    fetched++
    console.log(`${meta.files.length} file(s)`)
  }
  console.log(`✓ assets:fetch — ${fetched} downloaded, ${ASSET_SOURCES.length - fetched} cached`)
}

if (process.argv[1] && basename(process.argv[1]).startsWith('fetch')) {
  main().catch((error: unknown) => {
    console.error(String(error))
    process.exit(1)
  })
}
