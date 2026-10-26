import { ui } from '@/content/text'
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
          text: ui('meta.late_night'),
        },
        { text: ui('meta.late_night_fallback') },
      ],
    })
    metaHints.lateNightCommentFired = true
  }
  if (state.flags['return_comment'] && !metaHints.returnCommentFired) {
    const awayMinutes = Number(state.flags['away_minutes'] ?? 30)
    // From night 3 the voice says "sen" (FIX_PROMPT 6.1); its return comment follows suit.
    const informal = state.night >= 3
    lines.push({
      speaker: 'voice',
      variants: [
        {
          when: { flag: 'return_comment' },
          text:
            awayMinutes >= 120
              ? ui(informal ? 'meta.return_long_sen' : 'meta.return_long')
              : ui(informal ? 'meta.return_short_sen' : 'meta.return_short'),
        },
        { text: ui('meta.return_fallback') },
      ],
    })
    metaHints.returnCommentFired = true
  }
  return { state: { ...state, metaHints }, lines }
}
