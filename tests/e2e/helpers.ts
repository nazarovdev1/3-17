import { expect, type Page } from '@playwright/test'
import { ui } from '../../src/content/text'

/** Ticks the confirm checkbox and leaves the content warning. */
export async function acceptWarning(page: Page): Promise<void> {
  await page.getByRole('checkbox', { name: ui('warning.confirm') }).check()
  await page.getByRole('button', { name: ui('common.continue') }).click()
}

/** The test build's window.__game (src/debug/DebugOverlay.tsx), as e2e specs use it. */
export interface GameApi {
  setSpeed: (n: number) => void
  getSequence: () => string | null
  getClock: () => string | null
  getWorld: () => {
    form: boolean
    power: boolean
    subtitle: { line: string } | null
    sequence: string
    phone: { place: string; screen: string; missed: number }
    readable: string | null
    waiting: string | null
  } | null
  firedBeats: () => string[]
  interactables: () => string[]
  input: (input: unknown) => boolean
  setClock: (clock: string) => void
  startNight: (night: number) => void
  playSequence: (id: string) => void
  setFlag: (key: string, value: boolean | number | string) => void
  getState: () => {
    profile: { name: string } | null
    night: number
    sanity: number
    flags: Record<string, unknown>
    inventory: string[]
    metaHints: {
      realClock317Fired: boolean
      returnCommentFired: boolean
      lateNightCommentFired: boolean
    }
  } | null
  getScreen: () => string
  getAudioState: () => unknown
  getDesktopState: () => Record<string, unknown>
  teleport: (x: number, z: number, yaw?: number) => void
  emit: (events: unknown[]) => void
  setSanity: (n: number) => void
  setTime: (iso: string) => void
}
declare global {
  interface Window {
    /** Present only in test builds opened with ?debug=1. */
    __game: GameApi
  }
}

/** Accepts the warning and starts a new game: night 1 begins on the dark landing. */
export async function startRun(page: Page): Promise<void> {
  await acceptWarning(page)
  await page.getByRole('button', { name: ui('title.new_game') }).click()
  await expect(page.locator('.game-area')).toBeVisible()
}

/**
 * Rustam aka hands the rental form over (sped up in debug builds); the player fills it in
 * like a real form and signs.
 */
export async function signForm(page: Page, name: string, speed = 8): Promise<void> {
  await page.evaluate((s) => window.__game?.setSpeed(s), speed)
  await expect(page.getByText(ui('form.title'))).toBeVisible({ timeout: 45_000 })
  await page.getByRole('textbox').fill(name)
  await page.getByRole('button', { name: ui('form.sign') }).click()
  await expect(page.getByText(ui('form.title'))).toBeHidden()
  await page.evaluate(() => window.__game?.setSpeed(1))
}

/** Starts a run and signs the form: the usual way into a playable night 1. */
export async function startNamedRun(page: Page, name: string): Promise<void> {
  await startRun(page)
  await signForm(page, name)
}
