import { create } from 'zustand'
import {
  advance as engineAdvance,
  choose as engineChoose,
  goTo as engineGoTo,
  resume,
  startGame,
} from '@/core/engine'
import type { EngineEvent, Line, Step } from '@/core/engine/types'
import { SaveService } from '@/core/save/saveService'
import type { CloudStorageAdapter, StorageAdapter } from '@/core/save/types'
import { evaluateCondition } from '@/core/engine/conditions'
import type { EndingId, GameState, MetaState, PlayerProfile } from '@/core/state/types'
import { story } from '@/content/story'
import { isLateNight } from '@/core/engine/storyRunner'
import { takeMetaComments } from './metaHorror'

export type Screen =
  'boot' | 'warning' | 'title' | 'form' | 'game' | 'paused' | 'settings' | 'ending' | 'gallery'

export interface EndingCardInfo {
  id: EndingId
  nodeId: string
}

interface GameStore {
  screen: Screen
  run: GameState | null
  meta: MetaState
  currentStep: Step | null
  endingCard: EndingCardInfo | null
  /** One-time real-clock 3:17 event (spec 5.6). */
  realClock317Visible: boolean
  metaLines: Line[]

  setScreen: (screen: Screen) => void
  init: () => Promise<void>
  acceptWarning: () => void
  startRun: (profile: PlayerProfile) => void
  continueRun: () => void
  advance: () => void
  choose: (choiceId: string) => void
  goToNode: (nodeId: string) => void
  setSanity: (value: number) => void
  setFlag: (key: string, value: boolean | number | string) => void
  /** Debug setTime: rewrites the profile-independent meta hints gate. */
  debugSetTime: (iso: string) => void
  quitToTitle: () => void
  finishEnding: () => void
  saveNow: () => void
  showRealClock317: () => void
  dismissRealClock317: () => void
}

export type EngineListener = (events: EngineEvent[], step: Step, previous: Step | null) => void
const listeners = new Set<EngineListener>()

/** Presenters subscribe to engine side-effect events (sfx/fx/haptic/…). */
export function onEngineEvents(listener: EngineListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function dispatchEvents(events: EngineEvent[], step: Step, previous: Step | null): void {
  for (const listener of listeners) listener(events, step, previous)
}

let saveService: SaveService | null = null

export function configureSaveService(
  local: StorageAdapter,
  cloud: CloudStorageAdapter | null,
): void {
  saveService = new SaveService(local, cloud)
}

export function getSaveService(): SaveService {
  if (!saveService) saveService = new SaveService()
  return saveService
}

function clampSanity(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export const useGame = create<GameStore>((set, get) => {
  const applyStep = (step: Step, metaLines: Line[] = []) => {
    const previous = get().currentStep
    const endingEvent = step.events.find((e) => e.kind === 'ending')
    const ending = endingEvent?.kind === 'ending' ? endingEvent.id : null
    if (ending) {
      const meta = get().meta
      const endingsSeen = meta.endingsSeen.includes(ending)
        ? meta.endingsSeen
        : [...meta.endingsSeen, ending]
      const chaptersUnlocked = [...new Set([...meta.chaptersUnlocked, step.state.night])].sort(
        (a, b) => a - b,
      )
      const nextMeta = { ...meta, endingsSeen, chaptersUnlocked }
      set({
        meta: nextMeta,
        run: step.state,
        currentStep: step,
        endingCard: { id: ending, nodeId: step.node.id },
        screen: 'ending',
        metaLines: [],
      })
      dispatchEvents(step.events, step, previous)
      get().saveNow()
      return
    }
    set({ run: step.state, currentStep: step, metaLines })
    dispatchEvents(step.events, step, previous)
    if (step.events.some((e) => e.kind === 'autosave')) get().saveNow()
  }

  return {
    screen: 'boot',
    run: null,
    meta: { endingsSeen: [], chaptersUnlocked: [], contentWarningAccepted: false },
    currentStep: null,
    endingCard: null,
    realClock317Visible: false,
    metaLines: [],

    setScreen: (screen) => set({ screen }),

    init: async () => {
      const service = getSaveService()
      const meta = await service.loadMeta()
      const run = await service.loadRun()
      const late = isLateNight(new Date())
      if (run) {
        // Meta-horror flags (spec 5.6) are injected by the shell, not the story.
        if (late && !run.metaHints.lateNightCommentFired) run.flags['late_night'] = true
        const awayMs = Date.now() - new Date(run.lastPlayedAt).getTime()
        if (!run.finished && awayMs > 30 * 60 * 1000 && !run.metaHints.returnCommentFired) {
          run.flags['return_comment'] = true
          run.flags['away_minutes'] = Math.floor(awayMs / 60_000)
        }
        const step = resume(story, run)
        set({ meta, run, currentStep: step })
      } else {
        set({ meta, run: null })
      }
    },

    acceptWarning: () => {
      const meta = { ...get().meta, contentWarningAccepted: true }
      set({ meta })
      get().saveNow()
      set({ screen: 'title' })
    },

    startRun: (profile) => {
      const nowIso = new Date().toISOString()
      const step = startGame(story, profile, nowIso)
      if (isLateNight(new Date())) step.state.flags['late_night'] = true
      const comment = takeMetaComments(step.state)
      set({ realClock317Visible: false })
      applyStep({ ...step, state: comment.state }, comment.lines)
      get().saveNow()
      set({ screen: 'game' })
    },

    continueRun: () => {
      const run = get().run
      if (!run) return
      const comment = takeMetaComments(run)
      const step = resume(story, comment.state)
      set({ run: comment.state, currentStep: step, metaLines: comment.lines, screen: 'game' })
      get().saveNow()
    },

    advance: () => {
      const { run } = get()
      if (!run) return
      applyStep(engineAdvance(story, run))
      get().saveNow()
    },

    choose: (choiceId) => {
      const { run } = get()
      if (!run) return
      applyStep(engineChoose(story, run, choiceId))
      get().saveNow()
    },

    goToNode: (nodeId) => {
      const { run } = get()
      const fallback = run ?? {
        profile: null,
        currentNodeId: null,
        night: 0,
        sanity: 100,
        flags: {},
        inventory: [],
        visitedNodes: [],
        finished: false,
        startedAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        metaHints: {
          realClock317Fired: false,
          returnCommentFired: false,
          lateNightCommentFired: false,
        },
      }
      applyStep(engineGoTo(story, fallback, nodeId))
    },

    setSanity: (value) => {
      const { run } = get()
      if (!run) return
      const next = { ...run, sanity: clampSanity(value) }
      set({ run: next, currentStep: resume(story, next) })
    },

    setFlag: (key, value) => {
      const { run } = get()
      if (!run) return
      const next = { ...run, flags: { ...run.flags, [key]: value } }
      set({ run: next, currentStep: resume(story, next) })
    },

    debugSetTime: (iso) => {
      const { run } = get()
      if (!run) return
      const next = { ...run, lastPlayedAt: iso }
      set({ run: next })
    },

    quitToTitle: () => {
      get().saveNow()
      set({ screen: 'title', currentStep: get().run ? resume(story, get().run!) : null })
    },

    finishEnding: () => {
      const service = getSaveService()
      service.clearRun()
      set({ run: null, currentStep: null, endingCard: null, screen: 'title' })
    },

    saveNow: () => {
      const { run, meta } = get()
      const service = getSaveService()
      if (run) service.saveRun({ ...run, lastPlayedAt: new Date().toISOString() })
      service.saveMeta(meta)
    },

    showRealClock317: () => {
      const { run } = get()
      if (!run || run.finished || run.metaHints.realClock317Fired) return
      const next = { ...run, metaHints: { ...run.metaHints, realClock317Fired: true } }
      set({ run: next, currentStep: resume(story, next), realClock317Visible: true })
      get().saveNow()
    },

    dismissRealClock317: () => set({ realClock317Visible: false }),
  }
})

/** Helper re-exported for shell conditions. */
export { evaluateCondition }
