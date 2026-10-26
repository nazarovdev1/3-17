// F2 evidence: the asset bench (every model at real scale, every surface swatch).
// Run: npx playwright test -c audit/playwright.audit.config.ts assets
import { test } from '@playwright/test'

const OUT = 'audit/screenshots/f2'

const BENCH = [
  ['models', 'bench-models', ''],
  ['surfaces', 'bench-surfaces', ''],
  ['models', 'closeup', '&cam=-3.3,1.5,3.4&target=-4.4,0.6,-0.2'],
] as const

for (const [view, name, extra] of BENCH) {
  test(`asset bench: ${name}`, async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.route('https://telegram.org/js/telegram-web-app.js', (r) =>
      r.fulfill({ body: '', contentType: 'application/javascript' }),
    )
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto(`/?assetview=1&view=${view}${extra}`)
    await page.locator(`[data-assetview="${view}"] canvas`).waitFor()
    await page.waitForTimeout(12_000)
    await page.screenshot({ path: `${OUT}/${name}.png` })
    if (errors.length) throw new Error(errors.join('\n'))
  })
}

async function bootDesktop(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route('https://telegram.org/js/telegram-web-app.js', (r) =>
    r.fulfill({ body: '', contentType: 'application/javascript' }),
  )
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'desktop', reduceFlashing: true }))
    sessionStorage.setItem('g317:controls', '1')
  })
}

test('loading screen: mid-progress and error', async ({ page }) => {
  test.setTimeout(120_000)
  await bootDesktop(page)
  // Let roughly the first third through; the rest stalls and fails.
  let served = 0
  await page.route(/\/assets\/(models|textures|hdri)\//, async (route) => {
    if (served++ < 9) return route.continue()
    // Held, then dropped: the screen shows partial progress first, then the error.
    await new Promise((r) => setTimeout(r, 4000))
    return route.abort('failed')
  })
  await page.goto('/')
  await page.locator('input[type=checkbox]').last().check()
  await page.locator('.panel button').last().click()
  await page.locator('.menu button').first().click()
  await page.getByRole('textbox').fill('Dilnoza')
  await page.locator('.panel > button').last().click()
  await page.getByRole('progressbar').waitFor()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/loading-progress.png` })
  await page.getByRole('alert').waitFor({ timeout: 30_000 })
  await page.screenshot({ path: `${OUT}/loading-error.png` })
})

test('settings credits', async ({ page }) => {
  await bootDesktop(page)
  await page.goto('/')
  await page.locator('input[type=checkbox]').last().check()
  await page.locator('.panel button').last().click()
  await page.getByRole('button', { name: 'Sozlamalar' }).click()
  await page.getByRole('button', { name: 'Mualliflar va litsenziyalar' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/credits.png` })
})
