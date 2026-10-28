import { expect } from '@playwright/test'
import { test } from './fixtures'
import { acceptWarning, signForm, startNamedRun, startRun } from './helpers'
import { line, ui } from '../../src/content/text'

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

test('boots with a mocked Telegram WebApp object and fills its name into the rental form', async ({
  page,
}) => {
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
  await page.goto('/?debug=1')
  await expect(page.getByText('OGOHLANTIRISH')).toBeVisible()
  const calls = await page.evaluate(() => (window as unknown as { __tgCalls: string[] }).__tgCalls)
  expect(calls).toContain('ready')
  expect(calls).toContain('expand')
  // Rustam aka hands over the paper form; the Telegram first name is already written in.
  await startRun(page)
  await page.evaluate(() => window.__game.setSpeed(8))
  await expect(page.getByText(ui('form.title'))).toBeVisible({ timeout: 45_000 })
  await expect(page.getByRole('textbox')).toHaveValue('Aziz')
})

test('accept warning → title → night 1 on the landing → form → Rustam speaks → reload resumes', async ({
  page,
}) => {
  await page.goto('/?debug=1')
  await acceptWarning(page)
  await expect(page.getByRole('heading', { name: '3:17' })).toBeVisible()
  await page.getByRole('button', { name: ui('title.new_game') }).click()
  await expect(page.locator('.game-area')).toBeVisible()
  // No menus, no Continue, no narration while playing.
  await expect(page.locator('.game-area .choices, .narration')).toHaveCount(0)
  await signForm(page, 'Dilnoza')
  await expect(page.getByText(line('N1-01'))).toBeVisible({ timeout: 10_000 })
  expect(await page.evaluate(() => window.__game.getState()?.profile?.name)).toBe('Dilnoza')
  // Reload: the run resumes at the start of its night with what the player has done.
  await page.reload()
  await page.getByRole('button', { name: ui('common.continue') }).click()
  await expect(page.locator('.game-area')).toHaveAttribute('data-sequence', 'n1')
  expect(await page.evaluate(() => window.__game.getState()?.profile?.name)).toBe('Dilnoza')
})

test('pause menu is reachable and quit returns to title', async ({ page }) => {
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.getByRole('button', { name: ui('common.pause') }).click()
  await expect(page.getByRole('heading', { name: ui('pause.title'), exact: true })).toBeVisible()
  await page.getByRole('button', { name: ui('common.to_menu') }).click()
  await expect(page.getByRole('button', { name: ui('title.new_game') })).toBeVisible()
})

test('settings persist across reload', async ({ page }) => {
  await page.goto('/')
  await acceptWarning(page)
  await page.getByRole('button', { name: ui('common.settings') }).click()
  await page.getByRole('button', { name: /^L$/ }).click()
  await page.reload()
  await page.getByRole('button', { name: ui('common.settings') }).click()
  await expect(page.getByRole('button', { name: /^L$/ })).toHaveClass(/active/)
})

test('resizing / rotating does not break layout or the running night', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  const clock = await page.evaluate(() => window.__game.getClock())
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.game-area')).toHaveAttribute('data-sequence', 'n1')
  await page.setViewportSize({ width: 800, height: 1200 })
  await expect(page.locator('.game-area')).toHaveAttribute('data-sequence', 'n1')
  expect(await page.evaluate(() => window.__game.getClock())).not.toBeNull()
  expect(clock).not.toBeNull()
  expect(await page.evaluate(() => window.__game.getState()?.profile?.name)).toBe('Dilnoza')
})

test('window.__game exists only in debug mode', async ({ page }) => {
  await page.goto('/')
  expect(await page.evaluate(() => '__game' in window)).toBe(false)
  await page.goto('/?debug=1')
  await expect(page.locator('.debug-overlay')).toBeVisible()
  expect(
    await page.evaluate(() => typeof (window as unknown as Record<string, unknown>)['__game']),
  ).toBe('object')
  expect(await page.evaluate(() => window.__game.getState())).toBeNull()
})
