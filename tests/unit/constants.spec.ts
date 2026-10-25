import { describe, expect, it } from 'vitest'
import { GAME_TITLE, SAVE_VERSION } from '@/core/constants'

describe('constants', () => {
  it('exposes the game title', () => {
    expect(GAME_TITLE).toBe('3:17')
  })

  it('starts save schema at version 1', () => {
    expect(SAVE_VERSION).toBe(1)
  })
})
