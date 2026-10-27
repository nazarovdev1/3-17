# QA

Manual checklist (spec 12). Executed in a real browser where possible; every item gets an
honest ✅ / ❌ / not-verified note with a date.

## F5 — Recorded audio verification (completed 2026-10-28)

- `npm run check`: **309 tests / 27 files**; lint, formatting, strict types, 90-node story,
  73-object world, production build and budgets pass (22.8 MB desktop total / 60 MB;
  18.3 MB flat 47 playable / 25 MB; mobile initial JS 120.4 KB / 250 KB).
- **29 Freesound CC0 assets, 22 authors, 41 files / 2,556,600 bytes**. Every SfxId and
  every ambient cue except the intentional low drone has a recording. Manifest unit tests
  enforce complete cue coverage, ≥3 separate variants per floor (four ship), hashes,
  local FLAC/AAC formats, source identity, license and credits. CREDITS and Settings use
  the same manifest. Credentials remain only in ignored `.env.local`.
- Unit checks reject NC/ND/SA/unknown licenses, changed ids/licenses and invalid excerpts;
  isolate decode/download failures; exercise synth fallback, bounded voices, random
  recorded variation/pitch/gain, HRTF, actual plan positions and late-decode silence.
- Native FFmpeg measurements of **all shipped files** pass in `verify-sounds.ts`: mono,
  32 kHz; effects -6 ±0.5 dBFS peak; loops -23 ±0.75 LUFS; 320 ms fridge stop; exact zero
  gaps between clock ticks. Lossless FLAC preserves transient peaks and clock gaps;
  continuous ambience is AAC-LC/96 kbps. Measurements are cached in
  `.asset-cache/sound-verification.json` (not shipped). Build staging preserves existing
  assets if a clip fails; retries handle Windows directory locks.
- Focused native-audio small-Android run **5/5 passed**: 41 decoded files, actual recorded
  knock/HRTF position, corrupted-file audible synth fallback, measured post-cut silence,
  mixer persistence/mute, C-only ticks, bounded voices, pause/hidden/Telegram overlap,
  unavailable Web Audio and zero console/page errors. Silence is measured atomically
  inside the page; earlier CDP round trips consumed part of the gap before sampling.
- First 182-case sweep: **175 passed / 2 failed / 5 skipped**, all **25 audio cases green**.
  The two desktop failures (54.50 FPS, Ending C falling back to mobile) were profiled.
  Regular software output now uses ACES filmic mapping; native/ultra remains AgX. High/low
  resolution, geometry, 55 FPS, governor thresholds and assertions stay unchanged. Audio
  listener writes are skipped at rest; transient breathing is one layer across rapid beats.
- Focused rerun of the two failed cases: **2/2 passed**. The benchmark measured **59.90
  FPS**, with exactly 225 geometries / 44 textures before and after tours. Both baseline
  and optimised bright/night-5 software captures were opened: shapes and lighting remain
  readable. The 1440×900 and 360×640 credits captures were opened; long sound titles wrap,
  source links/author/CC0 are legible, and the scrollable list contains every sound.
- Final uninterrupted full suite: **177 passed / 5 expected skips / 0 failures** in
  13.2 minutes, including all 25 audio cases. Desktop default measured **59.71 FPS**;
  repeated room tours retained **225 geometries / 45 textures**. The original 55 FPS
  gate, resource equality, real-input endings and repeated-night heap limits all pass.
- Intermediate full rerun: 58.77 FPS passed; reload/resume exposed a partial typewriter
  line after five seconds despite the correct saved node. Elapsed-time catch-up now
  avoids compounding render delays; blocked-renderer unit coverage and 3× unchanged
  desktop save/reload E2E pass. Assertions/timeouts remain unchanged.
- Resource follow-up: phone notification geometry was uploaded on its first blink;
  breath textures were recreated per node. Phone priming/complete owned-resource
  cleanup and a persistent primed breath sprite remove those fluctuations. The
  original repeated-night GPU/heap test passes 3×; no tolerance or warm-up change.

Not measurable by graph tests: how natural the cuts/loops sound, subjective mix balance,
headphone direction/distance, and whether the silence creates tension. The owner should
listen with headphones. Physical iOS interruptions/autoplay and real Telegram clients
remain hardware checks. F6 is untouched.

## F4 — Desktop horror review (2026-10-27)

All 12 HD captures (`audit/f4.spec.ts`, 1440×900, `quality=ultra`) were opened one by one,
several of them cropped to check details (TV glass, door gap). The owner sheet is
`audit/screenshots/f4-contact-sheet.jpg`; `audit/f4-contact-sheet.mjs` rebuilds it and the
near-black table (`darkness.json`). For peephole shots only the lens is measured: the black
around it is the door, by design. Captures use `?figureHold=1` so a figure does not vanish
during the slow software render.

R = readability, S = spatial logic, L = lighting/mood, F = fear, P = polish (1–5).

| Capture                                    | R   | S   | L   | F   | P   | Near-black % |
| ------------------------------------------ | --- | --- | --- | --- | --- | ------------ |
| 01 Night 4 / feet in the light under door  | 5   | 5   | 5   | 5   | 4   | 38.1         |
| 02 Night 3 / shape behind kitchen glass    | 5   | 5   | 4   | 5   | 4   | 9.7          |
| 03 Night 4 / peephole, back turned         | 5   | 5   | 5   | 5   | 4   | 49.9 (lens)  |
| 11 Night 5 / peephole, right at the door   | 4   | 5   | 4   | 5   | 4   | 63.4 (lens)  |
| 04 Night 2 / end of the landing, light off | 4   | 4   | 4   | 4   | 4   | 42.7         |
| 05 Night 3 / in the dark TV glass          | 4   | 4   | 4   | 4   | 4   | 39.1         |
| 06 Phone / missed calls from Onam          | 5   | 4   | 4   | 4   | 4   | 26.5         |
| 07 Phone / voice message playing           | 5   | 4   | 4   | 4   | 4   | 26.5         |
| 08 Diary page held up                      | 5   | 4   | 4   | 4   | 4   | 21.0         |
| 09 Night 3 / a coat that isn't yours       | 4   | 4   | 4   | 4   | 4   | 2.9          |
| 09b Night 4–5 / chair turned to 48's wall  | 4   | 4   | 4   | 4   | 4   | 27.2         |
| 10 Night 4 / wet prints to door 48         | 5   | 5   | 4   | 5   | 4   | 49.7         |

One deliberate exception: shot 11 is 63.4 % near-black inside the lens, above the 60 %
guide. The dark mass is the subject itself — a man's chest and collar filling the lens,
the face cut off above the nose — against a legible lit landing. Lightening it would show
the figure in good light, which FIX_PROMPT §4.4 forbids. Flagged for the owner's judgement.

Fixed during review: the entrance door swinging open in front of the gap light (doors the
story holds shut are now shut), a blown-out diary page (papers are drawn unlit), a torch
override that survived power changes, a coat placed off its hook (meshopt node transforms
are now wrapped, and the head turns from a neck pivot), a TV reflection that showed only the
floor (flat mirror → convex tube), a stairwell figure lit from the front (timer light off,
light from the stairwell behind it), and a peephole view that saw through an open door (the
eye is now at the lens and the door stays shut).

Not verified here: how it plays with real sound (F5), native-GPU frame rate with the
transmission and cube-camera passes (only during their beats), and real hardware (F8).

## F3 — Desktop rebuild review (2026-10-27)

All 16 HD captures were opened and inspected individually at 1440×900, including the
supplementary appliance, sanitary fixture, hall and stair views. The regenerated 72-object
plan was also opened. The single owner sheet is `audit/screenshots/f3-contact-sheet.jpg`
(12 labelled shots); individual evidence is in `audit/screenshots/f3/`. These are local,
git-ignored outputs, reproducible with the audit specs and `audit/f3-contact-sheet.mjs`.

Scores below use FIX_PROMPT §9, from 1 to 5. R = readability, S = spatial logic,
L = lighting/mood, F = environmental unease, P = polish. They are the implementer's visual
assessment for the F3 environment, subject to the owner's review; they do not certify the
F4 figure/events or the later fear pass. The technical plan has no lighting/fear score.

| Capture                               | R   | S   | L   | F   | P   | Near-black % |
| ------------------------------------- | --- | --- | --- | --- | --- | ------------ |
| Floor plan / complete numbered key    | 5   | 5   | N/A | N/A | 4   | 0.1          |
| 01 Room / window and stopped clock    | 5   | 4   | 4   | 4   | 4   | 26.0         |
| 02 Sofa / wall carpet                 | 5   | 4   | 4   | 4   | 4   | 19.2         |
| 03 TV / balcony door                  | 4   | 4   | 4   | 4   | 4   | 22.1         |
| 04 Kitchen / sink and table           | 5   | 4   | 4   | 4   | 4   | 11.4         |
| 04b Kitchen / appliance fronts        | 4   | 4   | 4   | 4   | 4   | 8.1          |
| 05 Bathroom / cabinet mirror          | 5   | 4   | 4   | 4   | 4   | 0.0          |
| 05b Bathroom / tub curtain and vent   | 4   | 4   | 4   | 4   | 4   | 1.0          |
| 05c Bathroom / tub, toilet and sink   | 5   | 4   | 4   | 4   | 4   | 0.1          |
| 06 Corridor / entrance and bathroom   | 4   | 4   | 4   | 4   | 4   | 5.3          |
| 06b Hall / hooks and shoe rack        | 5   | 4   | 4   | 4   | 4   | 6.2          |
| 07 Landing / lift and neighbour doors | 4   | 4   | 4   | 4   | 4   | 7.8          |
| 07b Door 46 / number plate            | 4   | 4   | 4   | 4   | 4   | 41.4         |
| 07c Stairs / rail and half-landing    | 4   | 4   | 4   | 4   | 4   | 4.0          |
| 08 Flat 48 / cold, decayed room       | 4   | 4   | 4   | 4   | 4   | 20.5         |
| 09 Window / snowy courtyard           | 4   | 4   | 4   | 4   | 4   | 34.1         |
| 10 Outage / torch                     | 4   | 4   | 4   | 4   | 4   | 50.3         |

Near-black is measured on the raw screenshots as sRGB luma
`0.2126 R + 0.7152 G + 0.0722 B < 20/255`; the helper writes `darkness.json`.
Every scene is below the 60% cap. The earlier stair, flat-48 and outage failures were
75.1%, 80.1% and 63.5% respectively; cold window fill and the outage fill corrected them.

Visual fixes: fridge and shoe-rack fronts now face the usable space; clock hands pivot at
the dial and show 3:17; glazing reveals the courtyard; kitchen-door movement no longer
screens the appliances; mirrored doors have the correct hinge/swing; the stair flights
have supported rails and a closed lower shaft. Door numbers, the lift call button/seam/
floor indicator and the stair window make the common area legible. Whitewashed lintels,
smoother ceilings, weaker warm bulbs and reduced grain retain the worn domestic mood.
No unsupported or intersecting furniture was found in these views or by the world validator.

Verification: `npm run check` passes 238 tests in 21 files, 90 story nodes with zero
warnings, and the 72-object / 24-wall / 14-door world validator. Production JS budgets pass
(mobile 110.5 KB / 250 KB; desktop 399.3 KB / 700 KB); the debug API is absent. The full
`npx playwright test` sweep on the final source passed: **172 passed, 5 expected skips,
0 failures**, in 12.1 minutes. No tests were deleted or assertions relaxed. The skips are
the four no-WebGL-only cases in WebGL projects and the desktop mobile-throttle case.

The regular SwiftShader profile uses the same layout/assets with cached mesh LODs,
512 px colour maps and vertex lighting at 336/320 lines. The full native/ultra profile keeps
PBR, physical glass, shadows, AO and bloom. Removing the clock's software transmission pass
and batching the static shell fixed a mid-route fallback/performance regression. The earlier
400/360-line profiles passed focused runs but fell to about 53–54 FPS in a full sweep;
336 lines provides more margin within the software profile's 320–480 range. The ≥55 FPS
gate is unchanged. Native HD laptop FPS,
real Telegram clients, physical sensors and listening tests remain unverified F8 work.

The final full-sweep desktop benchmark measured **59.88 FPS** at high/336, with 59.99 FPS
after repeated room tours. GPU resources stayed exactly **217 geometries / 43 textures**
before and after the tour. All desktop functional cases passed in that run.

F3 requires owner review. F4 has not been started.

## Manual checklist (to be executed during Phases 3–8)

- [x] Pointer Lock works in a normal browser; fallback to click-and-drag look inside a
      webview without Pointer Lock (2026-10-26, rejection simulated in Chromium; physical webview pending).
- [x] Looping corridor (night 3, desktop) actually extends when the player looks away (2026-10-26, Chromium).
- [x] Peephole fisheye view renders correctly (desktop shader and mobile vignette; reviewed 2026-10-26).
- [x] All current mobile hotspots stay within the 360×640 scene; real-input ending runs
      and cancelled/successful wall holds pass (2026-10-25, Chromium emulation).
- [x] "Reduce flashing" removes the night 4 fake glitch and decorative flashes (2026-10-26, both presenters in Chromium).
- [x] Telegram BackButton opens the pause menu; the player can always leave (2026-10-26,
      mocked WebApp BackButton in all five projects; it was previously never registered — fixed).
      Hidden on warning/title so Telegram's own close applies. Physical Telegram pending.
- [x] Pause menu reachable at any moment; closing the tab mid-game autosaves (2026-10-26,
      `page.close({ runBeforeUnload })` → new tab resumes the exact node, sanity and flags).
      Settings opened from pause now returns to pause instead of the title (fixed).
- [x] IBM Plex Mono and Oswald contain ʻ (U+02BB) and ’ (U+2019); WOFF cmap check and
      visual review of `tests/screenshots/mobile-font-glyphs.png` (2026-10-25).
- [x] No external network requests at runtime except telegram-web-app.js (2026-10-26, every
      request recorded through a full B route in all five projects; zero foreign URLs).

## E2E status

| #   | Test (spec 12)                                                                   | Status                                                                      |
| --- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Boots without / with mocked Telegram                                             | passed (Phases 3–4)                                                         |
| 2   | Full playthrough to all 3 endings via `window.__game` + one ending by real input | passed (Phase 8: `__game` A/B/C in 5 projects; real input A/B/C both modes) |
| 3   | Save → reload → resume                                                           | passed (Phases 3–4)                                                         |
| 4   | Audio unlock flow                                                                | native suspended → tap → running passed (Phase 5)                           |
| 5   | Rotate / resize does not break layout or state                                   | passed (Phases 3–4)                                                         |
| 6   | WebGL disabled → mobile mode on desktop viewport                                 | passed (Phases 3–4)                                                         |
| 7   | WebGL context loss → recovery or fallback                                        | passed (Phase 6: native restore and fallback)                               |
| 8   | No console.error / pageerror                                                     | passed (enforced in every spec, Phase 8 full sweep)                         |

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

## Phase 8 — Full QA (2026-10-26)

New spec `tests/e2e/qa.spec.ts` (8 cases × 5 projects) plus a fix pass:

- [x] `window.__game` fast routes reach A, B and C in every project. The route visits
      nights 1–5; C asserts 7 diary pages, sanity ≥ 40 and no night-3 answer. A new
      debug-only `getStep()` exposes node, phase, ending and visible choices.
- [x] Telegram BackButton: game → pause, pause → game, settings → where it was opened
      from, form/ending/gallery → title; hidden (zero handlers) on warning/title.
- [x] Closing the tab mid-game, then reopening: identical node, sanity and flags.
- [x] Runtime network isolation through a full route: only same-origin, data/blob URLs and
      the official Telegram script.
- [x] Memory across nights: 1 warm-up + 2×4 cycles through the five night entry nodes, with
      forced GC and exact CDP heap. GPU resources constant (desktop 24 geometries / 10
      textures; one canvas everywhere). Heap growth shrinks per block (mobile ≈ 205 → 80 KB,
      desktop ≈ 730 → 320 KB): bounded caches plus the run's own visited-node history,
      not a leak. Gate: < 512 KB in the second block, < 2 MB overall.
- [x] Mobile frame rate under Chromium ×4 CPU throttling: ≈ 60 FPS in iPhone 13, Pixel 7,
      small Android and no-WebGL projects (budget ≥ 30).
- [x] Desktop ≥ 55 FPS benchmark and GPU-resource tour (Phase 6/7 spec) green in the sweep.
- Bugs found and fixed: (1) Telegram BackButton was never wired to the shell; (2) Settings
  opened from pause always returned to the title. The audio mixer test had encoded the
  old title return; it now asserts the pause return and checks music after resuming.
- Results: `npm run check` green (158 tests, 78-node validator, 0 warnings, mobile
  99.5 KB / 250 KB, desktop 263.1 KB / 700 KB gz). Full sweep in one run: 160
  passed, 5 expected skips, 0 flaky. An earlier sweep exposed two test races (camera not
  settled before the unobserved-clock flag; SDK stub missing on a reopened tab), now fixed.

Not verifiable on this host (no physical devices): real Telegram iOS/Android/Desktop
webviews (BackButton, CloudStorage, haptics, gyroscope, fullscreen), physical GPU laptop
FPS, iOS Safari/WebKit audio autoplay and interruption, real sensor permission prompts,
and acoustic listening. All runs use Chromium (SwiftShader) emulation. The 30–45 minute
human play duration has not been timed.
