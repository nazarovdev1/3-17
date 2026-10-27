import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AudioController } from '@/audio/AudioController'
import { audio } from '@/audio/engine'
import { useGame } from '@/ui/gameStore'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  useGame.setState({ run: null, currentStep: null, screen: 'title' })
})
it('does not stack breathing when the same voice node is refreshed', () => {
  vi.spyOn(audio, 'initialize').mockImplementation(() => {})
  const play = vi.spyOn(audio, 'play').mockReturnValue(true)
  render(<AudioController mode="desktop" />)
  act(() => {
    useGame
      .getState()
      .startRun({ name: 'Ali', livesAlone: 'ha', fear: 'qorongʻulik', doorAtNight: 'yopiq' })
  })
  play.mockClear()
  act(() => {
    useGame.getState().goToNode('n1_knocks')
  })
  expect(play.mock.calls.filter(([id]) => id === 'whisper')).toHaveLength(1)
  act(() => {
    useGame.getState().goToNode('n1_knocks')
    useGame.getState().goToNode('n1_knocks')
  })
  expect(play.mock.calls.filter(([id]) => id === 'whisper')).toHaveLength(1)
})
