import { describe, expect, it } from 'vitest'
import { doorPass } from '@/presenters/mobile/doors'
import { MOBILE_VIEWS } from '@/presenters/mobile/views'

const world = (
  doors: Record<string, 'open' | 'ajar' | 'closed'> = {},
  figure: string | null = null,
) => ({ doors, figure })

describe('mobile fallback doors', () => {
  it('the entrance stays shut until the player opens it', () => {
    expect(doorPass('front_door', world(), {})).toEqual({ open: false, locked: false })
    expect(doorPass('front_door', world(), { front_door: true }).open).toBe(true)
  })

  it('the story holding the front door shut beats the player', () => {
    expect(doorPass('front_door', world({ front_door: 'closed' }), { front_door: true })).toEqual({
      open: false,
      locked: true,
    })
  })

  it('a figure under the door keeps the front door shut', () => {
    expect(doorPass('front_door', world({}, 'under_door'), { front_door: true }).locked).toBe(true)
  })

  it('a door the story holds open is open', () => {
    expect(doorPass('front_door', world({ front_door: 'open' }), {}).open).toBe(true)
  })

  it('the room door rests open; a story-closed leaf rests shut but opens for a tap', () => {
    expect(doorPass('room_door', world(), {}).open).toBe(true)
    expect(doorPass('bath_door', world({ bath_door: 'closed' }), {})).toEqual({
      open: false,
      locked: false,
    })
    expect(doorPass('bath_door', world({ bath_door: 'closed' }), { bath_door: true }).open).toBe(
      true,
    )
  })

  it('entrance 48 opens only when the story leaves it ajar', () => {
    expect(doorPass('door48', world(), {}).locked).toBe(true)
    expect(doorPass('door48', world({ door48: 'ajar' }), {}).open).toBe(true)
  })

  it('every hinged-door crossing in the viewpoints is gated', () => {
    const gate = (view: string, edge: 'left' | 'right' | 'back' | 'forward') =>
      MOBILE_VIEWS[view]!.gates?.[edge]
    expect(gate('hall', 'forward')).toBe('front_door')
    expect(gate('landing', 'forward')).toBe('front_door')
    expect(gate('hall', 'left')).toBe('bath_door')
    expect(gate('hall', 'right')).toBe('kitchen_door')
    expect(gate('kitchen', 'back')).toBe('kitchen_door')
    expect(gate('bathroom', 'back')).toBe('bath_door')
    expect(gate('flat48', 'back')).toBe('door48')
  })
})
