// Top-down plan of the world (docs/floorplan.svg), drawn from src/content/world/layout.ts:
// rooms with their areas, walls with openings, door swings, and every object labelled.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  WORLD,
  footprint,
  openingRect,
  rectArea,
  type Rect,
  type Wall,
} from '../../src/content/world/layout'
import { wallSolids } from '../../src/core/validate/world'

const PX = 60 // pixels per metre
const PAD = 40
const minX = -7.4
const maxX = 3.5
const minZ = -5.0
const maxZ = 10.4
const W = (maxX - minX) * PX + PAD * 2
const H = (maxZ - minZ) * PX + PAD * 2 + 30
const sx = (x: number) => +((x - minX) * PX + PAD).toFixed(1)
const sz = (z: number) => +((z - minZ) * PX + PAD).toFixed(1)
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const FILL: Record<string, string> = {
  '47': '#f4efe4',
  '48': '#e3e1d8',
  common: '#e8ecef',
}

function rect(r: Rect, attrs: string) {
  return `<rect x="${sx(r.x0)}" y="${sz(r.z0)}" width="${+((r.x1 - r.x0) * PX).toFixed(1)}" height="${+((r.z1 - r.z0) * PX).toFixed(1)}" ${attrs}/>`
}

const out: string[] = []
out.push(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(0)}" height="${H.toFixed(0)}" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" font-family="Inter, Arial, sans-serif">`,
  `<rect width="100%" height="100%" fill="#ffffff"/>`,
  `<text x="${PAD}" y="24" font-size="15" font-weight="600">3:17 — 4th floor: flat 47, landing, flat 48 (mirrored). Generated from src/content/world/layout.ts · 1 m = ${PX} px</text>`,
)

for (const room of WORLD.rooms) {
  for (const r of room.rects) out.push(rect(r, `fill="${FILL[room.flat]}" stroke="none"`))
  const main = room.rects.reduce((a, b) => (rectArea(a) >= rectArea(b) ? a : b))
  const area = room.rects.reduce((sum, r) => sum + rectArea(r), 0)
  out.push(
    `<text x="${sx((main.x0 + main.x1) / 2)}" y="${sz(main.z0) + 16}" font-size="12" text-anchor="middle" fill="#6b6455">${room.id} · ${area.toFixed(1)} m²</text>`,
  )
}

const wallFill = (w: Wall) =>
  w.kind === 'partition' ? '#6f6a60' : w.kind === 'shaft' ? '#8d887d' : '#2b2a27'
for (const w of WORLD.walls) {
  for (const s of wallSolids(w).filter((b) => b.y0 === 0)) {
    out.push(rect(s, `fill="${wallFill(w)}"`))
  }
  for (const o of w.openings) {
    const r = openingRect(w, o)
    if (o.kind === 'window') {
      out.push(rect(r, `fill="#bcd3e6" stroke="#2b2a27" stroke-width="1"`))
    } else if (o.bottom > 0) {
      out.push(rect(r, `fill="#bcd3e6"`))
    }
  }
}

// Door swings: quarter circles from the hinge.
for (const d of WORLD.doors) {
  const w = WORLD.walls.find((wall) => wall.id === d.wall)
  const o = w?.openings.find((op) => op.door === d.id)
  if (!w || !o) continue
  const a0 = o.at - o.width / 2
  const a1 = o.at + o.width / 2
  const hinge = d.hinge === 'low' ? a0 : a1
  const free = d.hinge === 'low' ? a1 : a0
  const face =
    d.swing > 0 ? (w.axis === 'x' ? w.box.z1 : w.box.x1) : w.axis === 'x' ? w.box.z0 : w.box.x0
  const leaf = o.width * d.swing
  const [hx, hz, fx, fz, ox, oz] =
    w.axis === 'x'
      ? [hinge, face, free, face, hinge, face + leaf]
      : [face, hinge, face, free, face + leaf, hinge]
  out.push(
    `<path d="M${sx(hx)} ${sz(hz)} L${sx(ox)} ${sz(oz)} A${o.width * PX} ${o.width * PX} 0 0 ${(d.swing > 0 === (d.hinge === 'low')) === (w.axis === 'x') ? 0 : 1} ${sx(fx)} ${sz(fz)}" fill="none" stroke="#a0763c" stroke-width="1.2"/>`,
  )
  if (d.label) {
    out.push(
      `<text x="${sx(w.axis === 'x' ? o.at : face)}" y="${sz(w.axis === 'x' ? face : o.at) + (d.swing > 0 ? 14 : -6)}" font-size="12" font-weight="700" text-anchor="middle" fill="#a0763c">${d.label}</text>`,
    )
  }
}

for (const ob of WORLD.objects) {
  const f = footprint(ob)
  const colour =
    ob.support.on === 'ceiling' ? '#8aa0b8' : ob.support.on === 'wall' ? '#b07a52' : '#5b7a5a'
  out.push(
    rect(
      f,
      `fill="${colour}" fill-opacity="${ob.support.on === 'ceiling' ? 0.15 : 0.35}" stroke="${colour}" stroke-width="1"${ob.support.on === 'ceiling' ? ' stroke-dasharray="3 2"' : ''}`,
    ),
  )
  out.push(
    `<text x="${sx((f.x0 + f.x1) / 2)}" y="${sz((f.z0 + f.z1) / 2) + 3}" font-size="8.5" text-anchor="middle" fill="#1f2a1f">${esc(ob.id)}</text>`,
  )
}

// Scale bar and legend.
const ly = H - 22
out.push(
  `<line x1="${PAD}" y1="${ly}" x2="${PAD + PX}" y2="${ly}" stroke="#000" stroke-width="2"/>`,
  `<text x="${PAD + PX + 6}" y="${ly + 4}" font-size="11">1 m</text>`,
  `<text x="${PAD + PX + 50}" y="${ly + 4}" font-size="11" fill="#5b7a5a">■ floor object</text>`,
  `<text x="${PAD + PX + 150}" y="${ly + 4}" font-size="11" fill="#b07a52">■ wall-mounted</text>`,
  `<text x="${PAD + PX + 255}" y="${ly + 4}" font-size="11" fill="#8aa0b8">▢ ceiling</text>`,
  `<text x="${PAD + PX + 330}" y="${ly + 4}" font-size="11" fill="#a0763c">⌒ door swing</text>`,
  `</svg>`,
)

export const FLOORPLAN = join(import.meta.dirname, '..', '..', 'docs', 'floorplan.svg')
writeFileSync(FLOORPLAN, out.join('\n') + '\n')
console.log(`✓ ${FLOORPLAN}`)
