import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AudioController } from '@/audio/AudioController'
import { audio } from '@/audio/engine'
import { useGame } from '@/ui/gameStore'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  useGame.setState({ run: null, world: null, screen: 'title' })
})

it('starts listening at the wall once per hold and plays Director sounds where they are', () => {
  vi.spyOn(audio, 'initialize').mockImplementation(() => {})
  const listening = vi.spyOn(audio, 'setListening').mockImplementation(() => {})
  const play = vi.spyOn(audio, 'play').mockReturnValue(true)
  render(<AudioController mode="desktop" />)
  act(() => useGame.getState().startRun())
  listening.mockClear()
  act(() => {
    useGame.getState().input({ type: 'holdStart', target: 'party_wall' })
    // Refreshing the world while still holding must not stack another breathing layer.
    useGame.getState().step(16)
    useGame.getState().step(16)
  })
  expect(listening.mock.calls.filter(([on]) => on === true)).toHaveLength(1)
  act(() => {
    useGame.getState().input({ type: 'holdEnd' })
  })
  expect(listening.mock.calls.at(-1)?.[0]).toBe(false)
  // Night 1 opens on the landing: the key ring rattles in 47's lock, at the door.
  play.mockClear()
  act(() => useGame.getState().step(3000))
  const chain = play.mock.calls.find(([id]) => id === 'chain')
  expect(chain?.[1]).toBeDefined()
  expect(chain![1]![2]).toBeGreaterThan(4)
})

it('skips sounds that have no recording instead of faking them', () => {
  vi.spyOn(audio, 'initialize').mockImplementation(() => {})
  const play = vi.spyOn(audio, 'play').mockReturnValue(true)
  render(<AudioController mode="desktop" />)
  act(() => useGame.getState().startRun())
  play.mockClear()
  act(() => useGame.getState().debug.setFlag('tv_on', false))
  act(() => {
    useGame.getState().input({ type: 'interact', target: 'tv' })
    useGame.getState().step(4000)
  })
  expect(play.mock.calls.map(([id]) => id)).toContain('static')
  expect(play.mock.calls.map(([id]) => id)).not.toContain('cough')
})
