// Build the single owner review sheet and measure darkness of every F3 evidence image.
// Run: node audit/f3-contact-sheet.mjs (after the f3 and floorplan captures).
import sharp from 'sharp'
import { readdir, writeFile } from 'node:fs/promises'

const folder = 'audit/screenshots/f3'
const shots = [
  ['floorplan', '01 · Floor plan / numbered object key'],
  ['01-room', '02 · Flat 47 / window and stopped clock'],
  ['02-room-sofa', '03 · Flat 47 / sofa and wall carpet'],
  ['04-kitchen', '04 · Kitchen / sink, table and window'],
  ['04b-kitchen-stove', '05 · Kitchen / stove, washer and fridge'],
  ['05c-bathroom-fixtures', '06 · Bathroom / tub, toilet and pedestal sink'],
  ['06-corridor', '07 · Corridor / entrance and bathroom doorway'],
  ['07-landing', '08 · Fourth-floor landing / lift'],
  ['07c-landing-stairs', '09 · Stairwell / flights and half-landing'],
  ['08-flat48', '10 · Flat 48 / decayed mirror of 47'],
  ['09-window', '11 · Courtyard / opposite block in snow'],
  ['10-outage', '12 · 3:17 / power cut and torch'],
]
const tileW = 720
const tileH = 482
const composites = []
for (const [index, [name, label]] of shots.entries()) {
  const left = (index % 2) * tileW
  const top = Math.floor(index / 2) * tileH
  const picture = await sharp(`${folder}/${name}.png`)
    .resize(tileW, 450, { fit: 'contain', background: '#101318' })
    .png()
    .toBuffer()
  const caption = Buffer.from(
    `<svg width="720" height="32"><rect width="720" height="32" fill="#1c222b"/><text x="14" y="22" fill="#edf0f3" font-family="Arial" font-size="17">${label}</text></svg>`,
  )
  composites.push({ input: picture, left, top }, { input: caption, left, top: top + 450 })
}
const path = 'audit/screenshots/f3-contact-sheet.jpg'
await sharp({ create: { width: tileW * 2, height: tileH * 6, channels: 3, background: '#101318' } })
  .composite(composites)
  .jpeg({ quality: 93 })
  .toFile(path)
const darkness = {}
for (const name of (await readdir(folder)).filter((name) => name.endsWith('.png')).sort()) {
  const { data, info } = await sharp(`${folder}/${name}`)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let dark = 0
  for (let i = 0; i < data.length; i += info.channels) {
    if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] < 20) dark++
  }
  darkness[name] = Number(((dark / (info.width * info.height)) * 100).toFixed(1))
}
await writeFile(`${folder}/darkness.json`, `${JSON.stringify(darkness, null, 2)}\n`)
console.log(path)
console.table(darkness)
const tooDark = Object.entries(darkness).filter(([, percent]) => percent > 60)
if (tooDark.length) throw new Error(`F3 near-black cap exceeded: ${JSON.stringify(tooDark)}`)
