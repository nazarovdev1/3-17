import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { STILL_RECIPES } from '../src/presenters/mobile/still-scenes'
import type { StillApi } from '../src/presenters/desktop/StillCapture'
import { withStillCredits } from './assets/still-credits'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'public/assets/stills')
mkdirSync(output, { recursive: true })
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '4175',
    '--strictPort',
    '--mode',
    'e2e',
  ],
  { cwd: root, windowsHide: true, stdio: 'ignore' },
)
const base = 'http://127.0.0.1:4175'
const selected = process.argv
  .find((arg) => arg.startsWith('--only='))
  ?.slice(7)
  .split(',')
const manifestPath = resolve(root, 'src/presenters/mobile/stills.gen.json')
interface Frame {
  color: string
  depth: string
  bytes: number
  colorHash: string
  depthHash: string
  camera: string
  anchors: Record<string, { x: number; y: number }>
}
const frames = existsSync(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as { frames: Record<string, Frame> }).frames
  : ({} as Record<string, Frame>)
for (const [id, frame] of Object.entries(frames)) {
  if (STILL_RECIPES.some((recipe) => recipe.id === id)) continue
  for (const url of [frame.color, frame.depth]) {
    if (!/^\/assets\/stills\/[a-z0-9_-]+(?:\.depth)?\.webp$/.test(url))
      throw new Error('Invalid obsolete still path')
    const file = resolve(root, 'public', url.slice(1))
    if (existsSync(file)) unlinkSync(file)
  }
  delete frames[id]
}
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(base)).ok) break
    } catch {
      /* Server is still starting. */
    }
    await new Promise((done) => setTimeout(done, 200))
  }
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  })
  await page.route('https://telegram.org/js/telegram-web-app.js', (r) =>
    r.fulfill({ body: '', contentType: 'application/javascript' }),
  )
  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem(
      'g317:settings',
      JSON.stringify({ mode: 'desktop', reduceFlashing: true, masterVolume: 0 }),
    )
    localStorage.setItem(
      'g317:meta',
      JSON.stringify({
        kind: 'meta',
        saveVersion: 1,
        meta: { contentWarningAccepted: true, endingsSeen: [], chaptersUnlocked: [] },
      }),
    )
    sessionStorage.setItem('g317:controls', '1')
  })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  for (const recipe of STILL_RECIPES.filter((r) => !selected || selected.includes(r.id))) {
    console.log(`Rendering ${recipe.id}…`)
    await page.goto(
      `${base}/?debug=1&render=still&cam=${recipe.camera}&state=${recipe.id}&quality=ultra&figureHold=1`,
    )
    await page.getByRole('button', { name: 'Yangi oʻyin', exact: true }).click()
    await page.getByRole('textbox').fill('Dilnoza')
    await page.locator('.panel > button').last().click()
    await page.waitForFunction(
      () =>
        window.__still &&
        (
          window as unknown as { __game: { getDesktopState: () => { worldReady: boolean } } }
        ).__game.getDesktopState().worldReady,
      undefined,
      { timeout: 120_000 },
    )
    console.log('World ready')
    await page.addStyleTag({
      content:
        '.desktop-game,.desktop-view{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important}.desktop-hud,.desktop-topline,.desktop-controls,.crosshair,.interaction-prompt,.debug-overlay,.audio-unlock{display:none!important}',
    })
    await page.evaluate((shot) => {
      const api = (
        window as unknown as {
          __game: {
            goTo: (id: string) => void
            setFlag: (key: string, value: boolean | string) => void
          }
        }
      ).__game
      for (const node of shot.nodes) api.goTo(node)
      for (const [key, value] of Object.entries(shot.flags ?? {})) api.setFlag(key, value)
      api.setFlag('time', shot.time)
    }, recipe)
    await page.waitForTimeout(1800)
    await page.evaluate(() => document.fonts.ready)
    const capture = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await page.waitForFunction(() => !!window.__still)
          return await page.evaluate(async () => {
            const api = window.__still as StillApi
            await api.settle()
            if (api !== window.__still) throw new Error('Still capture invalidated by reload')
            return { color: api.color(), depth: api.depth(), anchors: api.anchors() }
          })
        } catch (error) {
          if (attempt === 2) throw error
        }
      }
      throw new Error('Still capture failed')
    }
    const snapshot = await capture()
    const png = Buffer.from(snapshot.color.split(',')[1]!, 'base64')
    const dimensions = await sharp(png).metadata()
    if (dimensions.width !== 1080 || dimensions.height !== 1920)
      throw new Error('Still export must be native 1080×1920')
    const color = await sharp(png).webp({ quality: 80, effort: 6 }).toBuffer()
    const depth = await sharp(Buffer.from(snapshot.depth.split(',')[1]!, 'base64'))
      .resize(270, 480)
      .greyscale()
      .webp({ lossless: true })
      .toBuffer()
    const anchors = snapshot.anchors
    const colorPath = `/assets/stills/${recipe.id}.webp`,
      depthPath = `/assets/stills/${recipe.id}.depth.webp`
    writeFileSync(resolve(output, `${recipe.id}.webp`), color)
    writeFileSync(resolve(output, `${recipe.id}.depth.webp`), depth)
    frames[recipe.id] = {
      color: colorPath,
      depth: depthPath,
      bytes: color.length + depth.length,
      colorHash: createHash('sha256').update(color).digest('hex'),
      depthHash: createHash('sha256').update(depth).digest('hex'),
      camera: recipe.camera,
      anchors,
    }
    const generated = {
      version: 1,
      width: 1080,
      height: 1920,
      depthWidth: 270,
      depthHeight: 480,
      source: 'Rendered from the credited 3:17 desktop world; see CREDITS.md',
      frames,
      credit: {
        author: '3:17 project',
        sourceUrl: 'https://github.com/nazarovdev1/3-17/blob/main/scripts/render-stills.ts',
        license: 'CC-BY-4.0',
      },
    }
    writeFileSync(manifestPath, JSON.stringify(generated, null, 2) + '\n')
    const creditsPath = resolve(root, 'CREDITS.md')
    writeFileSync(creditsPath, withStillCredits(readFileSync(creditsPath, 'utf8'), generated))
    console.log(`${recipe.id}: ${Math.round((color.length + depth.length) / 1024)} KB`)
    if (errors.length) throw new Error(errors.join('\n'))
  }
  const bytes = Object.values(frames).reduce((sum, frame) => sum + frame.bytes, 0)
  if (bytes > 10 * 1024 * 1024) throw new Error('Mobile stills exceed 10 MB')
  console.log(
    `${Object.keys(frames).length} stills, ${(bytes / 1024 / 1024).toFixed(2)} MB / 10 MB`,
  )
} finally {
  await browser.close()
  server.kill()
}
