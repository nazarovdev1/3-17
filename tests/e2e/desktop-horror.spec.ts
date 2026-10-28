import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { startNamedRun } from './helpers'
import type { getDesktopState } from '../../src/platform/device/desktopRuntime'
import { ui } from '../../src/content/text'
import { objectPoint } from '../../src/content/world/objects'

type Metrics = ReturnType<typeof getDesktopState>
const inspect = (page: Page): Promise<Metrics> =>
  page.evaluate(() => window.__game.getDesktopState() as unknown as Metrics)
const run = (page: Page) => page.evaluate(() => window.__game.getState()!)

async function boot(page: Page, mode: 'mobile' | 'desktop', reduced = true) {
  await page.addInitScript(
    ({ mode, reduced }) => {
      localStorage.setItem('g317:settings', JSON.stringify({ mode, reduceFlashing: reduced }))
    },
    { mode, reduced },
  )
  if (mode === 'mobile') await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.addStyleTag({ content: '.debug-overlay {display:none}' })
  await expect(page.locator(`.${mode}-game`)).toBeVisible({ timeout: 30_000 })
  if (mode === 'desktop')
    await expect.poll(async () => (await inspect(page)).worldReady, { timeout: 30_000 }).toBe(true)
}
test.use({ timezoneId: 'Asia/Tashkent' })
test.beforeEach(({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  ;(page as unknown as { errors: string[] }).errors = errors
})
test.afterEach(({ page }) => expect((page as unknown as { errors: string[] }).errors).toEqual([]))

test('a late-night launch is recorded on the run for night 1 (no narrator line), across reload', async ({
  page,
}) => {
  // 00:20 in Tashkent.
  await page.clock.setFixedTime(new Date('2026-10-25T19:20:00Z'))
  await boot(page, 'mobile')
  expect((await run(page)).flags['late_night']).toBe(true)
  await expect(page.locator('.narration')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: ui('common.continue'), exact: true }).click()
  expect((await run(page)).flags['late_night']).toBe(true)
})

test('a long absence is recorded when the run is continued, at the same night', async ({
  page,
}) => {
  await boot(page, 'mobile')
  await page.evaluate(() => window.__game.startNight(2))
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    window.__game.setTime(new Date(Date.now() - 150 * 60_000).toISOString())
  })
  await page.addInitScript(() => {
    const raw = localStorage.getItem('g317:run')
    if (!raw) return
    const saved = JSON.parse(raw) as { state: { lastPlayedAt: string } }
    saved.state.lastPlayedAt = new Date(Date.now() - 150 * 60_000).toISOString()
    localStorage.setItem('g317:run', JSON.stringify(saved))
  })
  await page.reload()
  await page.getByRole('button', { name: ui('common.continue'), exact: true }).click()
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-sequence', 'n2')
  expect((await run(page)).flags['returned']).toBe(true)
})

test('real 3:17 knocks once on the wall without moving the night, and stays spent on reload', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-25T22:16:59Z'))
  await boot(page, 'mobile')
  const before = await run(page)
  const sequence = await page.evaluate(() => window.__game.getSequence())
  await page.clock.setFixedTime(new Date('2026-10-25T22:17:00Z'))
  await expect.poll(async () => (await run(page)).metaHints.realClock317Fired).toBe(true)
  expect(await page.evaluate(() => window.__game.getSequence())).toBe(sequence)
  expect((await run(page)).sanity).toBe(before.sanity)
  expect(
    await page.evaluate(() => (window.__game.getAudioState() as { recent: string[] }).recent),
  ).toContain('knock_soft')
  // Nothing written on screen about it.
  await expect(page.locator('.realtime-banner')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: ui('common.continue'), exact: true }).click()
  expect((await run(page)).metaHints.realClock317Fired).toBe(true)
})

for (const mode of ['mobile', 'desktop'] as const) {
  test(`${mode}: the fake glitch has no words, never blocks input, and pause stays reachable`, async ({
    page,
  }) => {
    await boot(page, mode, false)
    await page.evaluate(() => window.__game.emit([{ type: 'fx', id: 'glitch_fake', ms: 2500 }]))
    const signal = page.locator('.signal-loss')
    await expect(signal).toBeVisible()
    expect(await signal.textContent()).toBe('')
    expect(await signal.evaluate((node) => getComputedStyle(node).pointerEvents)).toBe('none')
    await page.screenshot({ path: `tests/screenshots/phase7-signal-${mode}.png` })
    await page.getByRole('button', { name: ui('common.pause'), exact: true }).click()
    await expect(page.getByRole('heading', { name: ui('pause.title'), exact: true })).toBeVisible()
    await page
      .getByRole('button', { name: ui('common.continue'), exact: true })
      .last()
      .click()
    await expect(signal).toHaveCount(0, { timeout: 3100 })
  })
  test(`${mode}: Reduce flashing removes the fake glitch`, async ({ page }) => {
    await boot(page, mode)
    await page.evaluate(() => window.__game.emit([{ type: 'fx', id: 'glitch_fake', ms: 2500 }]))
    await page.waitForTimeout(200)
    await expect(page.locator('.signal-loss')).toHaveCount(0)
  })
}

test('desktop: the opposite windows go dark floor by floor before the power cut', async ({
  page,
}) => {
  await boot(page, 'desktop')
  await expect.poll(async () => (await inspect(page)).windowsLit).toBe(5)
  await page.evaluate(() => window.__game.setClock('03:16'))
  await expect.poll(async () => (await inspect(page)).windowsLit, { timeout: 7000 }).toBe(0)
  // The windows are out while the power is still on: 3:17 comes after them.
  expect(await page.evaluate(() => window.__game.getWorld()?.power)).toBe(true)
  await page.screenshot({ path: 'tests/screenshots/phase7-blackout-desktop.png' })
})

test('desktop: the clock moves only while unseen; the mirror turns half a second late', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('Drag test'))
  })
  await boot(page, 'desktop')
  await page.evaluate(() => window.__game.startNight(3))
  await expect(page.locator('.desktop-game')).toHaveAttribute('data-sequence', 'n3')
  const clock = objectPoint('clock')!
  // Facing the clock from the room: it stays where it is, however long the player looks.
  await page.evaluate(
    ([x, z]) => window.__game.teleport(x!, z!, Math.atan2(x! - -1.3, z! - -3.28)),
    [0.4, -0.8],
  )
  await page.waitForTimeout(9500)
  expect((await inspect(page)).clockShifted).toBe(false)
  // Turned away from it: after a few seconds unseen, it hangs on another wall.
  await page.evaluate(() => window.__game.teleport(0.4, -0.8, Math.PI))
  await expect.poll(async () => (await inspect(page)).clockShifted, { timeout: 15_000 }).toBe(true)
  expect(clock).toBeTruthy()
  await page.evaluate(() => window.__game.teleport(0.4, -0.8, 0.6))
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'tests/screenshots/phase7-shifted-desktop.png' })
  // In the bathroom the reflection's head turns half a second after the player's.
  const mirror = objectPoint('mirror_cabinet')!
  await page.evaluate(
    ([x, z, mx, mz]) => window.__game.teleport(x!, z!, Math.atan2(x! - mx!, z! - mz!)),
    [-1.3, 3.1, mirror[0], mirror[2]],
  )
  await page.waitForTimeout(700)
  const before = await inspect(page)
  await page.evaluate(() => {
    const w = window as unknown as { __mirrorGap: number }
    w.__mirrorGap = 0
    const start = performance.now()
    const sample = () => {
      const view = window.__game.getDesktopState() as { yaw: number; mirrorYaw: number }
      w.__mirrorGap = Math.max(w.__mirrorGap, Math.abs(view.yaw - view.mirrorYaw))
      if (performance.now() - start < 3000) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await page.mouse.move(720, 350)
  await page.mouse.down()
  await page.mouse.move(820, 350)
  await page.mouse.up()
  await expect
    .poll(async () => Math.abs((await inspect(page)).yaw - before.yaw))
    .toBeGreaterThan(0.15)
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __mirrorGap: number }).__mirrorGap))
    .toBeGreaterThan(0.15)
  await expect
    .poll(async () => {
      const view = await inspect(page)
      return Math.abs(view.yaw - view.mirrorYaw)
    })
    .toBeLessThan(0.03)
})
