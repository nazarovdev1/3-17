// Build the single owner review sheet and measure darkness of every F4 evidence image.
// Run: node audit/f4-contact-sheet.mjs (after the f4 capture).
import sharp from 'sharp'
import { readdir, writeFile } from 'node:fs/promises'

const folder = 'audit/screenshots/f4'
const shots = [
  ['01-under-door', '01 · Night 4, 3:17 / feet in the light under the door'],
  ['02-frosted-glass', '02 · Night 3 / a shape behind the kitchen glass'],
  ['03-peephole', '03 · Night 4 / peephole: by the stairs, back turned'],
  ['11-peephole-close', '04 · Night 5 / peephole: right behind the door'],
  ['04-stairwell', '05 · Night 2 / far end of the landing, light off'],
  ['05-tv-reflection', '06 · Night 3 / in the dark TV glass, behind you'],
  ['06-phone', '07 · Phone / missed calls from Onam'],
  ['07-phone-message', '08 · Phone / the voice message playing'],
  ['08-diary', '09 · Diary page held up to read'],
  ['09-coat', '10 · Night 3 / a coat on the hook that is not yours'],
  ['09b-chair', '11 · Night 4 / the chair turned to the wall of 48'],
  ['10-footprints', '12 · Night 4 / wet prints to door 48'],
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
const path = 'audit/screenshots/f4-contact-sheet.jpg'
await sharp({ create: { width: tileW * 2, height: tileH * 6, channels: 3, background: '#101318' } })
  .composite(composites)
  .jpeg({ quality: 93 })
  .toFile(path)
const darkness = {}
for (const name of (await readdir(folder))
  .filter((name) => name.endsWith('.png') && /^\d/.test(name))
  .sort()) {
  const { data, info } = await sharp(`${folder}/${name}`)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  // Peephole shots: only the lens counts; the black around it is the door, by design.
  const lens = name.includes('peephole')
  let dark = 0
  let counted = 0
  for (let i = 0, p = 0; i < data.length; i += info.channels, p++) {
    const x = (p % info.width) - info.width / 2
    const y = Math.floor(p / info.width) - info.height / 2
    if (lens && Math.hypot(x, y) > info.height * 0.36) continue
    counted++
    if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] < 20) dark++
  }
  darkness[name] = Number(((dark / counted) * 100).toFixed(1))
}
await writeFile(`${folder}/darkness.json`, `${JSON.stringify(darkness, null, 2)}\n`)
console.log(path)
console.table(darkness)
const tooDark = Object.entries(darkness).filter(([, percent]) => percent > 60)
if (tooDark.length) throw new Error(`F4 near-black cap exceeded: ${JSON.stringify(tooDark)}`)
