# PROGRESS

Honest, phase-by-phase record. A phase is only marked done when every check ran green.

- [x] Phase 0 — Scaffold (see below)
- [x] Phase 1 — Core engine
- [ ] Phase 2 — Full story content
- [ ] Phase 3 — Shell and platform
- [ ] Phase 4 — Mobile presenter
- [ ] Phase 5 — Audio
- [ ] Phase 6 — Desktop 3D presenter
- [ ] Phase 7 — Horror polish
- [ ] Phase 8 — Full QA
- [ ] Phase 9 — Release docs

## Phase 0 — Scaffold

Done:

- Vite 8 + React 19 + TypeScript 5.9 strict (`strict`, `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`) with `@/*` path alias.
- ESLint 10 flat config (typescript-eslint recommendedTypeChecked, react-hooks), Prettier,
  Vitest 5 (jsdom) with a first unit test, Playwright 1.64 config with all 5 projects
  (desktop-chrome, iphone-13, pixel-7, small-android, no-webgl) and a boot smoke spec.
- `npm run check`: lint → format:check → typecheck → test → validate:story → build → budget.
- Bundle budget gate reading `dist/.vite/manifest.json` (mobile ≤ 250 KB gz JS,
  desktop-3d subtree ≤ 700 KB gz).
- `scripts/validate-story.ts` intentionally exits 0 with a note: story content is authored in
  Phase 2, the real validator lands in Phase 1.
- Committed: see git log.

Not yet verified (planned):

- Playwright browsers not yet downloaded (`npx playwright install chromium`) — planned before
  the first real e2e run in Phase 3.
- e2e suite not part of `check`; it runs via `npm run e2e`.

## Phase 1 — Core engine

Done:

- `src/core/engine`: StoryNode/Line/Choice/Effect/Condition types per spec 4.1; story runner
  (startGame/advance/choose/resume/goTo) with onEnter effects, visited nodes, night-change
  events, checkpoint autosave events, ending detection; all 9 condition kinds; all 6 effect
  kinds emitting presenter events (sfx/fx/haptic) without touching state; meta-time helpers
  (isLateNight 00:00–05:00, is317 exact minute).
- `src/core/state`: GameState/MetaState/PlayerProfile types, sanity clamp + 4 bands
  (100–70/69–40/39–15/<15), deterministic corruptText (xorshift32) for the corruption band.
- `src/core/save`: versioned RunSave/MetaSave with a migration registry (empty at v1),
  shape-validating parser that returns null on any corruption (never throws), SaveService with
  local-first + best-effort cloud mirror, MemoryStorage for tests.
- `src/core/narration`: NarrationProvider interface + StaticNarrationProvider (first matching
  variant wins, unconditional fallback required) and {name}/{fear}/{door}/{time} placeholder
  resolution ({time} defaults to 3:17).
- `src/core/validate`: full validator — missing edges, unreachable nodes, no-exit cycles,
  nodes with no exit or multiple exits, missing/duplicate/unreachable endings, empty text,
  unknown placeholders, conditional-last-variant, duplicate/multi-granted diary pages, exactly
  7 diary pages, warnings for flags read but never set.
- Tests: 99 unit tests; engine coverage 100% statements/branches/functions/lines (verified via
  `vitest --coverage`, include src/core, barrels excluded).

Verified: `npm run check` fully green (lint, format, typecheck, 99 tests, validate:story,
build, budget 66.6 KB gz mobile).
