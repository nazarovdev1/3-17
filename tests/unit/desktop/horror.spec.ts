import { describe, expect, it } from 'vitest'
import { story } from '@/content/story'
import { createInitialState, goTo } from '@/core/engine'
import type { Step } from '@/core/engine/types'
import { WORLD, footprint, objectById, rectArea, type Rect } from '@/content/world/layout'
import { canWalk } from '@/content/world/walk'
import { figureAppearance } from '@/presenters/desktop/figure'
import { MISSED_CALLS, phoneState, phoneTime } from '@/presenters/desktop/phone'
import { CHAIR_MOVED, changesFor } from '@/presenters/desktop/changes'
import { REACH, footstepAt, interactionPoint } from '@/presenters/desktop/layout'

const initial = () =>
  createInitialState(
    { name: 'Ali', livesAlone: 'ha', fear: 'qorongʻulik', doorAtNight: 'yopiq' },
    '2026-10-25T00:00:00Z',
  )
/** Walks the story through `ids` in order, carrying the state like the game does. */
function through(...ids: string[]): Step {
  let step = goTo(story, initial(), ids[0]!)
  for (const id of ids.slice(1)) step = goTo(story, step.state, id)
  return step
}

const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1

describe('the figure (FIX_PROMPT §4.4)', () => {
  it('appears only at the beats fear-design.md gives it, never in night 1', () => {
    const appearances = Object.keys(story.nodes)
      .map((id) => [id, figureAppearance(id, through('n4_317', id).state)?.id] as const)
      .filter(([, a]) => a)
    expect(appearances.every(([id]) => !id.startsWith('n1_'))).toBe(true)
    expect(Object.fromEntries(appearances)).toMatchObject({
      n2_day_start: 'stairwell',
      n3_corridor_loop: 'frosted',
      n3_tv: 'tv_reflection',
      n4_peephole: 'peephole',
      n5_voice_final: 'under_door',
    })
  })
  it('stands under the door only after the night-4 power cut, until the peephole', () => {
    expect(figureAppearance('n4_hub', through('n4_start', 'n4_hub').state)).toBeNull()
    expect(figureAppearance('n4_hub', through('n4_317', 'n4_hub').state)?.id).toBe('under_door')
    expect(figureAppearance('n4_hub', through('n4_317', 'n4_peephole', 'n4_hub').state)).toBeNull()
  })
  it('never stands where it is plainly seen: always lit from behind, hidden or reflected', () => {
    for (const id of [
      'n2_day_start',
      'n3_corridor_loop',
      'n4_peephole',
      'n3_tv',
      'n5_voice_final',
    ]) {
      const a = figureAppearance(id, through('n4_317', id).state)!
      expect(a.maxSeconds).toBeLessThanOrEqual(75)
      expect(a.vanishWhenUnseen || a.reflectionOnly || a.closedDoors.length > 0).toBe(true)
    }
  })
  it('stands on walkable floor (a body fits there), outside the furniture', () => {
    for (const id of ['n2_day_start', 'n3_corridor_loop', 'n4_peephole', 'n5_voice_final']) {
      const [x, , z] = figureAppearance(id, through('n4_317', id).state)!.position
      expect(canWalk(x, z, { flat48: true, extension: 0 }), id).toBe(true)
    }
  })
  it('stands in the room doorway for the TV glass, seen only in the reflection', () => {
    const a = figureAppearance('n3_tv', through('n3_start', 'n3_tv').state)!
    expect(a.reflectionOnly).toBe(true)
    expect(canWalk(a.position[0], a.position[2], { flat48: false, extension: 0 })).toBe(true)
  })
})

describe('the phone (fear-design.md escalation table)', () => {
  it('counts the mother’s missed calls night by night', () => {
    expect(Object.values(MISSED_CALLS)).toEqual([3, 11, 24, 40, 52])
    expect(phoneState('n3_hub', through('n3_start', 'n3_hub').state).missed).toBe(24)
  })
  it('is held up at the phone beats and plays the message', () => {
    expect(phoneState('n1_phone', through('n1_hub', 'n1_phone').state)).toMatchObject({
      place: 'hand',
      screen: 'messages',
    })
    const message = through('n1_hub', 'n1_phone', 'n1_message')
    expect(phoneState('n1_message', message.state)).toMatchObject({
      screen: 'playing',
      heard: true,
      messageSeconds: 11,
    })
  })
  it('lies face down after the kitchen on night 1, under the pillow on night 4, dies at 3:17 on night 5', () => {
    expect(phoneState('n1_hub', through('n1_hub', 'n1_tea', 'n1_hub').state).faceDown).toBe(true)
    expect(phoneState('n1_hub', through('n1_hub').state).faceDown).toBe(false)
    expect(phoneState('n4_hub', through('n4_start', 'n4_hub').state).place).toBe('pillow')
    expect(phoneState('n5_317', through('n5_start', 'n5_317').state)).toMatchObject({
      screen: 'dead',
      calling: false,
    })
  })
  it('shows the story’s 3:17 once it is set, the player’s own clock before', () => {
    expect(phoneTime(through('n1_317').state)).toBe('3:17')
    expect(phoneTime(initial(), new Date(2026, 0, 1, 22, 5))).toBe('22:05')
  })
  it('lies on the room table, and is reached from under the pillow on night 4', () => {
    const phone = objectById('phone')!
    expect(phone.support).toEqual({ on: 'object', object: 'table' })
    const choice = { id: 'phone', label: '', to: 'n4_phone' }
    expect(interactionPoint(choice, 0, false, 4)).toEqual(
      interactionPoint({ ...choice, id: 'sleep' }),
    )
  })
})

describe('changes while nobody looks (fear-design.md)', () => {
  it('follows the nightly table', () => {
    expect(changesFor('n1_hub', through('n1_hub').state)).toMatchObject({
      coat: false,
      chairMoved: false,
    })
    expect(changesFor('n2_day_start', through('n2_day_start').state).coat).toBe(false)
    expect(changesFor('n2_night_hub', through('n2_night_hub').state)).toMatchObject({
      coat: true,
      coatTonight: true,
    })
    expect(changesFor('n3_hub', through('n3_start', 'n3_hub').state)).toMatchObject({
      chairMoved: true,
      chairMovedTonight: true,
    })
    const n4 = through('n4_start', 'n4_317', 'n4_hub')
    expect(changesFor('n4_hub', n4.state)).toMatchObject({
      chainLoose: true,
      bundle: true,
      footprints: false,
    })
    const seen = through('n4_start', 'n4_317', 'n4_peephole', 'n4_hub')
    expect(changesFor('n4_hub', seen.state).footprints).toBe(true)
    expect(changesFor('n5_hub', through('n5_start', 'n5_hub').state).breath).toBe(true)
  })
  it('moves the chair to an empty spot of the room', () => {
    const chair = objectById('room_chair')!
    const moved = footprint({
      ...chair,
      position: CHAIR_MOVED.position,
      rotation: CHAIR_MOVED.rotation,
    })
    const room = WORLD.rooms.find((r) => r.id === 'room')!
    expect(
      room.rects.some(
        (r) => moved.x0 >= r.x0 && moved.x1 <= r.x1 && moved.z0 >= r.z0 && moved.z1 <= r.z1,
      ),
    ).toBe(true)
    for (const o of WORLD.objects) {
      if (o.id === 'room_chair' || o.support.on !== 'floor' || rectArea(footprint(o)) < 0.01)
        continue
      expect(overlap(moved, footprint(o)), o.id).toBe(false)
    }
  })
})

describe('interaction feel (FIX_PROMPT §4.5)', () => {
  it('prompts within 1.5 m only', () => {
    expect(REACH).toBe(1.5)
  })
  it('plays the floor that is underfoot', () => {
    expect(footstepAt(0.6, -1.0)).toBe('step_wood')
    expect(footstepAt(1.6, 1.5)).toBe('step_board')
    expect(footstepAt(-1.3, 3.0)).toBe('step_tile')
    expect(footstepAt(-2.0, 6.0)).toBe('step_concrete')
  })
})
