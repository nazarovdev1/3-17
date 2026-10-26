import type { Page } from '@playwright/test'

/** Ticks the confirm checkbox and leaves the content warning. */
export async function acceptWarning(page: Page): Promise<void> {
  await page.getByRole('checkbox', { name: 'Buni oʻqidim, davom etaman' }).check()
  await page.getByRole('button', { name: 'Davom etish' }).click()
}

/** Accepts the warning and starts a named run, landing on night 1's hub. */
export async function startNamedRun(page: Page, name: string): Promise<void> {
  await acceptWarning(page)
  await page.getByRole('button', { name: 'Yangi oʻyin' }).click()
  await page.getByRole('textbox').fill(name)
  await page.getByRole('button', { name: 'Imzolash' }).click()
}
