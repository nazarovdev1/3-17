import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

// Check the actual WOFF cmap so browser font fallback cannot hide missing glyphs.
for (const font of ['ibm-plex-mono', 'oswald']) {
  const data = readFileSync(`node_modules/@fontsource/${font}/files/${font}-latin-400-normal.woff`)
  let cmap
  for (let i = 0; i < data.readUInt16BE(12); i++) {
    const pos = 44 + i * 20
    if (data.toString('ascii', pos, pos + 4) !== 'cmap') continue
    const offset = data.readUInt32BE(pos + 4)
    const length = data.readUInt32BE(pos + 8)
    const table = data.subarray(offset, offset + length)
    cmap = length === data.readUInt32BE(pos + 12) ? table : inflateSync(table)
  }
  if (!cmap) throw new Error(`${font}: cmap missing`)
  for (const cp of [0x02bb, 0x2019]) {
    let glyph = 0
    for (let i = 0; i < cmap.readUInt16BE(2); i++) {
      const base = cmap.readUInt32BE(8 + i * 8)
      if (cmap.readUInt16BE(base) !== 4) continue
      const count = cmap.readUInt16BE(base + 6) / 2
      for (let j = 0; j < count; j++) {
        const end = cmap.readUInt16BE(base + 14 + j * 2)
        const start = cmap.readUInt16BE(base + 16 + count * 2 + j * 2)
        if (cp < start || cp > end) continue
        const delta = cmap.readInt16BE(base + 16 + count * 4 + j * 2)
        const rangePos = base + 16 + count * 6 + j * 2
        const range = cmap.readUInt16BE(rangePos)
        const mapped = range ? cmap.readUInt16BE(rangePos + range + (cp - start) * 2) : cp
        glyph = mapped ? (mapped + delta) & 0xffff : 0
      }
    }
    if (!glyph) throw new Error(`${font}: U+${cp.toString(16)} missing`)
    console.log(`${font}: U+${cp.toString(16).toUpperCase()} → glyph ${glyph}`)
  }
}
