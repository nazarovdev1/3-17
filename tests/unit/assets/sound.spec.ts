// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { freesoundLicense, validateSound, type FreesoundInfo } from '../../../scripts/assets/sound'
import type { AssetSourceEntry } from '../../../scripts/assets/sources'

const entry: AssetSourceEntry = {
  id: 'test-knock',
  remoteId: '123',
  source: 'freesound',
  kind: 'sound',
  tier: 'small',
  group: 'flat47',
  purpose: 'panel wall knock',
  license: 'CC0-1.0',
  sound: { cue: 'knock', loop: false, clips: [{ start: 0, duration: 0.4 }] },
}
const info: FreesoundInfo = {
  id: 123,
  name: 'Wall knock',
  username: 'recordist',
  url: 'https://freesound.org/s/123/',
  license: 'https://creativecommons.org/publicdomain/zero/1.0/',
  previews: {},
}

describe('Freesound license gate', () => {
  it('accepts only exact CC0 and CC-BY license URLs with their original version', () => {
    expect(freesoundLicense(info.license)).toBe('CC0-1.0')
    for (const version of ['1.0', '2.0', '2.5', '3.0', '4.0'])
      expect(freesoundLicense(`http://creativecommons.org/licenses/by/${version}/`)).toBe(
        `CC-BY-${version}`,
      )
  })
  it.each(['by-nc', 'by-nd', 'by-sa', 'by-nc-nd', 'sampling+', 'unknown'])(
    'refuses %s even if a source entry claims CC0',
    (license) => {
      const url = `https://creativecommons.org/licenses/${license}/4.0/`
      expect(() => freesoundLicense(url)).toThrow('refused')
      expect(() => validateSound(entry, { ...info, license: url })).toThrow('refused')
    },
  )
  it('rejects spoofed domains, changed ids/licenses and missing attribution', () => {
    expect(() =>
      freesoundLicense('https://creativecommons.org.evil.test/licenses/by/4.0/'),
    ).toThrow()
    expect(() => validateSound(entry, { ...info, id: 124 })).toThrow('id mismatch')
    expect(() =>
      validateSound(entry, { ...info, license: 'https://creativecommons.org/licenses/by/4.0/' }),
    ).toThrow('pinned license')
    expect(() => validateSound(entry, { ...info, username: '' })).toThrow('attribution')
  })
  it('requires finite, bounded, pinned excerpts', () => {
    expect(() => validateSound(entry, info)).not.toThrow()
    for (const clip of [
      { start: -1, duration: 1 },
      { start: 0, duration: Infinity },
      { start: 0, duration: 0 },
    ])
      expect(() =>
        validateSound({ ...entry, sound: { ...entry.sound!, clips: [clip] } }, info),
      ).toThrow('excerpts')
  })
})
