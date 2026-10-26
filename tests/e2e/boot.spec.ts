import { expect } from '@playwright/test'
import { test } from './fixtures'

// Collects console.error and pageerror; any of these fails the test (spec 12).
test.beforeEach(({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${String(err)}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  ;(page as unknown as { __errors: string[] }).__errors = errors
})

test('boots without console errors', async ({ page }) => {
  await page.goto('/')
  expect(page.locator('#root')).not.toBeNull()
  const rootText = await page.locator('#root').textContent()
  expect(rootText?.trim().length ?? 0).toBeGreaterThan(0)
  const errors = (page as unknown as { __errors: string[] }).__errors
  expect(errors).toEqual([])
})
