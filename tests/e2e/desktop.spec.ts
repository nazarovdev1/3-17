import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { acceptWarning, startNamedRun } from './helpers'
import type { getDesktopState } from '../../src/platform/device/desktopRuntime'
import { ui } from '../../src/content/text'
import { objectPoint } from '../../src/content/world/objects'

type Metrics = ReturnType<typeof getDesktopState>
const inspect = (page: Page): Promise<Metrics> =>
  page.evaluate(() => window.__game.getDesktopState() as unknown as Metrics)

async function boot(page: Page) {
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await page.addStyleTag({ content: '.debug-overlay { display:none }' })
  await expect(page.locator('.desktop-view canvas')).toBeVisible()
  await expect.poll(async () => (await inspect(page)).frames).toBeGreaterThan(1)
  await expect.poll(async () => (await inspect(page)).worldReady, { timeout: 30_000 }).toBe(true)
}

/** Turns the head (drag look) toward a point; with a height, the eyes go up or down too. */
async function face(page: Page, x: number, z: number, y?: number) {
  for (let i = 0; i < 8; i++) {
    const view = await inspect(page)
    const [px, py, pz] = view.position as [number, number, number]
    const yaw = Math.atan2(px - x, pz - z)
    let turn = yaw - view.yaw
    turn = Math.atan2(Math.sin(turn), Math.cos(turn))
    const pitch = y === undefined ? view.pitch : Math.atan2(y - py, Math.hypot(x - px, z - pz))
    const tilt = pitch - view.pitch
    if (Math.abs(turn) < 0.04 && Math.abs(tilt) < 0.04) return
    await page.mouse.move(720, 350)
    await page.mouse.down()
    // At most ~1.2 rad per drag, so the pointer never leaves the window.
    const step = Math.max(-1.2, Math.min(1.2, turn))
    await page.mouse.move(720 - step / 0.0024, 350 - tilt / 0.0024, { steps: 8 })
    await page.mouse.up()
  }
}

/** Walks on real keys toward a floor point, turning as it goes. */
async function walkTo(page: Page, x: number, z: number, within = 0.35) {
  const distance = async () => {
    const p = (await inspect(page)).position
    return Math.hypot(p[0]! - x, p[2]! - z)
  }
  for (let leg = 0; leg < 12 && (await distance()) > within; leg++) {
    await face(page, x, z)
    await page.keyboard.down('w')
    await page.waitForTimeout(Math.min(1200, (await distance()) * 450))
    await page.keyboard.up('w')
  }
  const where = (await inspect(page)).position.map((v) => v.toFixed(2)).join(',')
  const sequence = await page.evaluate(() => window.__game.getSequence())
  expect(await distance(), `walking to ${x},${z}: at ${where} in ${sequence}`).toBeLessThan(
    within + 0.3,
  )
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
  })
})
test.afterEach(({ page }) => expect((page as unknown as { errors: string[] }).errors).toEqual([]))

/** Night 5 at speed until the voice has asked for the door; then real time, real keys. */
async function nightFive(page: Page, eligibleForC = false) {
  // Drag look (as in a webview without pointer lock) keeps the scripted turns exact.
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () =>
      Promise.reject(new Error('Pointer lock unavailable in this webview'))
  })
  await boot(page)
  await page.evaluate((c) => {
    const g = window.__game
    g.startNight(5)
    if (c) {
      const run = g.getState()!
      for (let i = 1; i <= 7; i++) run.inventory.push(`diary_${i}`)
      for (let i = 1; i <= 5; i++) run.inventory.push(`mom_msg_${i}`)
    }
    g.setSpeed(16)
  }, eligibleForC)
  await expect
    .poll(async () => page.evaluate(() => !!window.__game.getState()?.flags['open_the_door']), {
      timeout: 60_000,
    })
    .toBe(true)
  await page.evaluate(() => window.__game.setSpeed(1))
}
const endingSeen = (page: Page, id: string) =>
  expect
    .poll(async () => page.evaluate(() => window.__game.getScreen()), { timeout: 90_000 })
    .toBe('gallery')
    .then(async () =>
      expect(page.getByText(ui(`endings.${id}.title`), { exact: true })).toBeVisible(),
    )

test('desktop real-input ending B: unchain, walk out and down the stairs', async ({ page }) => {
  test.setTimeout(240_000)
  await nightFive(page)
  // Out of the room, along the corridor, past the shoe rack and coat hooks to the door.
  await walkTo(page, 0.1, 1.5)
  await walkTo(page, 0.15, 2.6, 0.2)
  await walkTo(page, 0.3, 3.4, 0.25)
  await walkTo(page, 0.1, 4.3)
  await face(page, 0, 4.69, 1.4)
  await page.keyboard.press('e')
  await expect
    .poll(async () => page.evaluate(() => !!window.__game.getState()?.flags['front_open']))
    .toBe(true)
  await expect
    .poll(async () => ({
      angle: ((await inspect(page)).doorAngles['front_door'] ?? 0) > 1,
      world: (await page.evaluate(() => window.__game.getWorld()))?.doors['front_door'],
    }))
    .toEqual({ angle: true, world: 'open' })
  await walkTo(page, 0.1, 5.3)
  await walkTo(page, 0.9, 6.9, 0.3)
  // The first steps down the flight are the ending.
  await walkTo(page, 0.9, 7.9, 0.3)
  await expect.poll(async () => page.evaluate(() => window.__game.getSequence())).toBe('endB')
  // The ending plays in the world: no title, no card until its last frame.
  await expect(page.getByText(ui('endings.B.title'), { exact: true })).toHaveCount(0)
  // On down: the half-landing, flight B, the 3rd floor; then out to the bus's open door.
  await walkTo(page, 0.9, 9.6, 0.3)
  await walkTo(page, 2.3, 9.6, 0.3)
  // Down flight B until the 3rd floor cuts to the yard.
  for (let leg = 0; leg < 12; leg++) {
    if (await page.evaluate(() => !!window.__game.getState()?.flags['going_out'])) break
    await face(page, 2.3, 6.6)
    await page.keyboard.down('w')
    await page.waitForTimeout(1000)
    await page.keyboard.up('w')
  }
  await expect
    .poll(async () => page.evaluate(() => !!window.__game.getState()?.flags['outside']), {
      timeout: 15_000,
    })
    .toBe(true)
  // Toward the bus's open door until the player is on board (the step in is the cut).
  for (let leg = 0; leg < 12; leg++) {
    if (await page.evaluate(() => !!window.__game.getState()?.flags['on_bus'])) break
    await face(page, 6.1, -16.0)
    await page.keyboard.down('w')
    await page.waitForTimeout(1200)
    await page.keyboard.up('w')
  }
  await expect
    .poll(async () => page.evaluate(() => !!window.__game.getState()?.flags['on_bus']))
    .toBe(true)
  await endingSeen(page, 'B')
})

test('desktop real-input ending A: across the landing, into 48', async ({ page }) => {
  test.setTimeout(300_000)
  await nightFive(page)
  await walkTo(page, 0.1, 1.5)
  await walkTo(page, 0.15, 2.6, 0.2)
  await walkTo(page, 0.3, 3.4, 0.25)
  await walkTo(page, 0.1, 4.3)
  await face(page, 0, 4.69, 1.4)
  await page.keyboard.press('e')
  // Fully out onto the landing before turning: the doorway allows no sideways step.
  await walkTo(page, 0.1, 5.7, 0.15)
  await walkTo(page, -4.2, 5.7)
  const leaf48 = (await inspect(page)).doorLeaves['front_door48']!
  await face(page, (leaf48.x0 + leaf48.x1) / 2, (leaf48.z0 + leaf48.z1) / 2)
  await page.keyboard.press('e')
  await expect.poll(async () => (await inspect(page)).doorAngles['front_door48']).toBeGreaterThan(1)
  // Over 48's threshold: that step is the ending.
  await face(page, -4.2, 4.0)
  await page.keyboard.down('w')
  await expect
    .poll(async () => page.evaluate(() => window.__game.getSequence()), { timeout: 10_000 })
    .toBe('endA')
  await page.keyboard.up('w')
  await expect.poll(async () => page.evaluate(() => window.__game.getSequence())).toBe('endA')
  await expect(page.getByText(ui('endings.A.title'), { exact: true })).toHaveCount(0)
  // Weeks later, once the light has died, the only thing left to do is knock on the wall.
  await expect
    .poll(async () => page.evaluate(() => window.__game.getWorld()?.objects['knock_prompt']), {
      timeout: 70_000,
    })
    .toBe('shown')
  await page.evaluate(() => window.__game.input({ type: 'knock3', target: 'party_wall48' }))
  await endingSeen(page, 'A')
})

test('desktop real-input ending C: the clock off the wall, the key turned', async ({ page }) => {
  test.setTimeout(240_000)
  await nightFive(page, true)
  const clock = objectPoint('clock')!
  // The clock hangs above the sofa: reached from the sofa's end, the nearest free spot.
  await walkTo(page, -0.86, -1.95, 0.25)
  await face(page, clock[0], clock[2], clock[1])
  await page.keyboard.press('e')
  await expect
    .poll(async () => page.evaluate(() => !!window.__game.getState()?.flags['clock_in_hand']))
    .toBe(true)
  await page.evaluate(() => window.__game.input({ type: 'interact', target: 'keyhole' }))
  await expect.poll(async () => page.evaluate(() => window.__game.getSequence())).toBe('endC')
  // Winding the spring: E held turns the key (a circular drag does too), about three turns.
  await page.keyboard.down('e')
  await expect
    .poll(async () => page.evaluate(() => window.__game.getWorld()?.objects['clock']), {
      timeout: 30_000,
    })
    .toBe('3:18')
  await page.keyboard.up('e')
  await expect
    .poll(async () => page.evaluate(() => window.__game.getWorld()?.phone.screen), {
      timeout: 20_000,
    })
    .toBe('incoming')
  await page.keyboard.press('e')
  await endingSeen(page, 'C')
})

test('night 1 begins on the dark landing: walk, pointer lock, torch, pause', async ({ page }) => {
  await boot(page)
  await page.locator('.desktop-view canvas').click({ position: { x: 700, y: 350 } })
  await expect.poll(async () => await page.evaluate(() => !!document.pointerLockElement)).toBe(true)
  const start = (await inspect(page)).position
  await page.keyboard.down('w')
  await page.waitForTimeout(500)
  await page.keyboard.up('w')
  expect((await inspect(page)).position[2]).toBeLessThan(start[2]!)
  const initial = (await inspect(page)).flashlight
  await page.keyboard.press('f')
  await expect.poll(async () => (await inspect(page)).flashlight).toBe(!initial)
  await page.keyboard.press('Escape')
  await expect(page.getByText(ui('pause.title'), { exact: true })).toBeVisible()
  await expect
    .poll(async () => await page.evaluate(() => !!document.pointerLockElement))
    .toBe(false)
  await page
    .getByRole('button', { name: ui('common.continue'), exact: true })
    .last()
    .click()
  // During play: no choice list, no Continue, no narration — the dot and a key glyph at most.
  await expect(page.locator('.desktop-game .choices, .narration, .desktop-hud')).toHaveCount(0)
})

test('rejected pointer lock uses drag look; E picks up the phone where it lies', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () =>
      Promise.reject(new Error('Pointer lock unavailable in this webview'))
  })
  await boot(page)
  await page.evaluate(() => window.__game.startNight(3))
  await expect(page.locator('.desktop-game')).toHaveAttribute('data-sequence', 'n3')
  await page.waitForTimeout(23_000) // Rustam's call ends and the phone goes back on the table.
  const phone = objectPoint('phone')!
  await walkTo(page, phone[0], phone[2] + 0.9, 0.4)
  await face(page, phone[0], phone[2], phone[1])
  await expect(page.locator('.use-glyph')).toHaveText('E')
  await page.keyboard.press('e')
  await expect
    .poll(async () => page.evaluate(() => window.__game.getWorld()?.phone.place))
    .toBe('hand')
})

test('WebGL restores or falls back without changing the run', async ({ page }) => {
  await boot(page)
  const saved = await page.evaluate(() => JSON.stringify(window.__game.getState()))
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
  expect(await page.evaluate(() => JSON.stringify(window.__game.getState()))).toEqual(saved)
  await page.evaluate(() =>
    (window as unknown as { lostGL: WEBGL_lose_context }).lostGL.loseContext(),
  )
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-sequence', 'n1', {
    timeout: 8000,
  })
  expect(await page.evaluate(() => JSON.stringify(window.__game.getState()))).toEqual(saved)
  await page.setViewportSize({ width: 1450, height: 900 })
  await expect(page.locator('.mobile-game')).toBeVisible()
})

test('sustained low FPS drops quality then keeps the night running in mobile', async ({ page }) => {
  test.setTimeout(60_000)
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
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-sequence', 'n1', {
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
        !url.startsWith('http://localhost:4174/') &&
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
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-sequence', 'n1')
  await page.addStyleTag({ content: '.debug-overlay { display:none }' })
  await page.getByRole('button', { name: /Tasvir yengil rejimga/ }).click()
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-view', 'landing')
})

test('flat 47 assets load behind the key-ring screen with real progress', async ({ page }) => {
  const released: (() => void)[] = []
  let hold = true
  await page.route(/\/assets\/(models|textures|hdri)\//, async (route) => {
    if (hold) await new Promise<void>((resolve) => released.push(resolve))
    await route.continue()
  })
  await page.goto('/?debug=1')
  await acceptWarning(page)
  await page.getByRole('button', { name: ui('title.new_game') }).click()
  const bar = page.getByRole('progressbar', { name: ui('loading.label') })
  await expect(bar).toBeVisible()
  await expect(page.getByText(ui('loading.place'))).toBeVisible()
  const before = Number(await bar.getAttribute('aria-valuenow'))
  expect(before).toBeLessThan(100)
  hold = false
  released.splice(0).forEach((release) => release())
  await expect(page.locator('.desktop-view canvas')).toBeVisible()
  await expect(bar).toHaveCount(0)
})

test('a failed asset download offers a retry that recovers', async ({ page }) => {
  let fail = true
  await page.route(/\/assets\/models\/sofa_03\.glb/, (route) =>
    fail ? route.abort('failed') : route.continue(),
  )
  // The aborted request is expected; only the shell's own error UI matters here.
  ;(page as unknown as { errors: string[] }).errors = []
  await page.goto('/?debug=1')
  await acceptWarning(page)
  await page.getByRole('button', { name: ui('title.new_game') }).click()
  await expect(page.getByRole('alert')).toHaveText(ui('loading.error'), { timeout: 20_000 })
  fail = false
  await page.getByRole('button', { name: ui('loading.retry') }).click()
  await expect(page.locator('.desktop-view canvas')).toBeVisible()
})
