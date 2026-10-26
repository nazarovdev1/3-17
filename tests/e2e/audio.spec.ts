import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import type { AudioEngine } from '../../src/audio/engine'

type AudioInfo = ReturnType<AudioEngine['inspect']>
interface DebugAudioApi {
  getAudioState: () => AudioInfo
  goTo: (id: string) => void
}
const state = (page: Page) =>
  page.evaluate(() => (window as unknown as { __game: DebugAudioApi }).__game.getAudioState())
const jump = (page: Page, id: string) =>
  page.evaluate((id) => (window as unknown as { __game: DebugAudioApi }).__game.goTo(id), id)

// Exercise the actual native graph under the configured gesture autoplay policy.

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  ;(page as unknown as { audioErrors: string[] }).audioErrors = errors
  await page.addInitScript(() => {
    if (!localStorage.getItem('g317:settings'))
      localStorage.setItem(
        'g317:settings',
        JSON.stringify({ mode: 'mobile', reduceFlashing: true }),
      )
    localStorage.setItem(
      'g317:meta',
      JSON.stringify({
        kind: 'meta',
        saveVersion: 1,
        meta: { contentWarningAccepted: true, endingsSeen: [], chaptersUnlocked: [] },
      }),
    )
  })
})
test.afterEach(({ page }) =>
  expect((page as unknown as { audioErrors: string[] }).audioErrors).toEqual([]),
)

async function boot(page: Page) {
  await page.goto('/?debug=1')
  await expect(page.getByRole('button', { name: 'Yangi oʻyin', exact: true })).toBeVisible()
  await page.addStyleTag({ content: '.debug-overlay { display: none }' })
}
async function start(page: Page) {
  await page.getByRole('button', { name: 'Yangi oʻyin', exact: true }).click()
  await page.getByRole('textbox').fill('Dilnoza')
  await page.getByRole('button', { name: 'Imzolash', exact: true }).click()
}

test('native suspended context unlocks on a tap; mixer is audible, muted and persisted', async ({
  page,
}, info) => {
  await boot(page)
  await expect.poll(async () => (await state(page)).contextState).toBe('suspended')
  expect((await state(page)).status).toBe('locked')
  const unlock = page.getByRole('button', { name: 'Tovushni yoqish', exact: true })
  await expect(unlock).toHaveText('Davom etish uchun bosing')
  if (info.project.name === 'small-android')
    await page.screenshot({ path: 'tests/screenshots/audio-unlock.png' })
  await unlock.click()
  await expect.poll(async () => (await state(page)).contextState).toBe('running')
  await expect(unlock).toBeHidden()
  await expect.poll(async () => (await state(page)).peak).toBeGreaterThan(0.001)
  await page.getByRole('button', { name: 'Sozlamalar', exact: true }).click()
  await page.getByRole('slider', { name: 'Umumiy tovush', exact: true }).press('Home')
  await page.getByRole('slider', { name: 'Musiqa', exact: true }).press('Home')
  await page.getByRole('slider', { name: 'Effektlar', exact: true }).press('End')
  await page.getByRole('button', { name: 'Orqaga', exact: true }).click()
  await expect.poll(async () => (await state(page)).peak).toBeLessThan(0.00001)
  expect((await state(page)).volumes).toEqual({ masterVolume: 0, musicVolume: 0, effectsVolume: 1 })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Yangi oʻyin', exact: true })).toBeVisible()
  expect((await state(page)).volumes).toEqual({ masterVolume: 0, musicVolume: 0, effectsVolume: 1 })
  await page.getByRole('button', { name: 'Sozlamalar', exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Umumiy tovush', exact: true })).toHaveValue('0')
  await expect(page.getByRole('slider', { name: 'Effektlar', exact: true })).toHaveValue('1')
  // Music mute must leave effects audible, and effects mute must leave music audible.
  await page.getByRole('slider', { name: 'Umumiy tovush', exact: true }).press('End')
  await page.getByRole('button', { name: 'Orqaga', exact: true }).click()
  await expect.poll(async () => (await state(page)).peak).toBeLessThan(0.00001)
  await start(page)
  await jump(page, 'n1_knocks')
  await expect.poll(async () => (await state(page)).peak).toBeGreaterThan(0.001)
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.getByRole('button', { name: 'Sozlamalar', exact: true }).click()
  await page.getByRole('slider', { name: 'Musiqa', exact: true }).press('End')
  await page.getByRole('slider', { name: 'Effektlar', exact: true }).press('Home')
  await page.getByRole('button', { name: 'Orqaga', exact: true }).click()
  await expect.poll(async () => (await state(page)).peak).toBeGreaterThan(0.001)
  await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
  await jump(page, 'n1_knocks')
  await expect.poll(async () => (await state(page)).peak).toBeLessThan(0.00001)
  expect((await state(page)).failures).toEqual([])
})

test('outage silence, native cue output, clock ending, spatial panner and bounded voices', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'desktop', reduceFlashing: true }))
    const original = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'createPanner')!
      .value as (this: AudioContext) => PannerNode
    ;(window as unknown as { pannerCount: number }).pannerCount = 0
    AudioContext.prototype.createPanner = function () {
      ;(window as unknown as { pannerCount: number }).pannerCount++
      return original.call(this)
    }
  })
  await boot(page)
  await start(page)
  await expect.poll(async () => (await state(page)).status).toBe('running')
  await jump(page, 'n1_clock')
  expect((await state(page)).recent).not.toContain('clock_tick')
  expect((await state(page)).layers).toContain('fridge')
  await jump(page, 'n1_317')
  expect((await state(page)).layers).toEqual([])
  await expect.poll(async () => (await state(page)).voices).toBe(0)
  await expect.poll(async () => (await state(page)).peak).toBeLessThan(0.00001)
  await jump(page, 'n1_knocks')
  await expect.poll(async () => (await state(page)).peak).toBeGreaterThan(0.001)
  expect((await state(page)).recent).toContain('knock_triple')
  const spatialExpected = info.project.name !== 'no-webgl'
  expect((await state(page)).spatial).toBe(spatialExpected)
  const panners = await page.evaluate(
    () => (window as unknown as { pannerCount: number }).pannerCount,
  )
  if (spatialExpected) expect(panners).toBeGreaterThan(0)
  else expect(panners).toBe(0)
  await page.evaluate(() => {
    const api = (window as unknown as { __game: DebugAudioApi }).__game
    for (let i = 0; i < 30; i++) api.goTo('n1_knocks')
  })
  expect((await state(page)).voices).toBeLessThanOrEqual(8)
  expect((await state(page)).bufferCount).toBeLessThanOrEqual(25)
  await jump(page, 'endC')
  expect((await state(page)).layers).toEqual(['clock'])
  await expect.poll(async () => (await state(page)).voices).toBe(0)
  await expect.poll(async () => (await state(page)).peak).toBeLessThan(0.00001)
  await expect
    .poll(async () => (await state(page)).peak, { intervals: [100, 150, 200, 250] })
    .toBeGreaterThan(0.001)
  expect((await state(page)).failures).toEqual([])
})

test('pause, hidden page and Telegram deactivation stop sound without replaying old cues', async ({
  page,
}) => {
  await page.route('**/telegram-web-app.js', (route) =>
    route.fulfill({ body: '', contentType: 'application/javascript' }),
  )
  await page.addInitScript(() => {
    const listeners = new Map<string, Set<() => void>>()
    ;(window as unknown as { Telegram: unknown }).Telegram = {
      WebApp: {
        ready: () => undefined,
        expand: () => undefined,
        onEvent: (event: string, callback: () => void) => {
          if (!listeners.has(event)) listeners.set(event, new Set())
          listeners.get(event)!.add(callback)
        },
        offEvent: (event: string, callback: () => void) => listeners.get(event)?.delete(callback),
      },
    }
    ;(window as unknown as { emitTelegram: (event: string) => void }).emitTelegram = (event) => {
      for (const callback of listeners.get(event) ?? []) callback()
    }
  })
  await boot(page)
  await start(page)
  await jump(page, 'n2_night_hub')
  const wall = page.getByRole('button', { name: 'Devorni tinglash', exact: true })
  const target = (await wall.boundingBox())!
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2)
  await page.mouse.down()
  await expect.poll(async () => (await state(page)).listening).toBe(true)
  await page.mouse.up()
  expect((await state(page)).listening).toBe(false)
  await jump(page, 'n1_knocks')
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await expect.poll(async () => (await state(page)).contextState).toBe('suspended')
  expect((await state(page)).voices).toBe(0)
  const frozen = (await state(page)).contextTime
  await page.waitForTimeout(120)
  expect((await state(page)).contextTime).toBe(frozen)
  await page.evaluate(() =>
    (window as unknown as { emitTelegram: (event: string) => void }).emitTelegram('deactivated'),
  )
  await page.getByRole('button', { name: 'Davom etish', exact: true }).last().click()
  expect((await state(page)).status).toBe('paused')
  await page.evaluate(() =>
    (window as unknown as { emitTelegram: (event: string) => void }).emitTelegram('activated'),
  )
  await expect.poll(async () => (await state(page)).contextState).toBe('running')
  const recent = (await state(page)).recent
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(async () => (await state(page)).contextState).toBe('suspended')
  await jump(page, 'n1_knocks')
  expect((await state(page)).recent).toEqual(recent)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(async () => (await state(page)).contextState).toBe('running')
  expect((await state(page)).recent).toEqual(recent)
  expect((await state(page)).voices).toBe(0)
  expect((await state(page)).failures).toEqual([])
})

test('missing Web Audio does not block playing or settings', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'AudioContext', { value: undefined }),
  )
  await boot(page)
  expect((await state(page)).status).toBe('unavailable')
  await expect(page.getByRole('button', { name: 'Tovushni yoqish', exact: true })).toBeHidden()
  await start(page)
  await page.getByRole('button', { name: 'Davom etish', exact: true }).click()
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-node', 'n1_hub')
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.getByRole('button', { name: 'Sozlamalar', exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Umumiy tovush', exact: true })).toBeVisible()
})
