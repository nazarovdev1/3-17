import { afterEach, expect, it } from 'vitest'
import { configureSaveService, onDirectorEvents, sensors, useGame } from '@/ui/gameStore'
import { MemoryStorage } from '@/core/save/memory'

const local = new MemoryStorage()
afterEach(() => {
  sensors.zones = []
  useGame.setState({ run: null, world: null, screen: 'title' })
})

it('an ending plays out, then commits to the gallery and clears the run in one step', () => {
  configureSaveService(local, null)
  useGame.getState().playNight(5)
  useGame.getState().run!.flags['open_the_door'] = true
  const seen: string[] = []
  const unsubscribe = onDirectorEvents((events) => {
    for (const event of events) if (event.type === 'endingStart') seen.push(event.id)
  })
  try {
    // The player unchains the door and walks to the top of the stairs: ending B.
    useGame.getState().input({ type: 'interact', target: 'front_door' })
    sensors.zones = ['landing', 'stairs_down']
    for (let i = 0; i < 400 && useGame.getState().screen === 'game'; i++) {
      useGame.getState().step(100)
      // While it plays the run is still there; only the credits finish it.
      if (seen.length && useGame.getState().screen === 'game')
        expect(useGame.getState().run?.finished).toBe(false)
    }
  } finally {
    unsubscribe()
  }
  expect(seen).toEqual(['B'])
  expect(useGame.getState().screen).toBe('gallery')
  expect(useGame.getState().meta.endingsSeen).toContain('B')
  expect(local.get('g317:run')).toBeNull()
  const meta = JSON.parse(local.get('g317:meta')!) as { meta: { endingsSeen: string[] } }
  expect(meta.meta.endingsSeen).toContain('B')
})
