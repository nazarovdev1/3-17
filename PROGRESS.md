# PROGRESS

Honest, phase-by-phase record. A phase is only marked done when every check ran green.

- [x] Phase 0 — Scaffold (see below)
- [x] Phase 1 — Core engine
- [x] Phase 2 — Full story content
- [x] Phase 3 — Shell and platform
- [x] Phase 4 — Mobile presenter
- [x] Phase 5 — Audio
- [x] Phase 6 — Desktop 3D presenter
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

## Phase 4 — Mobile presenter

Implemented:

- Continued the existing uncommitted mobile draft. Canvas 2D scenes cover every story
  location: room, kitchen, bathroom, corridor, balcony/window, stairwell, and flat 48;
  dark-room, wall, landing, peephole, and three ending compositions are included.
- Procedural furniture, wallpaper, window snow, stove/kettle, mirror/tiles, wardrobe,
  carpet, calendar, diary page, and radiator; depth-dependent parallax, permanent grain,
  scanlines and vignette. No remote visual assets or Three.js downloads on mobile.
- Choice-backed 44 px hotspots; panel choices remain scrollable at 360×640. Shared
  NarrationText retains skippable typewriter text and applies reversible corruption below
  15 sanity. Colour drain, fine screen tears, and slow wobble follow sanity bands.
- Voice overlay resets at every node, with delayed messages and a typing indicator.
  Full-screen peephole retains readable, scrollable narration and a continuation control.
- Hold-to-listen requires 700 ms, cancels on release/cancel, scene change or pause, and
  emits heartbeat haptics. Engine haptics use Telegram with browser vibration fallback.
- Telegram Gyroscope is feature/version gated; browser orientation requests permission
  inside a gesture. Missing or denied sensors leave touch/pointer drag available. Canvas
  reads mutable offsets rather than rebuilding its animation loop for each sensor sample.
- Reduce flashing removes lamp flicker, screen tears, wobble, shimmer and text corruption;
  subtitles and navigation remain available. Safe-area CSS and a centered phone frame.
- Pinned local OFL fonts: IBM Plex Mono 5.2.7 and Oswald 5.2.8. Actual WOFF cmap entries
  for U+02BB and U+2019 verified with `node scripts/verify-fonts.mjs`; both faces reviewed
  in `tests/screenshots/mobile-font-glyphs.png`.

Verification:

- `npm run check`: green, 117 unit/component tests, 77-node validator green, mobile JS
  93.1 KB gzipped (250 KB limit). The two existing meta-flag warnings remain intentional.
- Real-input mobile playthroughs reach A, B and C, including the seven-page/sanity gate,
  on 360×640. Scene sweep checks hotspot bounds across the story, peephole narration,
  interrupted/successful holds, and pause/resume with DeviceOrientationEvent unavailable.
- Full Playwright regression: 71 passed, 4 intentionally skipped (the no-WebGL-only
  assertion is skipped in the four projects where WebGL is enabled). All three mobile
  endings pass in all five projects; zero console/page errors. After the final hotspot
  and hold-cleanup adjustments, reran the four small-Android mobile checks.
- Opened and visually reviewed screenshots of every used mobile vignette and both fonts.
  Review fixes: furnished formerly empty room, recognizable kitchen/bathroom details,
  visible hotspot glints, preserved peephole text, and calendar target alignment.

Not verified / later phases:

- Physical iOS/Android sensor permission prompts, real Telegram Gyroscope and physical
  haptics were not exercised on hardware. Chromium emulation is not a physical-device test.
- Listening sound and all other audio remain Phase 5; desktop views remain Phase 6;
  mirror lag, unobserved changes, corridor puzzle and fake-glitch polish remain Phase 7.
  Performance/memory and full hardware/manual QA remain Phase 8.
- Existing DECISIONS.md entries are unchanged. Stop here after the Phase 4 commit.

## Phase 5 — Audio

Implemented:

- A dependency-free Web Audio engine with locally synthesized mono PCM at 22.05 kHz.
  Twenty sound cues cover wood/tile footsteps, radiator and wall knocks, chain, kettle,
  pages, heartbeat, filtered whisper noise, doors, relay/switch, static, pouring and pen.
  Separate four-second drone, wind, fridge, traffic and ending-clock loops are cached.
  The voice remains text; there is no speech generation or audio network request.
- Master/music/effects gain buses use the existing persisted Settings sliders, now with
  accessible labels. Gain smoothing, a compressor, an eight-voice cap, reusable buffers,
  and explicit source/node cleanup keep playback bounded. Desktop knocks use PannerNode;
  a listener-position API is ready for the Phase 6 camera.
- Title hum; pre-outage ambience; abrupt ambient silence at 3:17; one-shot story cues;
  whisper texture on voice lines; rising wall-listening texture and heartbeat; quiet
  street ambience for B; ticking exclusively in C. The saved current-night outage marker
  restores silence on reload, without treating a previous night's time flag as an outage.
- Context starts suspended and unlocks from pointer/keyboard gestures. A non-blocking Uzbek
  prompt offers retry when locked; unavailable Web Audio leaves navigation/play intact.
  Pause/settings, hidden document, pagehide and Telegram deactivation suspend playback.
  Separate pause reasons prevent activation from overriding a still-paused/hidden game;
  transient sounds are dropped rather than queued for later replay.
- Debug-only `window.__game.getAudioState()` reports native context state, active layers,
  bounded voices/buffers, gain settings, output peak and recent sound ids for verification.

Necessary fixes to existing code (explained before editing):

- `choose()` previously discarded side-effect events from choice.effects, losing chain,
  door and winding cues. Those events now precede destination effects; state/choices are
  unchanged. A regression test checks event order, including haptic and visual effects.
- Store steps/ending metadata are now committed atomically before event subscribers and
  checkpoint saves run. Intermediate old-state notifications could reset the audio scene
  during an ending. A regression test checks the committed ending and finished saved node.
- Existing clock-inspection cue ids stay in the story data but remain silent in the audio
  presenter; only Ending C creates the ticking loop, as required by PROMPT section 7.
  No recorded decisions or story content were changed.

Verified:

- `npm run check` green: 147 tests, 77-node validation, build and 97.2 KB gzipped mobile JS.
- `npx vitest run --coverage`: all 147 tests pass; core/engine retains 72/72 covered branches.
- Four native-audio browser tests pass on small Android: suspended → tap → running with
  nonzero output; master mute and independent music/effects channels; slider persistence;
  outage silence; native spatial panner; C-only ticking; bounded polyphony; wall-listening
  cancellation; pause/visibility/Telegram overlap; absent Web Audio; zero console/page errors.
- Full `npm run e2e -- --workers=2`: 91 passed, 4 expected project-specific skips.
  All 20 audio cases pass across the five projects, including mobile fallback when WebGL
  is disabled. Existing all-ending mobile routes, saves, settings, resizing and shell
  regression tests remain green. The no-WebGL spatial assertion was corrected to expect
  mobile audio rather than a desktop panner in that project.
- Opened `tests/screenshots/audio-unlock.png`: prompt is readable at 360×640 and leaves the
  title controls accessible.

Not verified:

- Physical iOS autoplay/interruption behavior, real Telegram lifecycle callbacks and
  subjective speaker/headphone listening were not exercised on hardware. PCM tests and
  Chromium analyser measurements verify the generated signal, not acoustic playback.
- Camera-relative spatial listening is Phase 6; full performance/hardware checks are Phase 8.

Phase 5 exit met. Stop after committing this phase; Phase 6 is not started.

## Phase 6 — Desktop 3D presenter

Implemented (2026-10-26):

- Lazy React Three Fiber presenter with procedural nearest-filtered textures, instanced
  PS1 geometry, flat 47, its decayed copy in flat 48, an enclosed stair landing and balcony.
  Furniture includes the stopped 3:17 clock, wall carpet, Rubin TV, radiator, kettle,
  wardrobe, mirror, numbered doors, chain, calendar and diary targets. No remote assets.
- Native Pointer Lock and rejected/unavailable-lock drag look; collision-limited WASD,
  E interaction, F flashlight, held Q listening, numeric choices, Space text skip and
  Escape pause. Shared narration and all story choices remain accessible in the HUD.
  One-time controls hint, optional head bob and camera-relative spatial audio.
- Fluorescent lamps and working switches, sodium streetlight, fog/snow, progressive
  window blackout and current-night outage. A delayed mirror silhouette, corridor extension
  outside the camera frustum, ajar door 48 and transient peephole figure are rendered.
  The peephole uses a circular radial-distortion shader. Phase 7 pacing/polish remains separate.
- 450/320-pixel render tiers with three-second FPS windows, automatic high-to-low drop,
  low-to-mobile fallback preserving story state, WebGL 2 preflight and context-loss recovery.
  Paused/hidden frames and long background stalls are excluded from quality sampling.
  Shared GPU resources and boot-probe resources are explicitly disposed.
- Scalar renderer diagnostics are available through the existing debug-only API and overlay.
  Mobile mode does not probe the GPU or download the desktop renderer. Failed renderers stay
  in mobile after resize, with manual Settings selection available to retry.
- Necessary decision 6 correction was explained before editing: the old manual chunking
  hoisted Three.js into mobile and its budget subtraction reported mobile as zero. Native
  dynamic splitting and full-entry mobile accounting now enforce the intended budgets.
  All other recorded decisions and story content remain unchanged.

Verified:

- `npm run check` green: lint, format, typecheck, 151 unit/component tests, 77-node validator,
  production build, mobile 98.0 KB / 250 KB and lazy desktop 262.8 KB / 700 KB gzipped JS.
- All 108 functional Playwright checks pass across five Chromium projects; four expected
  project-specific skips. Desktop A/B/C all pass through real input, as do all mobile endings.
  No console/page errors. Native context restore/fallback, WebGL 1/no-WebGL fallback,
  Pointer Lock/drag, keyboard controls, actual 320-pixel low tier and mobile request isolation pass.
- Isolated performance check passes separately with tracing disabled: 59.0 FPS over three
  seconds at high/450 pixels, about 60 FPS after repeated room tours. Geometry/texture
  counts remain exactly 41/10 after warm-up and repeated tours. The earlier traced run's
  recording overhead and startup variability produced lower readings; performance recording
  is now separated from functional traces. The benchmark retains its 55 FPS assertion.
- Opened and reviewed all eight desktop scene captures. Kept the previously reviewed mobile
  evidence; no finished mobile scene work was replaced.
- Browser tests use one worker to avoid competing software renderers and an explicit SDK
  fixture to remove CDN availability from the functional gate. Initial failures revealed
  the fixed low-tier pixel-ratio overwrite and two test target ambiguities.

Limits: the host exposes SwiftShader even without forced software flags. Physical GPU,
real Telegram Desktop webview behavior and hardware audio/sensors remain Phase 8 validation.
Phase 7's cross-mode horror/pacing pass is not started.

Phase 6 exit met. Stop after this phase commit.
