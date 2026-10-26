import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryStorage } from '@/core/save/memory'
import { configureSaveService, useGame } from '@/ui/gameStore'
import { takeMetaComments } from '@/ui/metaHorror'
import { HorrorEffects } from '@/ui/HorrorEffects'
import { DEFAULT_SETTINGS, useSettings } from '@/ui/settingsStore'
import { story } from '@/content/story'

let local: MemoryStorage
const profile = {
  name: 'Ali',
  livesAlone: 'ha',
  fear: 'qorongʻulik',
  doorAtNight: 'yopiq',
} as const
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-26T12:00:00Z'))
  local = new MemoryStorage()
  configureSaveService(local, null)
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, reduceFlashing: false } })
  useGame.getState().startRun(profile)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('uses the player name at most once per night in narration', () => {
  for (const night of [1, 2, 3, 4, 5]) {
    const named = Object.values(story.nodes)
      .filter((node) => node.night === night)
      .flatMap((node) => node.lines)
      .filter(
        (line) =>
          line.speaker === 'narrator' &&
          line.variants.some((variant) => variant.text.includes('{name}')),
      )
    expect(named.length).toBeLessThanOrEqual(1)
  }
})

it('takes each pending comment once without mutating the old save', () => {
  const original = useGame.getState().run!
  const pending = {
    ...original,
    flags: { late_night: true, return_comment: true, away_minutes: 150 },
  }
  const result = takeMetaComments(pending)
  expect(result.lines.map((line) => line.speaker)).toEqual(['narrator', 'voice'])
  expect(original.metaHints.returnCommentFired).toBe(false)
  expect(takeMetaComments(result.state).lines).toEqual([])
  expect(takeMetaComments({ ...pending, finished: true }).lines).toEqual([])
})

it('uses the saved absence timestamp and persists the consumed return gate on continue', async () => {
  vi.setSystemTime(new Date('2026-10-26T14:30:00Z'))
  await useGame.getState().init()
  expect(useGame.getState().run?.metaHints.returnCommentFired).toBe(false)
  useGame.getState().continueRun()
  expect(useGame.getState().metaLines[0]?.variants[0]?.text).toContain('Bir necha soat')
  expect(useGame.getState().run?.currentNodeId).toBe('n1_start')
  await useGame.getState().init()
  useGame.getState().continueRun()
  expect(useGame.getState().metaLines).toEqual([])
})

it('persists real-clock one-shot state immutably and resets the banner for a new run', () => {
  const previous = useGame.getState().run!
  useGame.getState().showRealClock317()
  const saved = JSON.parse(local.get('g317:run')!) as {
    state: { metaHints: { realClock317Fired: boolean } }
  }
  expect(saved.state.metaHints.realClock317Fired).toBe(true)
  expect(previous.metaHints.realClock317Fired).toBe(false)
  useGame.getState().dismissRealClock317()
  useGame.getState().showRealClock317()
  expect(useGame.getState().realClock317Visible).toBe(false)
  useGame.getState().startRun(profile)
  expect(useGame.getState().realClock317Visible).toBe(false)
  expect(useGame.getState().run?.metaHints.realClock317Fired).toBe(false)
})

it('limits the diegetic glitch to its authored duration and does not replay it', () => {
  render(<HorrorEffects />)
  act(() => useGame.getState().goToNode('n4_glitch'))
  expect(screen.getByRole('status')).toHaveTextContent('Signal yoʻqoldi')
  act(() => {
    vi.advanceTimersByTime(2499)
  })
  expect(screen.queryByRole('status')).not.toBeNull()
  act(() => {
    vi.advanceTimersByTime(1)
  })
  expect(screen.queryByRole('status')).toBeNull()
  act(() => useGame.getState().goToNode('n4_glitch'))
  expect(screen.queryByRole('status')).toBeNull()
})

it('disables the glitch with Reduce flashing and clears it when leaving the node', () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, reduceFlashing: true } })
  render(<HorrorEffects />)
  act(() => useGame.getState().goToNode('n4_glitch'))
  expect(screen.queryByRole('status')).toBeNull()
  act(() => useGame.getState().startRun(profile))
  act(() => useSettings.setState({ settings: { ...DEFAULT_SETTINGS, reduceFlashing: false } }))
  act(() => useGame.getState().goToNode('n4_glitch'))
  expect(screen.queryByRole('status')).not.toBeNull()
  act(() => useGame.getState().advance())
  expect(screen.queryByRole('status')).toBeNull()
})
