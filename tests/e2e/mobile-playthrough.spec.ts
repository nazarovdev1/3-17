import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { startNamedRun } from './helpers'
import { ui } from '../../src/content/text'
import { story } from '../../src/content/story'
import { pickChoice, type EndingTarget } from '../routes'

async function play(page: Page, ending: EndingTarget) {
  const visited = new Set<string>()
  for (let i = 0; i < 400; i++) {
    if (
      await page
        .getByRole('heading', { name: ui(`endings.${ending}.title`), exact: true })
        .isVisible()
    ) {
      if (ending === 'C') {
        expect([...new Set([...visited].map((id) => id.slice(0, 2)))].sort()).toEqual([
          'n1',
          'n2',
          'n3',
          'n4',
          'n5',
        ])
        expect(visited.has('n3_room_return')).toBe(true)
        await expect(page.locator('.ending-narration')).toContainText(
          story.nodes['endC']!.lines.at(-1)!.variants[0]!.text,
        )
        await test.info().attach('mobile-five-night-route', {
          body: JSON.stringify([...visited]),
          contentType: 'application/json',
        })
      }
      return
    }
    const area = page.locator('.mobile-game')
    await expect(area).toBeVisible()
    const node = (await area.getAttribute('data-node')) ?? ''
    if (!visited.has(node) && ending === 'C') {
      await area.locator('.narration').click()
      if (node.endsWith('_317') || node === 'n4_glitch' || node === 'n3_room_return')
        await page.waitForTimeout(600)
    }
    visited.add(node)
    const choices = area.locator('[data-choice-id]')
    const ids = await choices.evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-choice-id') ?? ''),
    )
    if (ids.length === 0) {
      await area.getByRole('button', { name: ui('common.continue'), exact: true }).click()
      continue
    }
    await area
      .locator(`[data-choice-id="${pickChoice(ending, ids)}"]`)
      .first()
      .click()
  }
  throw new Error(`Ending ${ending} was not reached`)
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  ;(page as unknown as { errors: string[] }).errors = errors
  await page.addInitScript(() =>
    localStorage.setItem('g317:settings', JSON.stringify({ mode: 'mobile', reduceFlashing: true })),
  )
})
test.afterEach(({ page }) => expect((page as unknown as { errors: string[] }).errors).toEqual([]))

for (const ending of ['A', 'B', 'C'] as const) {
  test(`mobile real input playthrough to ending ${ending}`, async ({ page }, info) => {
    test.setTimeout(180_000)
    await page.goto('/?debug=1')
    await startNamedRun(page, 'Dilnoza')
    await page.addStyleTag({ content: '.debug-overlay { display: none }' })
    // A narrow viewport also guarantees the mobile route independently of stored preferences.
    await page.setViewportSize({ width: 360, height: 640 })
    await expect(page.locator('.mobile-game')).toBeVisible()
    await play(page, ending)
    if (info.project.name === 'small-android') {
      await page.screenshot({ path: `tests/screenshots/phase7-ending-${ending}-mobile.png` })
      await page.locator('.ending-narration').hover()
      await page.mouse.wheel(0, 1600)
      await expect(page.locator('.ending-narration .line').last()).toBeVisible()
      // The last line of each ending is reachable by scrolling on a 360×640 screen.
      await expect(page.locator('.ending-narration .line').last()).toContainText(
        story.nodes[`end${ending}`]!.lines.at(-1)!.variants.at(-1)!.text,
      )
      await page.screenshot({ path: `tests/screenshots/phase7-ending-${ending}-mobile-bottom.png` })
    }
  })
}
