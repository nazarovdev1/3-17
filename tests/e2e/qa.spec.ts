import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { acceptWarning, startNamedRun, startRun } from './helpers'
import { ui } from '../../src/content/text'

/**
 * Phase 8 QA: fast debug-API routes to every ending, Telegram BackButton,
 * autosave when the tab closes, runtime network isolation, memory across night
 * transitions and the throttled mobile frame rate.
 */

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

type Ending = 'A' | 'B' | 'C'

const api = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(
    ([name, rest]) => {
      const game = (window as unknown as { __game: Record<string, (...a: unknown[]) => unknown> })
        .__game
      return game[name]!(...rest) as T
    },
    [fn, args] as const,
  )

/**
 * The whole game through the Director at ×60: the rental form is signed, the player idles
 * through nights 1–4 (3:17 comes by itself every night), and night 5 ends by the inputs that
 * ending needs. Returns the nights that played.
 */
async function fastRoute(page: Page, ending: Ending): Promise<string[]> {
  const played = new Set<string>()
  // The debug overlay sits over the mobile view's top (forward) arrow.
  await page.addStyleTag({ content: '.debug-overlay { display: none }' })
  await page.evaluate((c) => {
    const g = window.__game
    g.input({
      type: 'form',
      profile: { name: 'Dilnoza', livesAlone: 'ha', fear: 'qorongʻulik', doorAtNight: 'yopiq' },
    })
    if (c) {
      const run = g.getState()!
      for (let i = 1; i <= 7; i++) run.inventory.push(`diary_${i}`)
      for (let i = 1; i <= 5; i++) run.inventory.push(`mom_msg_${i}`)
    }
    g.setSpeed(60)
  }, ending === 'C')
  for (let i = 0; i < 600; i++) {
    const sequence = await page.evaluate(() => window.__game.getSequence())
    if (sequence) played.add(sequence)
    if ((await page.evaluate(() => window.__game.getScreen())) === 'gallery') return [...played]
    const door = await page.evaluate(() => !!window.__game.getState()?.flags['open_the_door'])
    if (sequence === 'n5' && door) {
      await page.evaluate((e) => {
        const g = window.__game
        if (e === 'B') g.input({ type: 'interact', target: 'front_door' })
        if (e === 'C') {
          g.input({ type: 'interact', target: 'clock' })
          g.input({ type: 'interact', target: 'keyhole' })
        }
      }, ending)
      if (ending !== 'C') {
        // The player walks out (B) or over 48's threshold (A).
        if (await page.locator('.desktop-game').count())
          await page.evaluate(
            (e) =>
              e === 'A' ? window.__game.teleport(-4.2, 4.3) : window.__game.teleport(1.6, 6.95),
            ending,
          )
        else {
          await page
            .locator('.mobile-game[data-view="room"] .view-exit-back')
            .click({ timeout: 2000 })
            .catch(() => undefined)
          await page
            .locator('.mobile-game[data-view="hall"] .view-exit-forward')
            .click({ timeout: 2000 })
            .catch(() => undefined)
          if (ending === 'B')
            await page
              .locator('.mobile-game[data-view="landing"] .view-exit-back')
              .click({ timeout: 2000 })
              .catch(() => undefined)
          else
            await page
              .locator('.mobile-game[data-view="landing"] .view-exit-left')
              .click({ timeout: 2000 })
              .catch(() => undefined)
        }
      }
    }
    if (sequence === 'endA')
      await page.evaluate(() => window.__game.input({ type: 'knock3', target: 'party_wall48' }))
    if (
      sequence === 'endC' &&
      (await page.evaluate(() => window.__game.getWorld()?.phone.screen)) === 'incoming'
    )
      await page.evaluate(() => window.__game.input({ type: 'interact', target: 'phone_call' }))
    await page.waitForTimeout(250)
  }
  throw new Error(`ending ${ending} not reached; played ${[...played].join(', ')}`)
}

for (const ending of ['A', 'B', 'C'] as const) {
  test(`window.__game fast route plays every night and reaches ending ${ending}`, async ({
    page,
  }) => {
    test.setTimeout(240_000)
    await page.goto('/?debug=1')
    await startRun(page)
    const played = await fastRoute(page, ending)
    expect(played).toEqual(expect.arrayContaining(['n1', 'n2', 'n3', 'n4', 'n5', `end${ending}`]))
    // Titles live in the gallery only, after the ending has played out.
    await expect(page.getByText(ui(`endings.${ending}.title`), { exact: true })).toBeVisible()
    expect(await page.evaluate(() => window.__game.getState())).toBeNull()
  })
}
test('Telegram BackButton opens pause, resumes and steps back from settings', async ({ page }) => {
  await page.addInitScript(() => {
    const handlers = new Set<() => void>()
    const state = { visible: false }
    ;(window as unknown as Record<string, unknown>).Telegram = {
      WebApp: {
        version: '9.0',
        platform: 'android',
        isVersionAtLeast: () => true,
        ready: () => undefined,
        expand: () => undefined,
        BackButton: {
          show: () => (state.visible = true),
          hide: () => (state.visible = false),
          onClick: (cb: () => void) => handlers.add(cb),
          offClick: (cb: () => void) => handlers.delete(cb),
        },
      },
    }
    ;(window as unknown as Record<string, unknown>).__tgBack = {
      press: () => [...handlers].forEach((cb) => cb()),
      visible: () => state.visible,
      count: () => handlers.size,
    }
  })
  const press = () =>
    page.evaluate(() => (window as unknown as { __tgBack: { press: () => void } }).__tgBack.press())
  const backState = () =>
    page.evaluate(() => {
      const b = (window as unknown as { __tgBack: { visible: () => boolean; count: () => number } })
        .__tgBack
      return { visible: b.visible(), count: b.count() }
    })

  await page.goto('/')
  await acceptWarning(page)
  // Title: hidden, so Telegram's own close remains the way out.
  await expect(page.getByRole('button', { name: ui('title.new_game') })).toBeVisible()
  expect(await backState()).toEqual({ visible: false, count: 0 })

  await page.getByRole('button', { name: ui('title.new_game') }).click()
  await expect.poll(backState).toEqual({ visible: true, count: 1 })

  await press()
  const pauseHeading = page.getByRole('heading', { name: ui('pause.title'), exact: true })
  await expect(pauseHeading).toBeVisible()
  await press()
  await expect(pauseHeading).toBeHidden()

  await press()
  await page.getByRole('button', { name: ui('common.settings') }).click()
  await expect(page.getByRole('button', { name: ui('common.back') })).toBeVisible()
  await press()
  await expect(pauseHeading).toBeVisible()

  // The on-screen back button also returns to the pause menu, not the title.
  await page.getByRole('button', { name: ui('common.settings') }).click()
  await page.getByRole('button', { name: ui('common.back') }).click()
  await expect(pauseHeading).toBeVisible()
  await page.getByRole('button', { name: ui('common.to_menu') }).click()
  await expect.poll(backState).toEqual({ visible: false, count: 0 })
})

test('closing the tab mid-night keeps the night, the profile and what the player did', async ({
  page,
  context,
}) => {
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await api(page, 'startNight', 3)
  await api(page, 'setSanity', 63)
  await api(page, 'setFlag', 'qa_marker', 'closed')
  await page.waitForTimeout(400)
  await page.close({ runBeforeUnload: true })
  // The auto fixture stubs the Telegram SDK per page; the reopened tab needs it too.
  await context.route('https://telegram.org/js/telegram-web-app.js', (route) =>
    route.fulfill({ body: '', contentType: 'application/javascript' }),
  )

  const next = await context.newPage()
  const errors: string[] = []
  next.on('pageerror', (e) => errors.push(String(e)))
  next.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await next.goto('/?debug=1')
  await next.getByRole('button', { name: ui('common.continue') }).click()
  const after = await api<{
    night: number
    sanity: number
    flags: Record<string, unknown>
  }>(next, 'getState')
  expect(after.night).toBe(3)
  await expect(next.locator('.game-area')).toHaveAttribute('data-sequence', 'n3')
  expect(after.sanity).toBe(63)
  expect(after.flags['qa_marker']).toBe('closed')
  expect(errors).toEqual([])
  ;(page as unknown as { __errors: string[] }).__errors.length = 0
})

test('no runtime request leaves the origin except the Telegram SDK', async ({ page, baseURL }) => {
  test.setTimeout(120_000)
  const foreign: string[] = []
  page.on('request', (req) => {
    const url = req.url()
    if (url.startsWith('data:') || url.startsWith('blob:')) return
    if (url.startsWith(baseURL!)) return
    if (url === 'https://telegram.org/js/telegram-web-app.js') return
    foreign.push(url)
  })
  await page.goto('/?debug=1')
  await startRun(page)
  await fastRoute(page, 'B')
  await expect(page.getByText(ui('endings.B.title'), { exact: true })).toBeVisible()
  expect(foreign).toEqual([])
})

test('repeated night transitions do not grow resources', async ({ page }, info) => {
  test.setTimeout(240_000)
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  const nights = [1, 2, 3, 4, 5]

  const isDesktop = info.project.name === 'desktop-chrome'
  const sample = async () => {
    // performance.memory is bucketed; the DevTools protocol reports the exact heap.
    const cdp = await page.context().newCDPSession(page)
    const { usedSize: heap } = await cdp.send('Runtime.getHeapUsage')
    await cdp.detach()
    const gpu = isDesktop
      ? await page.evaluate(() => {
          const d = (
            window as unknown as {
              __game: { getDesktopState: () => { geometries?: number; textures?: number } | null }
            }
          ).__game.getDesktopState()
          return { geometries: d?.geometries ?? 0, textures: d?.textures ?? 0 }
        })
      : { geometries: 0, textures: 0 }
    const canvases = await page.locator('canvas').count()
    return { heap, ...gpu, canvases }
  }
  const cycle = async () => {
    for (const id of nights) {
      await page.evaluate((night) => window.__game.startNight(night), id)
      await page.waitForTimeout(400)
    }
  }
  const gc = async () => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('HeapProfiler.collectGarbage')
    await cdp.detach()
  }

  if (isDesktop) {
    // Measure the flat, not its loading: wait until every world asset is on the GPU.
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (
                window as unknown as { __game: { getDesktopState: () => { worldReady: boolean } } }
              ).__game.getDesktopState().worldReady,
          ),
        { timeout: 60_000 },
      )
      .toBe(true)
  }
  await cycle() // warm-up: first-use caches, lazy chunks, audio buffers
  await gc()
  const baseline = await sample()
  for (let round = 0; round < 4; round++) await cycle()
  await gc()
  const middle = await sample()
  for (let round = 0; round < 4; round++) await cycle()
  await gc()
  const after = await sample()
  await info.attach('memory', {
    body: JSON.stringify({ nights, baseline, middle, after }),
    contentType: 'application/json',
  })
  expect(after.canvases).toBe(baseline.canvases)
  expect(after.geometries).toBe(baseline.geometries)
  expect(after.textures).toBe(baseline.textures)
  // A leak grows with every block of transitions; bounded caches level off.
  expect(after.heap - middle.heap).toBeLessThan(512 * 1024)
  expect(after.heap - baseline.heap).toBeLessThan(2 * 1024 * 1024)
})

test('mobile scene holds 30 FPS under ×4 CPU throttling', async ({ page }, info) => {
  test.skip(
    info.project.name === 'desktop-chrome',
    'mobile frame budget; desktop has its own benchmark',
  )
  test.setTimeout(120_000)
  await page.goto('/')
  await startNamedRun(page, 'Dilnoza')
  await expect(page.locator('.mobile-game canvas').first()).toBeVisible()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.waitForTimeout(1500)
  const fps = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let frames = 0
        const start = performance.now()
        const tick = () => {
          frames++
          const elapsed = performance.now() - start
          if (elapsed >= 4000) resolve((frames * 1000) / elapsed)
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
  )
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await cdp.detach()
  await info.attach('throttled-fps', { body: String(fps), contentType: 'text/plain' })
  expect(fps).toBeGreaterThanOrEqual(30)
})
