import { expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { test } from './fixtures'
import { startNamedRun } from './helpers'

test('a fixed view cannot cross a closed door until the door is tapped open', async ({ page }) => {
  test.setTimeout(120_000)
  mkdirSync('audit/screenshots/r45', { recursive: true })
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'mobile', reduceFlashing: true }))
  })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.addStyleTag({ content: '.debug-overlay { display: none !important }' })
  const game = page.locator('.mobile-game')
  // Night 2 begins in the room; its door rests open, so the hall is one tap away.
  await page.evaluate(() => window.__game.startNight(2))
  await expect(game).toHaveAttribute('data-view', 'room')
  await page.locator('.view-exit-back').click()
  await expect(game).toHaveAttribute('data-view', 'hall')

  // The front door ahead is shut: the control is a door, there is no arrow through it.
  await expect(page.locator('.view-door.view-exit-forward')).toBeVisible()
  await expect(page.locator('.view-exit-forward:not(.view-door)')).toHaveCount(0)
  await expect(page.locator('canvas[data-ready="true"]')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: 'audit/screenshots/r45/mobile-hall-door.png' })
  // The bathroom and kitchen doors stand to the sides, also shut.
  await expect(page.locator('.view-door.view-exit-left')).toBeVisible()
  await expect(page.locator('.view-door.view-exit-right')).toBeVisible()

  // Tapping the door opens it; the arrow takes its place and now leads through.
  await page.locator('.view-door.view-exit-forward').click()
  await expect(page.locator('.view-door.view-exit-forward')).toHaveCount(0)
  await page.screenshot({ path: 'audit/screenshots/r45/mobile-hall-door-open.png' })
  await page.locator('.view-exit-forward').click()
  await expect(game).toHaveAttribute('data-view', 'landing')
})
