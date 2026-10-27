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
import { SOUND_IDS } from '@/audio/synthesis'

const PUBLIC = join(import.meta.dirname, '..', '..', '..', 'public')
const CREDITS = readFileSync(join(import.meta.dirname, '..', '..', '..', 'CREDITS.md'), 'utf8')

describe('asset manifest (FIX_PROMPT §3)', () => {
  it('has recorded files for every sound and ambience except the deliberately procedural drone', () => {
    const sounds = manifest.assets.filter((a) => a.kind === 'sound')
    expect(
      sounds
        .filter((a) => !a.audio!.loop)
        .map((a) => a.audio!.cue)
        .sort(),
    ).toEqual([...SOUND_IDS].sort())
    expect(
      sounds
        .filter((a) => a.audio!.loop)
        .map((a) => a.audio!.cue)
        .sort(),
    ).toEqual(['clock', 'fridge', 'neighbour', 'traffic', 'wind'])
    for (const a of sounds.filter((a) => a.audio!.cue.startsWith('step_')))
      expect(Object.keys(a.files).length).toBeGreaterThanOrEqual(3)
  })
  it('matches sources.ts one to one, in order', () => {
    expect(manifest.assets.map((a) => a.id)).toEqual(ASSET_SOURCES.map((s) => s.id))
  })

  it.each(manifest.assets.map((a) => [a.id, a] as const))('%s: license, credit, files', (_, a) => {
    expect(ALLOWED_LICENSES).toContain(a.license)
    for (const p of FORBIDDEN_PATTERNS) expect(`${a.id} ${a.title} ${a.author}`).not.toMatch(p)
    expect(a.author).not.toBe('')
    if (a.source === 'original') {
      expect(a.license).toBe('CC0-1.0')
      expect(existsSync(join(PUBLIC, '..', a.sourceUrl)), a.sourceUrl).toBe(true)
    } else {
      expect(a.sourceUrl).toMatch(
        /^https:\/\/(polyhaven\.com|ambientcg\.com|sketchfab\.com|freesound\.org)\//,
      )
    }
    expect(a.purpose.length).toBeGreaterThan(5)
    expect(CREDITS).toContain(a.sourceUrl)

    const keys = Object.keys(a.files).sort()
    if (a.kind === 'model') {
      expect(keys).toEqual(['model'])
      expect(a.boundsM).toHaveLength(3)
      expect(a.boundsM!.every((extent) => Number.isFinite(extent) && extent > 0)).toBe(true)
      if (a.source === 'polyhaven') expect(a.dimensionsM).toHaveLength(3)
    }
    if (a.kind === 'texture') expect(keys).toEqual(['color', 'normal', 'orm'])
    if (a.kind === 'hdri') expect(keys).toEqual(['hdr'])
    if (a.kind === 'sound') {
      const source = ASSET_SOURCES.find((s) => s.id === a.id)!
      expect(a.source).toBe('freesound')
      expect(a.audio).toEqual({ cue: source.sound!.cue, loop: source.sound!.loop })
      expect(keys).toHaveLength(source.sound!.clips.length)
      expect(CREDITS).toContain(a.author)
      expect(CREDITS).toContain(a.license)
    }

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

  it('ships optimised formats only (meshopt GLB, WebP, HDR, FLAC effects and AAC/M4A ambience)', () => {
    for (const a of manifest.assets) {
      for (const file of Object.values(a.files)) {
        expect(file.path).toMatch(/\.(glb|webp|hdr|m4a|flac)$/)
        if (a.kind === 'sound') {
          expect(file.path).toMatch(/^assets\/sounds\//)
          expect(
            file.path.endsWith(a.audio!.loop && a.audio!.cue !== 'clock' ? '.m4a' : '.flac'),
          ).toBe(true)
        }
        if (file.path.endsWith('.glb')) {
          const glb = readFileSync(join(PUBLIC, file.path))
          expect(glb.toString('utf8', 0, 4)).toBe('glTF')
          expect(glb.toString('utf8')).toContain('EXT_meshopt_compression')
        }
      }
    }
  })
})
