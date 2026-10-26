import { expect } from '@playwright/test'
import { test } from './fixtures'
import { acceptWarning } from './helpers'

/**
 * WebGL disabled (spec 12 test 6): on a desktop viewport the game must still
 * work, routed into mobile mode ("telefon (2D)" on the title screen).
 */
test('no WebGL → mobile mode on a desktop viewport', async ({ page }) => {
  // Only meaningful in the no-webgl project (WebGL forced off); elsewhere the
  // desktop viewport legitimately routes to desktop mode.
  const hasWebgl = await page.evaluate(() => {
    try {
      return Boolean(document.createElement('canvas').getContext('webgl2'))
    } catch {
      return false
    }
  })
  test.skip(hasWebgl, 'WebGL is available in this project')
  await page.goto('/')
  await acceptWarning(page)
  await expect(page.getByRole('button', { name: 'Yangi oʻyin' })).toBeVisible()
  await expect(page.getByText(/rejim: telefon \(2D\)/)).toBeVisible()
})

/** Small Android viewport: everything reachable, no overlaps. */
test('360px viewport keeps the shell usable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('/')
  await acceptWarning(page)
  const menu = page.getByRole('button', { name: 'Yangi oʻyin' })
  await expect(menu).toBeVisible()
  const box = await menu.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(360)
})
