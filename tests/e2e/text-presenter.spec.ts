import { test, expect } from '@playwright/test'

/**
 * Phase 2 exit: all 3 endings playable in the text presenter through real
 * clicks. Ending per env var ENDING (A|B|C).
 *
 * Strategy: at each choice hub the first preference regex matching a button
 * wins; otherwise the first button not clicked before in this night wins.
 * Ordering encodes pacing (tea before scares), diary collection (C), silence
 * on night 3 (C), and the final choice (A opens the door, B leaves).
 */
const ending = (process.env.ENDING ?? 'A') as 'A' | 'B' | 'C'

const PREFERENCES: Record<'A' | 'B' | 'C', RegExp[]> = {
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
    // All diary pickups before any progression so nothing is locked out later.
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

/** Optional scary nodes the C run skips to protect the sanity >= 40 gate. */
const AVOID_C = /Televizorni|tinglash|buyumlaringiz|Yugurib|Javob berish|Sardormisan|Nega men/

test(`text presenter playthrough to ending ${ending}`, async ({ page }) => {
  test.setTimeout(300_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/?presenter=text')

  const preferences = PREFERENCES[ending]
  const clickedThisNight = new Set<string>()
  let currentNight = 0
  let reachedEnding = false

  for (let i = 0; i < 300; i++) {
    const heading = page.getByRole('heading', { name: /^Tugam:/ })
    if (await heading.isVisible().catch(() => false)) {
      reachedEnding = true
      expect((await heading.textContent()) ?? '').toContain(ending)
      break
    }

    const info = (await page.locator('p').first().textContent()) ?? ''
    if (process.env.TRACE) console.log(`[trace] ${info}`)
    const nightMatch = info.match(/tun (\d+)/)
    const night = nightMatch ? Number(nightMatch[1]) : 0
    if (night !== currentNight) {
      currentNight = night
      clickedThisNight.clear()
    }

    const buttons = page.getByRole('button')
    const count = await buttons.count()
    if (count === 0) break

    if (count === 1) {
      await buttons.nth(0).click()
      continue
    }

    const labels: string[] = []
    for (let b = 0; b < count; b++) {
      // Strip the presenter's "N. " numbering prefix so the seen-set keys are stable.
      labels.push(((await buttons.nth(b).textContent()) ?? '').replace(/^\d+\.\s*/, ''))
    }
    const fresh = labels.map((l, idx) => ({ l, idx })).filter(({ l }) => !clickedThisNight.has(l))
    let pickFrom = fresh.length > 0 ? fresh : labels.map((l, idx) => ({ l, idx }))
    if (ending === 'C' && pickFrom.length > 1) {
      const safe = pickFrom.filter(({ l }) => !AVOID_C.test(l))
      if (safe.length > 0) pickFrom = safe
    }

    let target = pickFrom[0]!.idx
    for (const re of preferences) {
      const hit = pickFrom.find(({ l }) => re.test(l))
      if (hit) {
        target = hit.idx
        break
      }
    }
    clickedThisNight.add(labels[target] ?? '')
    await buttons.nth(target).click()
  }

  expect(reachedEnding, `reached ending ${ending}`).toBe(true)
  expect(errors).toEqual([])
})
