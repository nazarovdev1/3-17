import { describe, expect, it } from 'vitest'
import { GAME_TITLE, SAVE_VERSION } from '@/core/constants'

describe('constants', () => {
  it('exposes the game title', () => {
    expect(GAME_TITLE).toBe('3:17')
  })

  it('saves at schema version 2 (the Director model)', () => {
    expect(SAVE_VERSION).toBe(2)
  })
})
