import { afterEach, expect, it } from 'vitest'
import { configureSaveService, onEngineEvents, useGame } from '@/ui/gameStore'
import { MemoryStorage } from '@/core/save/memory'

const local = new MemoryStorage()
afterEach(() =>
  useGame.setState({ run: null, currentStep: null, endingCard: null, screen: 'title' }),
)

it('commits an ending before notifying audio and saves the finished node atomically', () => {
  configureSaveService(local, null)
  useGame
    .getState()
    .startRun({ name: 'Ali', livesAlone: 'ha', fear: 'qorongʻulik', doorAtNight: 'yopiq' })
  useGame.getState().goToNode('n5_final_choice')
  const cues: string[] = []
  const unsubscribe = onEngineEvents((events, step, previous) => {
    expect(useGame.getState().currentStep).toBe(step)
    expect(useGame.getState().run?.finished).toBe(true)
    expect(useGame.getState().screen).toBe('ending')
    expect(previous?.node.id).toBe('n5_final_choice')
    for (const event of events) if (event.kind === 'sfx') cues.push(event.id)
  })
  try {
    useGame.getState().choose('leave')
  } finally {
    unsubscribe()
  }
  expect(cues).toEqual(['chain', 'door_open'])
  const saved = JSON.parse(local.get('g317:run')!) as {
    state: { currentNodeId: string; finished: boolean }
  }
  expect(saved.state.currentNodeId).toBe('endB')
  expect(saved.state.finished).toBe(true)
})
