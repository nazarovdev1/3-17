import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import sharp, { type OverlayOptions } from 'sharp'

const manifest = JSON.parse(readFileSync('src/presenters/mobile/stills.gen.json', 'utf8')) as {
  frames: Record<string, { color: string }>
}
const directory = 'audit/screenshots/f6'
mkdirSync(directory, { recursive: true })
const ids = Object.keys(manifest.frames).sort()
const report: { id: string; nearBlack: number; measuredArea: string }[] = []
for (let first = 0; first < ids.length; first += 12) {
  const group = ids.slice(first, first + 12),
    columns = 3,
    tileWidth = 200,
    tileHeight = 376
  const images: OverlayOptions[] = []
  for (const [index, id] of group.entries()) {
    const file = `public${manifest.frames[id]!.color}`
    const bitmap = await sharp(file).resize(180, 320).removeAlpha().raw().toBuffer()
    let dark = 0,
      pixels = 0
    for (let y = 0; y < 320; y++)
      for (let x = 0; x < 180; x++) {
        if (id.startsWith('peephole') && ((x - 90) / 86) ** 2 + ((y - 160) / 141) ** 2 > 1) continue
        const i = (y * 180 + x) * 3
        if (Math.max(bitmap[i]!, bitmap[i + 1]!, bitmap[i + 2]!) < 13) dark++
        pixels++
      }
    report.push({
      id,
      nearBlack: Math.round((dark / pixels) * 1000) / 10,
      measuredArea: id.startsWith('peephole') ? 'lens' : 'full',
    })
    const left = (index % columns) * tileWidth,
      top = Math.floor(index / columns) * tileHeight
    images.push({ input: await sharp(file).resize(200, 356).toBuffer(), left, top: top + 20 })
    images.push({
      input: Buffer.from(
        `<svg width="200" height="20"><rect width="200" height="20" fill="#11161b"/><text x="7" y="14" font-family="Arial" font-size="11" fill="#eee">${id}</text></svg>`,
      ),
      left,
      top,
    })
  }
  await sharp({
    create: {
      width: columns * tileWidth,
      height: Math.ceil(group.length / columns) * tileHeight,
      channels: 3,
      background: '#11161b',
    },
  })
    .composite(images)
    .jpeg({ quality: 90 })
    .toFile(`${directory}/stills-sheet-${first / 12 + 1}.jpg`)
}
writeFileSync(`${directory}/darkness.json`, JSON.stringify(report, null, 2) + '\n')
const sizes = [
  [360, 640],
  [375, 667],
  [390, 844],
  [412, 915],
  [430, 932],
]
// The five-size sheet needs the E2E captures; rows whose screenshots are absent are skipped.
const rows = ['n1_hub', 'n4_phone'].filter((node) =>
  sizes.every(([width, height]) => existsSync(`${directory}/${width}x${height}-${node}.png`)),
)
const screens: OverlayOptions[] = []
for (const [row, node] of rows.entries()) {
  for (const [i, [width, height]] of sizes.entries()) {
    const file = `${directory}/${width}x${height}-${node}.png`
    const data = await sharp(file).resize({ width: 220 }).toBuffer()
    screens.push({ input: data, left: i * 230, top: row * 510 + 26 })
    screens.push({
      input: Buffer.from(
        `<svg width="230" height="24"><text x="6" y="17" font-family="Arial" font-size="14" fill="#eee">${width} × ${height} · ${node}</text></svg>`,
      ),
      left: i * 230,
      top: row * 510,
    })
  }
}
if (rows.length)
  await sharp({
    create: { width: 1150, height: rows.length * 510, channels: 3, background: '#11161b' },
  })
    .composite(screens)
    .jpeg({ quality: 92 })
    .toFile(`${directory}/five-sizes.jpg`)
else console.warn('Five-size screenshots are absent; run tests/e2e/mobile-hd.spec.ts first.')
console.log(JSON.stringify(report.filter((item) => item.nearBlack > 55)))
