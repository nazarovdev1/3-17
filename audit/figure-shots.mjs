// Shoots the figure bench views (dev server must be running).
// node audit/figure-shots.mjs [baseUrl] [views...]
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://localhost:5199'
const views = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ['front', 'side', 'back', 'three', 'head', 'hand']
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 700, height: 900 } })
for (const view of views) {
  const [name, query = ''] = view.split('?')
  await page.goto(
    `${base}/audit/figure.html?view=${name}&glb=/public/assets/models/figure.glb?t=${Date.now()}&${query}`,
  )
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 })
  await page.screenshot({
    path: `audit/screenshots/f4/bench-${name}${query ? '-' + query.replace(/[^a-z0-9]/gi, '') : ''}.png`,
  })
  console.log('✓', view)
}
await browser.close()
