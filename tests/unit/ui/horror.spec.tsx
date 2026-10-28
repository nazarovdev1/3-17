import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryStorage } from '@/core/save/memory'
import { configureSaveService, emitDirectorEvents, onDirectorEvents, useGame } from '@/ui/gameStore'
import { HorrorEffects } from '@/ui/HorrorEffects'
import { PlayOverlays } from '@/ui/play/Overlays'
import { DEFAULT_SETTINGS, useSettings } from '@/ui/settingsStore'
import { SEQUENCES } from '@/content/nights'
import { line, scriptKeys } from '@/content/text'
import { actionsOf } from '@/core/validate/beats'
import type { DirectorEvent } from '@/core/director/types'

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
  useGame.getState().startRun()
  useGame.getState().input({ type: 'form', profile })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
  useGame.setState({ run: null, world: null, screen: 'title' })
})

it('shows a spoken line whole at once, never typed out', () => {
  render(<PlayOverlays controls={false} />)
  act(() => {
    useGame.getState().debug.setClock('03:16')
    // 3:16 → windows (8 s) → 3:17 → 7 s of silence → knocks → 3 s → the voice (1.3 s).
    for (let i = 0; i < 185; i++) useGame.getState().step(100)
  })
  expect(screen.getByText(line('N1-12'))).toBeTruthy()
})

it('names the player only in the voice’s mouth', () => {
  const withName = scriptKeys().filter((key) => line(key, '§').includes('§'))
  expect(withName.length).toBeGreaterThan(0)
  const speakers = Object.values(SEQUENCES).flatMap((s) =>
    actionsOf(s).flatMap(({ action }) =>
      action.type === 'say' && withName.includes(action.line) ? [action.speaker] : [],
    ),
  )
  expect(new Set(speakers)).toEqual(new Set(['voice']))
})

it('records a late-night start and a long absence on the run, for the night to use once', async () => {
  vi.setSystemTime(new Date(2026, 9, 26, 2, 30))
  useGame.getState().startRun()
  expect(useGame.getState().run?.flags['late_night']).toBe(true)
  useGame.getState().saveNow()
  vi.setSystemTime(new Date(2026, 9, 26, 6, 0))
  await useGame.getState().init()
  expect(useGame.getState().run?.flags['returned']).toBe(true)
})

it('plays the real-clock 3:17 knock once, and remembers it across a reload', async () => {
  const events: DirectorEvent[] = []
  const unsubscribe = onDirectorEvents((e) => events.push(...e))
  useGame.getState().realClock317()
  useGame.getState().realClock317()
  unsubscribe()
  expect(events.filter((e) => e.type === 'sound' && e.id === 'knock_soft')).toHaveLength(1)
  await useGame.getState().init()
  expect(useGame.getState().run?.metaHints.realClock317Fired).toBe(true)
})

it('limits the fake glitch to its duration, shows no words, and drops it with Reduce flashing', () => {
  const { container } = render(<HorrorEffects />)
  const fire = () => act(() => emitDirectorEvents([{ type: 'fx', id: 'glitch_fake', ms: 1500 }]))
  fire()
  expect(container.querySelector('.signal-loss')).not.toBeNull()
  expect(container.textContent).toBe('')
  act(() => {
    vi.advanceTimersByTime(1600)
  })
  expect(container.querySelector('.signal-loss')).toBeNull()
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, reduceFlashing: true } })
  fire()
  expect(container.querySelector('.signal-loss')).toBeNull()
})
