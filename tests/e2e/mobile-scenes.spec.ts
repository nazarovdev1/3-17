import { test, expect } from '@playwright/test'
import { story } from '../../src/content/story'
import { startNamedRun } from './helpers'

// Scene evidence is written once; the interaction checks run at every viewport.
test('mobile scenes, hotspot bounds, peephole, hold cancellation, and glyph evidence', async ({
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
  const scenes = new Set<string>()
  for (const node of Object.values(story.nodes)) {
    if (node.ending) continue
    await page.evaluate(
      (id) => (window as unknown as { __game: { goTo: (id: string) => void } }).__game.goTo(id),
      node.id,
    )
    await expect(page.locator('.mobile-game')).toHaveAttribute('data-node', node.id)
    for (const hotspot of await page.locator('.hotspot').all()) {
      const box = await hotspot.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(360)
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.y + box!.height).toBeLessThanOrEqual(352)
    }
    const scene = node.mobile?.vignette ?? node.location
    if (!scenes.has(scene) && info.project.name === 'small-android') {
      scenes.add(scene)
      await page.locator('.narration').click()
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ path: `tests/screenshots/mobile-${scene}.png` })
    }
  }
  await page.evaluate(() =>
    (window as unknown as { __game: { goTo: (id: string) => void } }).__game.goTo('n4_peephole'),
  )
  await expect(page.locator('.peephole-panel .narration')).toBeVisible()
  await page.locator('.narration').click()
  await expect(page.locator('.narration')).toContainText('kimdir')

  await page.evaluate(() =>
    (window as unknown as { __game: { goTo: (id: string) => void } }).__game.goTo('n2_night_hub'),
  )
  await page.evaluate(() =>
    (
      window as unknown as { __game: { setFlag: (key: string, value: boolean) => void } }
    ).__game.setFlag('listened_n2', false),
  )
  const listen = page.getByRole('button', { name: 'Devorni tinglash', exact: true })
  const box = (await listen.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(200)
  await page.mouse.up()
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-node', 'n2_night_hub')
  await page.mouse.down()
  await page.waitForTimeout(800)
  await page.mouse.up()
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-node', 'n2_listen')
  await page.getByRole('button', { name: 'Pauza' }).click()
  await expect(page.getByText('PAUZA', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Davom etish', exact: true }).last().click()

  if (info.project.name === 'small-android') {
    await page.evaluate(() => {
      const samples = document.createElement('div')
      samples.style.cssText =
        'position:fixed;inset:0;z-index:20000;background:#141a22;padding:24px;color:#cfc6b0'
      for (const family of ['IBM Plex Mono', 'Oswald']) {
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
