import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { startNamedRun } from './helpers'
import type { GameState } from '../../src/core/state/types'
import type { getDesktopState } from '../../src/platform/device/desktopRuntime'

interface Api {
  getState: () => GameState
  getDesktopState: typeof getDesktopState
  goTo: (id: string) => void
  setFlag: (key: string, value: boolean) => void
  getAudioState: () => { recent: string[] }
}
const state = (page: Page) =>
  page.evaluate(() => (window as unknown as { __game: Api }).__game.getState())
const inspect = (page: Page) =>
  page.evaluate(() => (window as unknown as { __game: Api }).__game.getDesktopState())
const jump = (page: Page, id: string) =>
  page.evaluate((id) => (window as unknown as { __game: Api }).__game.goTo(id), id)
async function boot(page: Page, mode: 'mobile' | 'desktop', reduced = true) {
  await page.addInitScript(
    ({ mode, reduced }) => {
      localStorage.setItem('g317:settings', JSON.stringify({ mode, reduceFlashing: reduced }))
      sessionStorage.setItem('g317:controls', '1')
    },
    { mode, reduced },
  )
  if (mode === 'mobile') await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.addStyleTag({ content: '.debug-overlay {display:none}' })
  await expect(page.locator(`.${mode}-game`)).toBeVisible()
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

test('late-night launch adds one line and consumes it across reload', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-25T19:20:00Z'))
  await boot(page, 'mobile')
  await expect(page.getByText(/Haqiqiy soat ham yarim tundan/)).toBeVisible()
  expect((await state(page)).metaHints.lateNightCommentFired).toBe(true)
  await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
  await expect(page.getByText(/Haqiqiy soat ham yarim tundan/)).toHaveCount(0)
})

test('saved absence is acknowledged once at the actual resumed node', async ({ page }) => {
  await boot(page, 'mobile')
  await jump(page, 'n2_mirror')
  await page.addInitScript(() => {
    const saved = JSON.parse(localStorage.getItem('g317:run')!) as { state: GameState }
    saved.state.lastPlayedAt = new Date(Date.now() - 150 * 60_000).toISOString()
    localStorage.setItem('g317:run', JSON.stringify(saved))
  })
  await page.reload()
  await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
  await expect(page.getByText(/Bir necha soat yoʻq boʻldingiz/)).toBeVisible()
  expect((await state(page)).currentNodeId).toBe('n2_mirror')
  expect((await state(page)).metaHints.returnCommentFired).toBe(true)
  await page.reload()
  await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
  await expect(page.getByText(/Bir necha soat yoʻq boʻldingiz/)).toHaveCount(0)
})

test('real 3:17 adds a knock without moving the story and stays consumed on reload', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-25T22:16:59Z'))
  await boot(page, 'mobile')
  const previous = await state(page)
  await page.clock.setFixedTime(new Date('2026-10-25T22:17:00Z'))
  const banner = page.getByRole('button', { name: /Haqiqiy soatingiz/ })
  await expect(banner).toBeVisible()
  expect((await state(page)).currentNodeId).toBe(previous.currentNodeId)
  expect((await state(page)).sanity).toBe(previous.sanity)
  expect((await state(page)).metaHints.realClock317Fired).toBe(true)
  expect(
    await page.evaluate(() => (window as unknown as { __game: Api }).__game.getAudioState().recent),
  ).toContain('knock_soft')
  await banner.click()
  await page.reload()
  await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
  await page.waitForTimeout(1200)
  await expect(banner).toHaveCount(0)
})

for (const mode of ['mobile', 'desktop'] as const) {
  test(`${mode}: finite signal loss leaves pause and continuation available`, async ({ page }) => {
    await boot(page, mode, false)
    await jump(page, 'n4_glitch')
    const signal = page.getByRole('status', { name: 'Xona tasviri buzildi' })
    await expect(signal).toBeVisible()
    expect(await signal.evaluate((node) => getComputedStyle(node).pointerEvents)).toBe('none')
    await page.screenshot({ path: `tests/screenshots/phase7-signal-${mode}.png` })
    await page.getByRole('button', { name: 'Pauza', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'PAUZA', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Davom etish', exact: true }).last().click()
    await expect(signal).toHaveCount(0, { timeout: 3100 })
    await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
    await expect(page.locator(`.${mode}-game`)).toHaveAttribute('data-node', 'n4_voice_identity')
    await jump(page, 'n4_glitch')
    await expect(signal).toHaveCount(0)
  })
  test(`${mode}: Reduce flashing removes the signal-loss effect`, async ({ page }) => {
    await boot(page, mode)
    await jump(page, 'n4_glitch')
    await expect(page.getByRole('status', { name: 'Xona tasviri buzildi' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
    await expect(page.locator(`.${mode}-game`)).toHaveAttribute('data-node', 'n4_voice_identity')
  })
}

test('mobile return puzzle exposes only the changed detail as the way forward', async ({
  page,
}) => {
  await boot(page, 'mobile')
  await jump(page, 'n3_corridor_loop')
  await page.getByRole('button', { name: 'Toʻxtab, orqaga qarash', exact: true }).click()
  await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-node', 'n3_room_return')
  await expect(page.locator('.mobile-panel .choices button')).toHaveCount(0)
  await page.screenshot({ path: 'tests/screenshots/phase7-shifted-mobile.png' })
  await page
    .getByRole('button', { name: 'Joyini oʻzgartirgan soatni tekshirish', exact: true })
    .click()
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-node', 'n3_hub')
  expect((await state(page)).flags['clock_shifted']).toBe(true)
})

test('mobile voice reveal skips the pause without duplicating dialogue in narration', async ({
  page,
}) => {
  await boot(page, 'mobile', false)
  await jump(page, 'n3_voice_repeat')
  await expect(page.locator('.chat-typing')).toBeVisible()
  await expect(page.locator('.mobile-panel .speaker-voice')).toHaveCount(0)
  await page.getByRole('button', { name: 'Matnni ochish', exact: true }).click()
  await expect(page.locator('.chat-bubble')).toHaveCount(2)
  await expect(page.locator('.chat-typing')).toHaveCount(0)
  await page.screenshot({ path: 'tests/screenshots/phase7-voice-mobile.png' })
})

for (const mode of ['mobile', 'desktop'] as const) {
  test(`${mode}: opposite windows go dark before the power cut`, async ({ page }) => {
    await boot(page, mode)
    if (mode === 'desktop') await expect.poll(async () => (await inspect(page)).windowsLit).toBe(5)
    await jump(page, 'n1_316')
    if (mode === 'desktop')
      await expect.poll(async () => (await inspect(page)).windowsLit, { timeout: 5500 }).toBe(0)
    else {
      await expect(page.locator('.mobile-game')).toHaveAttribute('data-vignette', 'window_dark')
      await page.waitForTimeout(3800)
    }
    await page.screenshot({ path: `tests/screenshots/phase7-blackout-${mode}.png` })
  })
}

test('desktop clock waits outside the frustum; mirror head turn follows after half a second', async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('Drag test'))
  })
  await boot(page, 'desktop')
  await jump(page, 'n3_hub')
  // The clock may only move unobserved, so wait until the camera has settled facing it.
  await expect
    .poll(async () => {
      const a = await inspect(page)
      await page.waitForTimeout(300)
      const b = await inspect(page)
      return a.yaw === b.yaw && a.position.every((v, i) => v === b.position[i])
    })
    .toBe(true)
  await page.evaluate(() =>
    (window as unknown as { __game: Api }).__game.setFlag('clock_shifted', true),
  )
  await page.waitForTimeout(250)
  expect((await inspect(page)).clockShifted).toBe(false)
  await page.mouse.move(720, 350)
  await page.mouse.down()
  await page.mouse.move(1400, 350)
  await page.mouse.up()
  await expect.poll(async () => (await inspect(page)).clockShifted).toBe(true)
  await page.mouse.move(720, 350)
  await page.mouse.down()
  await page.mouse.move(40, 350)
  await page.mouse.up()
  await page.screenshot({ path: 'tests/screenshots/phase7-shifted-desktop.png' })
  await jump(page, 'n2_mirror')
  await page.waitForTimeout(700)
  const before = await inspect(page)
  // Sample the reflection gap every frame in the page: the lag lasts half a second,
  // shorter than a round trip on a loaded software renderer.
  await page.evaluate(() => {
    const w = window as unknown as { __game: Api; __mirrorGap: number }
    w.__mirrorGap = 0
    const start = performance.now()
    const sample = () => {
      const view = w.__game.getDesktopState()
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
