import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STILL_CAMERAS, STILL_RECIPES, stillFor } from '@/presenters/mobile/still-scenes'
import { MOBILE_VIEWS } from '@/presenters/mobile/views'
import { coverPoint } from '@/presenters/mobile/still-renderer'
import { layoutHotspots } from '@/presenters/mobile/hotspots'
import manifest from '@/presenters/mobile/stills.gen.json'

const frames = manifest.frames as Record<
  string,
  {
    color: string
    depth: string
    bytes: number
    colorHash: string
    depthHash: string
    anchors: Record<string, { x: number; y: number }>
  }
>
const sizes = [
  [360, 640],
  [375, 667],
  [390, 844],
  [412, 915],
  [430, 932],
]

describe('mobile renders from the credited desktop world', () => {
  it('pins 30–45 valid camera/state recipes and ships hash-checked local pairs within 10 MB', async () => {
    expect(STILL_RECIPES.length).toBeGreaterThanOrEqual(30)
    expect(STILL_RECIPES.length).toBeLessThanOrEqual(45)
    expect(new Set(STILL_RECIPES.map((r) => r.id)).size).toBe(STILL_RECIPES.length)
    let total = 0
    const credits = readFileSync(resolve('CREDITS.md'), 'utf8')
    for (const recipe of STILL_RECIPES) {
      expect(STILL_CAMERAS[recipe.camera]).toBeDefined()
      expect(Array.isArray(recipe.nodes)).toBe(true)
      const frame = frames[recipe.id]!
      expect(frame, recipe.id).toBeDefined()
      expect(credits).toContain(`| ${recipe.id} | still + depth |`)
      let bytes = 0
      for (const [url, hash] of [
        [frame.color, frame.colorHash],
        [frame.depth, frame.depthHash],
      ]) {
        expect(url).toMatch(/^\/assets\/stills\/[a-z0-9_-]+(?:\.depth)?\.webp$/)
        const file = readFileSync(resolve('public', url!.slice(1)))
        expect(createHash('sha256').update(file).digest('hex')).toBe(hash)
        expect(file.subarray(8, 12).toString()).toBe('WEBP')
        const metadata = await sharp(file).metadata()
        expect([metadata.width, metadata.height]).toEqual(
          url!.includes('.depth.') ? [270, 480] : [1080, 1920],
        )
        bytes += file.length
      }
      expect(bytes).toBe(frame.bytes)
      total += bytes
    }
    expect(total).toBeLessThanOrEqual(10 * 1024 * 1024)
    expect(manifest).toMatchObject({
      width: 1080,
      height: 1920,
      depthWidth: 270,
      depthHeight: 480,
      credit: { author: '3:17 project', license: 'CC-BY-4.0' },
    })
  })
  it('resolves every viewpoint on every night before and after the cut, with persistent changes', () => {
    for (const view of Object.values(MOBILE_VIEWS))
      for (const night of [1, 2, 3, 4, 5])
        for (const power of [true, false])
          expect(
            frames[stillFor(view.still, night, power)],
            `${view.still} n${night}`,
          ).toBeDefined()
    expect(stillFor('room', 3, true)).toBe('room-changed')
    expect(stillFor('room', 1, false)).toBe('room-off')
    // The hall always shows the front door ahead; the coat is its own closer look.
    expect(stillFor('corridor', 2, true)).toBe('corridor-on')
    expect(stillFor('coat', 2, true)).toBe('coat-changed')
    expect(stillFor('corridor', 5, true)).toBe('corridor-cold')
    for (const night of [1, 2, 3, 4, 5])
      expect(stillFor('phone', night, true)).toBe(`phone-night${night}`)
    expect(stillFor('phone', 5, false)).toBe('phone-dead')
  })
  it('keeps every 48 px hotspot in its visible crop without overlaps at all five screen sizes', () => {
    let count = 0
    for (const view of Object.values(MOBILE_VIEWS))
      for (const power of [true, false]) {
        const frame = frames[stillFor(view.still, 1, power)]!
        for (const [width, height] of sizes) {
          const sceneHeight = height! * 0.58
          const spots = Object.values(
            layoutHotspots(view.objects, frame.anchors, width!, sceneHeight),
          )
          count += spots.length
          spots.forEach((p, i) => {
            expect(p.x - 24).toBeGreaterThanOrEqual(0)
            expect(p.x + 24).toBeLessThanOrEqual(width!)
            expect(p.y - 24).toBeGreaterThanOrEqual(0)
            expect(p.y + 24).toBeLessThanOrEqual(sceneHeight)
            for (const q of spots.slice(i + 1))
              expect(Math.abs(p.x - q.x) >= 48 || Math.abs(p.y - q.y) >= 48).toBe(true)
          })
        }
      }
    expect(count).toBeGreaterThan(30)
    expect(coverPoint(0.5, 0.5, 360, 352)).toEqual({ x: 180, y: 176 })
  })
})
