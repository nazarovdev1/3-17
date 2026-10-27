// F3 evidence: the rebuilt flat in HD (?quality=ultra), one shot per place.
// Run: npx playwright test -c audit/playwright.audit.config.ts f3
import { expect, test, type Page } from '@playwright/test'

const OUT = 'audit/screenshots/f3'
type Api = {
  goTo: (id: string) => void
  getDesktopState: () => { frames: number; worldReady: boolean }
}

const SHOTS: [name: string, node: string, drag: number, view?: string][] = [
  ['01-room', 'n1_hub', 0],
  ['02-room-sofa', 'n1_hub', -330],
  ['03-room-tv', 'n1_hub', 330],
  ['04-kitchen', 'n1_tea', 0],
  ['04b-kitchen-stove', 'n1_tea', 0, 'app-inspect'],
  ['05-bathroom', 'n2_mirror', 0],
  ['05b-bathroom-tub', 'n2_mirror', -1000],
  ['05c-bathroom-fixtures', 'n2_mirror', 0, 'bath-inspect'],
  ['06-corridor', 'n3_corridor_loop', 0],
  ['06b-hall-fixtures', 'n3_corridor_loop', 0, 'fixtures'],
  ['07-landing', 'n2_day_start', 0],
  ['07b-landing-doors', 'n2_day_start', 0, 'neighbours'],
  ['07c-landing-stairs', 'n2_day_start', 0, 'stairs'],
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
  await page.goto('/?debug=1&quality=ultra&render=still')
  await page.locator('input[type=checkbox]').last().check()
  await page.locator('.panel button').last().click()
  await page.locator('.menu button').first().click()
  await page.getByRole('textbox').fill('Dilnoza')
  await page.locator('.panel > button').last().click()
  await page.locator('.desktop-view canvas').waitFor({ timeout: 120_000 })
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (window as unknown as { __game: Api }).__game.getDesktopState().worldReady,
        ),
      { timeout: 120_000 },
    )
    .toBe(true)
  await page.addStyleTag({
    content:
      '.debug-overlay,.desktop-hud,.desktop-topline,.crosshair,.interaction-prompt{display:none!important}',
  })
}

test('f3 flat shots', async ({ page }) => {
  test.setTimeout(3_600_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await boot(page)
  const selected = process.env.F3_SHOTS?.split(',')
  for (const [name, node, drag, view] of SHOTS.filter(
    ([name]) => !selected || selected.includes(name),
  )) {
    await page.evaluate((camera) => {
      const url = new URL(window.location.href)
      if (camera) url.searchParams.set('auditView', camera)
      else url.searchParams.delete('auditView')
      history.replaceState(null, '', url)
    }, view)
    // Consecutive room shots otherwise retain the previous drag yaw.
    await page.evaluate(
      (id) => (window as unknown as { __game: Api }).__game.goTo(id),
      node === 'n2_day_start' ? 'n1_hub' : 'n2_day_start',
    )
    await page.waitForTimeout(250)
    await page.evaluate((id) => (window as unknown as { __game: Api }).__game.goTo(id), node)
    await expect(page.locator('.desktop-game')).toHaveAttribute('data-node', node)
    await page.waitForTimeout(1500)
    if (drag) {
      // Stills need a camera pose, not a timed input test. Batch the drag so every
      // intermediate pointer position does not wait for another full HD software frame.
      await page.evaluate((distance) => {
        const canvas = document.querySelector('.desktop-view canvas')!
        canvas.dispatchEvent(
          new PointerEvent('pointerdown', { clientX: 720, clientY: 450, bubbles: true }),
        )
        window.dispatchEvent(
          new PointerEvent('pointermove', { clientX: 720 + distance, clientY: 450 }),
        )
        window.dispatchEvent(new PointerEvent('pointerup'))
      }, drag)
    }
    // Let shadows, AO and the door animations settle (software GL is slow).
    await page.waitForTimeout(9000)
    await page.screenshot({ path: `${OUT}/${name}.png` })
  }
  expect(errors).toEqual([])
})
