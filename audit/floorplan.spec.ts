// Renders docs/floorplan.svg to a PNG for the phase contact sheet.
// Run: npx playwright test -c audit/playwright.audit.config.ts floorplan
import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'

test('floor plan png', async ({ page }) => {
  const svg = readFileSync('docs/floorplan.svg', 'utf8')
  const [, w, h] = /width="(\d+)" height="(\d+)"/.exec(svg)!
  await page.setViewportSize({ width: Number(w), height: Number(h) })
  await page.setContent(`<body style="margin:0">${svg}</body>`)
  await page.screenshot({ path: 'audit/screenshots/f3/floorplan.png' })
})
