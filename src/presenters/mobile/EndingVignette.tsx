import { ui } from '@/content/text'
import { StillScene } from './StillScene'
import type { EndingId } from '@/core/state/types'

export function EndingVignette({ ending }: { ending: EndingId }) {
  return (
    <div className="ending-vignette">
      <StillScene id={`ending_${ending.toLowerCase()}-on`} label={ui('mobile.ending_label')} />
    </div>
  )
}
