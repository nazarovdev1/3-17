import { expect } from '@playwright/test'
import { test } from './fixtures'
import { moveOn, startNamedRun } from './helpers'
import { ui } from '../../src/content/text'

// Scene evidence is written once; the interaction checks run at every viewport.
test('mobile viewpoints, hotspot bounds, wall listening, pause and glyph evidence', async ({
  page,
}, info) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'mobile', reduceFlashing: true }))
    // Test the fallback used by webviews with no device orientation API.
    Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined })
  })
  await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.addStyleTag({ content: '.debug-overlay { display: none }' })
  const game = page.locator('.mobile-game')
  const scene = (await page.locator('.mobile-scene').boundingBox())!
  // Walk every viewpoint by its edge arrows: landing → hall → room → wall / entry …
  const route: [string, string][] = [
    ['landing', 'forward'],
    ['hall', 'back'],
    ['room', 'left'],
    ['wall', 'back'],
    ['room', 'right'],
    ['entry', 'back'],
    ['hall', 'right'],
    ['kitchen', 'back'],
    ['hall', 'left'],
    ['bathroom', 'back'],
  ]
  for (const [view, exit] of route) {
    await expect(game).toHaveAttribute('data-view', view)
    for (const hotspot of await page.locator('.hotspot').all()) {
      const box = (await hotspot.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(scene.x)
      expect(box.x + box.width).toBeLessThanOrEqual(scene.x + scene.width)
      expect(box.y).toBeGreaterThanOrEqual(scene.y)
      expect(box.y + box.height).toBeLessThanOrEqual(scene.y + scene.height)
      expect(box.width).toBeGreaterThanOrEqual(48)
    }
    // No panel, no choices, no narration: the still, its objects and the way on.
    await expect(page.locator('.mobile-panel, .choices, .narration')).toHaveCount(0)
    if (info.project.name === 'small-android') {
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ path: `tests/screenshots/mobile-${view}.png` })
    }
    await moveOn(page, exit as 'left' | 'right' | 'back' | 'forward')
  }
  // Hold the shared wall to listen; letting go stops.
  await expect(game).toHaveAttribute('data-view', 'hall')
  // Listening exists once night 2's voice has spoken, so the wall is tried there.
  await page.evaluate(() => {
    window.__game.startNight(2)
    window.__game.setFlag('n2_voice_done', true)
  })
  await expect(game).toHaveAttribute('data-view', 'room')
  await moveOn(page, 'left')
  await expect(game).toHaveAttribute('data-view', 'wall')
  const wall = (await page.locator('[data-object="party_wall"]').boundingBox())!
  await page.mouse.move(wall.x + wall.width / 2, wall.y + wall.height / 2)
  await page.mouse.down()
  await expect.poll(() => page.evaluate(() => window.__game.getWorld()?.waiting ?? null)).toBeNull()
  await expect
    .poll(() =>
      page.evaluate(
        () => (window.__game.getWorld() as unknown as { listening: boolean }).listening,
      ),
    )
    .toBe(true)
  await page.mouse.up()
  await expect
    .poll(() =>
      page.evaluate(
        () => (window.__game.getWorld() as unknown as { listening: boolean }).listening,
      ),
    )
    .toBe(false)
  await page.getByRole('button', { name: ui('common.pause') }).click()
  await expect(page.getByText(ui('pause.title'), { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: ui('common.continue'), exact: true })
    .last()
    .click()

  if (info.project.name === 'small-android') {
    await page.evaluate(() => {
      const samples = document.createElement('div')
      samples.style.cssText =
        'position:fixed;inset:0;z-index:20000;background:#141a22;padding:24px;color:#cfc6b0'
      for (const family of ['Literata', 'Inter']) {
        const line = document.createElement('p')
        line.style.cssText = `font: 26px "${family}";line-height:2`
        line.textContent = `${family}: Qoʻshni · gʻalati · ma’no · e’tibor`
        samples.appendChild(line)
      }
      document.body.appendChild(samples)
    })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'tests/screenshots/mobile-font-glyphs.png' })
  }
  expect(errors).toEqual([])
})
