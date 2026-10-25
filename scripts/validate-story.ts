/**
 * Story graph validation entry point.
 *
 * Phase 0: no story content exists yet, so this exits successfully with a note.
 * Phase 1 replaces this with the full validator over src/content/story.
 */
const hasStoryContent = false

if (!hasStoryContent) {
  console.log('validate-story: story content not authored yet (expected before Phase 2); OK')
} else {
  console.error('validate-story: validated story modules')
}
