// Phase F0 audit capture. Not part of the game or the regular E2E suite.
// Run: npx playwright test -c audit/playwright.audit.config.ts
import { expect, test, type Page } from '@playwright/test'
import { story } from '../src/content/story'

const OUT = 'audit/screenshots'
type Api = {
  goTo: (id: string) => void
  getScreen: () => string
}
const api = (page: Page, fn: string, arg?: unknown) =>
  page.evaluate(
    ([fn, arg]) =>
      (window as unknown as { __game: Record<string, (a?: unknown) => unknown> }).__game[
        fn as string
      ]!(arg),
    [fn, arg] as const,
  )

async function shell(page: Page, dir: string) {
  await page.goto('/?debug=1')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${dir}/00-warning.png` })
  await page.getByRole('checkbox', { name: 'Buni oʻqidim, davom etaman' }).check()
  await page.getByRole('button', { name: 'Davom etish' }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${dir}/01-title.png` })
  await page.getByRole('button', { name: 'Sozlamalar' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/${dir}/02-settings.png`, fullPage: true })
  await page.goBack().catch(() => {})
  await page.goto('/?debug=1')
  await page.getByRole('button', { name: 'Yangi oʻyin' }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${dir}/03-form.png`, fullPage: true })
  await page.getByRole('textbox').fill('Dilnoza')
  await page.getByRole('button', { name: 'Imzolash' }).click()
  await page.addStyleTag({ content: '.debug-overlay { display:none !important }' })
}

async function beats(page: Page, dir: string, root: string) {
  let i = 10
  for (const node of Object.values(story.nodes)) {
    await api(page, 'goTo', node.id)
    if (!node.ending) {
      await expect(page.locator(root)).toHaveAttribute('data-node', node.id, { timeout: 10_000 })
      const narration = page.locator('.narration').first()
      if (await narration.isVisible()) await narration.click().catch(() => {})
    }
    await page.waitForTimeout(node.ending ? 2500 : 900)
    await page.screenshot({ path: `${OUT}/${dir}/${String(i++).padStart(3, '0')}-${node.id}.png` })
  }
}

test('desktop 1440x900', async ({ browser }) => {
  test.setTimeout(900_000)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.route('https://telegram.org/js/telegram-web-app.js', (r) =>
    r.fulfill({ body: '', contentType: 'application/javascript' }),
  )
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'desktop', reduceFlashing: true }))
    HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('audit'))
  })
  await shell(page, 'desktop-1440')
  await expect(page.locator('.desktop-view canvas')).toBeVisible()
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT}/desktop-1440/04-first-frame.png` })
  // Look around each location (4 directions via drag-look).
  const spots = [
    'n1_hub',
    'n1_window',
    'n1_tea',
    'n2_mirror',
    'n2_day_start',
    'n3_corridor_loop',
    'n4_door48',
    'n4_inside48',
  ]
  for (const id of spots) {
    await api(page, 'goTo', id)
    await page.waitForTimeout(800)
    await page
      .locator('.narration')
      .first()
      .click()
      .catch(() => {})
    for (let d = 0; d < 4; d++) {
      await page.screenshot({ path: `${OUT}/desktop-1440/05-look-${id}-${d * 90}.png` })
      await page.mouse.move(1000, 300)
      await page.mouse.down()
      await page.mouse.move(600, 300, { steps: 10 })
      await page.mouse.up()
      await page.waitForTimeout(600)
    }
  }
  await beats(page, 'desktop-1440', '.desktop-game')
})

for (const [w, h] of [
  [390, 844],
  [360, 640],
] as const)
  test(`mobile ${w}x${h}`, async ({ browser }) => {
    test.setTimeout(900_000)
    const context = await browser.newContext({
      viewport: { width: w, height: h },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()
    await page.route('https://telegram.org/js/telegram-web-app.js', (r) =>
      r.fulfill({ body: '', contentType: 'application/javascript' }),
    )
    await page.addInitScript(() => {
      localStorage.setItem(
        'g317:settings',
        JSON.stringify({ mode: 'mobile', reduceFlashing: true }),
      )
    })
    const dir = `mobile-${w}`
    await shell(page, dir)
    await beats(page, dir, '.mobile-game')
  })

void ({} as Api)
