import { expect } from '@playwright/test'
import { test } from './fixtures'
import { acceptWarning, startNamedRun } from './helpers'

// Collects console.error and pageerror; any of these fails the test (spec 12).
test.beforeEach(({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${String(err)}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  ;(page as unknown as { __errors: string[] }).__errors = errors
})

test.afterEach(({ page }) => {
  const errors = (page as unknown as { __errors: string[] }).__errors
  expect(errors, 'no console errors or page errors').toEqual([])
})

test('boots to the content warning without Telegram', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('OGOHLANTIRISH')).toBeVisible()
})

test('boots with a mocked Telegram WebApp object', async ({ page }) => {
  await page.route('**/telegram-web-app.js', (route) =>
    route.fulfill({ body: '', contentType: 'application/javascript' }),
  )
  await page.addInitScript(() => {
    const calls: string[] = []
    const w = window as unknown as Record<string, unknown>
    w.Telegram = {
      WebApp: {
        ready: () => calls.push('ready'),
        expand: () => calls.push('expand'),
        setHeaderColor: () => calls.push('header'),
        initDataUnsafe: { user: { first_name: 'Aziz' } },
        HapticFeedback: { impactOccurred: () => undefined },
        version: '9.0',
        platform: 'web',
      },
    }
    ;(window as unknown as { __tgCalls: string[] }).__tgCalls = calls
  })
  await page.goto('/')
  await expect(page.getByText('OGOHLANTIRISH')).toBeVisible()
  const calls = await page.evaluate(() => (window as unknown as { __tgCalls: string[] }).__tgCalls)
  expect(calls).toContain('ready')
  expect(calls).toContain('expand')

  // The pre-filled name from initDataUnsafe lands in the rental form.
  await acceptWarning(page)
  await page.getByRole('button', { name: 'Yangi oʻyin' }).click()
  await expect(page.getByText('IJARA ANKETASI')).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveValue('Aziz')
})

test('accept warning → title → full flow: form, night 1, save → reload → resume', async ({
  page,
}) => {
  await page.goto('/')
  await acceptWarning(page)
  await expect(page.getByRole('heading', { name: '3:17' })).toBeVisible()

  await page.getByRole('button', { name: 'Yangi oʻyin' }).click()
  await page.getByRole('textbox').fill('Dilnoza')
  await page.getByRole('button', { name: 'Imzolash' }).click()

  // Night 1: advance past the opening narration to the hub.
  await page.getByRole('button', { name: 'Davom etish' }).first().click()
  await expect(page.getByText(/Xonadon sizniki/)).toBeVisible()

  // Inspect the clock (panel button on desktop, shimmering hotspot on mobile).
  await page.getByRole('button', { name: /Devordagi soatga qarash|^Soat$/ }).click()
  await expect(page.getByText(/Katta devor soati/)).toBeVisible()

  // Reload: the run must resume at the same node (save → reload → resume).
  await page.reload()
  await page.getByRole('button', { name: 'Davom etish' }).click() // continue run
  await expect(page.getByText(/Katta devor soati/)).toBeVisible()
})

test('pause menu is reachable and quit returns to title', async ({ page }) => {
  await page.goto('/')
  await startNamedRun(page, 'Dilnoza')
  await page.getByRole('button', { name: 'Pauza' }).click()
  await expect(page.getByRole('heading', { name: 'PAUZA', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sarlavha ekraniga chiqish' }).click()
  await expect(page.getByRole('button', { name: 'Yangi oʻyin' })).toBeVisible()
})

test('settings persist across reload', async ({ page }) => {
  await page.goto('/')
  await acceptWarning(page)
  await page.getByRole('button', { name: 'Sozlamalar' }).click()
  await page.getByRole('button', { name: /^L$/ }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Sozlamalar' }).click()
  await expect(page.getByRole('button', { name: /^L$/ })).toHaveClass(/active/)
})

test('resizing / rotating does not break layout or state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await acceptWarning(page)
  await page.getByRole('button', { name: 'Yangi oʻyin' }).click()
  await page.getByRole('textbox').fill('Dilnoza')
  await page.getByRole('button', { name: 'Imzolash' }).click()
  await page.getByRole('button', { name: 'Davom etish' }).first().click()
  await expect(page.getByText(/Xonadon sizniki|Soat tungi uchlar/)).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByText(/Xonadon sizniki|Soat tungi uchlar/)).toBeVisible()

  await page.setViewportSize({ width: 800, height: 1200 })
  await expect(page.getByText(/Xonadon sizniki|Soat tungi uchlar/)).toBeVisible()
})

test('window.__game exists only in debug mode', async ({ page }) => {
  await page.goto('/')
  expect(await page.evaluate(() => '__game' in window)).toBe(false)
  await page.goto('/?debug=1')
  await expect(page.locator('.debug-overlay')).toBeVisible()
  expect(
    await page.evaluate(() => typeof (window as unknown as Record<string, unknown>)['__game']),
  ).toBe('object')
  const state = await page.evaluate(() => {
    const api = (window as unknown as { __game: { getState: () => unknown } }).__game
    return api.getState()
  })
  expect(state).toBeNull()
})
