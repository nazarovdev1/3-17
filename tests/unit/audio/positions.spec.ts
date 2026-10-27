import { expect, it } from 'vitest'
import { cuePosition, doorHinge, SHARED_WALL } from '@/audio/positions'
import { createInitialState } from '@/core/engine'
import { objectById, PARTY_X, WORLD } from '@/content/world/layout'
import { SCRIPTED_SOUNDS } from '@/presenters/desktop/events'

const initial = createInitialState(
  { name: 'Ali', livesAlone: 'ha', fear: 'qorongʻulik', doorAtNight: 'yopiq' },
  '2026-10-27T00:00:00Z',
)
it('places wall knocks and breathing on the party wall, doors at their hinge, phone at its actual place', () => {
  expect(SHARED_WALL[0]).toBeCloseTo(PARTY_X + 0.1)
  expect(cuePosition('knock', initial)).toEqual(SHARED_WALL)
  expect(cuePosition('whisper', initial)).toEqual(SHARED_WALL)
  expect(cuePosition('phone_buzz', initial)).toEqual(objectById('phone')!.position)
  const sofa = objectById('sofa')!
  expect(cuePosition('phone_buzz', { ...initial, night: 4 })).toEqual([
    sofa.position[0],
    0.5,
    sofa.position[2],
  ])
  const door = WORLD.doors.find((d) => d.id === 'front_door')!
  const wall = WORLD.walls.find((w) => w.id === door.wall)!
  const opening = wall.openings.find((o) => o.door === door.id)!
  expect(doorHinge('front_door')[0]).toBeCloseTo(opening.at + opening.width / 2)
  expect(cuePosition('chain', initial)).toEqual(doorHinge('front_door'))
})
it('keeps the scripted landing step outside, overhead steps above, and the wardrobe knock inside', () => {
  expect(SCRIPTED_SOUNDS.n4_317![0]!.position[2]).toBeGreaterThan(5)
  expect(SCRIPTED_SOUNDS.n2_night_hub!.every((s) => s.position[1] > 2.6)).toBe(true)
  const wardrobe = objectById('wardrobe')!
  expect(SCRIPTED_SOUNDS.n3_hub![0]!.position).toEqual([
    wardrobe.position[0],
    1.1,
    wardrobe.position[2],
  ])
})
