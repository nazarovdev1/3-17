import { expect } from '@playwright/test'
import { test } from './fixtures'
import { ui } from '../../src/content/text'

/**
 * All 3 endings playable in the text presenter through real clicks. Choices are picked by
 * their stable ids (tests/routes.ts), so editing the Uzbek YAML never breaks this test.
 */
import { pickChoice, type EndingTarget } from '../routes'

for (const ending of ['A', 'B', 'C'] as EndingTarget[])
  test(`text presenter playthrough to ending ${ending}`, async ({ page }) => {
    test.setTimeout(300_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    await page.goto('/?presenter=text')
    let reached = false
    for (let i = 0; i < 400; i++) {
      const heading = page.getByRole('heading', { name: /^Yakun:/ })
      if (await heading.isVisible().catch(() => false)) {
        expect((await heading.textContent()) ?? '').toContain(ending)
        reached = true
        break
      }
      const choices = page.locator('button[data-choice-id]')
      const ids = await choices.evaluateAll((items) =>
        items.map((item) => item.getAttribute('data-choice-id') ?? ''),
      )
      if (ids.length === 0) {
        await page.getByRole('button', { name: ui('common.continue') }).click()
        continue
      }
      await page.locator(`button[data-choice-id="${pickChoice(ending, ids)}"]`).click()
    }
    expect(reached, `reached ending ${ending}`).toBe(true)
    expect(errors).toEqual([])
  })
