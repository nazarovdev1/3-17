// Optimises the cached downloads into public/assets/ and writes the runtime manifest
// (src/assets/manifest.gen.json) and CREDITS.md. Run: npm run assets:build
//
// Models: dedupe, prune, weld, textures → WebP at the tier size, meshopt compression.
// Textures: color + normal as WebP, AO/roughness/metalness packed into one ORM WebP
// (R = AO, G = roughness, B = metalness, the layout three.js expects).
// KTX2 needs the native `toktx` binary, which is not part of this toolchain; WebP is the
// fallback FIX_PROMPT §3 allows.
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { getBounds, Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import { format, resolveConfig } from 'prettier'
import { CACHE, readMeta } from './fetch'
import {
  ALLOWED_LICENSES,
  ASSET_SOURCES,
  FORBIDDEN_PATTERNS,
  TIER_SIZE,
  type AssetSourceEntry,
} from './sources'
import type { AssetManifest, ManifestAsset, ManifestFile } from '../../src/assets/types'
import { encodeSound, freesoundLicense } from './sound'

const ROOT = join(import.meta.dirname, '..', '..')
const PUBLIC = join(ROOT, 'public')
const STAGING = join(CACHE, 'build-output')
const OUT = join(STAGING, 'assets')
const MANIFEST = join(ROOT, 'src', 'assets', 'manifest.gen.json')
const CREDITS = join(ROOT, 'CREDITS.md')

async function moveDirectory(from: string, to: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      renameSync(from, to)
      return
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (attempt >= 7 || !['EPERM', 'EBUSY', 'EACCES'].includes(code ?? '')) throw error
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    }
  }
}

const SOURCE_NAMES = {
  polyhaven: 'Poly Haven',
  ambientcg: 'ambientCG',
  sketchfab: 'Sketchfab',
  original: 'this repository',
  freesound: 'Freesound',
} as const

function fileEntry(path: string): ManifestFile {
  const data = readFileSync(path)
  return {
    path: relative(STAGING, path).replaceAll('\\', '/'),
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex').slice(0, 16),
  }
}

function buildSound(entry: AssetSourceEntry): Record<string, ManifestFile> {
  const meta = readMeta(entry.id)!
  if (
    !entry.sound ||
    !meta.licenseUrl ||
    freesoundLicense(meta.licenseUrl) !== entry.license ||
    meta.remoteId !== entry.remoteId
  )
    throw new Error(`${entry.id}: missing or mismatched API license evidence`)
  const input = join(CACHE, entry.id, 'source.mp3')
  if (createHash('sha256').update(readFileSync(input)).digest('hex') !== meta.rawSha256)
    throw new Error(`${entry.id}: cached sound integrity mismatch`)
  const dir = join(OUT, 'sounds')
  mkdirSync(dir, { recursive: true })
  return Object.fromEntries(
    entry.sound.clips.map((clip, index) => {
      const out = join(
        dir,
        `${entry.id}-${index + 1}.${entry.sound!.loop && !entry.sound!.repeat ? 'm4a' : 'flac'}`,
      )
      encodeSound(input, out, clip.start, clip.duration, entry.sound!.loop, entry.sound)
      return [`v${index + 1}`, fileEntry(out)]
    }),
  )
}

async function buildModel(entry: AssetSourceEntry) {
  await MeshoptEncoder.ready
  await MeshoptSimplifier.ready
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
  const glb = join(CACHE, entry.id, `${entry.id}.glb`)
  const doc = await io.read(existsSync(glb) ? glb : join(CACHE, entry.id, `${entry.id}.gltf`))
  doc.setLogger(new Logger(Logger.Verbosity.ERROR))
  if (entry.keep) {
    const { name, x } = entry.keep
    for (const node of doc.getRoot().listNodes()) {
      if (!node.getMesh()) continue
      const b = getBounds(node)
      const cx = (b.min[0] + b.max[0]) / 2
      if ((name && !name.test(node.getName())) || (x && (cx < x[0] || cx > x[1]))) {
        node.setMesh(null)
      }
    }
  }
  const size = TIER_SIZE[entry.tier]
  await doc.transform(
    dedup(),
    prune(),
    weld(),
    ...(entry.simplify
      ? [simplify({ simplifier: MeshoptSimplifier, ratio: entry.simplify, error: 0.002 })]
      : []),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 82 }),
  )
  // Natural size in the file's own units (Sketchfab models are often in cm or rotated);
  // the world layout scales each model to its declared real size and validate:world
  // checks the proportions.
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]!
  const { min, max } = getBounds(scene)
  const boundsM = [0, 1, 2].map((i) => Math.round((max[i]! - min[i]!) * 1000) / 1000) as [
    number,
    number,
    number,
  ]
  const nodes = doc
    .getRoot()
    .listNodes()
    .filter((n) => n.getMesh() && n.getName())
    .map((n) => n.getName())
    .slice(0, 60)
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
  const out = join(OUT, 'models', `${entry.id}.glb`)
  mkdirSync(join(OUT, 'models'), { recursive: true })
  writeFileSync(out, await io.writeBinary(doc))
  return { files: { model: fileEntry(out) }, boundsM, nodes }
}

async function greyRaw(path: string | null, size: number, fill: number): Promise<Buffer> {
  if (!path || !existsSync(path)) return Buffer.alloc(size * size, fill)
  return sharp(path).resize(size, size).greyscale().raw().toBuffer()
}

async function buildTexture(entry: AssetSourceEntry) {
  const src = (map: string) => join(CACHE, entry.id, `${map}.jpg`)
  const size = TIER_SIZE[entry.tier]
  const dir = join(OUT, 'textures', entry.id)
  mkdirSync(dir, { recursive: true })
  await sharp(src('color')).resize(size, size).webp({ quality: 82 }).toFile(join(dir, 'color.webp'))
  await sharp(src('normal'))
    .resize(size, size)
    .webp({ quality: 80, smartSubsample: true })
    .toFile(join(dir, 'normal.webp'))
  const [ao, rough, metal] = await Promise.all([
    greyRaw(src('ao'), size, 255),
    greyRaw(src('roughness'), size, 200),
    greyRaw(src('metalness'), size, 0),
  ])
  const orm = Buffer.alloc(size * size * 3)
  for (let i = 0; i < size * size; i++) {
    orm[i * 3] = ao[i]!
    orm[i * 3 + 1] = rough[i]!
    orm[i * 3 + 2] = metal[i]!
  }
  await sharp(orm, { raw: { width: size, height: size, channels: 3 } })
    .webp({ quality: 90, smartSubsample: true })
    .toFile(join(dir, 'orm.webp'))
  return {
    color: fileEntry(join(dir, 'color.webp')),
    normal: fileEntry(join(dir, 'normal.webp')),
    orm: fileEntry(join(dir, 'orm.webp')),
  }
}

function buildHdri(entry: AssetSourceEntry) {
  mkdirSync(join(OUT, 'hdri'), { recursive: true })
  const out = join(OUT, 'hdri', `${entry.id}.hdr`)
  copyFileSync(join(CACHE, entry.id, `${entry.id}.hdr`), out)
  return { hdr: fileEntry(out) }
}

function credits(assets: ManifestAsset[]): string {
  const rows = assets.map(
    (a) =>
      `| ${a.title} | ${a.kind} | ${a.author} | [${SOURCE_NAMES[a.source]}](${a.sourceUrl}) | ${a.license} |`,
  )
  return [
    '# Credits',
    '',
    'Generated by `npm run assets:build` from `scripts/assets/sources.ts`. Do not edit by hand.',
    '',
    'Poly Haven and ambientCG assets are CC0 (public domain); CC0 needs no attribution but the',
    'authors are credited anyway. Sketchfab assets are CC-BY-4.0',
    '(https://creativecommons.org/licenses/by/4.0/): credited here and in Settings → Mualliflar.',
    'Assets from "this repository" were generated for the game by the linked script (CC0).',
    'They were optimised (re-compressed, resized and in some cases simplified) for the web.',
    assets.some((a) => a.kind === 'sound')
      ? 'Freesound recordings are excerpted, mixed to mono, filtered and loudness-normalised; effects use FLAC and ambience uses AAC.'
      : 'F5 audio is in progress: no external sound recordings are bundled yet; synth fallbacks remain.',
    '',
    '## Fonts',
    '',
    '| Font | Author | Source | License |',
    '| --- | --- | --- | --- |',
    '| Literata | TypeTogether | [Fontsource](https://fontsource.org/fonts/literata) | OFL-1.1 |',
    '| Inter | Rasmus Andersson | [Fontsource](https://fontsource.org/fonts/inter) | OFL-1.1 |',
    '',
    '## Models, textures, HDRIs and sounds',
    '',
    '| Asset | Type | Author | Source | License |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}

async function main() {
  const soundsOnly = process.argv.includes('--sounds-only')
  const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice(7)
  if (only && (!soundsOnly || !ASSET_SOURCES.some((a) => a.id === only && a.kind === 'sound')))
    throw new Error('--only requires --sounds-only and a known sound id')
  const previous = soundsOnly ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as AssetManifest) : null
  // Refuse incomplete inputs before replacing any shipped assets.
  for (const entry of ASSET_SOURCES) {
    if (previous && (entry.kind !== 'sound' || (only && entry.id !== only))) continue
    if (!readMeta(entry.id))
      throw new Error(`${entry.id} is not downloaded — run npm run assets:fetch`)
  }
  if (relative(ROOT, OUT).startsWith('..')) throw new Error('Asset staging escaped workspace')
  rmSync(OUT, { recursive: true, force: true })
  const assets: ManifestAsset[] = []
  for (const entry of ASSET_SOURCES) {
    if (previous && (entry.kind !== 'sound' || (only && entry.id !== only))) {
      const existing = previous.assets.find(
        (a) => a.id === entry.id && a.kind === entry.kind && a.source === entry.source,
      )
      if (!existing) throw new Error(`${entry.id}: cannot reuse unbuilt asset`)
      for (const file of Object.values(existing.files)) {
        const src = join(PUBLIC, file.path)
        const data = readFileSync(src)
        if (
          data.length !== file.bytes ||
          !createHash('sha256').update(data).digest('hex').startsWith(file.sha256)
        )
          throw new Error(`${entry.id}: cannot reuse changed asset`)
        const dest = join(STAGING, file.path)
        mkdirSync(dirname(dest), { recursive: true })
        copyFileSync(src, dest)
      }
      assets.push(existing)
      continue
    }
    if (!ALLOWED_LICENSES.includes(entry.license)) throw new Error(`license: ${entry.id}`)
    const meta = readMeta(entry.id)
    if (!meta) throw new Error(`${entry.id} is not downloaded — run npm run assets:fetch`)
    if (FORBIDDEN_PATTERNS.some((p) => p.test(meta.author) || p.test(meta.title))) {
      throw new Error(`forbidden asset: ${entry.id}`)
    }
    process.stdout.write(`⚙ ${entry.id} … `)
    const model = entry.kind === 'model' ? await buildModel(entry) : null
    const files = model
      ? model.files
      : entry.kind === 'sound'
        ? buildSound(entry)
        : entry.kind === 'texture'
          ? await buildTexture(entry)
          : buildHdri(entry)
    const bytes = Object.values(files).reduce((sum, f) => sum + f.bytes, 0)
    console.log(`${(bytes / 1024).toFixed(0)} KB`)
    assets.push({
      id: entry.id,
      kind: entry.kind,
      group: entry.group,
      tier: entry.tier,
      purpose: entry.purpose,
      title: meta.title,
      author: meta.author,
      source: entry.source,
      sourceUrl: meta.sourceUrl,
      license: entry.license,
      ...(entry.sound ? { audio: { cue: entry.sound.cue, loop: entry.sound.loop } } : {}),
      ...(meta.dimensionsM ? { dimensionsM: meta.dimensionsM } : {}),
      ...(model ? { boundsM: model.boundsM, nodes: model.nodes } : {}),
      files,
      bytes,
    })
  }
  const manifest: AssetManifest = { assets }
  // A failed download/encode must never destroy the last working local asset set.
  const destination = join(PUBLIC, 'assets')
  const backup = join(CACHE, 'previous-assets')
  if (relative(ROOT, backup).startsWith('..')) throw new Error('Asset backup escaped workspace')
  rmSync(backup, { recursive: true, force: true })
  if (existsSync(destination)) await moveDirectory(destination, backup)
  try {
    await moveDirectory(OUT, destination)
  } catch (error) {
    if (existsSync(backup)) await moveDirectory(backup, destination)
    throw error
  }
  writeFileSync(
    MANIFEST,
    await format(JSON.stringify(manifest), { ...(await resolveConfig(MANIFEST)), parser: 'json' }),
  )
  writeFileSync(CREDITS, credits(assets))
  const total = assets.reduce((sum, a) => sum + a.bytes, 0)
  console.log(`✓ assets:build — ${assets.length} assets, ${(total / 1048576).toFixed(1)} MB`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
