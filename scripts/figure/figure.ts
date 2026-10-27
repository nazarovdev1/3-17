// The figure (FIX_PROMPT §4.4): an original, smooth humanoid in a long coat, built from a
// signed distance field and meshed with surface nets. Nothing is a visible primitive: every
// part is blended into the next (smooth union), the surface is projected back onto the
// field and normals come from its gradient. Proportions are those of a thin man of about
// 2.03 m with arms and fingers a little too long — tall enough to feel wrong in a 2.6 m flat.
//
// Two meshes: `figure_body` (coat, trousers, shoes, hands) and `figure_head` (head and
// neck, hidden inside the collar) parented at the neck pivot so the head can turn alone.
// Vertex colours carry the materials. The figure faces +z, feet on y = 0.
//
// Used by scripts/assets/fetch.ts (source 'original'); `npx tsx scripts/figure/figure.ts out.glb`
// writes it directly.
import { writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { Document, NodeIO } from '@gltf-transform/core'

type V3 = [number, number, number]

// ---------- SDF primitives (after Inigo Quilez) ----------

const len3 = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const mix = (a: number, b: number, t: number) => a + (b - a) * t

function smin(a: number, b: number, k: number) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1)
  return mix(b, a, h) - k * h * (1 - h)
}
function smax(a: number, b: number, k: number) {
  return -smin(-a, -b, k)
}

function ellipsoid(p: V3, c: V3, r: V3) {
  const x = p[0] - c[0]
  const y = p[1] - c[1]
  const z = p[2] - c[2]
  const k0 = len3(x / r[0], y / r[1], z / r[2])
  const k1 = len3(x / (r[0] * r[0]), y / (r[1] * r[1]), z / (r[2] * r[2]))
  return k1 === 0 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1
}

/** Segment a→b whose radius tapers from ra to rb (a "round cone", blended, never seen bare). */
function limb(p: V3, a: V3, b: V3, ra: number, rb: number) {
  const bax = b[0] - a[0]
  const bay = b[1] - a[1]
  const baz = b[2] - a[2]
  const pax = p[0] - a[0]
  const pay = p[1] - a[1]
  const paz = p[2] - a[2]
  const l2 = bax * bax + bay * bay + baz * baz
  const t = clamp((pax * bax + pay * bay + paz * baz) / l2, 0, 1)
  const d = len3(pax - bax * t, pay - bay * t, paz - baz * t)
  return d - mix(ra, rb, t)
}

/** Rotation about the x axis through `o` (used to tilt the head). */
function rotX(p: V3, o: V3, angle: number): V3 {
  const y = p[1] - o[1]
  const z = p[2] - o[2]
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [p[0], o[1] + y * c - z * s, o[2] + y * s + z * c]
}

// ---------- The figure ----------

export type Region = 'coat' | 'trousers' | 'shoes' | 'skin' | 'hair'

const COLOURS: Record<Region, V3> = {
  // Linear RGB. Dark wool, near-black trousers, wet black shoes, pale bloodless skin.
  coat: [0.018, 0.019, 0.021],
  trousers: [0.012, 0.012, 0.013],
  shoes: [0.006, 0.006, 0.006],
  skin: [0.26, 0.235, 0.22],
  hair: [0.008, 0.007, 0.007],
}

/** Where the head and neck pivot (inside the collar). */
export const NECK_PIVOT: V3 = [0, 1.62, -0.012]
/** The head leans forward a little: it looks down at whoever is in front of it. */
const HEAD_TILT = 0.14

function headParts(q: V3) {
  // q is in the tilted head frame.
  const p = rotX(q, [0, 1.76, 0], -HEAD_TILT)
  let face = ellipsoid(p, [0, 1.905, 0.018], [0.074, 0.112, 0.092])
  face = smin(face, ellipsoid(p, [0, 1.93, -0.018], [0.079, 0.096, 0.088]), 0.03)
  // Long jaw and narrow chin.
  face = smin(face, ellipsoid(p, [0, 1.83, 0.034], [0.056, 0.058, 0.062]), 0.03)
  face = smin(face, ellipsoid(p, [0, 1.795, 0.058], [0.028, 0.024, 0.03]), 0.02)
  // Brow ridge, cheekbones, nose, lips, ears.
  face = smin(face, ellipsoid(p, [0, 1.926, 0.086], [0.06, 0.015, 0.02]), 0.015)
  // Short hair: a thin shell over the skull, cut at the hairline.
  let hair = ellipsoid(p, [0, 1.932, -0.02], [0.084, 0.1, 0.093])
  hair = smax(hair, hairline(p) - p[1], 0.008)
  face = smin(face, hair, 0.006)
  for (const side of [-1, 1]) {
    face = smin(face, ellipsoid(p, [side * 0.045, 1.878, 0.07], [0.024, 0.018, 0.02]), 0.02)
    face = smin(face, ellipsoid(p, [side * 0.077, 1.895, -0.002], [0.011, 0.03, 0.019]), 0.008)
  }
  face = smin(face, limb(p, [0, 1.918, 0.094], [0, 1.866, 0.114], 0.008, 0.013), 0.01)
  face = smin(face, ellipsoid(p, [0, 1.846, 0.088], [0.024, 0.009, 0.011]), 0.008)
  // Deep-set eyes.
  for (const side of [-1, 1]) {
    face = smax(face, -ellipsoid(p, [side * 0.031, 1.899, 0.097], [0.016, 0.0105, 0.014]), 0.01)
  }
  const neck = limb(q, [0, 1.56, -0.022], [0, 1.8, 0.004], 0.054, 0.046)
  return smin(face, neck, 0.03)
}

/** Hairline height: high on the forehead, above the ears at the sides, low at the nape. */
function hairline(p: V3) {
  const back = clamp((0.04 - p[2]) / 0.12, 0, 1)
  const side = clamp((Math.abs(p[0]) - 0.04) / 0.04, 0, 1)
  return 1.962 - 0.05 * side * (1 - back) - 0.1 * back
}

function headRegion(q: V3): V3 {
  const p = rotX(q, [0, 1.76, 0], -HEAD_TILT)
  const t = clamp((p[1] - hairline(p) + 0.004) / 0.008, 0, 1)
  return blend([
    [COLOURS.skin, 1 - t],
    [COLOURS.hair, t],
  ])
}

function blend(parts: [V3, number][]): V3 {
  let w = 0
  const c: V3 = [0, 0, 0]
  for (const [colour, weight] of parts) {
    w += weight
    for (let i = 0; i < 3; i++) c[i]! += colour[i]! * weight
  }
  return w > 0 ? [c[0] / w, c[1] / w, c[2] / w] : parts[0]![0]
}

interface BodySample {
  d: number
  coat: number
  trousers: number
  shoes: number
  skin: number
}

function bodyParts(p: V3): BodySample {
  const [x, y, z] = p
  // Coat: stand-up collar, shoulders, a slightly hunched back, chest, waist, long skirt.
  const ring = Math.hypot(x, z / 0.9) - 0.083
  let coat = Math.hypot(
    Math.max(Math.abs(ring) - 0.012, 0),
    Math.max(Math.abs(y - 1.645) - 0.06, 0),
  )
  coat -= 0.008
  coat = smin(coat, ellipsoid(p, [0, 1.578, -0.014], [0.214, 0.06, 0.1]), 0.04)
  for (const side of [-1, 1]) {
    coat = smin(coat, ellipsoid(p, [side * 0.2, 1.55, -0.01], [0.056, 0.064, 0.062]), 0.035)
  }
  coat = smin(coat, ellipsoid(p, [0, 1.4, 0], [0.182, 0.215, 0.114]), 0.06)
  coat = smin(coat, ellipsoid(p, [0, 1.47, -0.036], [0.168, 0.15, 0.1]), 0.05)
  coat = smin(coat, ellipsoid(p, [0, 1.13, 0], [0.168, 0.21, 0.114]), 0.08)
  // Skirt: an elliptical flare from the waist to below the knee, with heavy cloth folds.
  const t = clamp((1.05 - y) / 0.69, 0, 1)
  const rx = mix(0.172, 0.236, t)
  const rz = mix(0.118, 0.162, t)
  const angle = Math.atan2(z, x)
  // Heavy wool falls in a few irregular folds, deeper toward the hem.
  const folds =
    t * 0.0048 * Math.sin(angle * 5 + y * 2.3 + Math.sin(angle * 3) * 1.6) +
    t * 0.0026 * Math.sin(angle * 11 + y * 5.5 + 0.7) +
    t * t * 0.002 * Math.sin(angle * 19 + 1.3)
  let skirt = (Math.hypot(x / rx, z / rz) - 1) * Math.min(rx, rz) + folds
  skirt = smax(skirt, 0.365 + 0.012 * Math.sin(angle * 5) - y, 0.012)
  skirt = smax(skirt, y - 1.14, 0.08)
  coat = smin(coat, skirt, 0.09)
  // Buttons and pocket flaps.
  for (const by of [1.43, 1.29, 1.15, 1.01]) {
    coat = smin(coat, len3(x - 0.012, y - by, z - 0.112 - 0.004 * (by - 1)) - 0.008, 0.004)
  }
  for (const side of [-1, 1]) {
    coat = smin(coat, ellipsoid(p, [side * 0.118, 0.975, 0.121], [0.058, 0.011, 0.012]), 0.008)
  }
  // Sleeves: long arms hanging close to the body, wrists low.
  let skin = Infinity
  for (const side of [-1, 1]) {
    const shoulder: V3 = [side * 0.212, 1.54, -0.014]
    const elbow: V3 = [side * 0.236, 1.205, -0.026]
    const wrist: V3 = [side * 0.246, 0.9, 0.018]
    coat = smin(coat, limb(p, shoulder, elbow, 0.054, 0.046), 0.03)
    coat = smin(coat, limb(p, elbow, wrist, 0.046, 0.044), 0.02)
    coat = smin(
      coat,
      limb(p, [side * 0.245, 0.93, 0.014], [side * 0.247, 0.897, 0.02], 0.047, 0.049),
      0.01,
    )
    // Hands: palm towards the thigh, long fingers.
    let hand = limb(p, [side * 0.247, 0.91, 0.02], [side * 0.25, 0.86, 0.026], 0.024, 0.026)
    hand = smin(hand, ellipsoid(p, [side * 0.252, 0.825, 0.028], [0.019, 0.052, 0.04]), 0.02)
    const fingers: [number, number][] = [
      [0.053, 0.088],
      [0.035, 0.097],
      [0.017, 0.092],
      [0.0, 0.078],
    ]
    for (const [fz, length] of fingers) {
      const base: V3 = [side * 0.254, 0.782, fz]
      const mid: V3 = [side * 0.252, 0.782 - length * 0.55, fz + 0.004]
      const tip: V3 = [side * 0.244, 0.782 - length, fz + 0.012]
      hand = smin(hand, limb(p, base, mid, 0.0088, 0.0078), 0.008)
      hand = smin(hand, limb(p, mid, tip, 0.0078, 0.0064), 0.004)
    }
    hand = smin(
      hand,
      limb(p, [side * 0.238, 0.84, 0.05], [side * 0.236, 0.786, 0.064], 0.0105, 0.0085),
      0.01,
    )
    skin = Math.min(skin, hand)
  }
  // Trousers and shoes.
  let trousers = Infinity
  let shoes = Infinity
  for (const side of [-1, 1]) {
    let leg = limb(p, [side * 0.095, 0.98, 0], [side * 0.1, 0.53, 0.012], 0.08, 0.064)
    leg = smin(
      leg,
      limb(p, [side * 0.1, 0.53, 0.012], [side * 0.104, 0.1, -0.004], 0.064, 0.05),
      0.02,
    )
    trousers = Math.min(trousers, leg)
    let shoe = ellipsoid(p, [side * 0.105, 0.05, 0.05], [0.049, 0.052, 0.138])
    shoe = smin(shoe, ellipsoid(p, [side * 0.104, 0.07, -0.035], [0.045, 0.05, 0.06]), 0.02)
    shoe = smax(shoe, -y, 0.006)
    shoes = Math.min(shoes, shoe)
  }
  let d = smin(coat, trousers, 0.015)
  d = smin(d, shoes, 0.012)
  d = smin(d, skin, 0.006)
  return { d, coat, trousers, shoes, skin }
}

const bodySdf = (p: V3) => bodyParts(p).d

/** The same coat, empty, on a hook: flattened front to back, the hem hanging straight. */
const HANG_FLAT = 0.7
const coatSdf = (p: V3) => bodyParts([p[0], p[1], p[2] / HANG_FLAT]).coat * HANG_FLAT
const coatColour = (): V3 => COLOURS.coat

/** Colour from the nearest parts, softly blended so seams do not alias. */
function bodyRegion(p: V3): V3 {
  const s = bodyParts(p)
  const w = (d: number) => Math.exp(-(d - s.d) / 0.0025)
  return blend([
    [COLOURS.coat, w(s.coat)],
    [COLOURS.trousers, w(s.trousers)],
    [COLOURS.shoes, w(s.shoes)],
    [COLOURS.skin, w(s.skin)],
  ])
}

// ---------- Surface nets ----------

interface Mesh {
  positions: Float32Array
  normals: Float32Array
  colors: Float32Array
  indices: Uint32Array
}

function gradient(f: (p: V3) => number, p: V3, e = 0.0007): V3 {
  const gx = f([p[0] + e, p[1], p[2]]) - f([p[0] - e, p[1], p[2]])
  const gy = f([p[0], p[1] + e, p[2]]) - f([p[0], p[1] - e, p[2]])
  const gz = f([p[0], p[1], p[2] + e]) - f([p[0], p[1], p[2] - e])
  const l = len3(gx, gy, gz) || 1
  return [gx / l, gy / l, gz / l]
}

function surfaceNets(
  f: (p: V3) => number,
  region: (p: V3) => V3,
  min: V3,
  max: V3,
  step: number,
): Mesh {
  const n = [0, 1, 2].map((i) => Math.ceil((max[i]! - min[i]!) / step) + 1) as V3
  const [nx, ny, nz] = n
  const field = new Float32Array(nx * ny * nz)
  const at = (i: number, j: number, k: number) => i + nx * (j + ny * k)
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++)
        field[at(i, j, k)] = f([min[0] + i * step, min[1] + j * step, min[2] + k * step])

  const cellVertex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1)
  const cell = (i: number, j: number, k: number) => i + (nx - 1) * (j + (ny - 1) * k)
  const verts: number[] = []
  const corners: V3[] = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ]
  const edges: [number, number][] = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ]
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const values = corners.map(([a, b, c]) => field[at(i + a, j + b, k + c)]!)
        let inside = 0
        for (const v of values) if (v < 0) inside++
        if (inside === 0 || inside === 8) continue
        let sx = 0
        let sy = 0
        let sz = 0
        let count = 0
        for (const [a, b] of edges) {
          const va = values[a]!
          const vb = values[b]!
          if (va < 0 === vb < 0) continue
          const t = va / (va - vb)
          const ca = corners[a]!
          const cb = corners[b]!
          sx += mix(ca[0], cb[0], t)
          sy += mix(ca[1], cb[1], t)
          sz += mix(ca[2], cb[2], t)
          count++
        }
        cellVertex[cell(i, j, k)] = verts.length / 3
        verts.push(
          min[0] + (i + sx / count) * step,
          min[1] + (j + sy / count) * step,
          min[2] + (k + sz / count) * step,
        )
      }

  const tris: number[] = []
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return
    if (flip) tris.push(a, b, c, a, c, d)
    else tris.push(a, d, c, a, c, b)
  }
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v0 = field[at(i, j, k)]!
        if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1) {
          const v1 = field[at(i + 1, j, k)]!
          if (v0 < 0 !== v1 < 0)
            quad(
              cellVertex[cell(i, j - 1, k - 1)]!,
              cellVertex[cell(i, j, k - 1)]!,
              cellVertex[cell(i, j, k)]!,
              cellVertex[cell(i, j - 1, k)]!,
              v0 < 0,
            )
        }
        if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1) {
          const v1 = field[at(i, j + 1, k)]!
          if (v0 < 0 !== v1 < 0)
            quad(
              cellVertex[cell(i - 1, j, k - 1)]!,
              cellVertex[cell(i - 1, j, k)]!,
              cellVertex[cell(i, j, k)]!,
              cellVertex[cell(i, j, k - 1)]!,
              v0 < 0,
            )
        }
        if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1) {
          const v1 = field[at(i, j, k + 1)]!
          if (v0 < 0 !== v1 < 0)
            quad(
              cellVertex[cell(i - 1, j - 1, k)]!,
              cellVertex[cell(i, j - 1, k)]!,
              cellVertex[cell(i, j, k)]!,
              cellVertex[cell(i - 1, j, k)]!,
              v0 < 0,
            )
        }
      }

  // Project each vertex onto the true surface (two Newton steps) — smooth, exact silhouettes.
  const count = verts.length / 3
  const positions = new Float32Array(verts)
  const normals = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let v = 0; v < count; v++) {
    let p: V3 = [positions[v * 3]!, positions[v * 3 + 1]!, positions[v * 3 + 2]!]
    for (let it = 0; it < 2; it++) {
      const d = f(p)
      const g = gradient(f, p)
      p = [p[0] - g[0] * d, p[1] - g[1] * d, p[2] - g[2] * d]
    }
    positions.set(p, v * 3)
    normals.set(gradient(f, p), v * 3)
    colors.set(region(p), v * 3)
  }
  // Surface nets winds by the field's sign; make it agree with the outward normals.
  const indices = new Uint32Array(tris)
  let agree = 0
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t]!, indices[t + 1]!, indices[t + 2]!]
    const e1 = [0, 1, 2].map((q) => positions[b * 3 + q]! - positions[a * 3 + q]!)
    const e2 = [0, 1, 2].map((q) => positions[c * 3 + q]! - positions[a * 3 + q]!)
    const cx = e1[1]! * e2[2]! - e1[2]! * e2[1]!
    const cy = e1[2]! * e2[0]! - e1[0]! * e2[2]!
    const cz = e1[0]! * e2[1]! - e1[1]! * e2[0]!
    agree += Math.sign(cx * normals[a * 3]! + cy * normals[a * 3 + 1]! + cz * normals[a * 3 + 2]!)
  }
  if (agree < 0) {
    for (let t = 0; t < indices.length; t += 3) {
      const b = indices[t + 1]!
      indices[t + 1] = indices[t + 2]!
      indices[t + 2] = b
    }
  }
  return { positions, normals, colors, indices }
}

// ---------- Export ----------

export function buildFigure(step = 0.006) {
  const body = surfaceNets(bodySdf, bodyRegion, [-0.34, -0.01, -0.22], [0.34, 1.73, 0.3], step)
  const headWorld = (p: V3): V3 => [
    p[0] + NECK_PIVOT[0],
    p[1] + NECK_PIVOT[1],
    p[2] + NECK_PIVOT[2],
  ]
  // The head mesh is built around the pivot, so rotating its node turns the head.
  const head = surfaceNets(
    (p) => headParts(headWorld(p)),
    (p) => headRegion(headWorld(p)),
    [-0.11, -0.08, -0.13],
    [0.11, 0.43, 0.17],
    step * 0.7,
  )
  const coat = surfaceNets(coatSdf, coatColour, [-0.34, 0.3, -0.16], [0.34, 1.73, 0.21], step * 1.4)
  return { body, head, coat }
}

export async function writeFigure(path: string) {
  const { body, head, coat } = buildFigure()
  const doc = new Document()
  const buffer = doc.createBuffer()
  const material = doc
    .createMaterial('figure')
    .setBaseColorFactor([1, 1, 1, 1])
    .setRoughnessFactor(0.88)
    .setMetallicFactor(0)
  const meshOf = (name: string, m: Mesh) => {
    const prim = doc
      .createPrimitive()
      .setAttribute(
        'POSITION',
        doc.createAccessor().setType('VEC3').setArray(m.positions).setBuffer(buffer),
      )
      .setAttribute(
        'NORMAL',
        doc.createAccessor().setType('VEC3').setArray(m.normals).setBuffer(buffer),
      )
      .setAttribute(
        'COLOR_0',
        doc.createAccessor().setType('VEC3').setArray(m.colors).setBuffer(buffer),
      )
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(m.indices).setBuffer(buffer))
      .setMaterial(material)
    return doc.createMesh(name).addPrimitive(prim)
  }
  const headNode = doc
    .createNode('figure_head')
    .setMesh(meshOf('figure_head', head))
    .setTranslation(NECK_PIVOT)
  const bodyNode = doc.createNode('figure_body').setMesh(meshOf('figure_body', body))
  const root = doc.createNode('figure').addChild(bodyNode).addChild(headNode)
  // Not part of the figure: its coat, hanging empty (night 2 on). Kept apart by name.
  const coatNode = doc.createNode('hanging_coat').setMesh(meshOf('hanging_coat', coat))
  doc.createScene('figure').addChild(root).addChild(coatNode)
  writeFileSync(path, await new NodeIO().writeBinary(doc))
  return {
    triangles: (body.indices.length + head.indices.length + coat.indices.length) / 3,
    vertices: (body.positions.length + head.positions.length + coat.positions.length) / 3,
  }
}

if (process.argv[1] && basename(process.argv[1]).startsWith('figure')) {
  const out = process.argv[2] ?? 'figure.glb'
  const started = Date.now()
  void writeFigure(out).then((stats) =>
    console.log(
      `✓ ${out}: ${stats.triangles} triangles, ${stats.vertices} vertices, ${Date.now() - started} ms`,
    ),
  )
}
