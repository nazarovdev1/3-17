import { expect, it } from 'vitest'
import { doorHinge, SHARED_WALL, soundPosition } from '@/audio/positions'
import { objectById, PARTY_X, WORLD } from '@/content/world/layout'
import { objectPoint } from '@/content/world/objects'
import { SEQUENCES } from '@/content/nights'
import { actionsOf } from '@/core/validate/beats'

it('places wall knocks and breathing on the party wall, doors at their hinge, the phone where it lies', () => {
  expect(SHARED_WALL[0]).toBeCloseTo(PARTY_X + 0.1)
  expect(soundPosition('party_wall')).toEqual(SHARED_WALL)
  const phone = objectById('phone')!
  const at = soundPosition('phone')!
  expect(at[0]).toBeCloseTo(phone.position[0])
  expect(at[2]).toBeCloseTo(phone.position[2])
  const door = WORLD.doors.find((d) => d.id === 'front_door')!
  const wall = WORLD.walls.find((w) => w.id === door.wall)!
  const opening = wall.openings.find((o) => o.door === door.id)!
  expect(doorHinge('front_door')[0]).toBeCloseTo(opening.at + opening.width / 2)
  expect(soundPosition('front_door')).toEqual(doorHinge('front_door'))
  expect(soundPosition([1, 2, 3])).toEqual([1, 2, 3])
  expect(soundPosition(undefined)).toBeUndefined()
})

it('every sound a night names plays from a real place in the plan', () => {
  for (const sequence of Object.values(SEQUENCES))
    for (const { beat, action } of actionsOf(sequence)) {
      if (action.type !== 'sound' || typeof action.at !== 'string') continue
      expect(
        objectPoint(action.at) ?? soundPosition(action.at),
        `${beat}: ${action.at}`,
      ).toBeTruthy()
    }
})

it('keeps the night-4 step outside on the landing and the wardrobe knock inside the wardrobe', () => {
  const step = actionsOf(SEQUENCES.n4!).find(
    (a) => a.beat === 'n4.step' && a.action.type === 'sound',
  )!.action as { at: [number, number, number] }
  expect(step.at[2]).toBeGreaterThan(4.78)
  const knock = actionsOf(SEQUENCES.n3!).find((a) => a.beat === 'n3.wardrobe_knock')!.action as {
    at: string
  }
  expect(knock.at).toBe('wardrobe')
})
