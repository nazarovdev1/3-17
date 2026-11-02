# PROGRESS

Honest, phase-by-phase record. A phase is only marked done when every check ran green.

- [x] Phase 0 — Scaffold (see below)
- [x] Phase 1 — Core engine
- [x] Phase 2 — Full story content
- [x] Phase 3 — Shell and platform
- [x] Phase 4 — Mobile presenter
- [x] Phase 5 — Audio
- [x] Phase 6 — Desktop 3D presenter
- [x] Phase 7 — Horror polish
- [x] Phase 8 — Full QA
- [x] Phase 9 — Release docs

Fix phases (FIX_PROMPT.md):

- [x] F0 — Audit and plan (`AUDIT.md`), approved by the owner
- [x] F1 — Story and language, reviewed by the owner (8 fixes applied in `9c4dbb7`)
- [x] F2 — Asset pipeline
- [x] F3 — Desktop flat rebuild, reviewed by the owner ("f3 qilindi")
- [ ] F4 — Desktop horror (verified; awaiting owner review)
- [x] F5 — Audio
- [ ] F6 — Mobile (verified; awaiting owner visual review)
- [ ] F7 — Fear pass (superseded by REDESIGN R6)
- [ ] F8 — Full QA (superseded by REDESIGN R7)

Redesign phases (REDESIGN_PROMPT.md, overrides FIX_PROMPT and PROMPT; based on `DIAGNOSIS.md`):

- [x] R0 — Design (approved by the owner with eight decisions, BEATS §11)
- [x] R1 — Engine (Director, clock, triggers, ambient, save v2, metrics:design)
- [x] R2 — Night 1 vertical slice on desktop (reviewed by the owner: "davom et")
- [x] R3 — Nights 2–5 on desktop
- [ ] R4 — Endings as set pieces (built; ✋ awaiting owner review of the videos)
- [~] R5 — Mobile magic window + stills fallback (built; ✋ awaiting the owner's test on a real phone)
- [x] R6 — Fear pass
- [~] R7 — Full QA (all green except one machine-dependent FPS spec, see below)

## R4 — Endings as set pieces (✋ awaiting owner review, 2026-10-30)

- A, B and C are played in the world, with no title or card (DECISIONS 88). Titles stay in
  the gallery.
  - A: 48's door shuts; darkness; 48 weeks later in daylight, the body only shuffling. Through
    the wall: a suitcase, keys and the landlord, then 47's unanswered phone. The light dies
    over 10 s; the only knock glyph in the game appears; the player's knock and EA-02.
  - B: down the walkable stairs past 43 (light under the door, her TV), then out into the
    snowy yard to an idling bus with its door open (`exterior.ts`, `Bus.tsx`). On board,
    "Onam" calls with no answer button. Lamps slide past; for one frame someone sits behind
    (a real mirror on the GPU).
  - C: the clock is wound by hand: a clockwise circular drag or holding E, with ratchet
    clicks and haptics; six taps on the key on the phone fallback. The ticking; the minute
    hand to 3:18; no knock. The power comes back slowly, then the call: two ringback tones,
    EC-02 in the centre.
- Fallbacks so no ending can get stuck: A knocks by itself after 90 s; B goes out after 25 s
  and boards after 50 s.
- Four pinned CC0 sounds (DECISIONS 89): ringback, ratchet, suitcase, bus engine.
- Found while recording, and fixed:
  - In A the player was put 2.4 m from the wall but could shuffle only 1.5 m, so the knock
    could not be given. A unit test now guards the spot.
  - GPU geometry counts grew on a night's first view (lazy uploads). Every night now uploads
    all its geometry once at its start (`primeGeometries`). The quality governor ignores
    that frame, and the 3rd floor is drawn only from the stairs.
- Tests:
  - New `tests/unit/director/endings.spec.ts` (9 tests).
  - The e2e ending tests now play the new inputs: B walks down the stairs and out to the bus;
    A waits for the knock glyph; C holds E to wind.
  - `npm run check` is green with 318 unit tests.
- Evidence (ignored folder `audit/screenshots/r4/`), all real time on desktop with real keys
  and mouse, from night 5 after "Eshikni och". Playwright video has no sound.

  | Ending | Video           | Length | Contact sheet          |
  | ------ | --------------- | ------ | ---------------------- |
  | A      | `ending-A.webm` | 1:49   | `contact-ending-A.jpg` |
  | B      | `ending-B.webm` | 2:13   | `contact-ending-B.jpg` |
  | C      | `ending-C.webm` | 1:09   | `contact-ending-C.jpg` |

- Known:
  - On software GL, A's "weeks later" daylight reads dim (R6).
  - The desktop performance e2e (≥ 55 FPS, high tier) fails on this machine today for the R2
    commit as well (48 FPS), so it is the environment, not R3/R4. The room now draws fewer
    calls than R2 (205 vs 231).

## R3 — Nights 2–5 on desktop (done, 2026-10-29)

The owner approved R2 and asked to go on ("yaxshi endi davom et qolganlarini ham boshlashing
mumkin"). R3 has no gate; R4 stops with videos.

- Stairwell down to the 3rd floor (DECISIONS 75): both flights and the half-landing are walkable.
  The 3rd-floor landing has 42–45, the lift and Muhabbat opa's 43; moving boxes block the way
  further down. The camera keeps a floor height.
- Night 2 (`src/content/nights/n2.ts`): the day.
  - The player wakes on the sofa; the phone is on the cushion.
  - Bread waits on the half-landing sill.
  - Muhabbat opa opens 43 on its chain with halva and talks in three stages while the player
    stays. Walking off hushes her and she calls N2-14 once. The figure stands on the
    half-landing below for 2 s if looked at.
  - Nobody comes down: after 45 s she talks at 47's door and leaves the halva.
  - The blink into the night; frost on the glass.
  - The wardrobe holds the black coat, tally marks and page 1; page 2 is in the bathroom.
  - The bathroom door is found ajar and the mirror cabinet open.
  - Footsteps cross the flat above; 48's TV stops when the player comes near.
  - 3:16 floor by floor, 3:17, knocks. The voice's three lines quote the form. Holding at the
    wall after it gives one tap.
- Night 3 (`n3.ts`):
  - Rustam's call answers itself.
  - The tap runs while nobody is in the bathroom; the coat moves to the hooks; the clock moves
    to the shared wall and leaves a pale circle.
  - The corridor stretch (DECISIONS 80), with steps behind the player. Running ends by the
    sofa; turning round raises the floorboard over page 6.
  - The TV shows this room from the corner with someone on the sofa (DECISIONS 81). Looking at
    the real sofa leaves static.
  - Someone stands in the 4th-floor window opposite; a knock comes from the wardrobe.
  - 3:17 brings no knocks: a cough, then the voice with "sen" and its 20 s window. A palm of
    breath appears on the wall. Dusk.
- Night 4 (`n4.ts`):
  - The phone buzzes under the pillow; something drags in the corridor; the radiator knocks
    once.
  - 3:16 all at once. 3:17: one step outside, feet under the door; the figure in the peephole,
    then wet footprints.
  - The entrance swings ajar at +60 s and the cold comes in. The parcel is on the threshold;
    48 is ajar with its seal torn.
  - Chaining the door: the voice at the door 30 s later.
  - In 48: the calendar and passport papers, page 5, the glitch (respects Reduce flashing),
    the voice in the mother's words. Walking toward it or away chooses the line. Back on the
    landing, a knock comes from inside the lift.
- Night 5 (`n5.ts`):
  - The clock comes off the wall into the hands; page 7 is behind it; the key stops before
    3:17.
  - 48's TV murmurs through the wall. At 3:16 someone opposite holds a lit phone up as the 4th
    floor goes dark last.
  - At 3:17 everything dies, the phone too. Three slow knocks, the voice in the player's words.
  - The clock holds at 3:17: knocks and "Eshikni och" every 45 s; feet under the door.
  - A: into 48. B: down the stairs, at any time. C: wind the clock (eligible, after the voice).
- Shared: `flatBeats` (note, clock, radiator, tea, chain, TV, sofa) and the mother's call while
  the player is away. Opposite windows go out top-down, the 4th floor last (DECISIONS 82).
- Gates (`metrics:design`):

  | Night | 3:17 by itself | Silence | Reading | Wordless beats |
  | ----- | -------------- | ------- | ------- | -------------- |
  | n1    | 359 s          | 7 s     | 6%      | 88%            |
  | n2    | 349 s          | 7 s     | 14%     | 70%            |
  | n3    | 350 s          | 7 s     | 8%      | 84%            |
  | n4    | 252 s          | 7 s     | 6%      | 78%            |
  | n5    | 232 s          | 8 s     | 3%      | 84%            |

  The whole game has 524 visible words; all three endings are reached.

- Tests: 301 unit tests pass, including the new `nights.spec.ts` and `stairwell.spec.ts`; three
  tests were retimed (DECISIONS 86). `npm run check` is green.
- Evidence (ignored folder `audit/screenshots/r3/`):
  - `stairs-sheet.jpg`;
  - `nights-sheet.jpg`: wake, Muhabbat at 43, the figure below, frost, wardrobe, mirror cabinet,
    feet under the door, peephole, 48, calendar, clock off the wall;
  - `ultra-sheet.jpg`: the TV's picture on the GPU path.

  All at 60 FPS on software GL.

- Not built yet: DECISIONS 87 (details for R6). Mobile is still the viewpoint fallback; new
  hotspots were added for the new objects.

## R1 — Engine (done, 2026-10-29) and R2 — Night 1 slice (✋ awaiting owner review)

- `src/core/director`: clock, seeded RNG, triggers (clock, zone dwell, gaze, notLooking,
  interact, hold, three knocks, idle, after, every), world actions, response windows,
  ambient events, the subtitle queue and night → dawn → next night. One Director drives both
  presenters; `simulate()` runs it headless for tests and `npm run metrics:design`.
- Story graph, narration, text presenter, node tests and `validate:story` deleted;
  `validate:beats` and `metrics:design` gate `npm run check`. Save v2 with v1 migration.
- Night 1 is complete on desktop: Rustam's hand in 47's doorway, the paper form, the keys,
  the dark flat and its switches, phone + mother's message, Rustam's note, TV and the cough,
  window, radiator, tea, drip, chain, the sofa (×8), the 02:35 call, 3:16 windows going dark
  floor by floor, 3:17 power cut, 7 s of silence, knocks, the voice and a 20 s response
  window (answer / three knocks / silence), dawn.
- Nights 2–5 and the endings are R1 scaffolds on the same engine (all endings reachable).
  Mobile is a temporary viewpoint fallback until R5.
- Gates: reading 2–11% of each night; 3:17 by itself at 228–370 s; 7–8 s of silence before
  the knocks; ≥ 72% wordless beats every night; 521 visible words in the game.
- Recordings: `RECORDING.md` lists every spoken line for the owner; until they arrive,
  silence and subtitles.
- Tests: graph tests replaced; the old → new mapping is DECISIONS 71.
- R2 evidence (`audit/screenshots/r2/`, ignored folder): `night1-playthrough.webm` (4:14, real time:
  form, keys, light switches, chain, phone and message, note, window, radiator, TV, clock, tea,
  sofa, 3:16 → 3:17, answer at the wall, dawn into night 2), `night1-idle.webm` (7:08: the form
  signed, then no input; 3:17, silence answer and dawn come by themselves), and contact sheets
  `contact-night1.jpg` and `contact-night1-idle.jpg`. Playwright video has no sound.
- Fixed on the way (DECISIONS 72–74): furniture culling and software LOD (landing 34 → 60 FPS),
  one kitchen chair so the kettle can be reached, getting up from the sofa at 3:16.

## R0 — Design (approved, 2026-10-28)

No code changed. Deliverables:

- `docs/BEATS.md`:
  - beats for all five nights and three endings (clock, trigger, world action, text ID);
  - tension curves; data model sketch (Director, Beat, Trigger, Action, PlayerResponse, save v2);
  - shared systems; flags; deletion list; new world/asset needs; eight owner decisions.
- `SCRIPT_UZ.md` rewritten: only in-world words (subtitles, phone, paper, diary) in play order,
  no narrator and no choice labels. Worst-case playthrough: **661 words** (limit 900).
  - Rental form 33; nights 91 / 160 / 96 / 82 / 57; diary pages 126; endings 16.
  - No subtitle over 10 words; no diary page over 35.
  - All five mother messages, Rustam's note and rule, Muhabbat's 48/Sardor story, the voice's quoting lines and the diary pages are kept word for word.
- Beats without text per night (counted from the tables): 73% / 70% / 70% / 70% / 73%; endings 78–88%.
- 3:17 arrives for an idle player at 5:56 / 6:58 / 5:47 / 4:08 / 3:48. Silence before the knocks is 7–8 s.

Open: owner decisions in BEATS §11 (Ending C timing, night 5 idle loop, recorded voices, Rustam model,
voice lint exemption, rental form, replacing graph-based tests, night 2 day scope).
Resolved in R1: `text:build` no longer writes `SCRIPT_UZ.md`.

## F6 — Mobile (verified, awaiting owner review, 2026-10-28)

Owner authorised F6 after the completed F5 commit `8685684`. No F7 work is authorised.

- `npm run assets:stills` renders 45 portrait 1080×1920 WebP stills of the actual desktop
  world with 270×480 grayscale depth, SHA-256 and camera-projected anchors
  (`stills.gen.json`, 2.2 MB / 10 MB). Supports `--only=a,b`; starts its own Vite server
  on 127.0.0.1:4175. The capture bridge (`StillCapture`) is dev/test-only; the budget
  rejects `__still` in production JS. Procedural `vignettes.ts` is removed.
- WebGL2 depth parallax with Canvas fallback (missing WebGL2 or context loss), real fetch
  progress and retry, per-scene resource release. Push-in, dust, snow, breath and delayed
  mirror movement; Reduce flashing freezes all motion.
- 58% scene / scrollable panel, ≥17 px narration, 48 px controls, safe areas. Hotspots
  use projected anchors with cover-crop math; offscreen/colliding choices stay in the
  panel, and an unanchored hold-to-listen button leads it (DECISIONS 57).
- Live `PhoneClock` overlay draws story time over the blank exported phone clock; the six
  phone pairs were re-rendered blank. Nightly screens show 3/11/24/40/52 missed calls.
- Desktop fixes found by export: shifted clock no longer inside the party wall. Ordinary
  desktop camera priority unchanged.
- Credits: one CC-BY-4.0 "3:17 project" row per render pair in CREDITS and Settings.
- Tests: `tests/unit/mobile/stills.spec.ts`, extended credits unit test,
  `tests/e2e/mobile-hd.spec.ts` (3 tests × 5 projects). `npm run check`: 312 tests pass.
- Full Playwright (197 cases, one worker): run 1 189 passed / 3 failed / 5 skipped;
  run 2 190 passed / 2 failed / 5 skipped. The listen regression (run 1) is fixed; the
  remaining failures are documented in QA as pre-existing timing margins, not F6.

Open for the owner: visual review of renders and five-size captures; `wall-off` has a
strong torch hotspot. Real iOS/WebKit/Telegram/gyroscope hardware remains unverified.
F7 has not been started.

## F5 — Audio (completed, 2026-10-28)

Implemented after the owner supplied the credential (kept only in ignored `.env.local`):

- `scripts/assets/sound-sources.ts`: 29 pinned Freesound CC0 assets, 22 authors, **41
  shipped files / 2,556,600 bytes**. All 24 SfxIds have real recorded files; five ambience
  cues cover fridge, wind/window frame, winter city, muffled neighbour TV and Ending C's
  clock. Only the quiet drone deliberately stays procedural. Credits and source URLs
  come from the API into the manifest, `CREDITS.md` and Settings → Mualliflar.
- Four separate recorded footfalls for each floor: old parquet (evghenifloca), boards
  (ftpalad), tile (Nox_Sound), concrete (florianreichelt). No adjacent variation repeat;
  ±4% pitch and 0.84–1.0 gain jitter. Other sources/authors are listed in CREDITS.
- Recorded hinge, door close, security chain, radiator, compressor and shutdown, kettle,
  tea pouring, paper, pen, light switch/relay, single/soft/triple panel-wall knocks,
  calm breathing, contact-microphone heartbeat, phone vibration, CRT static, cloth,
  winter-city ambience and wind rattling an old window frame. Neighbour TV is a CC0
  muffled public-domain 1955 programme, identified by its uploader (no ripped game audio).
- Pipeline checks exact API CC0/CC-BY license URLs/versions before download; rejects NC,
  ND, SA and unknown licenses; stores author, URL, license evidence and raw SHA-256.
  Original downloads remain ignored; optimised files ship locally in `public/assets/sounds`.
- Mono/32 kHz. FLAC for transient effects and the sparse clock (exact peaks/zero gaps);
  AAC-LC/M4A at 96 kbps for continuous ambience. Two-pass -23 LUFS loops; -6 dBFS effects
  (±0.5 dB), checked against the actual encoded decode. Fades, filtering and metadata
  stripping are deterministic. Staging/rollback preserves existing assets on build errors;
  `assets:build -- --sounds-only [--only=<id>]` reuses hash-checked existing files.
- Engine decodes with four bounded workers; failed or missing recordings fall back
  immediately to synth. Optional audio cannot block the world's loading screen.
  Async completion never replays a transient or revives outage ambience. Desktop HRTF
  positions follow the actual party wall, door hinges (including 48), phone table/pillow,
  radiator and kettle; scripted landing/overhead/wardrobe positions are unit-tested.
  Pillow vibration is quieter; wall listening uses the wall's real breathing emitter.
- At 3:17 all ambience stops synchronously. The 320 ms recorded compressor stop is
  followed by at least four seconds of actual silence (plus HRTF-tail headroom).
  Knocks/breath are scheduled after that gap; incidental phone buzzes are dropped;
  actions remain possible. Pause/scene changes cancel scheduled scares. C alone ticks,
  with exact silent gaps between recorded ticks. Existing headphone hint remains visible.
- Diagnostics expose decoded count/readiness, failed paths, remaining silence and a
  bounded playback history including recorded/synth origin, variation, position and HRTF.

Verified:

- Final recorded-audio `npm run check` green: **309 tests / 27 files**, story/world/build/budgets. Desktop
  total 22.8 MB / 60 MB; flat 47 playable 18.3 MB / 25 MB; mobile JS 120.4 KB / 250 KB.
- `scripts/assets/verify-sounds.ts` verifies every shipped file: 41 mono/32 kHz decodes,
  loops -23 ±0.75 LUFS, effects -6 ±0.5 dBFS, fridge stop ≤350 ms, exact clock gaps.
  Machine-readable measurements are in ignored `.asset-cache/sound-verification.json`.
- Focused small-Android native-audio E2E **5/5 passed**, including all 41 decoded files,
  real recorded playback, corrupted-file synth fallback, spatial knock, measured outage
  silence, bounded voices, pause/lifecycle and unavailable Web Audio. The silence window
  is measured within one page call so CDP latency cannot consume it before sampling.
- First recorded-audio full sweep: **175 passed / 2 desktop failures / 5 skips**; all 25
  audio cases passed. Desktop C fell back to mobile and steady rendering measured 54.50
  FPS. Profiling showed a GPU/backend limit rather than JS work. The regular software
  output now uses permitted ACES filmic mapping; native/ultra stays AgX. Resolution
  (336/320), geometry, the 55 FPS gate, governor and assertions are unchanged. Listener
  writes are cached at rest; breath is kept to one layer across rapid voice beats.
- After that fix, the two failed desktop cases **both passed**: default **59.90 FPS**,
  225 geometries / 44 textures unchanged across tours, real-input Ending C finished in
  desktop. Separate measurements at the night-5 cut improved from 55.87 to 59.91 FPS;
  stationary native audio writes fell from ~2,500 to zero per five seconds. The warm/dark
  before/after software captures and 1440×900 / 360×640 credits screens were opened.
- Final uninterrupted full sweep: **177 passed / 5 expected skips / 0 failures** (13.2 min).
  All 25 audio cases pass across five browser profiles. Default desktop measured
  **59.71 FPS** against the unchanged 55 FPS gate; room tours retained **225 geometries /
  45 textures**. Real-input endings and the repeated-night GPU/heap checks pass.
- An intermediate rerun passed the unchanged FPS gate at 58.77 FPS, but exposed a
  reload/resume typewriter delay. The saved node was correct; per-character callbacks
  accumulated render delays. Elapsed-time catch-up preserves the authored 24 ms rate.
  A blocked-renderer unit regression and the unchanged desktop E2E repeated 3× pass.
- The repeated-night GPU gate exposed the phone LED's delayed first upload and the
  night-5 breath sprite's per-node texture churn. Prime the entire phone; keep one
  primed breath sprite with per-node timing/visibility. Owned phone resources are
  disposed on unmount. The unchanged resource test passes 3× after both fixes.

F5's automated exit checks are complete. Real headphone judgement (balance, loop seams, direction and
the emotional effect of the silence) and physical iOS/Telegram audio remain owner/hardware
checks. F6 has not been started.

## F4 — Desktop horror

Done (2026-10-27; see DECISIONS 33–41):

- **The figure**, original work: `scripts/figure/figure.ts` builds a ~2.03 m man in a long
  coat from a blended signed distance field (surface nets, vertices projected onto the
  field, gradient normals), plus the same coat hanging empty. Through the asset pipeline as
  source `original` (CC0, credited): `public/assets/models/figure.glb`, 427 KB. The head
  turns from a neck pivot; it breathes and sways; it never walks on screen.
- **Where it may be** (`src/presenters/desktop/figure.ts`, unit-tested): night 2 at the far end
  of the landing as the timer light clicks off; night 3 behind the kitchen's frosted glass
  (real rough transmission, only during that beat) and only in the dark TV glass (a convex
  cube-camera mirror, reflection-only layer); night 4 as feet shadows in the light under the
  entrance door (14 mm gap + shader decal) and through the peephole, back turned; night 5
  right behind the door, head bowed to the lens. Each appearance ends once seen and looked
  away from, approached, or waited out. Night 1 has none.
- **Phone** as an object (`phone.ts`, `world/Phone.tsx`): dark screen and blinking LED on the
  room table, buzzes and lights up "Onam" now and then, held up at the phone beats with the
  missed calls (3/11/24/40/52) and a playing voice message; face down after the kitchen on
  night 1 (only while unobserved), under the pillow on night 4, dead at 3:17 on night 5;
  lock screen shows the player's real time until the story sets one. New UI text in
  `ui.yaml` (`phone.*`, `desktop.peek`, `desktop.unpeek`).
- **Changes while unobserved** (`changes.ts`, `world/Changes.tsx`): the coat on the hooks
  (night 2), the chair turned to the wall of 48 (night 3), the loose door chain (night 4),
  the bundle outside 47, wet prints to door 48, visible breath (night 5).
- **Sounds from the wrong place** (`events.ts`): a step on the landing after the night-4
  cut, steps across the empty flat above (night 2), a knock inside the wardrobe (night 3).
  The wall's knocks now come from the real party wall (they pointed at the east wall).
- **Interaction feel**: prompts within 1.5 m only; eased walking; footsteps by floor
  (parquet / painted boards / tiles / concrete — new synth placeholders until F5); doors on a
  damped spring with hinge sounds; diary pages and the note held up in HD and turned with the
  mouse; the peephole usable at any time (E at the door); the torch follows power changes even
  after a manual switch.
- Audit: `audit/f4.spec.ts` (12 HD shots, `figureHold=1`), `audit/f4-contact-sheet.mjs`,
  figure bench `audit/figure.html` + `audit/figure-shots.mjs`. Rubric scores in QA.md.

Fixed while verifying: a resource leak on night transitions (new meshes now disposed; the
figure, coat and the shared sprite quad are uploaded at load), SwiftShader slowdowns from
the phone screen (smaller canvas, no mipmaps, fewer redraws), a merged door chain (one
draw), and a race in the resource test (it now waits for the world before measuring).
Measured against the F3 commit under the same machine load: 56.5 FPS (F3) vs 56.8 FPS (F4)
in the steady-render test, 61 → 64 draw calls.

Verification (2026-10-27):

- `npm run check` green: 256 unit tests in 22 files, 90 story nodes / 0 warnings, 73 objects
  in `validate:world`, production build, budgets (desktop 3D JS 408 KB / 700 KB, desktop
  assets 20.3 MB / 60 MB, mobile initial JS 110.9 KB / 250 KB).
- Full `npx playwright test`, best run: **169 passed, 3 failed, 5 skipped**. The failures are
  the long software-rendered desktop routes (real-input endings, the shell full flow) and the
  55 FPS steady-render gate, where the quality governor drops to "low" or falls back to the
  light mode. They are load-dependent: during these runs other processes held ~1.5 CPU
  cores, and the **unchanged F3 commit fails the same tests on the same machine** (control
  run: steady-render and ending A). Night-4 draw calls / triangles are identical between F3
  and F4 (e.g. 56 / 22.3k at 3:17, 41 / 21.4k inside 48). In isolation the same tests pass
  (steady render 56.8–58.1 FPS; endings 27/27 in a focused run). A quiet-machine rerun is
  still owed before F8.

## F3 — Desktop flat rebuild

Done:

- `src/content/world/layout.ts`: the plan in metres (flat 47, 4th-floor landing with doors
  46–49, lift and stairs, flat 48 mirrored and decayed): 24 walls with openings, 14 doors,
  72 objects each with room, transform, real size, support and story purpose.
- `docs/floorplan.svg` generated from it (`npm run validate:world` rewrites it).
- `npm run validate:world` (in `check`): intersections (objects, walls minus openings),
  floating, outside room, ±10 % scale, doorways clear, every room reachable on foot from the
  entrance (10 cm grid on the same walk function the camera uses). Unit tests prove each
  rule fires.
- 15 Sketchfab CC-BY models added (credited); 42 assets, 19.9 MB.
- Desktop renderer rebuilt (`src/presenters/desktop/World.tsx`, `world/*`): PBR walls with
  per-room finishes and metric UVs, stairwell dado, doors on hinges, real fixtures, a live
  bathroom mirror, the block opposite with windows that go dark, snow, the yard below.
  Light: dim bulbs on 4 switch circuits, moon, sodium lamp, torch with cookie; AgX, N8AO,
  bloom, grain, vignette.
- Movement and story anchors now come from the plan (`src/content/world/walk.ts`,
  `src/presenters/desktop/layout.ts`).

F3 corrective pass (2026-10-27):

- Reviewed HD views of every room plus appliance, bathroom, hall and stair details. Corrected
  the fridge and shoe rack fronts, the clock's hands, mirrored door hinges, kitchen-door
  occlusion, window glazing, stair treads/rail supports and the stairwell base. Added the
  stair window, neighbour numbers, lift seam/button/floor indicator and whitewashed lintels.
- Balanced warm bulbs against cold window fill, reduced ceiling relief and grain, and kept
  the torch available in unpowered flat 48. Native/ultra retains full PBR, shadows, AO and bloom.
- Fixed a software-renderer regression: refractive clock glass triggered an extra scene pass.
  The CPU profile now uses cached mesh LODs, 512 px linear colour maps and vertex lighting at
  336/320 lines. Static architecture is batched by finish. The 55 FPS test gate is unchanged.
- Desktop tests wait for world assets and aim/walk toward the current clock anchor using real
  input. Asset checks now cover the Sketchfab sources without assuming Poly Haven metadata.
- The HD audit has 16 views plus the numbered floor plan; `audit/f3-contact-sheet.mjs` builds
  one 12-shot review sheet and measures near-black pixels. Every view was opened; the
  worst near-black result is 50.3%, below the 60% cap. Per-shot rubric scores are in QA.md.

Verified on the final source:

- `npm run check` green: 238 tests in 21 files, 90 story nodes / zero warnings, the
  72-object world validator, production build and JS/asset budgets.
- Full `npx playwright test`: **172 passed, 5 expected skips, 0 failures** in 12.1 minutes.
  No tests were deleted or assertions relaxed. Desktop high/336 measured 59.88 FPS;
  repeated tours held 59.99 FPS with exactly 217 geometries / 43 textures before and after.
- Full HD capture plus corrective recaptures and a fresh floor-plan capture passed. The
  final 12-shot contact sheet was opened and inspected. Native HD laptop performance and
  physical Telegram/sensor/audio verification remain F8 work.

F3 was approved by the owner on 2026-10-27.

## F2 — Asset pipeline

Done:

- `scripts/assets/sources.ts`: 29 pinned CC0 assets with purpose, tier and load group —
  19 Poly Haven models (sofa, CRT TV, sideboard, stove, kitchen table/chairs/stool,
  cupboard, kettle, enamel pot, tea set, bulb, wall clock, mirror, clutter), 9 ambientCG
  PBR surfaces (herringbone parquet, two wallpapers, whitewash, painted boards, tiles, door
  paint, flaking stairwell plaster, concrete) and one night HDRI.
- `npm run assets` = `assets:fetch` (download into `.asset-cache/`, md5/size-checked,
  forbidden-pack guard) + `assets:build` (gltf-transform: dedup, prune, weld, WebP textures
  at 2K/1K/512 by tier, meshopt; surfaces → color/normal/ORM WebP; writes
  `src/assets/manifest.gen.json` and `CREDITS.md`).
- Runtime: `src/assets/loader.ts` (same-origin, hash-versioned URLs, streamed byte
  progress, 3 attempts, dedupe, in-memory cache) and `src/presenters/desktop/assets.ts`
  (`loadModel`, `loadPbr`, `loadHdri` from the preloaded bytes).
- Key-ring loading screen with real progress and a retry on failure; loading begins at
  boot in desktop mode; stairwell and flat 48 stream in the background.
- Credits in Settings ("Mualliflar va litsenziyalar"): fonts + every asset from the manifest.
- `npm run budget` now also checks: desktop total ≤ 60 MB (now 16.2 MB), flat 47 playable
  ≤ 25 MB (now 12.2 MB), mobile stills ≤ 10 MB (none yet), every manifest file present
  with the right size, no orphan files in `public/assets/`, asset bench absent from prod.
- Asset bench `?assetview=1&view=models|surfaces` (dev/test only) to check the pipeline
  output by eye; evidence in `audit/screenshots/f2/`.
- Tests: manifest ↔ sources, licenses, credits, file sizes and hashes, meshopt GLBs;
  loader progress, retries, give-up, dedupe, same-origin URLs; loading screen and credits
  UI; E2E: key-ring screen before the flat, failed download → retry → recovers.

Not in F2 (later phases): the assets are not placed in the flat yet (F3 builds the floor
plan and furnishes it); fridge, sink, bathtub, washing machine, radiators, wardrobe, wall
carpet, doors and coat hooks have no CC0 model in Poly Haven — F3 will look on Sketchfab
(CC0/CC-BY) or build them as real-proportioned meshes with these PBR surfaces. Sounds wait
for the Freesound key (F5). Mobile stills come in F6.

## F1 — Story and language

Done:

- `docs/fear-design.md`: core theme, phone escalation table (3 → 11 → 24 → 40 → 52 missed
  calls, one voice message per night), tension curve and events per night, unobserved changes.
- Story rewritten around the new core: a young person alone in Tashkent, the mother's calls
  and voice messages, the reply typed and deleted, days blurring, a diary page in the player's
  own handwriting. The voice: _siz_ (N1–2) → _sen_ without comment (N3) → the mother's words
  (N4, including messages the player never heard) → the player's own words (N5).
- Endings rewritten (FIX_PROMPT 6.2). Ending C now also needs all 5 messages heard.
- 89 nodes (17/17/18/22/12 per night + 3 endings), validator green.
- All Uzbek text in `src/content/text/uz/night-1…5.yaml`, `endings.yaml`, `ui.yaml`; every UI
  string in the shell and presenters reads from `ui.yaml` (no hard-coded Uzbek left in `src/`
  except the debug text presenter's heading).
- `npm run text:build` → `uz.gen.json` + `SCRIPT_UZ.md`; `npm run lint:text` (Cyrillic,
  English words, wrong apostrophes, forbidden clichés, sentences > 25 words, 4-word phrase
  repeated > 2 times, missing/unused keys, stale generated files) — both in `npm run check`.
- Fonts: Literata (narration, 17–21 px) + Inter (UI). Glyphs ʻ and ’ verified in the cmap and
  in screenshots (`audit/screenshots/f1/`).
- New unit tests: real-story playthroughs to A/B/C by choice id, exact Ending C requirements,
  C hidden when a message is skipped or the voice answered on night 3, the voice speaking the
  mother's words, siz → sen arc; text-lint rules; YAML key completeness.
- E2E playthroughs (text, desktop, mobile, debug API) now route by `data-choice-id` through
  the shared `tests/routes.ts`; UI labels come from `ui()`.

Not changed in F1 (later phases): desktop/mobile visuals, audio, the phone object in 3D
(the phone is a HUD/panel choice until F4).

Language notes for the owner: average sentence ≈ 5 words by `.!?` (short horror prose with
longer sentences mixed in); the text is mine, not machine-translated, but it still needs a
native speaker's read — that is the F1 review.

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

## Phase 7 — Horror polish

Implemented (2026-10-26):

- Preserved all recorded decisions, the seven diary pages, sanity economy and Ending C gate.
  Added one authored return-room node (78 total) for the changed-detail puzzle. The mobile
  scene offers only the shifted clock hotspot as its route forward; the engine owns that
  choice in both modes. Clock movement is saved as a flag, and the desktop clocks wait
  until outside the actual camera frustum. Their old wall impressions remain visible.
- Mirror lag now includes desktop head yaw/pitch as well as position. Mobile reflections
  sample a half-second history of touch/gyro parallax. The mobile peephole figure now leaves
  after its short appearance, matching the desktop presentation.
- Late-night and saved-absence comments are consumed once when a run starts/continues,
  immediately persist their existing MetaHints gates, and can appear at the actual resumed
  node. Absence wording uses the saved timestamp. The real 3:17 watcher checks once a second,
  handles foreground return, saves its gate immutably and never moves the story node.
- Shared signal-loss cue: only the authored night-4 event, 2.5 seconds with a hard 3-second
  cap, visibly in-game 47/48 branding, no input interception, no replay after save/return,
  hidden-page cancellation and complete omission with Reduce flashing. Narration and pause
  controls remain available. Desktop uses the existing safe sanity colour/motion classes.
- Voice text on mobile is presented once in the chat, with an explicit reveal/skip control
  and paused message timers. Narration retains its narrator/diary text. Desktop timed nodes
  allow enough time for their resolved text instead of advancing partway through typing.
- The full ending scripts now appear in a bounded scrollable narration panel, preserving
  always-available gallery/title controls. Ending A names the new resident; Ending C finally
  exposes the scripted Sardor resolution instead of replacing it with a summary.

Pacing and text pass:

| Night | Concrete fixes                                                                                                                                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Natural wording for the note, tea and first silence. Both modes show thirty opposite windows with five initially lit, then extinguish those lights before the outage. Timed desktop narration gets its full reading interval. |
| 2     | Clearer Muhabbat dialogue and tally description; half-second reflection includes head turns. Changing a mobile vignette alone no longer teleports the desktop camera.                                                         |
| 3     | Turning back faces the room before the corridor contracts. Returning reveals the shifted-clock observation puzzle and then the existing carpet diary. Voice repetition and the no-answer ending condition remain intact.      |
| 4     | Finite, skippable-through signal loss; clearer stairwell and copy-room text. Calendar marks end yesterday and show the current month under the unsettling 2006 year. The voice uses the player's name sparingly.              |
| 5     | Correct fourth-floor descent and twenty-year clock reference. Full ending narration is readable/scrollable; the name appears at most once per night in narration. All ending requirements and consequences are preserved.     |

Verified:

- `npm run check` green: 157 unit/component tests, 78-node validator with zero warnings,
  production build, mobile 99.3 KB / 250 KB and lazy desktop 263.1 KB / 700 KB gzipped JS.
- Browser sweep plus corrective reruns: all 121 distinct cases pass, with four expected
  project-specific skips. The first sweep caught an old case-sensitive wording assertion
  and the software-GPU FPS budget. Five scene checks and the isolated benchmark passed
  after their corrections; all other functional cases had already passed.
- Desktop A/B/C and mobile A/B/C real-input routes pass. The C routes explicitly assert
  all five nights and the new return-room node, and attach their node lists. Added short
  observation pauses at the outage, signal-loss and changed-detail beats for the pacing pass.
- All twelve targeted horror checks pass: late-night/absence/real-clock persistence, native
  short knock, both modes' finite and reduced glitch, chat reveal, window extinction,
  changed-detail-only mobile progression, frustum-controlled clock and delayed mirror yaw.
- All three 360×640 endings were rerun with real wheel scrolling to the final line; A names
  the player. Opened and reviewed the fourteen focused Phase 7 screenshots, including each
  mobile ending's top/bottom. Previously reviewed Phase 4/6 location evidence is preserved.
- Necessary performance tuning was explained before changing the tier target: high is now
  400 pixels (inside the specified 320–480 range), low remains 320. At 450 pixels this
  software renderer measured about 46–54 FPS. The unchanged ≥55 FPS check now measures
  60.0 FPS over five seconds at high/400; repeated room tours hold about 59.9 FPS and exactly
  43 geometries / 10 textures before and after. No recorded decision or budget was relaxed.

Limits: automated routes skip typing; the 30–45 minute human play duration is not measured.
Physical GPU, real Telegram webviews and hardware sensor/audio validation remain Phase 8.

Phase 7 exit met. Stop after this phase commit; Phase 8 is not started.

## Phase 8 — Full QA

Implemented (2026-10-26):

- New `tests/e2e/qa.spec.ts`: `window.__game` fast routes to A/B/C, Telegram BackButton,
  tab-close autosave, runtime network isolation, memory across repeated night transitions,
  and mobile FPS under ×4 CPU throttling. A debug-only `__game.getStep()` reports the node,
  phase, ending and visible choices so the fast routes use the real choice list.
- Bug fix: the Telegram BackButton adapter existed but the shell never registered it.
  It now opens pause in game, resumes from pause, returns from settings/form/ending/
  gallery, and stays hidden on warning/title so Telegram's own close remains the exit.
- Bug fix: Settings opened from the pause menu always returned to the title. It now
  returns to where it was opened from (pause or title). Unit test covers the back map.
- Test corrections (no product change): the audio mixer case had encoded the old
  settings→title return; the desktop unobserved-clock case set its flag before the camera
  settled (a real race in the test, since the clock correctly moves whenever unseen); the
  new close-tab case needed the Telegram SDK stub on the reopened tab as well.

Verified:

- `npm run check` green: lint, format, typecheck, 158 unit/component tests, 78-node
  validator with 0 warnings, build, mobile 99.5 KB / 250 KB and desktop 263.1 KB / 700 KB gz.
- Full Playwright sweep, single uninterrupted run: 160 passed, 5 expected skips (four
  no-WebGL-only assertions in WebGL projects, the mobile throttle case on desktop), 0 flaky.
  Zero console/page errors are enforced in every spec. The two race fixes were also
  repeated 3× per project green before the sweep.
- Fast `__game` routes reach A/B/C in all five projects, across nights 1–5; C asserts the
  7 pages, sanity ≥ 40 and no night-3 answer. Real-input A/B/C remain green in both modes.
- Memory: 1 warm-up + 2×4 cycles over the five night entry nodes, forced GC, exact CDP heap.
  Desktop GPU resources constant (24 geometries / 10 textures), one canvas in every project.
  Heap growth shrinks between blocks (mobile ≈ 205 → 80 KB, desktop ≈ 730 → 320 KB):
  bounded first-use caches plus the run's own visited-node history, not a leak.
- Mobile ×4 CPU throttle: ≈ 60 FPS in iPhone 13, Pixel 7, small-Android and no-WebGL
  projects (budget ≥ 30). Desktop ≥ 55 FPS benchmark at high/400 px green in the sweep.
- Network: a full route records only same-origin, data/blob and the Telegram SDK URL.
- QA.md manual checklist: every item checked except physical-hardware validation.
- DECISIONS.md unchanged.

Not verified (no hardware on this host; all runs are Chromium + SwiftShader emulation):

- Real Telegram clients (iOS/Android/Desktop/Web): BackButton delivery, CloudStorage,
  haptics, gyroscope, fullscreen, Pointer Lock inside Telegram Desktop's webview.
- Physical mid-range laptop GPU FPS; iOS WebKit audio unlock/interruption; real sensor
  permission prompts; acoustic listening on speakers/headphones.
- The 30–45 minute human play duration has not been timed.

Phase 8 exit met for everything verifiable here. Stop after this commit; Phase 9 not started.

## Phase 9 — Release docs

Implemented (2026-10-26):

- `README.md`: requirements, local run (dev/build/preview, text presenter), `npm run check`
  and the Playwright suite, debug mode, Vercel deploy (dashboard and CLI), BotFather bot
  creation and attaching the `*.vercel.app` URL as the Mini App / menu button / direct link,
  project layout and license.
- `vercel.json`: Vite framework, `npm ci`, `npm run build`, output `dist`, immutable cache
  headers for hashed `/assets/*`.
- Spec gap fixed (explained before editing): PROMPT §11 says `window.__game` must not exist in
  production builds, but the production build exposed it under `?debug=1` because the e2e
  suite ran against that build. The API is now compiled in only when `VITE_GAME_API=1`
  (`.env.e2e`). Playwright builds that variant into `dist-e2e/` and serves it on port 4174;
  `npm run build` / Vercel ship without it, and `npm run budget` fails if it ever reappears.
  The `?debug=1` overlay remains available in production. Mobile JS fell to 99.3 KB.
- The mirror-lag assertion now samples the reflection gap every frame inside the page; a
  slow software-renderer round trip had read it after the half-second lag had already ended.

Verified:

- `npm run check` green: 158 tests, 78-node validator with 0 warnings, mobile 99.3 KB / 250 KB,
  desktop 263.1 KB / 700 KB, "debug API: absent from production JS".
- `npm run e2e` full sweep in one run: 160 passed, 5 expected skips, 0 flaky. The changed
  mirror case also passed 5× in a row. An earlier sweep was cut off when the session ended;
  its one recorded failure (desktop signal loss) printed no details, did not reproduce in
  36 repeated runs of that file, and the complete rerun was green.
- Fresh-copy check following the README: only the files git would ship (tracked plus new,
  `.gitignore` respected) copied into an empty directory → `npm ci` → `npm run check` green →
  `vite preview` serves the build, which boots to the content warning with zero console
  errors, `window.__game` absent and the debug overlay present → boot/shell e2e 8/8 green.

Not verified:

- The Vercel deployment and the BotFather steps were not executed (no account access from
  this host); they follow the current Vercel and BotFather flows. Opening the game inside
  real Telegram clients remains the hardware validation listed in Phase 8 and QA.md.

Phase 9 exit met. All phases complete; the remaining unverified items are listed above and
in Phase 8.

## R4.5 — in progress

Desktop doors now use deliberate interaction and live leaf collision. The new door input
test passed; desktop real-input A and B passed after fixing the under-door figure holding
47 shut, and C passed in the preceding run. The first A/B runs failed at the entrance;
these were rerun after that correction. Small-Android fast routes A, B and C passed.
Kitchen chair clearance and an automated swing-arc validator were added. Before/after
chair images and initial area views are in `audit/screenshots/r45/`. Area views are not
yet a complete placement audit: several face nearby walls, close-ups and ending key frames
are incomplete, and the required after sheets and full player walk-through remain.
R4.5 is not at its owner gate; R5 has not started.

R4.5 continuation: same-position before/after area sheets and additional object views were
reviewed. Some views face walls or are too dark to judge all props, so this is not a full
visual sign-off. The kitchen chair was viewed again from a downward angle after resizing.
Desktop fast routes A/B/C and small-Android fast routes A/B/C passed; the two targeted
door cases passed, including crossing an open door and the locked night-5 front door.
The unchanged desktop performance test failed at **52.70 FPS** (high, 336 px, SwiftShader;
requirement >= 55). The complete real-input night-by-night walk, procedural-prop and
exterior audit, mobile door interaction, and ending key-frame comparisons remain.

The wardrobe was added to deliberate desktop door interaction and the swing validator;
its closed and open screenshots were reviewed. Three targeted desktop door tests passed.

Mobile continuation: the wall hotspot no longer appears when no wall action is available.
The small-Android regression passed after an initial test-harness failure caused by removing
the React-owned debug overlay; the corrected test hides it instead. The viewed mobile hall
still shows the closed front door while its movement arrow can cross it. Door operations and
the complete mobile/desktop visual and real-input audit remain unfinished.

R4.5 continuation (Claude Code): fixed mobile views now respect doors (DECISIONS 98–99,
`mobile-doors.spec.ts`, `moveOn` e2e helper) and desktop interaction is blocked by walls and
shut doors (DECISION 100). Screenshots reviewed: hall on a 360x640 phone (door controls and
corridor still), and lit corner views of every room of flat 47
(`audit/screenshots/r45/rooms-lit/`). `npm run check`: 333 unit tests green. Still open for
the gate: a complete real-input walk of all nights, a full placement sign-off of the
procedural props and the stairwell/exterior (the stairwell is very dark in screenshots and
its steps read as floating planks), final performance on this HEAD, and the mobile ending
fast routes after the door change.

## R5 — Mobile magic window (Claude Code)

The owner released R4.5 ("fix the errors, then go on to R5 and finish it"). Built: the 3D flat
on phones (`src/presenters/magic/`: nodes, MagicRig, MagicHud), device-orientation look,
recentre, glide markers, door controls, projected object hotspots, wall hold/knock, circle-drag
clock winding, peephole; routing and fallback in `GameShell` + `platform/device/magic.ts`.
Evidence (screenshots, no videos): `audit/screenshots/r5/` (walk sheets, magic-*.png).
`npm run check` 339 unit tests green. e2e `mobile-magic.spec.ts` 9/9 on small-android (360x640)
and iphone-13 (390x844): glide through every door, gyro, drag, tap a hotspot, ending A knock,
ending B stairs/bus by glides, ending C winding, context-loss fallback, `magic=0`. Stills
fallback specs (qa fast routes A/B/C, mobile-doors/wall/scenes/hd) still pass.
Not done: real-phone check of gyro axes and frame rate (owner gate); no real-input walk of
nights 1–5 in magic mode beyond the above; stairwell darkness and R6 items remain.

## R6 — Fear pass (Claude Code)

`npm run metrics:pacing` added to `npm run check` (idle gaps per tension phase, build vs
unease). Fixed starvation of ambient events (DECISION 104). Real-time idle playthroughs of
nights 1–5 in desktop and magic-window modes: 7.0–7.3 min per night, no errors, no stalls.
Timelines and screenshots: `audit/screenshots/r6/out-*/`. Voice recordings remain pending
(RECORDING.md); no TTS is used. QA rubric: environment scores in QA.md stand; the fear pass
adds no per-capture score because it changes timing, not pictures.

## R7 — Full QA (Claude Code)

Full e2e, one project at a time, one worker: desktop-chrome 58 passed / 2 skipped (+ the
audio pause test fixed, DECISION 105), small-android 36 + iphone-13 36 + pixel-7 36 passed
(+ the same audio fix), no-webgl 29 passed. `npm run check`: 339 unit tests, validate:beats,
metrics:design, metrics:pacing, validate:world, budgets (mobile JS 129.6 KB / 250, desktop 3D
418.6 KB / 700, flat 47 playable 19.8 MB / 25) all green. Telegram: BackButton, deactivation
and the WebApp mock cases are in qa/audio specs and pass in plain-browser and mocked-Telegram
modes. Performance: `desktop-performance.spec` passes at 57–60 FPS (high tier) when the
software GPU is quiet but trips the quality governor in some runs on this machine (the same
spec fails 2 of 3 on the pre-R5 commit 2f6f6f8 too, so it is not a regression); the threshold
is not relaxed. On the owner's real phone/desktop GPU this needs a confirmation run.
Open for the owner: real-phone check of the magic window (gyro axes, FPS), voice recordings
(RECORDING.md), the dark stairwell.

R8 (owner review, DECISION 106): door opens only on E in night 1, form/hand/chain redone,
3rd-floor landing floor added, new title/pause design, loading veil with tips. Unit tests and
`npm run check` green; targeted e2e green (desktop doors/audio/horror, small-android mobile set).
