// F4 evidence: the figure where the story allows it (src/presenters/desktop/figure.ts).
// Run: npx playwright test -c audit/playwright.audit.config.ts f4
import { expect, test, type Page } from '@playwright/test'

const OUT = 'audit/screenshots/f4'
type Api = {
  goTo: (id: string) => void
  getDesktopState: () => { worldReady: boolean; figure: string }
}

/**
 * name, nodes visited in order (the last one is shot), audit camera, expected appearance,
 * torch switched off by hand (F) before the shot.
 */
type Shot = [
  name: string,
  nodes: string[],
  view: string,
  figure: string,
  dark?: boolean,
  peek?: boolean,
]
const SHOTS: Shot[] = [
  ['01-under-door', ['n4_start', 'n4_317', 'n4_hub'], 'door-gap', 'under_door', true],
  ['02-frosted-glass', ['n3_start', 'n3_corridor_loop'], 'kitchen-glass', 'frosted'],
  ['03-peephole', ['n4_start', 'n4_317', 'n4_peephole'], '', 'peephole'],
  ['04-stairwell', ['n1_hub', 'n2_day_start'], '', 'stairwell'],
  ['05-tv-reflection', ['n3_start', 'n3_tv'], 'tv-screen', 'tv_reflection'],
  ['06-phone', ['n1_start', 'n1_hub', 'n1_phone'], '', ''],
  ['07-phone-message', ['n2_night_hub', 'n2_phone', 'n2_message'], '', ''],
  ['08-diary', ['n2_night_hub', 'n2_wardrobe'], '', ''],
  ['09-coat', ['n3_start', 'n3_hub'], 'hall-coat', ''],
  ['09b-chair', ['n5_start'], '', ''],
  ['10-footprints', ['n4_start', 'n4_317', 'n4_peephole', 'n4_hub'], 'prints', ''],
  // Night 5, the voice says "open the door": an eye to the peephole by choice (E).
  [
    '11-peephole-close',
    ['n5_start', 'n5_317', 'n5_voice_final'],
    'door-front',
    'under_door',
    false,
    true,
  ],
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
  await page.goto('/?debug=1&quality=ultra&render=still&figureHold=1')
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
      {
        timeout: 120_000,
      },
    )
    .toBe(true)
  await page.addStyleTag({
    content:
      '.debug-overlay,.desktop-hud,.desktop-topline,.crosshair,.interaction-prompt{display:none!important}',
  })
}

test('f4 figure shots', async ({ page }) => {
  test.setTimeout(3_600_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await boot(page)
  const selected = process.env.F4_SHOTS?.split(',')
  for (const [name, nodes, view, figure, dark, peek] of SHOTS.filter(
    ([n]) => !selected || selected.includes(n),
  )) {
    await page.evaluate((camera) => {
      const url = new URL(window.location.href)
      if (camera) url.searchParams.set('auditView', camera)
      else url.searchParams.delete('auditView')
      history.replaceState(null, '', url)
    }, view)
    for (const node of nodes) {
      await page.evaluate((id) => (window as unknown as { __game: Api }).__game.goTo(id), node)
      await page.waitForTimeout(400)
    }
    await expect(page.locator('.desktop-game')).toHaveAttribute('data-node', nodes.at(-1)!)
    await expect
      .poll(
        () =>
          page.evaluate(
            () => (window as unknown as { __game: Api }).__game.getDesktopState().figure,
          ),
        {
          timeout: 60_000,
        },
      )
      .toBe(figure)
    if (dark) await page.keyboard.press('f')
    if (peek) {
      await page.waitForTimeout(1500)
      await page.keyboard.press('e')
    }
    await page.waitForTimeout(9000)
    await page.screenshot({ path: `${OUT}/${name}.png` })
    if (peek) await page.keyboard.press('e')
    if (dark) await page.keyboard.press('f')
  }
  expect(errors).toEqual([])
})
