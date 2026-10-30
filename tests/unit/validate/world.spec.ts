// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { WORLD, roomArea, type WorldObject } from '@/content/world/layout'
import { validateWorld } from '@/core/validate/world'

const added: WorldObject[] = []
function add(o: Partial<WorldObject> & Pick<WorldObject, 'id'>) {
  const base: WorldObject = {
    id: o.id,
    room: 'room',
    asset: 'cardboard_box_01',
    position: [1.0, 0, -1.0],
    rotation: 0,
    size: [0.39, 0.34, 0.52],
    support: { on: 'floor' },
    purpose: 'test',
    blocks: true,
  }
  const object = { ...base, ...o }
  WORLD.objects.push(object)
  added.push(object)
}
afterEach(() => {
  for (const o of added.splice(0)) WORLD.objects.splice(WORLD.objects.indexOf(o), 1)
})

describe('validate:world (FIX_PROMPT §4.3)', () => {
  it('detects furniture in a door swing even when the doorway itself is clear', () => {
    const chair = WORLD.objects.find((o) => o.id === 'kitchen_chair_1')!
    const before = chair.position
    try {
      chair.position = [1.6, 0, 1.5]
      expect(validateWorld().errors).toContain('kitchen_chair_1 intersects the kitchen_door swing')
    } finally {
      chair.position = before
    }
  })

  it('detects furniture in the built-in wardrobe leaf sweep', () => {
    add({ id: 'wardrobe-sweep-test', room: 'corridor', position: [-0.15, 0, 0.5] })
    expect(validateWorld().errors).toContain('wardrobe-sweep-test intersects the wardrobe swing')
  })
  it('passes on the shipped plan', () => {
    expect(validateWorld().errors).toEqual([])
  })

  it('keeps the plan close to a real Soviet one-room flat', () => {
    expect(roomArea('room')).toBeGreaterThan(15)
    expect(roomArea('room')).toBeLessThan(19)
    expect(roomArea('kitchen')).toBeGreaterThan(6)
    expect(roomArea('kitchen')).toBeLessThan(8.5)
    expect(roomArea('bathroom')).toBeGreaterThan(3)
    expect(roomArea('bathroom')).toBeLessThan(4.5)
    const corridor = WORLD.rooms.find((r) => r.id === 'corridor')!.rects[0]!
    expect(corridor.x1 - corridor.x0).toBeCloseTo(1.2, 2)
    const front = WORLD.walls.flatMap((w) => w.openings).find((o) => o.door === 'front_door')!
    expect(front.width).toBeCloseTo(0.9, 2)
    expect(front.top).toBeCloseTo(2.05, 2)
  })

  it('catches a floating object', () => {
    add({ id: 'floater', position: [1.0, 0.3, -1.0] })
    expect(validateWorld().errors.join('\n')).toMatch(/floater: floats/)
  })

  it('catches objects intersecting each other and walls', () => {
    add({ id: 'in_sofa', position: [-1.5, 0, -1.6] })
    add({ id: 'in_wall', position: [1.0, 0, 0.05], room: 'room' })
    const errors = validateWorld().errors.join('\n')
    expect(errors).toMatch(/sofa intersects in_sofa|in_sofa intersects sofa/)
    expect(errors).toMatch(/in_wall intersects wall room_south/)
  })

  it('catches an object outside its room', () => {
    add({ id: 'lost', room: 'kitchen', position: [-1.0, 0, -2.0] })
    expect(validateWorld().errors.join('\n')).toMatch(/lost: outside room kitchen/)
  })

  it('catches a model scaled out of its real proportions', () => {
    add({ id: 'stretched', size: [0.39, 0.9, 0.52] })
    expect(validateWorld().errors.join('\n')).toMatch(/stretched: [xyz] is .* declared/)
  })

  it('catches a blocked doorway and an unreachable room', () => {
    add({ id: 'blocker', room: 'corridor', position: [0, 0, 0.45], size: [1.17, 0.68, 0.7] })
    const errors = validateWorld().errors.join('\n')
    expect(errors).toMatch(/blocker blocks the room_door doorway/)
    expect(errors).toMatch(/flat 47: room cannot be reached/)
  })
})
