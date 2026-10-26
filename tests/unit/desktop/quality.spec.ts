import { expect, it } from 'vitest'
import { QualityGovernor } from '@/platform/device/quality'
import { walk, VIEWS } from '@/presenters/desktop/layout'
import { canWalk } from '@/content/world/walk'
import { mirrorX } from '@/content/world/layout'

it('drops only after three sustained seconds and falls back only on the low tier', () => {
  const governor = new QualityGovernor()
  let action: string | null = null
  for (let i = 0; i < 118; i++) action = governor.sample(1 / 39) ?? action
  expect(action).toBe('low')
  expect(governor.tier).toBe('low')
  for (let i = 0; i < 73; i++) action = governor.sample(1 / 24) ?? action
  expect(action).toBe('fallback')
  const fast = new QualityGovernor()
  for (let i = 0; i < 400; i++) expect(fast.sample(1 / 60)).toBeNull()
})
it('resets interrupted measurement windows', () => {
  const governor = new QualityGovernor()
  for (let i = 0; i < 30; i++) governor.sample(1 / 15)
  governor.resetWindow()
  for (let i = 0; i < 30; i++) expect(governor.sample(1 / 15)).toBeNull()
  expect(governor.tier).toBe('high')
})
it('blocks walls, furniture and sealed 48, slides along walls and grows the corridor', () => {
  const closed = { flat48: false, extension: 0 }
  const open48 = { flat48: true, extension: 0 }
  // Inside a wall (room/corridor partition beside the door) and inside the sofa.
  expect(canWalk(1.0, 0.05, closed)).toBe(false)
  expect(canWalk(-1.5, -1.6, closed)).toBe(false)
  // Through the room doorway and on into the corridor.
  expect(canWalk(0, 0.05, closed)).toBe(true)
  // Flat 48 only once its door is open.
  expect(canWalk(mirrorX(0.6), -0.6, closed)).toBe(false)
  expect(canWalk(mirrorX(0.6), -0.6, open48)).toBe(true)
  // Sliding: pushing into the corridor's east wall keeps the forward move.
  expect(walk([0.35, 1.6, 2.4], 0.2, 0.1, false)).toEqual([0.35, 1.6, 2.5])
  // The night-3 corridor grows: its inserted piece is walkable, its sides are not.
  expect(canWalk(0, 4.5, { flat48: false, extension: 4 })).toBe(true)
  expect(canWalk(1.2, 4.5, { flat48: false, extension: 4 })).toBe(false)
  expect(canWalk(0.4, 7.5, { flat48: false, extension: 4 })).toBe(true)
})
it('every scene spawn is connected by walkable doorways', () => {
  const visited = new Set(['6,-6'])
  const queue: [number, number][] = [[6, -6]]
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i]!
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx
      const nz = z + dz
      const key = `${nx},${nz}`
      if (nx < -80 || nx > 40 || nz < -50 || nz > 110 || visited.has(key)) continue
      if (!canWalk(nx / 10, nz / 10, { flat48: true, extension: 0 })) continue
      visited.add(key)
      queue.push([nx, nz])
    }
  }
  for (const [name, view] of Object.entries(VIEWS))
    expect(
      visited.has(`${Math.round(view.position[0] * 10)},${Math.round(view.position[2] * 10)}`),
      name,
    ).toBe(true)
})
