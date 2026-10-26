// F3 evidence: the rebuilt flat in HD (?quality=ultra), one shot per place.
// Run: npx playwright test -c audit/playwright.audit.config.ts f3
import { expect, test, type Page } from '@playwright/test'

const OUT = 'audit/screenshots/f3'
type Api = { goTo: (id: string) => void; getDesktopState: () => { frames: number } }

const SHOTS: [name: string, node: string, drag: number][] = [
  ['01-room', 'n1_hub', 0],
  ['02-room-sofa', 'n1_hub', -330],
  ['03-room-tv', 'n1_hub', 330],
  ['04-kitchen', 'n1_tea', 0],
  ['05-bathroom', 'n2_mirror', 0],
  ['06-corridor', 'n3_corridor_stop', 0],
  ['07-landing', 'n2_day_start', 0],
  ['08-flat48', 'n4_inside48', 0],
  ['09-window', 'n1_window', 0],
  ['10-outage', 'n1_317', 0],
]

async function boot(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route('https://telegram.org/js/telegram-web-app.js', (r) =>
    r.fulfill({ body: '', contentType: 'application/javascript' }),
  )
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'desktop', reduceFlashing: true }))
    sessionStorage.setItem('g317:controls', '1')
    HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('drag'))
  })
  await page.goto('/?debug=1&quality=ultra')
  await page.locator('input[type=checkbox]').last().check()
  await page.locator('.panel button').last().click()
  await page.locator('.menu button').first().click()
  await page.getByRole('textbox').fill('Dilnoza')
  await page.locator('.panel > button').last().click()
  await page.locator('.desktop-view canvas').waitFor({ timeout: 120_000 })
  await page.addStyleTag({
    content: '.debug-overlay,.desktop-hud,.desktop-topline,.crosshair,.interaction-prompt{display:none!important}',
  })
}

test('f3 flat shots', async ({ page }) => {
  test.setTimeout(1_200_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await boot(page)
  for (const [name, node, drag] of SHOTS) {
    await page.evaluate((id) => (window as unknown as { __game: Api }).__game.goTo(id), node)
    await expect(page.locator('.desktop-game')).toHaveAttribute('data-node', node)
    await page.waitForTimeout(1500)
    if (drag) {
      await page.mouse.move(720, 450)
      await page.mouse.down()
      await page.mouse.move(720 + drag, 450, { steps: 12 })
      await page.mouse.up()
    }
    // Let shadows, AO and the door animations settle (software GL is slow).
    await page.waitForTimeout(9000)
    await page.screenshot({ path: `${OUT}/${name}.png` })
  }
  expect(errors).toEqual([])
})
