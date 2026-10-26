import type { QualityTier } from './mode'

/** Three sustained seconds per tier; ignore hidden/paused frames at the caller. */
export class QualityGovernor {
  tier: QualityTier = 'high'
  private elapsed = 0
  private frames = 0
  fps = 60
  sample(delta: number): 'low' | 'fallback' | null {
    this.elapsed += delta
    this.frames++
    if (this.elapsed < 3) return null
    this.fps = this.frames / this.elapsed
    this.elapsed = 0
    this.frames = 0
    if (this.tier === 'high' && this.fps < 40) {
      this.tier = 'low'
      return 'low'
    }
    if (this.tier === 'low' && this.fps < 25) return 'fallback'
    return null
  }
  resetWindow() {
    this.elapsed = 0
    this.frames = 0
  }
}
