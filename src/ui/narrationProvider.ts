import { StaticNarrationProvider } from '@/core/narration/static'

/** Re-export so presenters share one provider instance without cycles. */
export const narration = new StaticNarrationProvider()
export { StaticNarrationProvider }
