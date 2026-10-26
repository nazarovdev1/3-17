// Bundle budget gate (section 10 of the spec).
// Mobile initial JS <= 250 KB gzipped; desktop 3D chunk subtree <= 700 KB gzipped.
// Reads dist/.vite/manifest.json produced by `vite build` (manifest: true).
import { gzipSync } from 'node:zlib'
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const MOBILE_BUDGET_BYTES = 250 * 1024
const DESKTOP_BUDGET_BYTES = 700 * 1024
const distDir = new URL('../dist', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const manifestPath = join(distDir, '.vite', 'manifest.json')

if (!existsSync(manifestPath)) {
  console.error('budget: dist/.vite/manifest.json not found — run `npm run build` first')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const gzipped = (file) => gzipSync(readFileSync(join(distDir, file))).length

// Collect the transitive static-import subtree of a manifest entry, JS files only.
function subtree(entryKey, predicate = () => true) {
  const entry = manifest[entryKey]
  if (!entry) return null
  const seen = new Set()
  const stack = [entry]
  const files = []
  while (stack.length > 0) {
    const current = stack.pop()
    for (const depKey of current.imports ?? []) {
      if (seen.has(depKey)) continue
      seen.add(depKey)
      stack.push(manifest[depKey])
    }
    if (current.file && predicate(current.file) && !files.includes(current.file)) {
      files.push(current.file)
    }
  }
  return files
}

const isJs = (f) => f.endsWith('.js')

const desktopKey = Object.keys(manifest).find(
  (k) => k.includes('presenters/desktop') && manifest[k].isDynamicEntry,
)
const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry)

if (!entryKey) {
  console.error('budget: no entry chunk found in manifest')
  process.exit(1)
}

// The lazy presenter can import shared code from the entry. Count that code in
// mobile exactly once, and only additional downloads in the desktop budget.
const mobileFiles = subtree(entryKey, isJs) ?? []
const mobileSet = new Set(mobileFiles)
const desktopFiles = desktopKey
  ? (subtree(desktopKey, isJs) ?? []).filter((file) => !mobileSet.has(file))
  : []
if (mobileFiles.some((file) => /DesktopPresenter|desktop-3d/.test(file))) {
  console.error('budget: desktop renderer is statically reachable from the mobile entry')
  process.exit(1)
}

const desktopBytes = desktopFiles.reduce((sum, f) => sum + gzipped(f), 0)
const mobileBytes = mobileFiles.reduce((sum, f) => sum + gzipped(f), 0)

// Informational: css + font assets reachable from the entry.
const assetFiles = subtree(entryKey, (f) => !isJs(f)) ?? []
const assetBytes = assetFiles.reduce((sum, f) => sum + statSync(join(distDir, f)).size, 0)

console.log('--- bundle budget report (gzipped) ---')
for (const f of mobileFiles) console.log(`  mobile  ${String(gzipped(f)).padStart(7)}  ${f}`)
for (const f of desktopFiles) console.log(`  desktop ${String(gzipped(f)).padStart(7)}  ${f}`)
console.log(
  `mobile initial JS:  ${(mobileBytes / 1024).toFixed(1)} KB / ${MOBILE_BUDGET_BYTES / 1024} KB`,
)
console.log(
  `desktop 3D subtree:  ${(desktopBytes / 1024).toFixed(1)} KB / ${DESKTOP_BUDGET_BYTES / 1024} KB`,
)
console.log(`entry css+fonts (raw): ${(assetBytes / 1024).toFixed(1)} KB (informational)`)

let failed = false
if (mobileBytes > MOBILE_BUDGET_BYTES) {
  console.error('budget: MOBILE budget exceeded')
  failed = true
}
if (desktopBytes > DESKTOP_BUDGET_BYTES) {
  console.error('budget: DESKTOP budget exceeded')
  failed = true
}
// Spec 11: the window.__game test API must not exist in production builds.
const leaked = [...mobileFiles, ...desktopFiles].filter((f) =>
  readFileSync(join(distDir, f), 'utf8').includes('getAudioState'),
)
if (leaked.length > 0) {
  console.error(`budget: window.__game debug API found in production JS: ${leaked.join(', ')}`)
  failed = true
} else {
  console.log('debug API: absent from production JS')
}

// FIX_PROMPT §3 asset budgets: desktop total ≤ 60 MB, flat 47 playable ≤ 25 MB (everything
// the loading screen waits for, plus code and fonts), mobile stills ≤ 10 MB.
const MB = 1024 * 1024
const DESKTOP_TOTAL_BYTES = 60 * MB
const PLAYABLE_BYTES = 25 * MB
const STILLS_BYTES = 10 * MB
const rootDir = join(distDir, '..')
const assetManifest = JSON.parse(
  readFileSync(join(rootDir, 'src', 'assets', 'manifest.gen.json'), 'utf8'),
)
const listed = new Set()
let assetTotal = 0
let flat47 = 0
for (const a of assetManifest.assets) {
  for (const file of Object.values(a.files)) {
    listed.add(file.path)
    const built = join(distDir, file.path)
    if (!existsSync(built) || statSync(built).size !== file.bytes) {
      console.error(`budget: ${file.path} missing from dist or size differs from the manifest`)
      failed = true
    }
    assetTotal += file.bytes
    if (a.group === 'flat47') flat47 += file.bytes
  }
}
const walk = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
        d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
      )
    : []
const publicDir = join(rootDir, 'public')
const stillsDir = join(publicDir, 'assets', 'stills')
const orphans = walk(join(publicDir, 'assets'))
  .map((f) => relative(publicDir, f).split('\\').join('/'))
  .filter((f) => !listed.has(f) && !f.startsWith('assets/stills/'))
if (orphans.length > 0) {
  console.error(`budget: files in public/assets not in the manifest: ${orphans.join(', ')}`)
  failed = true
}
const stillsBytes = walk(stillsDir).reduce((sum, f) => sum + statSync(f).size, 0)
const codeBytes = mobileBytes + desktopBytes + assetBytes
const desktopTotal = assetTotal + codeBytes
const playable = flat47 + codeBytes
const mb = (n) => (n / MB).toFixed(1)
console.log('--- asset budget report ---')
console.log(`desktop total:       ${mb(desktopTotal)} MB / ${DESKTOP_TOTAL_BYTES / MB} MB`)
console.log(`flat 47 playable:    ${mb(playable)} MB / ${PLAYABLE_BYTES / MB} MB`)
console.log(`mobile stills:       ${mb(stillsBytes)} MB / ${STILLS_BYTES / MB} MB`)
if (desktopTotal > DESKTOP_TOTAL_BYTES) {
  console.error('budget: DESKTOP TOTAL asset budget exceeded')
  failed = true
}
if (playable > PLAYABLE_BYTES) {
  console.error('budget: flat 47 PLAYABLE budget exceeded')
  failed = true
}
if (stillsBytes > STILLS_BYTES) {
  console.error('budget: MOBILE STILLS budget exceeded')
  failed = true
}
// The asset QA bench is dev/test only.
const benchLeak = walk(join(distDir, 'assets'))
  .filter((f) => f.endsWith('.js'))
  .filter((f) => readFileSync(f, 'utf8').includes('data-assetview'))
if (benchLeak.length > 0) {
  console.error(`budget: asset bench found in production JS: ${benchLeak.join(', ')}`)
  failed = true
}

process.exit(failed ? 1 : 0)
