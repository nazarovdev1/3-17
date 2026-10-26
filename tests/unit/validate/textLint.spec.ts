import { describe, expect, it } from 'vitest'
import { lintEntry, lintTexts, repeatedPhrases } from '@/core/validate/textLint'
import { story } from '@/content/story'
import { allStoryKeys, missingKeys, usedKeys } from '@/content/text'

const line = (text: string, id = 'n/l') => ({ id, text, kind: 'line' as const })

describe('Uzbek text rules', () => {
  it('accepts clean modern Uzbek with correct apostrophes', () => {
    expect(lintEntry(line('Qoʻshni… uxlamayapsizmi? E’tibor bermang.'))).toEqual([])
  })

  it('rejects Cyrillic letters', () => {
    expect(lintEntry(line('Салом, qoʻshni.')).join()).toMatch(/Cyrillic/)
  })

  it('rejects English words and letters Uzbek Latin does not use', () => {
    expect(lintEntry(line('Hello, qoʻshni.')).join()).toMatch(/foreign word "hello"/)
    expect(lintEntry(line('Wallpaper eski.')).join()).toMatch(/foreign word/)
  })

  it('allows keyboard key names in hints', () => {
    expect(lintEntry({ id: 'ui/x', text: 'WASD — yurish · Esc — pauza', kind: 'ui' })).toEqual([])
  })

  it('rejects ASCII and look-alike apostrophes', () => {
    for (const bad of ["qo'shni", 'qo`shni', 'qoʼshni', 'qo‘shni'])
      expect(lintEntry(line(bad)).join()).toMatch(/wrong apostrophe/)
  })

  it('rejects ’ where oʻ/gʻ needs ʻ, but keeps real tutuq words', () => {
    expect(lintEntry(line('to’g’ri')).join()).toMatch(/needs ʻ/)
    expect(lintEntry(line('Bu mo’jiza edi, ma’no ham bor.'))).toEqual([])
  })

  it('rejects ʻ after letters other than o and g', () => {
    expect(lintEntry(line('maʻno')).join()).toMatch(/belongs only in oʻ and gʻ/)
  })

  it('rejects forbidden clichés', () => {
    expect(lintEntry(line('Yuragim tez ura boshladi.')).join()).toMatch(/cliché/)
    expect(lintEntry(line('Dahshatli tun edi.')).join()).toMatch(/cliché "dahshat"/)
    expect(lintEntry(line('Uni sovuq ter bosdi.')).join()).toMatch(/cliché/)
  })

  it('rejects sentences over 25 words', () => {
    const long = Array.from({ length: 26 }, () => 'soʻz').join(' ') + '.'
    expect(lintEntry(line(long)).join()).toMatch(/sentence of 26 words/)
  })

  it('ignores {placeholders} when reading words', () => {
    expect(lintEntry(line('{name}, uxlamayapsizmi?'))).toEqual([])
  })

  it('rejects a 4-word phrase repeated more than twice in story lines only', () => {
    const phrase = 'Devor uch marta taqilladi.'
    expect(repeatedPhrases([line(phrase, 'a'), line(phrase, 'b')])).toEqual([])
    expect(
      repeatedPhrases([line(phrase, 'a'), line(phrase, 'b'), line(phrase, 'c')]).join(),
    ).toMatch(/repeated 3×/)
    const choice = { id: 'c', text: phrase, kind: 'choice' as const }
    expect(repeatedPhrases([line(phrase, 'a'), line(phrase, 'b'), choice])).toEqual([])
  })

  it('reports empty text', () => {
    expect(lintTexts([line('  ')]).join()).toMatch(/empty/)
  })
})

describe('YAML text keys', () => {
  it('every key the story asks for exists and every YAML story key is used', () => {
    expect(Object.keys(story.nodes).length).toBeGreaterThan(0)
    expect(missingKeys).toEqual([])
    expect(allStoryKeys().filter((key) => !usedKeys.has(key))).toEqual([])
  })
})
