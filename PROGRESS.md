# PROGRESS

Honest, phase-by-phase record. A phase is only marked done when every check ran green.

- [x] Phase 0 — Scaffold (see below)
- [x] Phase 1 — Core engine
- [x] Phase 2 — Full story content
- [x] Phase 3 — Shell and platform
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

## Phase 2 — Full story content

Done:

- 77 story nodes: night 1 "Koʻchib kelish" (18), night 2 "Devor" (16), night 3 "Takror" (16),
  night 4 "48" (20), night 5 "3:17" + endings (15, incl. endA/endB/endC). Validator green
  (structure, reachability, all 3 endings reachable, 7 unique diary pages, no empty text,
  conditional-fallback rules, placeholder whitelist).
- Profile variants in use: fear (4-way voice lines n2), livesAlone (n1/n2), doorAtNight
  (n1/n5), name (n4 passport line). n1_reaction (javob/sukut/urdi) echoed by the voice in
  n2/n5. knows_48/knows_sardor gate n4 choice "Sardormisan?".
- Hidden ending C gate at n5_final_choice: 7 diary pages + sanity ≥ 40 + never answered on
  night 3 (flag answered_n3; expressed as {not:{flag:'answered_n3'}} — see DECISIONS 9).
- Diary pages: n2 wardrobe + bathroom, n3 kitchen + carpet (after corridor loop), n4 flat-48
  chair + night-4 carpet, n5 under the stopped clock.
- Sanity budget verified end to end: a careful run reaches the C gate at ~50/100; the
  "reduce" path (tea, avoid optional scares, never answer n3) is the intended one.
- Text presenter (`?presenter=text`) with real-click e2e playthroughs to A (4.9s), B (4.6s),
  C (6.5s) — all passing, zero console errors.
- Apostrophe audit script run over all story strings: only U+02BB (ʻ) and U+2019 (’) in Uzbek
  text; U+2018 eliminated.
- Narrative proofread pass: fixed broken/weak lines (corridor "Dahdahiz" spellings, tv noise
  line, knock-back line, wardrobe diary intro, landlord-note phrasing).

Verified: `npm run check` green (99 tests, validator OK 77 nodes, budget green); Playwright
A/B/C text-presenter playthroughs green against the production build.

Notes:

- The two validator warnings (flags `late_night`, `return_comment` never set by effects) are
  intentional: they are shell-injected meta-horror flags set at boot / on resume (Phase 3+).

## Phase 3 — Shell and platform

Done:

- Screens: boot (mode detection + GPU check) → content warning (with Reduce flashing, gated
  on confirm) → title (continue/new/settings/gallery) → diegetic rental form (name prefilled
  from Telegram initDataUnsafe, sanitized to 20 chars; livesAlone / fear / doorAtNight) →
  game with skippable typewriter narration + numbered choices + pause menu → ending cards →
  endings gallery + chapter select (unlocked nights).
- Telegram adapter: ready/expand/fullscreen/disableVerticalSwipes/lockOrientation, header and
  background forced to #0B0B0C, HapticFeedback mapping + navigator.vibrate fallback,
  CloudStorage as a best-effort save mirror (gated on isVersionAtLeast('6.9') because the
  official script logs console.error when unsupported members are merely accessed),
  BackButton registration. Everything feature-detected; absent gracefully outside Telegram.
- Mode routing: pure detectMode() (settings override, pointer:fine, width ≥ 900, WebGL,
  GPU check incl. SwiftShader/llvmpipe rejection and an FPS sample); Settings offers
  manual auto/mobile/desktop; resize re-evaluates auto mode.
- Persistence: settings store (localStorage, guarded) + SaveService wired with
  LocalStorageAdapter and the Telegram cloud mirror; autosave on checkpoint nodes, on every
  action, and on visibilitychange hidden.
- Error handling: root ErrorBoundary with a calm Uzbek message, in-memory error log with
  global error/unhandledrejection handlers.
- Debug: ?debug=1 overlay (FPS, screen, node, sanity, inventory, flags, last errors, node
  jumper) and window.__game (getState/goTo/choose/setSanity/setFlag/setTime/advance) —
  attached only when debug is on; e2e-verified absent otherwise.
- Real-clock 3:17 watcher (spec 5.6) polling every 20 s, one-shot per run, calm banner.

E2E (50 tests across desktop-chrome 1440×900, iPhone 13 (Chromium per spec), Pixel 7,
small-android 360×640, no-webgl):

- boots without Telegram and with a mocked WebApp (ready/expand called, name prefill) ✔
- full flow: warning → title → form → night 1 hub → clock → reload → resumes at the same
  node ✔
- pause menu reachable, quit to title works ✔
- settings persist across reload ✔
- resize/rotate does not break layout or state ✔
- no WebGL on desktop viewport → mobile mode ✔; 360 px keeps controls inside the viewport ✔
- window.__game absent without ?debug=1 ✔
- zero console.error / pageerror enforced by afterEach in every test ✔

Verified: `npm run check` green (117 unit tests, validator OK, mobile JS 87.9 KB gz ≤ 250),
e2e suites green, text-presenter A/B/C playthroughs still green.

Notes:
- Playwright projects force Chromium everywhere (spec 12 asks for Chromium+SwiftShader);
  iPhone 13 emulation therefore runs under Chromium, not WebKit.
