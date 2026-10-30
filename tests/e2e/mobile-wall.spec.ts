import { expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { test } from './fixtures'
import { startNamedRun } from './helpers'

test('the wall hotspot appears only when a response is available', async ({ page }) => {
  test.setTimeout(120_000)
  mkdirSync('audit/screenshots/r45', { recursive: true })
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'mobile', reduceFlashing: true }))
  })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.evaluate(() => window.__game.startNight(5))
  await page.addStyleTag({ content: '.debug-overlay { display: none !important }' })
  await page.locator('.mobile-game[data-view="room"] .view-exit-left').click()
  await expect(page.locator('[data-object="party_wall"]')).toHaveCount(0)
  await expect(page.locator('canvas[data-ready="true"]')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: 'audit/screenshots/r45/mobile-wall-no-action.png' })
  await page.evaluate(() => {
    window.__game.startNight(2)
    window.__game.setFlag('n2_voice_done', true)
  })
  await page.locator('.mobile-game[data-view="room"] .view-exit-left').click()
  await expect(page.locator('[data-object="party_wall"]')).toBeVisible()
  await expect(page.locator('canvas[data-ready="true"]')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: 'audit/screenshots/r45/mobile-wall-listen.png' })
})
