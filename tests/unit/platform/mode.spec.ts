import { describe, expect, it } from 'vitest'
import { DESKTOP_MIN_WIDTH, detectMode, detectTier } from '@/platform/device/mode'

const base = {
  setting: 'auto' as const,
  pointerFine: true,
  viewportWidth: 1440,
  webglAvailable: true,
  gpuOk: true,
}

describe('detectMode', () => {
  it('desktop requires ALL conditions', () => {
    expect(detectMode(base)).toBe('desktop')
    expect(detectMode({ ...base, pointerFine: false })).toBe('mobile')
    expect(detectMode({ ...base, viewportWidth: DESKTOP_MIN_WIDTH - 1 })).toBe('mobile')
    expect(detectMode({ ...base, viewportWidth: DESKTOP_MIN_WIDTH })).toBe('desktop')
    expect(detectMode({ ...base, webglAvailable: false })).toBe('mobile')
    expect(detectMode({ ...base, gpuOk: false })).toBe('mobile')
  })

  it('manual mobile override wins even on a capable desktop', () => {
    expect(detectMode({ ...base, setting: 'mobile' })).toBe('mobile')
  })

  it('manual desktop override falls back to mobile without WebGL', () => {
    expect(detectMode({ ...base, setting: 'desktop' })).toBe('desktop')
    expect(detectMode({ ...base, setting: 'desktop', webglAvailable: false })).toBe('mobile')
  })

  it('weak devices get mobile mode', () => {
    expect(detectMode({ ...base, pointerFine: true, viewportWidth: 360 })).toBe('mobile')
  })
})

describe('detectTier', () => {
  it('high for tall internal buffers, low otherwise', () => {
    expect(detectTier(450)).toBe('high')
    expect(detectTier(400)).toBe('high')
    expect(detectTier(320)).toBe('low')
  })
})
