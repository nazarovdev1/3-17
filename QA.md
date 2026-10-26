# QA

Manual checklist (spec 12). Executed in a real browser where possible; every item gets an
honest ✅ / ❌ / not-verified note with a date.

## Manual checklist (to be executed during Phases 3–8)

- [x] Pointer Lock works in a normal browser; fallback to click-and-drag look inside a
      webview without Pointer Lock (2026-10-26, rejection simulated in Chromium; physical webview pending).
- [x] Looping corridor (night 3, desktop) actually extends when the player looks away (2026-10-26, Chromium).
- [x] Peephole fisheye view renders correctly (desktop shader and mobile vignette; reviewed 2026-10-26).
- [x] All current mobile hotspots stay within the 360×640 scene; real-input ending runs
      and cancelled/successful wall holds pass (2026-10-25, Chromium emulation).
- [x] "Reduce flashing" removes the night 4 fake glitch and decorative flashes (2026-10-26, both presenters in Chromium).
- [ ] Telegram BackButton opens the pause menu; the player can always leave.
- [ ] Pause menu reachable at any moment; closing the tab mid-game autosaves.
- [x] IBM Plex Mono and Oswald contain ʻ (U+02BB) and ’ (U+2019); WOFF cmap check and
      visual review of `tests/screenshots/mobile-font-glyphs.png` (2026-10-25).
- [ ] No external network requests at runtime except telegram-web-app.js.

## E2E status

| #   | Test (spec 12)                                                                   | Status                                                           |
| --- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Boots without / with mocked Telegram                                             | passed (Phases 3–4)                                              |
| 2   | Full playthrough to all 3 endings via `window.__game` + one ending by real input | desktop/mobile A/B/C real input passed; full debug paths pending |
| 3   | Save → reload → resume                                                           | passed (Phases 3–4)                                              |
| 4   | Audio unlock flow                                                                | native suspended → tap → running passed (Phase 5)                |
| 5   | Rotate / resize does not break layout or state                                   | passed (Phases 3–4)                                              |
| 6   | WebGL disabled → mobile mode on desktop viewport                                 | passed (Phases 3–4)                                              |
| 7   | WebGL context loss → recovery or fallback                                        | passed (Phase 6: native restore and fallback)                    |
| 8   | No console.error / pageerror                                                     | active since Phase 0 (boot spec)                                 |

## Run log

- 2026-10-25 — Phase 0. `npm run check` green after scaffold. Playwright browsers not yet
  installed; boot e2e not yet executed (no browsers).

- 2026-10-25 — Phase 3. All 50 e2e tests across 5 Chromium projects green; fixed an unstable
  zustand selector (React #185), a Telegram-script CloudStorage console.error, and several
  test-flow bugs (warning checkbox, disabled form button).

- 2026-10-25 — Phase 4. `npm run check` green (117 tests, validator, build, 93.1 KB gz
  mobile JS). Full Playwright suite: 71 passed, 4 expected project-specific skips;
  A/B/C mobile real-input routes pass in every project with zero console/page errors.
  Scene sweep checks every non-ending story node, current hotspot bounds, peephole text,
  cancelled/successful holds, missing orientation API, and pause/resume. Four small-Android
  checks rerun after final target alignment / hold cleanup. Browser runs needed network
  access for the permitted official Telegram script; restricted runs correctly failed
  the console gate on `ERR_NETWORK_ACCESS_DENIED`.
- 2026-10-25 — Opened all 11 used mobile scene screenshots, three ending cards and the
  font glyph sheet in `tests/screenshots/`. All seven story locations are represented
  (the balcony uses the window vignette). Long narration and choices scroll within the
  lower panel; peephole text remains visible. Review fixes: room furniture, kitchen/tile
  detail, hotspot glints, calendar alignment. Desktop scene evidence remains Phase 6.
- Hardware limitations: physical haptics, iOS permission prompts and real Telegram sensor
  behavior remain unverified. Native audio graph verification is recorded below; physical
  iOS audio and speaker/headphone listening remain unverified. Desktop shader/Pointer Lock and horror
  polish are later phases. Reduce flashing currently disables mobile decorative motion,
  lamp flicker, tears and corruption; the Phase 7 fake-glitch check remains pending.

## Phase 5 — Audio checks (2026-10-25)

Run: `npm run check` green (147 tests, validator, build and 97.2 KB gz mobile JS).
Full Playwright suite: 91 passed, 4 expected skips; all 20 audio cases green in the five
Chromium projects. `vitest --coverage` preserves 72/72 covered core/engine branches.
Initial runs caught startup suspension, transition ordering, and a test that incorrectly
expected spatial desktop audio after the no-WebGL mobile fallback; these are corrected.

- [x] Native suspended AudioContext becomes running after a trusted tap. The unlocked
      title produces nonzero analyser samples. Prompt screenshot opened and reviewed at
      360×640: `tests/screenshots/audio-unlock.png`.
- [x] Master zero produces measured silence; music mute leaves effects audible; effects
      mute leaves music audible. All three slider values persist across reload.
- [x] Outage stops ambient layers and reaches measured silence between cues. Inspection
      nodes do not tick; C's clock loop produces separated ticks. Knocks use a native
      PannerNode in desktop mode and the mobile path after no-WebGL fallback.
- [x] Holding the wall starts rising whisper audio/heartbeat; release stops the listening
      source. Pause/hidden-page/Telegram-deactivation reasons compose correctly, freeze
      native context time, discard transient cues, and resume without replaying old sounds.
- [x] Missing Web Audio leaves a playable game and usable settings, with no console errors.
- [x] Twenty cue buffers and five ambience loops are finite/non-silent, with bounded
      amplitudes and loop seams. Repeated native playback stays at ≤8 transient voices
      and ≤25 cached buffers; C cancels previous knocks.
- [x] Regression tests preserve choice effects before destination effects, publish the
      finished ending before subscribers run, and save the finished node.
- [ ] Physical-device acoustic listening, iOS interruption/autoplay, and real Telegram
      lifecycle delivery. Chromium graph samples and mocked lifecycle events verify the
      implementation; these hardware checks remain Phase 8.

## Phase 6 — Desktop checks (2026-10-26)

- Native Pointer Lock, WASD collision, F flashlight, numeric choices, Space text skip and
  Escape pause pass in Chromium. A rejected Pointer Lock promise leaves drag look working;
  E reaches the clock. Context loss is exercised with the native WEBGL_lose_context extension:
  restoration resumes the renderer; a second, unrecovered loss falls back to mobile with
  identical story state, including after resize. Forced low FPS drops to low, verifies the
  actual 320-pixel drawing buffer, then preserves the current node in mobile.
- Real-input desktop routes reach A, B and the seven-page/sanity-gated C. Eight scene captures
  cover the room, kitchen, bathroom, corridor, balcony, stair landing, flat 48 and peephole.
  The circular fisheye, readable HUD, delayed silhouette and numbered doors were reviewed.
- Room geometry is instanced by material; only the nearest interior ceiling fixture shades
  visible surfaces. A locally generated grain tile and CSS vignette avoid redundant screen
  passes; chromatic distortion and the peephole retain the effect composer when needed.
  A standalone default-renderer probe measured 60 FPS at the high tier's 450-pixel height.
  The host's default renderer is also SwiftShader; physical GPU/Telegram webview validation
  remains a Phase 8 hardware check, not a claim made from software emulation.
- Repeated room tours compare GPU resource counts after a first-use warm-up. Diagnostics
  capture geometry/texture counts, draw calls, triangles, quality and drawing-buffer height.
  The automated steady-frame sample enforces 55 FPS at the default high tier.
- Corrected the bundle gate's shared-entry accounting and removed manual chunk grouping that
  pulled Three.js into mobile. Mobile-only browsing checks actual request URLs and never
  downloads the desktop presenter. WebGL 1 alone and no WebGL both keep a playable mobile game.
- Browser tests run with one worker because concurrent SwiftShader sessions compete for host
  CPU. A shared fixture serves an empty Telegram script outside the host; Telegram cases
  install their explicit WebApp mocks. This removes CDN outages from the zero-console-error
  gate. Earlier runs exercised the official SDK; real Telegram integration still needs hardware.
- Review fixes include the low-tier pixel ratio being overwritten on rerenders, a misleading
  pre-warm-up memory baseline, the kitchen starting view, and two ambiguous/obscured test
  targets. Existing mobile screenshots remain the previously reviewed Phase 4 evidence.

Final results: `npm run check` passes all 151 tests and both JS budgets (98.0 KB mobile,
262.8 KB desktop). The full browser sweep passes all 108 functional cases with four expected
skips. The corrected, separately run performance case passes at 59.0 FPS over three seconds
on high/450 pixels and 60.0 FPS after the room tours; GPU counts remain 41 geometries and
10 textures. Tracing is disabled only in the performance file so browser recording does not
become part of the renderer benchmark. Early startup measurements varied; physical laptop
and real Telegram validation remain unverified and belong to Phase 8.

## Phase 7 — Horror and pacing checks (2026-10-26)

- [x] Late-night launch adds an extra narrator line; its saved gate prevents repeats after
      node changes and reload. An artificially aged save resumes at the same bathroom node,
      uses the elapsed absence in the voice comment and consumes that comment once.
- [x] Advancing the browser's real local clock into 3:17 shows the one-time banner without
      changing node/sanity, and persists its gate across reload. The native audio diagnostic
      also verifies the short knock cue.
- [x] Both presenters show the finite night-4 signal-loss cue, leave pause/continue usable,
      and omit it with Reduce flashing. The effect has no pointer interception, never replays
      on a repeated visit, clears on hidden-page exit, and uses the authored 2.5-second duration.
- [x] The mobile return-room puzzle offers only its changed clock hotspot. The desktop clock
      stays put while in the frustum and moves after a real drag-look turn. A real head turn
      changes the camera before the delayed mirror yaw, which catches up after half a second.
- [x] Both modes show five lit windows becoming zero before the outage. The mobile voice's
      reveal control removes its typing pause and displays the dialogue once, without a second
      copy in the narration panel. Opened the new effect/clock/voice/blackout screenshots.
- [x] Real-input desktop and mobile C routes traverse nights 1–5 and the new clock node;
      the route lists are attached by Playwright. A/B/C pass in both modes, and the seven-page,
      sanity and never-answer requirements remain intact. The full scripts were read during
      the text/pacing pass; per-night fixes are listed in PROGRESS.md.
- [x] Ending narration uses a bounded scrollable panel with a visible reading hint and
      accessible exit controls. Three 360×640 ending routes explicitly scroll to the last line;
      A's final line names Dilnoza. Screenshots include the top and bottom of every mobile ending.
- [x] A unit contract limits named narrator lines to one per night. Unit tests also check
      immutable/persisted meta gates and reduced/finite/non-replaying glitch behavior.

The high target was tuned from 450 to 400 pixels after the original software-GPU measurement
fell below 55 FPS. This stays inside PROMPT's 320–480 range; low remains 320 and the test's
55 FPS assertion is unchanged. With a five-second GPU warm-up and five-second sample, high
measured 60.0 FPS; repeated room tours remained about 59.9 FPS with exactly 43 geometries
and 10 textures before/after. DECISIONS.md is unchanged.

The browser sweep and corrective reruns cover 121 passing cases and four expected skips.
Initial red checks came from a case-sensitive old wording assertion and the original
450-pixel software-GPU target. The wording check is now case-insensitive; the resolution
change and measured results are recorded above. `npm run check` passes 157 tests, the
78-node validator with zero warnings, build and JS budgets (99.3 KB mobile, 263.1 KB desktop).
The old graph warnings disappeared because the meta-comment variants now live in the shared
shell comment path, where their existing one-shot gates can be consumed consistently.

Physical GPU/Telegram/sensor/audio validation remains Phase 8. Automated full-route runs
skip typewriting and are not evidence of a 30–45 minute human play duration; that duration
has not been measured. Phase 8 has not been started.
