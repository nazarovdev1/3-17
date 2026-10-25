import { describe, expect, it } from 'vitest'
import { clampSanity, corruptText, sanityBand } from '@/core/state/sanity'

describe('sanityBand', () => {
  it('100–70 clean', () => {
    expect(sanityBand(100)).toBe('clean')
    expect(sanityBand(85)).toBe('clean')
    expect(sanityBand(70)).toBe('clean')
  })

  it('69–40 subtle', () => {
    expect(sanityBand(69)).toBe('subtle')
    expect(sanityBand(55)).toBe('subtle')
    expect(sanityBand(40)).toBe('subtle')
  })

  it('39–15 heavy', () => {
    expect(sanityBand(39)).toBe('heavy')
    expect(sanityBand(15)).toBe('heavy')
  })

  it('below 15 corrupt', () => {
    expect(sanityBand(14)).toBe('corrupt')
    expect(sanityBand(0)).toBe('corrupt')
  })
})

describe('clampSanity', () => {
  it('clamps both ends', () => {
    expect(clampSanity(120)).toBe(100)
    expect(clampSanity(-5)).toBe(0)
    expect(clampSanity(42)).toBe(42)
  })
})

describe('corruptText', () => {
  it('returns text untouched for amount 0', () => {
    expect(corruptText('salom', 0, 1, 0)).toBe('salom')
  })

  it('is deterministic for the same seed and tick', () => {
    expect(corruptText('qorongʻulik', 1, 42, 3)).toBe(corruptText('qorongʻulik', 1, 42, 3))
  })

  it('differs across ticks (letters swap and return)', () => {
    const a = corruptText('devor ostida', 1, 7, 0)
    const b = corruptText('devor ostida', 1, 7, 1)
    expect(a).not.toBe(b)
  })

  it('keeps the same length and only swaps neighbours', () => {
    const text = 'uch xonali xonadon'
    const out = corruptText(text, 1, 5, 2)
    expect([...out].sort()).toEqual([...text].sort())
  })
})
