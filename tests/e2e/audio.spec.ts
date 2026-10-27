import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import type { AudioEngine } from '../../src/audio/engine'
import { ui } from '../../src/content/text'
import { manifest } from '../../src/assets/loader'

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
  await expect(page.getByRole('button', { name: ui('title.new_game'), exact: true })).toBeVisible()
  await page.addStyleTag({ content: '.debug-overlay { display: none }' })
}
async function start(page: Page) {
  await page.getByRole('button', { name: ui('title.new_game'), exact: true }).click()
  await page.getByRole('textbox').fill('Dilnoza')
  await page.getByRole('button', { name: ui('form.sign'), exact: true }).click()
}

test('native suspended context unlocks on a tap; mixer is audible, muted and persisted', async ({
  page,
}, info) => {
  await boot(page)
  await expect.poll(async () => (await state(page)).contextState).toBe('suspended')
  await expect.poll(async () => (await state(page)).recordingsReady).toBe(true)
  expect((await state(page)).missingRecordings).toEqual([])
  expect((await state(page)).recordingCount).toBe(41)
  expect((await state(page)).status).toBe('locked')
  const unlock = page.getByRole('button', { name: ui('shell.audio_unlock_label'), exact: true })
  await expect(unlock).toHaveText(ui('shell.audio_unlock'))
  if (info.project.name === 'small-android')
    await page.screenshot({ path: 'tests/screenshots/audio-unlock.png' })
  await unlock.click()
  await expect.poll(async () => (await state(page)).contextState).toBe('running')
  await expect(unlock).toBeHidden()
  await expect.poll(async () => (await state(page)).peak).toBeGreaterThan(0.001)
  await page.getByRole('button', { name: ui('common.settings'), exact: true }).click()
  await page.getByRole('slider', { name: ui('settings.master'), exact: true }).press('Home')
  await page.getByRole('slider', { name: ui('settings.music'), exact: true }).press('Home')
  await page.getByRole('slider', { name: ui('settings.effects'), exact: true }).press('End')
  await page.getByRole('button', { name: ui('common.back'), exact: true }).click()
  await expect.poll(async () => (await state(page)).peak).toBeLessThan(0.00001)
  expect((await state(page)).volumes).toEqual({ masterVolume: 0, musicVolume: 0, effectsVolume: 1 })
  await page.reload()
  await expect(page.getByRole('button', { name: ui('title.new_game'), exact: true })).toBeVisible()
  expect((await state(page)).volumes).toEqual({ masterVolume: 0, musicVolume: 0, effectsVolume: 1 })
  await page.getByRole('button', { name: ui('common.settings'), exact: true }).click()
  await expect(page.getByRole('slider', { name: ui('settings.master'), exact: true })).toHaveValue(
    '0',
  )
  await expect(page.getByRole('slider', { name: ui('settings.effects'), exact: true })).toHaveValue(
    '1',
  )
  // Music mute must leave effects audible, and effects mute must leave music audible.
  await page.getByRole('slider', { name: ui('settings.master'), exact: true }).press('End')
  await page.getByRole('button', { name: ui('common.back'), exact: true }).click()
  await expect.poll(async () => (await state(page)).peak).toBeLessThan(0.00001)
  await start(page)
  await jump(page, 'n1_knocks')
  await expect.poll(async () => (await state(page)).peak).toBeGreaterThan(0.001)
  await page.getByRole('button', { name: ui('common.pause'), exact: true }).click()
  await page.getByRole('button', { name: ui('common.settings'), exact: true }).click()
  await page.getByRole('slider', { name: ui('settings.music'), exact: true }).press('End')
  await page.getByRole('slider', { name: ui('settings.effects'), exact: true }).press('Home')
  // Settings opened from pause returns to pause, where playback is suspended.
  await page.getByRole('button', { name: ui('common.back'), exact: true }).click()
  await expect(page.getByRole('heading', { name: ui('pause.title'), exact: true })).toBeVisible()
  await page.getByRole('button', { name: ui('common.continue'), exact: true }).click()
  await jump(page, 'n1_start')
  await expect.poll(async () => (await state(page)).peak).toBeGreaterThan(0.001)
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
  const quiet = await page.evaluate(async () => {
    const api = (window as unknown as { __game: DebugAudioApi }).__game
    // Start the cut and measurement atomically; slow CDP round trips cannot consume the gap.
    api.goTo('n1_317')
    const begin = api.getAudioState().contextTime
    api.goTo('n1_knocks')
    let peak = 0
    let observedAt: number | null = null
    while (api.getAudioState().silenceRemaining > 0.08) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const audio = api.getAudioState()
      if (audio.contextTime - begin >= 0.45 && audio.silenceRemaining > 0.08) {
        observedAt ??= audio.contextTime
        peak = Math.max(peak, audio.peak)
      }
    }
    return { peak, seconds: observedAt === null ? 0 : api.getAudioState().contextTime - observedAt }
  })
  expect(quiet.seconds).toBeGreaterThan(3)
  expect(quiet.peak).toBeLessThan(0.00001)
  await expect.poll(async () => (await state(page)).peak).toBeGreaterThan(0.001)
  expect((await state(page)).recent).toContain('knock_triple')
  const spatialExpected = info.project.name !== 'no-webgl'
  expect((await state(page)).spatial).toBe(spatialExpected)
  const playback = (await state(page)).playbacks.filter((p) => p.id === 'knock_triple').at(-1)
  expect(playback?.kind).toBe('recording')
  expect(playback?.panner).toBe(spatialExpected ? 'HRTF' : null)
  expect(playback?.position).toEqual(spatialExpected ? [-1.99, 1.5, -0.45] : null)
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

test('an undecodable local recording uses the audible synth fallback without blocking play', async ({
  page,
}) => {
  const recording = manifest.assets.find((a) => a.id === 'sound_knock_triple')!.files.v1!
  await page.route('**/assets/sounds/sound_knock_triple-1.flac?*', (route) =>
    route.fulfill({ body: Buffer.alloc(recording.bytes), contentType: 'audio/flac' }),
  )
  await boot(page)
  await start(page)
  await expect.poll(async () => (await state(page)).recordingsReady).toBe(true)
  expect((await state(page)).missingRecordings).toEqual([recording.path])
  await jump(page, 'n1_knocks')
  const playback = (await state(page)).playbacks.filter((p) => p.id === 'knock_triple').at(-1)
  expect(playback?.kind).toBe('synth')
  await expect.poll(async () => (await state(page)).peak).toBeGreaterThan(0.001)
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
  const wall = page.locator('[data-choice-id="listen"]')
  const target = (await wall.boundingBox())!
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2)
  await page.mouse.down()
  await expect.poll(async () => (await state(page)).listening).toBe(true)
  await page.mouse.up()
  expect((await state(page)).listening).toBe(false)
  await jump(page, 'n1_knocks')
  await page.getByRole('button', { name: ui('common.pause'), exact: true }).click()
  await expect.poll(async () => (await state(page)).contextState).toBe('suspended')
  expect((await state(page)).voices).toBe(0)
  const frozen = (await state(page)).contextTime
  await page.waitForTimeout(120)
  expect((await state(page)).contextTime).toBe(frozen)
  await page.evaluate(() =>
    (window as unknown as { emitTelegram: (event: string) => void }).emitTelegram('deactivated'),
  )
  await page
    .getByRole('button', { name: ui('common.continue'), exact: true })
    .last()
    .click()
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
  await expect(
    page.getByRole('button', { name: ui('shell.audio_unlock_label'), exact: true }),
  ).toBeHidden()
  await start(page)
  await page.getByRole('button', { name: ui('common.continue'), exact: true }).click()
  await expect(page.locator('.mobile-game')).toHaveAttribute('data-node', 'n1_hub')
  await page.getByRole('button', { name: ui('common.pause'), exact: true }).click()
  await page.getByRole('button', { name: ui('common.settings'), exact: true }).click()
  await expect(page.getByRole('slider', { name: ui('settings.master'), exact: true })).toBeVisible()
})
