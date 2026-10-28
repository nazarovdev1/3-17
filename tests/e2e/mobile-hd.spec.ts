import { expect } from '@playwright/test'
import { test } from './fixtures'
import { startNamedRun } from './helpers'
import { ui } from '../../src/content/text'

test('HD stills, depth fallback, readable layout and disjoint 48 px targets at five sizes', async ({
  page,
}, info) => {
  test.setTimeout(150_000)
  await page.addInitScript(() =>
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'mobile', reduceFlashing: true })),
  )
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.addStyleTag({ content: '.debug-overlay{display:none!important}' })
  for (const [width, height] of [
    [360, 640],
    [375, 667],
    [390, 844],
    [412, 915],
    [430, 932],
  ]) {
    await page.setViewportSize({ width: width!, height: height! })
    if (width !== 360) {
      // Each viewport starts a fresh run. Storage is cleared from a static same-origin
      // document so the unloading app cannot save over it; the init script restores settings.
      await page.goto('/assets/stills/room_entry-on.webp')
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      await page.goto('/?debug=1')
      await startNamedRun(page, 'Dilnoza')
      await page.addStyleTag({ content: '.debug-overlay{display:none!important}' })
    }
    // Night 1's landing, then nights 2, 3 and 5 from the room through the wall and entry
    // viewpoints (power on and off).
    const shots: [number, string[]][] = [
      [1, []],
      [2, []],
      [3, ['left']],
      [5, ['right']],
    ]
    for (const [night, exits] of shots) {
      if (night !== 1) await page.evaluate((n) => window.__game.startNight(n), night)
      await expect(page.locator('.mobile-game')).toHaveAttribute('data-sequence', `n${night}`)
      for (const exit of exits) await page.locator(`.view-exit-${exit}`).click()
      const node = `n${night}-${await page.locator('.mobile-game').getAttribute('data-view')}`
      const canvas = page.locator('.mobile-scene canvas')
      await expect(canvas).toHaveAttribute('data-ready', 'true')
      await expect(canvas).toHaveAttribute(
        'data-renderer',
        info.project.name === 'no-webgl' ? 'canvas' : 'webgl2',
      )
      const scene = (await page.locator('.mobile-scene').boundingBox())!
      // No text panel under the scene: the still is the whole screen.
      await expect(page.locator('.mobile-panel, .narration')).toHaveCount(0)
      const boxes = await page.locator('.hotspot').evaluateAll((elements) =>
        elements.map((element) => {
          const r = element.getBoundingClientRect()
          return { x: r.x, y: r.y, w: r.width, h: r.height }
        }),
      )
      boxes.forEach((box, i) => {
        expect(box.w).toBeGreaterThanOrEqual(48)
        expect(box.h).toBeGreaterThanOrEqual(48)
        expect(box.x).toBeGreaterThanOrEqual(scene.x)
        expect(box.x + box.w).toBeLessThanOrEqual(scene.x + scene.width)
        expect(box.y).toBeGreaterThanOrEqual(scene.y)
        expect(box.y + box.h).toBeLessThanOrEqual(scene.y + scene.height)
        boxes
          .slice(i + 1)
          .forEach((b) =>
            expect(
              box.x + box.w <= b.x ||
                b.x + b.w <= box.x ||
                box.y + box.h <= b.y ||
                b.y + b.h <= box.y,
            ).toBe(true),
          )
      })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      if (info.project.name === 'small-android') {
        await page.screenshot({ path: `audit/screenshots/f6/${width}x${height}-${node}.png` })
      }
    }
  }
})

test('a damaged still can be retried; context loss retains the scene through Canvas', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'mobile', reduceFlashing: true })),
  )
  let damaged = true
  await page.route('**/assets/stills/stairwell-on.webp', (route) => {
    if (damaged) {
      damaged = false
      return route.fulfill({ status: 200, contentType: 'image/webp', body: 'invalid image' })
    }
    return route.continue()
  })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.getByRole('button', { name: ui('loading.retry'), exact: true }).click()
  const canvas = page.locator('.mobile-scene canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement
    if (target.dataset.renderer === 'webgl2')
      target.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()
  })
  await expect(canvas).toHaveAttribute('data-renderer', 'canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await expect(canvas).toHaveAttribute('data-still', 'stairwell-on')
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-view', 'landing')
})

test('orientation reaches the depth renderer and Reduce flashing freezes motion', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('g317:settings'))
      localStorage.setItem(
        'g317:settings',
        JSON.stringify({ mode: 'mobile', reduceFlashing: false }),
      )
  })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  const canvas = page.locator('.mobile-scene canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  const sample = () =>
    canvas.evaluate((element) => {
      const target = element as HTMLCanvasElement
      if (target.dataset.renderer === 'webgl2') {
        const gl = target.getContext('webgl2')!,
          program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram
        const movement = gl.getUniformLocation(program, 'movement'),
          depth = gl.getUniformLocation(program, 'depthMap')
        if (!movement || !depth) throw new Error('Depth shader uniforms are missing')
        return {
          kind: 'webgl2',
          x: (gl.getUniform(program, movement) as Float32Array)[0]!,
          depth: gl.getUniform(program, depth) as number,
          signature: 0,
        }
      }
      const pixels = target.getContext('2d')!.getImageData(0, 0, target.width, target.height).data
      let signature = 2166136261
      for (let i = 0; i < pixels.length; i += 137)
        signature = Math.imul(signature ^ pixels[i]!, 16777619)
      return { kind: 'canvas', x: 0, depth: 0, signature }
    })
  const turn = () =>
    page.evaluate(() =>
      window.dispatchEvent(Object.assign(new Event('deviceorientation'), { gamma: 30, beta: 35 })),
    )
  const before = await sample()
  await turn()
  if (before.kind === 'webgl2') {
    await expect.poll(async () => (await sample()).x).toBeGreaterThan(0.003)
    expect((await sample()).depth).toBe(1)
  } else await expect.poll(async () => (await sample()).signature).not.toBe(before.signature)
  await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem('g317:settings')!) as Record<string, unknown>
    localStorage.setItem('g317:settings', JSON.stringify({ ...settings, reduceFlashing: true }))
  })
  await page.reload()
  await page.getByRole('button', { name: ui('common.continue'), exact: true }).click()
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  const quiet = await sample()
  await turn()
  await page.waitForTimeout(150)
  if (quiet.kind === 'webgl2') expect((await sample()).x).toBe(0)
  else expect((await sample()).signature).toBe(quiet.signature)
})
