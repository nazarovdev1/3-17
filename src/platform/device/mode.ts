/**
 * Mode routing (spec 2). Pure logic so it is unit-testable; the browser side
 * only collects inputs and calls detectMode.
 */
export type GameMode = 'mobile' | 'desktop'

export interface ModeInput {
  /** Manual Settings override, if any. */
  setting: GameMode | 'auto'
  pointerFine: boolean
  viewportWidth: number
  /** WebGL context creation succeeded. */
  webglAvailable: boolean
  /** Quick GPU check passed (renderer string sane, early FPS above floor). */
  gpuOk: boolean
}

export const DESKTOP_MIN_WIDTH = 900

export function detectMode(input: ModeInput): GameMode {
  if (input.setting === 'mobile') return 'mobile'
  if (input.setting === 'desktop') {
    return input.webglAvailable ? 'desktop' : 'mobile'
  }
  const desktop =
    input.pointerFine &&
    input.viewportWidth >= DESKTOP_MIN_WIDTH &&
    input.webglAvailable &&
    input.gpuOk
  return desktop ? 'desktop' : 'mobile'
}

/** Quality tier for the 3D presenter (spec 10). */
export type QualityTier = 'high' | 'low'

export function detectTier(internalHeightTarget: number): QualityTier {
  return internalHeightTarget >= 400 ? 'high' : 'low'
}

export const QUALITY_HEIGHT: Record<QualityTier, number> = { high: 450, low: 320 }

/** FPS floors (spec 10): auto-drop below 40, fall back to mobile below 25. */
export const FPS_DROP_THRESHOLD = 40
export const FPS_FALLBACK_THRESHOLD = 25
