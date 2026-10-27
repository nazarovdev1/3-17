import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createInitialState, goTo, visibleChoices } from '@/core/engine'
import { story } from '@/content/story'
import { STILL_CAMERAS, STILL_RECIPES, stillId } from '@/presenters/mobile/still-scenes'
import { coverPoint } from '@/presenters/mobile/still-renderer'
import { layoutHotspots } from '@/presenters/mobile/hotspots'
import manifest from '@/presenters/mobile/stills.gen.json'

const initial = () =>
  createInitialState(
    { name: 'Ali', livesAlone: 'ha', fear: 'qorongʻulik', doorAtNight: 'yopiq' },
    '2026-10-28T00:00:00Z',
  )
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
      recipe.nodes.forEach((node) => expect(story.nodes[node], node).toBeDefined())
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
  it('resolves every story scene before and after the cut, including persistent return changes', () => {
    for (const node of Object.values(story.nodes).filter((n) => !n.ending)) {
      const step = goTo(story, initial(), node.id)
      for (const outage of [false, true]) {
        const state = {
          ...step.state,
          visitedNodes: outage
            ? [...step.state.visitedNodes, `n${step.state.night}_317`]
            : step.state.visitedNodes,
        }
        expect(
          frames[stillId(node.mobile?.vignette ?? node.location, node.id, state)],
          node.id,
        ).toBeDefined()
      }
    }
    const returned = goTo(story, goTo(story, initial(), 'n1_tea').state, 'n1_hub')
    expect(stillId('room', 'n1_hub', returned.state)).toBe('room-return')
    expect(stillId('room', 'n3_tv', returned.state)).toBe('tv-figure')
    const windows = goTo(story, initial(), 'n5_316')
    expect(stillId('window_dark', 'n5_316', windows.state)).toBe('window-off')
    for (const night of [1, 2, 3, 4, 5]) {
      const phone = goTo(story, initial(), `n${night}_phone`)
      expect(stillId('room', phone.node.id, phone.state)).toBe(`phone-night${night}`)
    }
  })
  it('keeps every 48 px hotspot in its visible crop without overlaps at all five screen sizes', () => {
    let count = 0
    for (const node of Object.values(story.nodes).filter((n) => !n.ending)) {
      const step = goTo(story, initial(), node.id)
      const frame = frames[stillId(node.mobile?.vignette ?? node.location, node.id, step.state)]!
      for (const [width, height] of sizes) {
        const sceneHeight = height! * 0.58
        const spots = Object.values(
          layoutHotspots(visibleChoices(node, step.state), frame.anchors, width!, sceneHeight),
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
