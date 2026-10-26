import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { startNamedRun } from './helpers'
import { story } from '../../src/content/story'
import type { getDesktopState } from '../../src/platform/device/desktopRuntime'

type Metrics = ReturnType<typeof getDesktopState>
interface DebugApi {
  getDesktopState: () => Metrics
  goTo: (id: string) => void
  getState: () => {
    currentNodeId: string
    sanity: number
    inventory: string[]
    flags: Record<string, unknown>
  }
}
const inspect = (page: Page) =>
  page.evaluate(() => (window as unknown as { __game: DebugApi }).__game.getDesktopState())
const jump = (page: Page, id: string) =>
  page.evaluate((id) => (window as unknown as { __game: DebugApi }).__game.goTo(id), id)
async function boot(page: Page) {
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.addStyleTag({ content: '.debug-overlay { display:none }' })
  await expect(page.locator('.desktop-view canvas')).toBeVisible()
  await expect.poll(async () => (await inspect(page)).frames).toBeGreaterThan(1)
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  ;(page as unknown as { errors: string[] }).errors = errors
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'desktop', reduceFlashing: true }))
    sessionStorage.setItem('g317:controls', '1')
  })
})
test.afterEach(({ page }) => expect((page as unknown as { errors: string[] }).errors).toEqual([]))

const preferences = [
  /choy/i,
  /Sahifa|qogʻoz|daftar|varag|Gilam|shkafini/,
  /Kozachokka/,
  /48-xonadonga/,
  /kalendarg/,
  /Stuldagi/,
  /Chuqurroq/,
  /Dahliga chiqish/,
  /Hammomni/,
  /oynaga qarash/,
  /Oshxonaga borish/,
  /Soatni diqqat/,
  /Soat ostidagi/,
  /Javob bermaslik|umuman javob|Jim/,
  /Toʻxtab/,
  /Uxlash|Toʻshak|Qolish|3:17/,
  /Davom etish/,
  /Kutish/,
]
for (const ending of ['A', 'B', 'C'] as const)
  test(`desktop real-input ending ${ending}`, async ({ page }) => {
    test.setTimeout(180_000)
    await boot(page)
    const final =
      ending === 'C' ? /Soatni oʻrash/ : ending === 'B' ? /chiqib ketish/ : /Eshikni ochish/
    const seen = new Set<string>()
    const visited = new Set<string>()
    let night = ''
    for (let i = 0; i < 250; i++) {
      const title = page.getByRole('heading', {
        name: { A: 'Qoʻshni', B: 'Ketish', C: '3:18' }[ending],
        exact: true,
      })
      if (await title.isVisible()) {
        if (ending === 'C') {
          expect([...new Set([...visited].map((id) => id.slice(0, 2)))].sort()).toEqual([
            'n1',
            'n2',
            'n3',
            'n4',
            'n5',
          ])
          expect(visited.has('n3_room_return')).toBe(true)
          await expect(page.locator('.ending-narration')).toContainText('Dunyo davom etdi.')
          await test.info().attach('desktop-five-night-route', {
            body: JSON.stringify([...visited]),
            contentType: 'application/json',
          })
          await page.screenshot({ path: 'tests/screenshots/phase7-ending-C-desktop.png' })
        }
        return
      }
      const game = page.locator('.desktop-game')
      await expect(game).toBeVisible()
      const node = (await game.getAttribute('data-node')) ?? ''
      if (!visited.has(node) && ending === 'C') {
        await game.locator('.narration').click()
        if (node.endsWith('_317') || node === 'n4_glitch' || node === 'n3_room_return')
          await page.waitForTimeout(600)
      }
      visited.add(node)
      if (node.slice(0, 2) !== night) {
        night = node.slice(0, 2)
        seen.clear()
      }
      const buttons = game.locator('.desktop-hud .choices button')
      const labels = await buttons.evaluateAll((items) =>
        items.map((item) => (item.textContent ?? '').replace(/^\d+\.\s*/, '')),
      )
      const fresh = labels
        .map((label, index) => ({ label, index }))
        .filter(({ label }) => !seen.has(label))
      let pool = fresh.length ? fresh : labels.map((label, index) => ({ label, index }))
      if (ending === 'C' && pool.length > 1) {
        const safe = pool.filter(
          ({ label }) =>
            !/televizor|tinglash|buyumlaringiz|Yugurib|Javob berish|Sardormisan|Nega men/i.test(
              label,
            ),
        )
        if (safe.length) pool = safe
      }
      let target = pool[0]!
      for (const re of [final, ...preferences]) {
        const match = pool.find(({ label }) => re.test(label))
        if (match) {
          target = match
          break
        }
      }
      seen.add(target.label)
      await buttons.nth(target.index).click()
    }
    throw new Error(`Ending ${ending} not reached`)
  })

const sceneNodes = [
  'n1_hub',
  'n1_tea',
  'n2_mirror',
  'n3_corridor_loop',
  'n1_window',
  'n2_day_start',
  'n4_inside48',
  'n4_peephole',
]
for (const id of sceneNodes)
  test(`desktop scene evidence ${id}`, async ({ page }) => {
    await boot(page)
    await jump(page, id)
    await expect(page.locator('.desktop-game')).toHaveAttribute('data-node', id)
    await page.locator('.narration').click()
    await page.waitForTimeout(400)
    await page.screenshot({
      path: `tests/screenshots/desktop-${story.nodes[id]!.mobile?.vignette === 'window' ? 'balcony' : story.nodes[id]!.location}${id === 'n4_peephole' ? '-peephole' : ''}.png`,
    })
  })
test('native pointer lock, movement, flashlight, pause and keyboard choices', async ({ page }) => {
  await boot(page)
  await page.locator('.desktop-view canvas').click({ position: { x: 700, y: 350 } })
  await expect.poll(async () => await page.evaluate(() => !!document.pointerLockElement)).toBe(true)
  await page.keyboard.down('w')
  await page.waitForTimeout(500)
  await page.keyboard.up('w')
  expect((await inspect(page)).position[2]).toBeLessThan(0)
  const initial = (await inspect(page)).flashlight
  await page.keyboard.press('f')
  await expect.poll(async () => (await inspect(page)).flashlight).toBe(!initial)
  await page.keyboard.press('Escape')
  await expect(page.getByText('PAUZA', { exact: true })).toBeVisible()
  await expect
    .poll(async () => await page.evaluate(() => !!document.pointerLockElement))
    .toBe(false)
  await page.getByRole('button', { name: 'Davom etish', exact: true }).last().click()
  await page
    .locator('.desktop-hud .choices button')
    .getByText('Davom etish', { exact: true })
    .click()
  await page.keyboard.press('1')
  await expect(page.locator('.desktop-game')).toHaveAttribute('data-node', 'n1_clock')
})

test('rejected pointer lock uses drag look; E interacts with the clock; corridor grows out of view', async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () =>
      Promise.reject(new Error('Pointer lock unavailable in this webview'))
  })
  await boot(page)
  await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
  await page.keyboard.down('w')
  await page.waitForTimeout(600)
  await page.keyboard.up('w')
  await page.mouse.move(720, 350)
  await page.mouse.down()
  await page.mouse.move(520, 350, { steps: 8 })
  await page.mouse.up()
  await expect.poll(async () => (await inspect(page)).yaw).toBeGreaterThan(0.3)
  await expect
    .poll(async () => await page.locator('.interaction-prompt').textContent())
    .toContain('soat')
  await page.keyboard.press('e')
  await expect(page.locator('.desktop-game')).toHaveAttribute('data-node', 'n1_clock')
  await jump(page, 'n3_corridor_loop')
  await page.waitForTimeout(200)
  const before = (await inspect(page)).corridorLength
  await page.mouse.move(720, 350)
  await page.mouse.down()
  await page.mouse.move(60, 350, { steps: 15 })
  await page.mouse.up()
  await expect.poll(async () => (await inspect(page)).corridorLength).toBeGreaterThan(before)
})

test('WebGL restores or falls back without changing story state', async ({ page }) => {
  await boot(page)
  await jump(page, 'n1_clock')
  const saved = await page.evaluate(() =>
    (window as unknown as { __game: DebugApi }).__game.getState(),
  )
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.desktop-view canvas')!
    const extension = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!
    ;(window as unknown as { lostGL: WEBGL_lose_context }).lostGL = extension
    extension.loseContext()
  })
  await expect.poll(async () => (await inspect(page)).context).toBe('lost')
  await page.evaluate(() =>
    (window as unknown as { lostGL: WEBGL_lose_context }).lostGL.restoreContext(),
  )
  await expect.poll(async () => (await inspect(page)).context).toBe('restored')
  await expect(page.locator('.desktop-game')).toBeVisible()
  expect(
    await page.evaluate(() => (window as unknown as { __game: DebugApi }).__game.getState()),
  ).toEqual(saved)
  await page.evaluate(() =>
    (window as unknown as { lostGL: WEBGL_lose_context }).lostGL.loseContext(),
  )
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-node', 'n1_clock', {
    timeout: 8000,
  })
  expect(
    await page.evaluate(() => (window as unknown as { __game: DebugApi }).__game.getState()),
  ).toEqual(saved)
  await page.setViewportSize({ width: 1450, height: 900 })
  await expect(page.locator('.mobile-game')).toBeVisible()
})

test('sustained low FPS drops quality then keeps the story in mobile', async ({ page }) => {
  test.setTimeout(40_000)
  await page.addInitScript(() => {
    const nativeRAF = window.requestAnimationFrame.bind(window)
    const cancel = window.cancelAnimationFrame.bind(window)
    const timers = new Map<number, number>()
    window.requestAnimationFrame = (callback) => {
      const id = nativeRAF(() => {
        timers.set(
          id,
          window.setTimeout(() => {
            timers.delete(id)
            callback(performance.now())
          }, 75),
        )
      })
      return id
    }
    window.cancelAnimationFrame = (id) => {
      cancel(id)
      const timer = timers.get(id)
      if (timer) clearTimeout(timer)
      timers.delete(id)
    }
  })
  await boot(page)
  await expect(page.locator('.desktop-game')).toHaveAttribute('data-tier', 'low', {
    timeout: 14000,
  })
  await expect.poll(async () => (await inspect(page)).renderHeight).toBe(320)
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-node', 'n1_start', {
    timeout: 14000,
  })
})

test('mobile selection never downloads desktop code or remote assets', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'mobile' }))
  })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await expect(page.locator('.mobile-game')).toBeVisible()
  await page.waitForTimeout(800)
  expect(requests.filter((url) => /DesktopPresenter|desktop-3d/.test(url))).toEqual([])
  expect(
    requests.filter(
      (url) =>
        !url.startsWith('http://localhost:4173/') &&
        url !== 'https://telegram.org/js/telegram-web-app.js',
    ),
  ).toEqual([])
})

test('WebGL 1 alone falls back to a playable mobile scene', async ({ page }) => {
  await page.addInitScript(() => {
    const native = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext')!
      .value as (this: HTMLCanvasElement, id: string, options?: unknown) => unknown
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, id: string, options?: unknown) {
        return id === 'webgl2' ? null : Reflect.apply(native, this, [id, options])
      },
    })
  })
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-node', 'n1_start')
  await page.addStyleTag({ content: '.debug-overlay { display:none }' })
  await page.getByRole('button', { name: /Tasvir yengil rejimga/ }).click()
  await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-node', 'n1_hub')
})
