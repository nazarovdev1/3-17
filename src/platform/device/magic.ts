import { renderProfile } from '@/presenters/desktop/quality'

/**
 * Does this phone get the magic window (the 3D flat turned by the phone, REDESIGN §8), or the
 * HD stills? Weak devices keep the stills; the quality governor drops to them at run time too.
 * `?magic=0` forces the stills anywhere; `?magic=1` forces the window in debug/test builds
 * (the headless GPU is a software rasteriser, which is otherwise a "weak device").
 */
export function magicCapable(): boolean {
  const query = new URLSearchParams(window.location.search).get('magic')
  if (query === '0') return false
  const debug = import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1'
  if (query === '1' && debug) return webgl2()
  if (!webgl2()) return false
  const nav = navigator as Navigator & { deviceMemory?: number }
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 3) return false
  if (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency < 4) return false
  return !renderProfile().software
}

function webgl2(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
}
