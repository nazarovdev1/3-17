import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { startNamedRun } from './helpers'
import type { getDesktopState } from '../../src/platform/device/desktopRuntime'
import { QUALITY_HEIGHT } from '../../src/platform/device/mode'

type Metrics = ReturnType<typeof getDesktopState>
interface DebugApi {
  getDesktopState: () => Metrics
  goTo: (id: string) => void
  getState: () => {
    currentNodeId: string
    sanity: number
    inventory: string[]
    flags: Record<string, unknown>
  }
}
const inspect = (page: Page) =>
  page.evaluate(() => (window as unknown as { __game: DebugApi }).__game.getDesktopState())
const jump = (page: Page, id: string) =>
  page.evaluate((id) => (window as unknown as { __game: DebugApi }).__game.goTo(id), id)
async function boot(page: Page) {
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.addStyleTag({ content: '.debug-overlay { display:none }' })
  await expect(page.locator('.desktop-view canvas')).toBeVisible()
  await expect.poll(async () => (await inspect(page)).frames).toBeGreaterThan(1)
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  ;(page as unknown as { errors: string[] }).errors = errors
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'desktop', reduceFlashing: true }))
    sessionStorage.setItem('g317:controls', '1')
  })
})
test.afterEach(({ page }) => expect((page as unknown as { errors: string[] }).errors).toEqual([]))

test.use({ trace: 'off' })
test('desktop steady rendering and resource stability', async ({ page }, info) => {
  test.setTimeout(90_000)
  await boot(page)
  await jump(page, 'n1_hub')
  // Let the software GPU finish first-use uploads before measuring steady rendering.
  await page.waitForTimeout(5000)
  const start = await page.evaluate(() => ({
    time: performance.now(),
    frames: (window as unknown as { __game: DebugApi }).__game.getDesktopState().frames,
  }))
  await page.waitForTimeout(5000)
  const end = await page.evaluate(() => ({
    time: performance.now(),
    frames: (window as unknown as { __game: DebugApi }).__game.getDesktopState().frames,
  }))
  const defaultFps = ((end.frames - start.frames) * 1000) / (end.time - start.time)
  console.log(
    'default graphics sample',
    defaultFps,
    await page.evaluate(() => {
      const gl = document
        .querySelector<HTMLCanvasElement>('.desktop-view canvas')!
        .getContext('webgl2')!
      const info = gl.getExtension('WEBGL_debug_renderer_info')!
      return gl.getParameter(info.UNMASKED_RENDERER_WEBGL) as string
    }),
  )
  expect((await inspect(page)).tier).toBe('high')
  expect(defaultFps).toBeGreaterThanOrEqual(55)
  for (const id of ['n1_tea', 'n2_mirror', 'n2_day_start', 'n4_inside48', 'n1_hub']) {
    await jump(page, id)
    await page.waitForTimeout(120)
  }
  await page.waitForTimeout(1000)
  const before = await inspect(page)
  for (let i = 0; i < 3; i++)
    for (const id of ['n1_tea', 'n2_mirror', 'n2_day_start', 'n4_inside48', 'n1_hub']) {
      await jump(page, id)
      await page.waitForTimeout(80)
    }
  await page.waitForTimeout(4000)
  const after = await inspect(page)
  console.log('desktop steady metrics', JSON.stringify({ defaultFps, before, after }))
  expect(after.geometries).toBeLessThanOrEqual(before.geometries + 2)
  expect(after.textures).toBeLessThanOrEqual(before.textures + 2)
  expect(after.renderHeight).toBe(QUALITY_HEIGHT[after.tier === 'high' ? 'high' : 'low'])
  expect(after.fps).toBeGreaterThan(25)
  await info.attach('desktop-metrics.json', {
    body: JSON.stringify({ defaultFps, before, after }),
    contentType: 'application/json',
  })
})
