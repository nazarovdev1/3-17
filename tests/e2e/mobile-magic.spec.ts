import { expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { test } from './fixtures'
import { startNamedRun } from './helpers'

/**
 * R5: the magic window on a phone. The headless GPU is a software rasteriser, which the app
 * treats as a weak device, so these runs force the window with ?magic=1 (debug builds only).
 */
const SHOTS = 'audit/screenshots/r5'

const state = (page: Page) => page.evaluate(() => window.__game.getDesktopState())

async function openMagic(page: Page, night?: number) {
  mkdirSync(SHOTS, { recursive: true })
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'mobile', reduceFlashing: true }))
  })
  await page.goto('/?debug=1&magic=1')
  await page.addStyleTag({ content: '.debug-overlay { display: none !important }' })
  await startNamedRun(page, 'Dilnoza')
  await expect.poll(async () => (await state(page)).worldReady, { timeout: 90_000 }).toBe(true)
  if (night) await page.evaluate((n) => window.__game.startNight(n), night)
  await expect(page.locator('.magic-hud')).toBeVisible()
  // A phone held in the hand (a night's opening) is put down so the room can be seen.
  await page.waitForTimeout(1500)
  await putPhoneDown(page)
}

async function putPhoneDown(page: Page) {
  await page.evaluate(() => {
    if (window.__game.getWorld()?.phone.place === 'hand')
      window.__game.input({ type: 'interact', target: 'phone' })
  })
  await page.waitForTimeout(600)
}

async function arrive(page: Page, node: string) {
  await expect.poll(async () => (await state(page)).magicNode, { timeout: 30_000 }).toBe(node)
  await expect.poll(async () => (await state(page)).magicGliding).toBe(false)
}

/** Glide to a neighbouring viewpoint as a player would: a closed door is tapped open first. */
async function glideTo(page: Page, node: string, door?: string) {
  await putPhoneDown(page)
  const mark = page.locator(`[data-node="${node}"]`)
  if (door && !(await mark.count())) {
    await page.locator(`[data-door="${door}"]`).click()
    // A night's phone beat may lift the phone again meanwhile; markers return once it is down.
    await expect(async () => {
      await putPhoneDown(page)
      await expect(mark).toHaveCount(1, { timeout: 1500 })
    }).toPass({ timeout: 20_000 })
  }
  await mark.click()
  await arrive(page, node)
}

test('the window glides through the flat by markers, and a shut door is tapped open first', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await openMagic(page, 3)
  await arrive(page, 'room_a')
  await page.screenshot({ path: `${SHOTS}/magic-room.png` })
  // The room door rests open; the corridor, then the shut kitchen door.
  await glideTo(page, 'corr_1')
  await expect(page.locator('[data-door="kitchen_door"]')).toBeVisible()
  await expect(page.locator('[data-node="kitchen"]')).toHaveCount(0)
  await glideTo(page, 'kitchen', 'kitchen_door')
  await page.screenshot({ path: `${SHOTS}/magic-kitchen.png` })
  // Back out, on to the hall, and the front door onto the landing.
  await glideTo(page, 'corr_1')
  await glideTo(page, 'corr_2')
  await glideTo(page, 'hall')
  await glideTo(page, 'landing_d', 'front_door')
  await page.screenshot({ path: `${SHOTS}/magic-landing.png` })
  expect((await state(page)).feet).toBe(0)
})

test('the phone turns the head, and recentre brings the viewpoint back', async ({ page }) => {
  test.setTimeout(180_000)
  await openMagic(page, 3)
  await arrive(page, 'room_a')
  const turn = (alpha: number, beta = 90) =>
    page.evaluate(
      ([a, b]) =>
        window.dispatchEvent(
          new DeviceOrientationEvent('deviceorientation', { alpha: a!, beta: b!, gamma: 0 }),
        ),
      [alpha, beta],
    )
  const yaw = async () => (await state(page)).yaw as number
  await turn(0)
  await page.waitForTimeout(400)
  await page.locator('.magic-recenter').click()
  await page.waitForTimeout(800)
  const before = await yaw()
  // Turning the phone a quarter turn to the left turns the view the same way (+90°).
  await turn(90)
  await expect.poll(yaw).toBeCloseTo(before + Math.PI / 2, 1)
  // Raising the top edge of the phone looks up.
  await turn(90, 110)
  await expect.poll(async () => (await state(page)).pitch as number).toBeGreaterThan(0.25)
  await turn(90, 90)
  expect((await state(page)).magicGyro).toBe(true)
  await page.locator('.magic-recenter').click()
  await expect.poll(yaw).toBeCloseTo(before, 1)
})

test('without a motion sensor a finger drag turns the head', async ({ page }) => {
  test.setTimeout(180_000)
  await openMagic(page, 3)
  await arrive(page, 'room_a')
  const yaw = async () => (await state(page)).yaw as number
  const before = await yaw()
  const box = (await page.locator('.desktop-view canvas').boundingBox())!
  await page.mouse.move(box.x + 100, box.y + 300)
  await page.mouse.down()
  await page.mouse.move(box.x + 250, box.y + 300, { steps: 8 })
  await page.mouse.up()
  // Dragging right turns the view left (the picture follows the finger).
  expect(await yaw()).toBeGreaterThan(before + 0.3)
})

test('an object in reach and in view is tapped where it is', async ({ page }) => {
  test.setTimeout(240_000)
  await openMagic(page, 1)
  // Night 1 begins on the landing, with the landlord's hand held out.
  await arrive(page, 'landing_s')
  // The door is opened first (use key); only then does the hand come out with the form.
  await page.evaluate(() => window.__game.input({ type: 'interact', target: 'front_door' }))
  await expect
    .poll(async () => page.evaluate(() => window.__game.interactables()), { timeout: 15_000 })
    .toContain('rustam_hand')
  const ids = await page.evaluate(() => window.__game.interactables())
  expect(ids).toContain('rustam_hand')
  const hand = page.locator('[data-object="rustam_hand"]')
  await expect(hand).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${SHOTS}/magic-landing-hotspot.png` })
  await hand.click()
  await expect
    .poll(async () =>
      (await page.evaluate(() => window.__game.interactables())).includes('rustam_hand'),
    )
    .toBe(false)
})

test('a lost graphics context hands the game to the stills', async ({ page }) => {
  test.setTimeout(180_000)
  await openMagic(page, 3)
  await page.evaluate(() => {
    const canvas = document.querySelector('.desktop-view canvas') as HTMLCanvasElement
    const gl = canvas.getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  })
  await expect(page.locator('.mobile-game')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.magic-hud')).toHaveCount(0)
})

test('magic=0 keeps the stills', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'mobile', reduceFlashing: true }))
  })
  await page.goto('/?debug=1&magic=0')
  await startNamedRun(page, 'Dilnoza')
  await expect(page.locator('.mobile-game')).toBeVisible()
  await expect(page.locator('.magic-hud')).toHaveCount(0)
})

test('ending C: the clock is wound by circling a finger on the screen', async ({ page }) => {
  test.setTimeout(240_000)
  await openMagic(page)
  await page.evaluate(() => {
    const run = window.__game.getState()!
    for (let i = 1; i <= 7; i++) run.inventory.push(`diary_${i}`)
    window.__game.playSequence('endC')
  })
  await expect
    .poll(async () => (await page.evaluate(() => window.__game.getWorld()))?.objects['clock'], {
      timeout: 60_000,
    })
    .toBe('winding')
  const box = (await page.locator('.desktop-view canvas').boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy - 120)
  await page.mouse.down()
  for (let lap = 0; lap < 8; lap++)
    for (let a = 0; a < 360; a += 12) {
      const r = (a * Math.PI) / 180
      await page.mouse.move(cx + Math.sin(r) * 120, cy - Math.cos(r) * 120)
    }
  await page.mouse.up()
  await expect
    .poll(async () => (await page.evaluate(() => window.__game.getWorld()))?.objects['clock'], {
      timeout: 30_000,
    })
    .toBe('3:18')
})

test('ending A: the shared wall is knocked on three taps', async ({ page }) => {
  test.setTimeout(240_000)
  await openMagic(page)
  await page.evaluate(() => window.__game.playSequence('endA'))
  await expect
    .poll(
      async () => (await page.evaluate(() => window.__game.getWorld()))?.objects['knock_prompt'],
      {
        timeout: 90_000,
      },
    )
    .toBe('shown')
  const wall = page.locator('[data-object="party_wall48"]')
  await expect(wall).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${SHOTS}/magic-ending-a.png` })
  for (let i = 0; i < 3; i++) {
    await wall.dispatchEvent('pointerdown', { pointerId: 1 })
    await wall.dispatchEvent('pointerup', { pointerId: 1 })
  }
  await expect
    .poll(async () => (await page.evaluate(() => window.__game.getState()))?.flags['knocked_48'], {
      timeout: 20_000,
    })
    .toBeTruthy()
})

test('ending B: down the stairs, out into the snow and onto the bus, by glides', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await openMagic(page)
  await page.evaluate(() => window.__game.playSequence('endB'))
  await arrive(page, 's_top')
  for (const node of ['s_a', 's_b', 's_c', 's_d']) await glideTo(page, node)
  // The foot of the second flight is the 3rd-floor landing: a blink, and the street.
  await expect
    .poll(async () => (await page.evaluate(() => window.__game.getState()))?.flags['outside'], {
      timeout: 30_000,
    })
    .toBeTruthy()
  await arrive(page, 'yard')
  // The street fades in from black.
  await page.waitForTimeout(4500)
  await page.screenshot({ path: `${SHOTS}/magic-ending-b-yard.png` })
  await glideTo(page, 'bus_door')
  await expect
    .poll(async () => (await page.evaluate(() => window.__game.getState()))?.flags['on_bus'], {
      timeout: 30_000,
    })
    .toBeTruthy()
})
