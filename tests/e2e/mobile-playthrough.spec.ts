import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { startNamedRun } from './helpers'

const preferences = [
  /choy/i,
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
]
const avoid = /televizor|tinglash|buyumlaringiz|Yugurib|Javob berish|Sardormisan|Nega men/i

async function play(page: Page, ending: 'A' | 'B' | 'C') {
  const final =
    ending === 'C' ? /Soatni oʻrash/ : ending === 'B' ? /chiqib ketish/ : /Eshikni ochish/
  const seen = new Set<string>()
  let night = ''
  for (let i = 0; i < 250; i++) {
    if (
      await page
        .getByRole('heading', {
          name: { A: 'Qoʻshni', B: 'Ketish', C: '3:18' }[ending],
          exact: true,
        })
        .isVisible()
    )
      return
    const area = page.locator('.mobile-game')
    await expect(area).toBeVisible()
    const node = (await area.getAttribute('data-node')) ?? ''
    if (node.slice(0, 2) !== night) {
      night = node.slice(0, 2)
      seen.clear()
    }
    const buttons = area.locator('button:not(.pause-button)')
    const labels = await buttons.evaluateAll((items) =>
      items.map((item) => item.getAttribute('aria-label') ?? item.textContent ?? ''),
    )
    const fresh = labels
      .map((label, index) => ({ label, index }))
      .filter(({ label }) => !seen.has(label))
    let pool = fresh.length ? fresh : labels.map((label, index) => ({ label, index }))
    if (ending === 'C' && pool.length > 1) {
      const safe = pool.filter(({ label }) => !avoid.test(label))
      if (safe.length) pool = safe
    }
    let target = pool[0]!
    for (const re of [final, ...preferences]) {
      const match = pool.find(({ label }) => re.test(label))
      if (match) {
        target = match
        break
      }
    }
    seen.add(target.label)
    await buttons.nth(target.index).click()
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
      await page.screenshot({ path: `tests/screenshots/mobile-ending-${ending}.png` })
    }
  })
}
