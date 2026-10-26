// F1 font evidence: the same beat at desktop 1440×900 and mobile 360×640, plus a glyph sheet.
// Run: npx playwright test -c audit/playwright.audit.config.ts fonts
import { expect, test, type Browser } from '@playwright/test'

const OUT = 'audit/screenshots/f1'
const NODE = 'n1_start'

async function shot(browser: Browser, mode: 'desktop' | 'mobile', w: number, h: number) {
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: mode === 'mobile' ? 2 : 1,
    isMobile: mode === 'mobile',
    hasTouch: mode === 'mobile',
  })
  const page = await context.newPage()
  await page.route('https://telegram.org/js/telegram-web-app.js', (r) =>
    r.fulfill({ body: '', contentType: 'application/javascript' }),
  )
  await page.addInitScript((m) => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: m, reduceFlashing: true }))
    sessionStorage.setItem('g317:controls', '1')
  }, mode)
  await page.goto('/?debug=1')
  await page.locator('input[type=checkbox]').last().check()
  await page.locator('.panel button').last().click()
  await page.locator('.menu button').first().click()
  await page.getByRole('textbox').fill('Dilnoza')
  await page.locator('.panel > button').last().click()
  await page.addStyleTag({ content: '.debug-overlay{display:none!important}' })
  await page.evaluate(
    (id) => (window as unknown as { __game: { goTo: (id: string) => void } }).__game.goTo(id),
    NODE,
  )
  await expect(page.locator(`[data-node="${NODE}"]`)).toBeVisible()
  await page.locator('.narration').first().click()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(mode === 'desktop' ? 2500 : 800)
  await page.screenshot({ path: `${OUT}/${mode}-${w}x${h}.png` })
  await context.close()
}

test('font evidence', async ({ browser }) => {
  test.setTimeout(180_000)
  await shot(browser, 'desktop', 1440, 900)
  await shot(browser, 'mobile', 360, 640)
  // Glyph sheet rendered by the game's own bundled fonts.
  const context = await browser.newContext({ viewport: { width: 720, height: 300 } })
  const page = await context.newPage()
  await page.route('https://telegram.org/js/telegram-web-app.js', (r) =>
    r.fulfill({ body: '', contentType: 'application/javascript' }),
  )
  await page.goto('/')
  await page.evaluate(() => {
    document.body.innerHTML = ''
    const sheet = document.createElement('div')
    sheet.style.cssText = 'position:fixed;inset:0;background:#0b0b0c;color:#cfc6b0;padding:24px'
    for (const [family, label] of [
      ['Literata', 'Literata — hikoya'],
      ['Inter', 'Inter — interfeys'],
    ]) {
      const p = document.createElement('p')
      p.style.cssText = `font-family:"${family}";font-size:30px;margin:0 0 6px`
      p.textContent = 'Qoʻshni · gʻalati · oʻn yetti · e’tibor · ma’no'
      const l = document.createElement('p')
      l.style.cssText = 'font-family:Inter;font-size:14px;opacity:.6;margin:0 0 22px'
      l.textContent = `${label}: ʻ (U+02BB) va ’ (U+2019)`
      sheet.append(p, l)
    }
    document.body.appendChild(sheet)
  })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/glyphs.png` })
  await context.close()
})
