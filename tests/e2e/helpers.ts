import type { Page } from '@playwright/test'
import { ui } from '../../src/content/text'

/** Ticks the confirm checkbox and leaves the content warning. */
export async function acceptWarning(page: Page): Promise<void> {
  await page.getByRole('checkbox', { name: ui('warning.confirm') }).check()
  await page.getByRole('button', { name: ui('common.continue') }).click()
}

/** Accepts the warning and starts a named run, landing on night 1's hub. */
export async function startNamedRun(page: Page, name: string): Promise<void> {
  await acceptWarning(page)
  await page.getByRole('button', { name: ui('title.new_game') }).click()
  await page.getByRole('textbox').fill(name)
  await page.getByRole('button', { name: ui('form.sign') }).click()
}
