// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { canWalk, standAt, touchesDoor, type DoorLeaf } from '@/content/world/walk'

describe('door leaf collision', () => {
  const closed: DoorLeaf = { x0: -0.4, z0: 4.69, x1: 0.4, z1: 4.69 }
  const open: DoorLeaf = { x0: -0.4, z0: 4.69, x1: -0.4, z1: 3.89 }

  it('blocks the closed leaf and allows the same passage with the leaf swung aside', () => {
    const options = { flat48: false, extension: 0 }
    expect(canWalk(0, 4.69, { ...options, doorLeaves: [closed] })).toBe(false)
    expect(canWalk(0, 4.69, { ...options, doorLeaves: [open] })).toBe(true)
    expect(standAt(0, 4.69, 0, { ...options, doorLeaves: [closed] })).toBeNull()
    expect(standAt(0, 4.69, 0, { ...options, doorLeaves: [open] })).toBe(0)
  })

  it('includes the ends of the leaf but not the infinite extension of its line', () => {
    expect(touchesDoor(0.5, 4.69, closed)).toBe(true)
    expect(touchesDoor(0.7, 4.69, closed)).toBe(false)
  })
})
