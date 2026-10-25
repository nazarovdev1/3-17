// Bundle budget gate (section 10 of the spec).
// Mobile initial JS <= 250 KB gzipped; desktop 3D chunk subtree <= 700 KB gzipped.
// Reads dist/.vite/manifest.json produced by `vite build` (manifest: true).
import { gzipSync } from 'node:zlib'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

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

const desktopFiles = desktopKey ? (subtree(desktopKey, isJs) ?? []) : []
const desktopSet = new Set(desktopFiles)
const mobileFiles = (subtree(entryKey, isJs) ?? []).filter((f) => !desktopSet.has(f))

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
process.exit(failed ? 1 : 0)
