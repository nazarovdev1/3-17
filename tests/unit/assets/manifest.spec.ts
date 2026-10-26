// @vitest-environment node
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { manifest } from '@/assets/loader'
import {
  ALLOWED_LICENSES,
  ASSET_SOURCES,
  FORBIDDEN_PATTERNS,
} from '../../../scripts/assets/sources'

const PUBLIC = join(import.meta.dirname, '..', '..', '..', 'public')
const CREDITS = readFileSync(join(import.meta.dirname, '..', '..', '..', 'CREDITS.md'), 'utf8')

describe('asset manifest (FIX_PROMPT §3)', () => {
  it('matches sources.ts one to one, in order', () => {
    expect(manifest.assets.map((a) => a.id)).toEqual(ASSET_SOURCES.map((s) => s.id))
  })

  it.each(manifest.assets.map((a) => [a.id, a] as const))('%s: license, credit, files', (_, a) => {
    expect(ALLOWED_LICENSES).toContain(a.license)
    for (const p of FORBIDDEN_PATTERNS) expect(`${a.id} ${a.title} ${a.author}`).not.toMatch(p)
    expect(a.author).not.toBe('')
    expect(a.sourceUrl).toMatch(/^https:\/\/(polyhaven\.com|ambientcg\.com)\//)
    expect(a.purpose.length).toBeGreaterThan(5)
    expect(CREDITS).toContain(a.sourceUrl)

    const keys = Object.keys(a.files).sort()
    if (a.kind === 'model') {
      expect(keys).toEqual(['model'])
      expect(a.dimensionsM).toHaveLength(3)
    }
    if (a.kind === 'texture') expect(keys).toEqual(['color', 'normal', 'orm'])
    if (a.kind === 'hdri') expect(keys).toEqual(['hdr'])

    let total = 0
    for (const file of Object.values(a.files)) {
      const path = join(PUBLIC, file.path)
      expect(existsSync(path), file.path).toBe(true)
      const data = readFileSync(path)
      expect(data.length).toBe(file.bytes)
      expect(createHash('sha256').update(data).digest('hex').startsWith(file.sha256)).toBe(true)
      total += file.bytes
    }
    expect(a.bytes).toBe(total)
  })

  it('ships optimised formats only (meshopt GLB, WebP, HDR)', () => {
    for (const a of manifest.assets) {
      for (const file of Object.values(a.files)) {
        expect(file.path).toMatch(/\.(glb|webp|hdr)$/)
        if (file.path.endsWith('.glb')) {
          const glb = readFileSync(join(PUBLIC, file.path))
          expect(glb.toString('utf8', 0, 4)).toBe('glTF')
          expect(glb.toString('utf8')).toContain('EXT_meshopt_compression')
        }
      }
    }
  })
})
