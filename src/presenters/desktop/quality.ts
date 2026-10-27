import { QUALITY_HEIGHT, type QualityTier } from '@/platform/device/mode'

/**
 * Render resolution and features per device (FIX_PROMPT §2: native resolution, DPR up to 2
 * on the high tier). SwiftShader is the sanctioned headless test backend (see gpu.ts); it
 * renders at the old small size so the automated suite runs at a usable frame rate.
 * `?quality=ultra` (still renders, QA captures) forces full resolution on any backend.
 */
export interface RenderProfile {
  software: boolean
  ultra: boolean
  shadows: boolean
}

export function renderProfile(gl?: {
  getContext: () => WebGLRenderingContext | WebGL2RenderingContext
}): RenderProfile {
  let renderer: string
  try {
    const own = gl?.getContext()
    const context = own ?? document.createElement('canvas').getContext('webgl2')
    const info = context?.getExtension('WEBGL_debug_renderer_info')
    renderer = info && context ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    // A probe context of our own is released at once.
    if (!own) context?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    renderer = ''
  }
  const software = /swiftshader|llvmpipe|software/i.test(renderer)
  const ultra = new URLSearchParams(window.location.search).get('quality') === 'ultra'
  return { software, ultra, shadows: !software || ultra }
}

/** CPU rasterizer limits; native GPUs render at viewport resolution. */
const SOFTWARE_HEIGHT = QUALITY_HEIGHT

export function renderDpr(tier: QualityTier, profile: RenderProfile, viewportHeight: number) {
  const device = Math.min(2, window.devicePixelRatio || 1)
  if (profile.ultra) return Math.max(1, device)
  if (profile.software) return Math.min(1, SOFTWARE_HEIGHT[tier] / Math.max(1, viewportHeight))
  // Low tier: about 720 lines, never above the device ratio.
  return tier === 'high' ? device : Math.min(device, 720 / Math.max(1, viewportHeight))
}
