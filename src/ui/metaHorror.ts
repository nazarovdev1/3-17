import type { Line } from '@/core/engine/types'
import type { GameState } from '@/core/state/types'

/** Shell-owned comments consume saved gates when play actually resumes, not at the title. */
export function takeMetaComments(state: GameState): { state: GameState; lines: Line[] } {
  if (state.finished) return { state, lines: [] }
  const lines: Line[] = []
  const metaHints = { ...state.metaHints }
  if (state.flags['late_night'] && !metaHints.lateNightCommentFired) {
    lines.push({
      speaker: 'narrator',
      variants: [
        {
          when: { flag: 'late_night' },
          text: 'Haqiqiy soat ham yarim tundan oʻtgan. Hali uxlamadingizmi?',
        },
        { text: 'Tashqarida tun uzoq davom etayotgandek.' },
      ],
    })
    metaHints.lateNightCommentFired = true
  }
  if (state.flags['return_comment'] && !metaHints.returnCommentFired) {
    const awayMinutes = Number(state.flags['away_minutes'] ?? 30)
    lines.push({
      speaker: 'voice',
      variants: [
        {
          when: { flag: 'return_comment' },
          text:
            awayMinutes >= 120
              ? 'Bir necha soat yoʻq boʻldingiz. Men kutdim. Bu yerda soat hali ham oʻsha.'
              : 'Yarim soatdan koʻproq kutdim. Qaytdingiz. Bu yerda soat hali ham oʻsha.',
        },
        { text: 'Qaytdingiz. Men kutdim.' },
      ],
    })
    metaHints.returnCommentFired = true
  }
  return { state: { ...state, metaHints }, lines }
}
