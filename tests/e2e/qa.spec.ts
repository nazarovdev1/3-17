import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { acceptWarning, startNamedRun } from './helpers'

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
interface DebugStep {
  nodeId: string
  night: number
  phase: 'next' | 'choices' | 'ending'
  ending: string | null
  choices: { id: string; label: string }[]
}

const PREFERENCES: Record<Ending, RegExp[]> = {
  A: [
    /Eshikni ochish/,
    /Kozachokka/,
    /Dahliga chiqish/,
    /48-xonadonga/,
    /Chuqurroq/,
    /Toʻxtab/,
    /Uxlash|Toʻshak|Qolish/,
    /Davom etish/,
    /Kutish/,
  ],
  B: [
    /chiqib ketish/,
    /Zanjirni yechib/,
    /Kozachokka/,
    /Dahliga chiqish/,
    /48-xonadonga/,
    /Chuqurroq/,
    /Toʻxtab/,
    /Uxlash|Toʻshak|Qolish/,
    /Davom etish/,
    /Kutish/,
  ],
  C: [
    /Soatni oʻrash/,
    /choy|Choy/,
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
  ],
}
const AVOID_C = /Televizorni|tinglash|buyumlaringiz|Yugurib|Javob berish|Sardormisan|Nega men/

const api = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(
    ([name, rest]) => {
      const game = (window as unknown as { __game: Record<string, (...a: unknown[]) => unknown> })
        .__game
      return game[name]!(...rest) as T
    },
    [fn, args] as const,
  )

/** Drives the story through window.__game only, with the same route strategy as
 * the real-input runs. Returns the visited node ids. */
async function debugRoute(page: Page, ending: Ending): Promise<string[]> {
  const visited: string[] = []
  const seen = new Set<string>()
  let night = 0
  for (let i = 0; i < 400; i++) {
    const step = await api<DebugStep | null>(page, 'getStep')
    expect(step, 'a running story').not.toBeNull()
    visited.push(step!.nodeId)
    if (step!.phase === 'ending') return visited
    if (step!.night !== night) {
      night = step!.night
      seen.clear()
    }
    if (step!.phase === 'next') {
      await api(page, 'advance')
      continue
    }
    const fresh = step!.choices.filter((c) => !seen.has(c.label))
    let pool = fresh.length > 0 ? fresh : step!.choices
    if (ending === 'C' && pool.length > 1) {
      const safe = pool.filter((c) => !AVOID_C.test(c.label))
      if (safe.length > 0) pool = safe
    }
    let pick = pool[0]!
    for (const re of PREFERENCES[ending]) {
      const hit = pool.find((c) => re.test(c.label))
      if (hit) {
        pick = hit
        break
      }
    }
    seen.add(pick.label)
    await api(page, 'choose', pick.id)
  }
  throw new Error(`no ending after 400 steps for ${ending}`)
}

for (const ending of ['A', 'B', 'C'] as const) {
  test(`window.__game fast route reaches ending ${ending}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/?debug=1')
    await startNamedRun(page, 'Dilnoza')
    const visited = await debugRoute(page, ending)
    const step = await api<DebugStep>(page, 'getStep')
    expect(step.ending).toBe(ending)
    expect(await api<string>(page, 'getScreen')).toBe('ending')
    expect(
      new Set(visited.filter((id) => !id.startsWith('end')).map((id) => id.slice(0, 2))),
    ).toEqual(new Set(['n1', 'n2', 'n3', 'n4', 'n5']))
    if (ending === 'C') {
      const state = await api<{
        sanity: number
        inventory: string[]
        flags: Record<string, unknown>
      }>(page, 'getState')
      expect(state.inventory.filter((id) => id.startsWith('diary_'))).toHaveLength(7)
      expect(state.sanity).toBeGreaterThanOrEqual(40)
      expect(state.flags['answered_n3']).toBeFalsy()
    }
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /Qoʻshni|Ketish|3:18/ })
        .first(),
    ).toBeVisible()
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
  await expect(page.getByRole('button', { name: 'Yangi oʻyin' })).toBeVisible()
  expect(await backState()).toEqual({ visible: false, count: 0 })

  await page.getByRole('button', { name: 'Yangi oʻyin' }).click()
  await page.getByRole('textbox').fill('Dilnoza')
  await page.getByRole('button', { name: 'Imzolash' }).click()
  await expect.poll(backState).toEqual({ visible: true, count: 1 })

  await press()
  const pauseHeading = page.getByRole('heading', { name: 'PAUZA', exact: true })
  await expect(pauseHeading).toBeVisible()
  await press()
  await expect(pauseHeading).toBeHidden()

  await press()
  await page.getByRole('button', { name: 'Sozlamalar' }).click()
  await expect(page.getByRole('button', { name: 'Orqaga' })).toBeVisible()
  await press()
  await expect(pauseHeading).toBeVisible()

  // The on-screen back button also returns to the pause menu, not the title.
  await page.getByRole('button', { name: 'Sozlamalar' }).click()
  await page.getByRole('button', { name: 'Orqaga' }).click()
  await expect(pauseHeading).toBeVisible()
  await page.getByRole('button', { name: 'Sarlavha ekraniga chiqish' }).click()
  await expect.poll(backState).toEqual({ visible: false, count: 0 })
})

test('closing the tab mid-game keeps the exact node and state', async ({ page, context }) => {
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  await api(page, 'advance')
  await api(page, 'setSanity', 63)
  await api(page, 'setFlag', 'qa_marker', 'closed')
  const before = await api<{ currentNodeId: string; sanity: number }>(page, 'getState')
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
  await next.getByRole('button', { name: 'Davom etish' }).click()
  const after = await api<{
    currentNodeId: string
    sanity: number
    flags: Record<string, unknown>
  }>(next, 'getState')
  expect(after.currentNodeId).toBe(before.currentNodeId)
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
  await startNamedRun(page, 'Dilnoza')
  await debugRoute(page, 'B')
  await expect(page.locator('h1, h2').filter({ hasText: 'Ketish' }).first()).toBeVisible()
  expect(foreign).toEqual([])
})

test('repeated night transitions do not grow resources', async ({ page }, info) => {
  test.setTimeout(240_000)
  await page.goto('/?debug=1')
  await startNamedRun(page, 'Dilnoza')
  const nights = ['n1_start', 'n2_day_start', 'n3_start', 'n4_start', 'n5_start']

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
      await page.evaluate((nodeId) => {
        ;(window as unknown as { __game: { goTo: (id: string) => void } }).__game.goTo(nodeId)
      }, id)
      await page.waitForTimeout(400)
    }
  }
  const gc = async () => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('HeapProfiler.collectGarbage')
    await cdp.detach()
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
  await page.getByRole('button', { name: 'Davom etish' }).first().click()
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
