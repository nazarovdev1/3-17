import { expect } from '@playwright/test'
import { test } from './fixtures'
import { startNamedRun } from './helpers'

test('a door stays closed on approach, toggles on E, and blocks walking', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'desktop', reduceFlashing: true }))
  })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.evaluate(() => window.__game.startNight(2))
  await expect
    .poll(() => page.evaluate(() => window.__game.getDesktopState().worldReady))
    .toBe(true)
  await page.evaluate(() => window.__game.teleport(0, 2.5, Math.PI / 2))
  const angle = async () =>
    page.evaluate(
      () => (window.__game.getDesktopState().doorAngles as Record<string, number>)?.bath_door,
    )
  await expect.poll(angle).toBeLessThan(0.3)
  await page.keyboard.down('w')
  await page.waitForTimeout(800)
  await page.keyboard.up('w')
  expect(await angle()).toBeLessThan(0.3)
  const x = await page.evaluate(() => (window.__game.getDesktopState().position as number[])[0]!)
  expect(x).toBeGreaterThan(-0.5)
  await page.keyboard.press('e')
  await expect.poll(angle).toBeGreaterThan(1)
  await page.keyboard.down('w')
  await page.waitForTimeout(1800)
  await page.keyboard.up('w')
  const through = await page.evaluate(
    () => (window.__game.getDesktopState().position as number[])[0]!,
  )
  expect(through).toBeLessThan(-0.8)
  await page.evaluate(() => {
    const state = window.__game.getDesktopState()
    const position = state.position as number[]
    const leaf = (
      state.doorLeaves as Record<string, { x0: number; x1: number; z0: number; z1: number }>
    ).bath_door!
    const x = (leaf.x0 + leaf.x1) / 2
    const z = (leaf.z0 + leaf.z1) / 2
    window.__game.teleport(
      position[0]!,
      position[2]!,
      Math.atan2(position[0]! - x, position[2]! - z),
    )
  })
  await page.waitForTimeout(250)
  await page.keyboard.press('e')
  await expect.poll(angle).toBeLessThan(0.3)
})

test('night five front door stays locked before the request', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'desktop', reduceFlashing: true }))
  })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.evaluate(() => window.__game.startNight(5))
  await expect
    .poll(() => page.evaluate(() => window.__game.getDesktopState().worldReady))
    .toBe(true)
  await page.evaluate(() => window.__game.teleport(0, 4.1, Math.PI))
  await page.waitForTimeout(500)
  await page.keyboard.press('e')
  await page.waitForTimeout(800)
  expect(await page.evaluate(() => window.__game.getState()?.flags['front_open'])).not.toBe(true)
  expect(
    await page.evaluate(
      () => (window.__game.getDesktopState().doorAngles as Record<string, number>).front_door,
    ),
  ).toBeLessThan(0.3)
})

test('the wardrobe opens and closes only on E', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'desktop', reduceFlashing: true }))
  })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.evaluate(() => window.__game.startNight(5))
  await expect
    .poll(() => page.evaluate(() => window.__game.getDesktopState().worldReady))
    .toBe(true)
  await page.evaluate(() => window.__game.teleport(0.3, 0.95, Math.PI / 2))
  const angle = () => page.evaluate(() => window.__game.getDesktopState().wardrobeAngle as number)
  await expect.poll(angle).toBeLessThan(0.1)
  await page.keyboard.press('e')
  await expect.poll(angle).toBeGreaterThan(1)
  await page.keyboard.press('e')
  await expect.poll(angle).toBeLessThan(0.1)
})
