import type { SanityBand } from './types'

export function clampSanity(value: number): number {
  return Math.max(0, Math.min(100, value))
}

/**
 * Sanity bands (spec 5.5):
 * 100–70 clean, 69–40 subtle distortion, 39–15 heavy distortion, below 15 text corruption.
 */
export function sanityBand(sanity: number): SanityBand {
  if (sanity >= 70) return 'clean'
  if (sanity >= 40) return 'subtle'
  if (sanity >= 15) return 'heavy'
  return 'corrupt'
}

/** Deterministic xorshift32 — same seed, same sequence, so tests are stable. */
function xorshift32(seed: number): () => number {
  let x = seed | 0
  if (x === 0) x = 0x9e3779b9
  return () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return (x >>> 0) / 0xffffffff
  }
}

/**
 * Corrupted text for the lowest sanity band (spec 5.5): adjacent letters swap
 * positions. Deterministic for (seed, tick) so the presenter can animate letters
 * swapping and returning without owning any randomness.
 */
export function corruptText(text: string, amount: number, seed: number, tick: number): string {
  if (amount <= 0) return text
  const chars = [...text]
  const rng = xorshift32(seed + tick * 31)
  for (let i = 0; i + 1 < chars.length; i++) {
    if (rng() < amount * 0.3) {
      const left = chars[i]
      if (left === undefined) break
      const right = chars[i + 1]
      if (right === undefined) break
      chars[i] = right
      chars[i + 1] = left
      i++
    }
  }
  return chars.join('')
}
