import { expect, it } from 'vitest'
import { QualityGovernor } from '@/platform/device/quality'
import { canWalk, walk, VIEWS } from '@/presenters/desktop/layout'

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
  expect(canWalk(2, 0, false)).toBe(false)
  expect(canWalk(6, 0, false)).toBe(false)
  expect(canWalk(6, 0, true)).toBe(true)
  expect(walk([0.59, 1.6, 1.5], 0.2, 0.1, false)).toEqual([0.59, 1.6, 1.6])
  expect(canWalk(0, 8, false, 4)).toBe(true)
  expect(canWalk(1.8, 6, false, 4)).toBe(false)
})
it('every scene spawn is connected by walkable doorways', () => {
  const visited = new Set(['0,2'])
  const queue: [[number, number]] = [[0, 2]]
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i]!
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx!,
        nz = z + dz!,
        key = `${nx},${nz}`
      if (
        nx < -30 ||
        nx > 90 ||
        nz < -45 ||
        nz > 110 ||
        visited.has(key) ||
        !canWalk(nx / 10, nz / 10, true)
      )
        continue
      visited.add(key)
      queue.push([nx, nz])
    }
  }
  for (const view of Object.values(VIEWS))
    expect(
      visited.has(`${Math.round(view.position[0] * 10)},${Math.round(view.position[2] * 10)}`),
    ).toBe(true)
})
