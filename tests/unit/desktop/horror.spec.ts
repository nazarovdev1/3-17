import { describe, expect, it } from 'vitest'
import { SEQUENCES } from '@/content/nights'
import { wordsOf } from '@/content/text'
import { Director } from '@/core/director/director'
import { newRun, STILL } from '@/core/director/simulate'
import { actionsOf } from '@/core/validate/beats'
import { WORLD, footprint, objectById, rectArea, type Rect } from '@/content/world/layout'
import { canWalk } from '@/content/world/walk'
import { appearanceFor } from '@/presenters/desktop/figure'
import { phoneTime } from '@/presenters/desktop/phone'
import { CHAIR_MOVED, changesFor } from '@/presenters/desktop/changes'
import { REACH, footstepAt } from '@/presenters/desktop/layout'

const profile = {
  name: 'Ali',
  livesAlone: 'ha',
  fear: 'qorongʻulik',
  doorAtNight: 'yopiq',
} as const
/** Runs a night for `ms` with the player standing still, then returns its Director. */
function night(id: string, ms: number, before?: (d: Director) => void) {
  const director = new Director({ sequences: SEQUENCES, run: newRun({ ...profile }), wordsOf }, id)
  director.run.night = Number(id[1]) as 1
  before?.(director)
  for (let t = 0; t < ms; t += 100) director.tick(100, STILL)
  return director
}

const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1
const PLACEMENTS = ['stairwell', 'frosted', 'peephole', 'under_door', 'tv_reflection'] as const

describe('the figure (FIX_PROMPT §4.4)', () => {
  it('never appears on night 1', () => {
    expect(actionsOf(SEQUENCES.n1!).some(({ action }) => action.type === 'figure')).toBe(false)
  })
  it('never stands where it is plainly seen: always lit from behind, hidden or reflected', () => {
    for (const id of PLACEMENTS) {
      const a = appearanceFor(id)!
      expect(a.maxSeconds).toBeLessThanOrEqual(75)
      expect(a.vanishWhenUnseen || a.reflectionOnly || a.closedDoors.length > 0).toBe(true)
    }
    expect(appearanceFor(null)).toBeNull()
    expect(appearanceFor('nowhere')).toBeNull()
  })
  it('stands on walkable floor (a body fits there), outside the furniture', () => {
    for (const id of ['stairwell', 'frosted', 'peephole', 'under_door'] as const) {
      const [x, , z] = appearanceFor(id)!.position
      expect(canWalk(x, z, { flat48: true, extension: 0 }), id).toBe(true)
    }
  })
  it('stands in the room doorway for the TV glass, seen only in the reflection', () => {
    const a = appearanceFor('tv_reflection')!
    expect(a.reflectionOnly).toBe(true)
    expect(canWalk(a.position[0], a.position[2], { flat48: false, extension: 0 })).toBe(true)
  })
})

describe('the phone (fear-design.md escalation table)', () => {
  it('counts the mother’s missed calls night by night', () => {
    const counts = ['n1', 'n2', 'n3', 'n4', 'n5'].map((id) => {
      const d = night(id, 300)
      // Night 2 begins in the day; its night count is set when the night falls.
      return id === 'n2' ? night(id, 85_000).world.phone.missed : d.world.phone.missed
    })
    expect(counts).toEqual([3, 11, 24, 40, 52])
  })
  it('is picked up, plays tonight’s message when tapped, and is put down', () => {
    const d = night('n1', 300)
    d.input({ type: 'interact', target: 'phone' })
    expect(d.world.phone).toMatchObject({ place: 'hand', screen: 'lock' })
    d.input({ type: 'interact', target: 'phone_message' })
    expect(d.world.phone.screen).toBe('playing')
    expect(d.run.inventory).toContain('mom_msg_1')
    for (let t = 0; t < 11_500; t += 100) d.tick(100, STILL)
    expect(d.world.phone).toMatchObject({ screen: 'lock', heard: true, messageSeconds: 11 })
    d.input({ type: 'interact', target: 'phone' })
    expect(d.world.phone.place).toBe('table')
  })
  it('lies under the pillow on night 4 and dies with everything else at 3:17 on night 5', () => {
    expect(night('n4', 300).world.phone.place).toBe('pillow')
    expect(night('n5', 240_000).world.phone.screen).toBe('dead')
  })
  it('shows the night’s clock, or the player’s own after midnight on night 1', () => {
    const phone = night('n1', 300).world.phone
    expect(phoneTime(phone, '02:41', false)).toBe('02:41')
    expect(phoneTime(phone, '02:41', true, new Date(2026, 0, 1, 3, 5))).toBe('03:05')
    expect(phoneTime({ ...phone, time: '07:40' }, '03:17', false)).toBe('07:40')
  })
  it('lies on the room table', () => {
    expect(objectById('phone')!.support).toEqual({ on: 'object', object: 'table' })
  })
})

describe('changes while nobody looks (fear-design.md)', () => {
  it('follows the nightly table', () => {
    expect(changesFor(1, {}, false)).toMatchObject({ coat: false, chairMoved: false })
    expect(changesFor(2, {}, true).coat).toBe(false)
    expect(changesFor(2, {}, false)).toMatchObject({ coat: true, coatTonight: true })
    expect(changesFor(3, {}, false)).toMatchObject({ chairMoved: true, chairMovedTonight: true })
    expect(changesFor(4, { power_off: true }, false)).toMatchObject({
      chainLoose: true,
      bundle: true,
      footprints: false,
    })
    expect(changesFor(4, { power_off: true, took_parcel: true }, false).bundle).toBe(false)
    expect(changesFor(4, { power_off: true, saw_figure: true }, false).footprints).toBe(true)
    expect(changesFor(5, {}, false).breath).toBe(true)
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
