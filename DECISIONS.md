# DECISIONS

Every ambiguity resolved per spec section 0 ("prefer what keeps the game stable on weak
Android phones"), recorded here.

1. **TypeScript 5.9.3 instead of 7.x.** typescript-eslint 8.72 declares peer support for
   `typescript <6.1.0`; TS 7 (the native compiler) is outside that range. Pinning 5.9.3 keeps
   lint + typecheck fully compatible.
2. **No tone.js.** Spec allows it, but the custom Web Audio engine is small, tone would add
   significant weight against the 250 KB gz mobile JS budget, and the sound design is entirely
   procedural. Decided: hand-written audio engine (Phase 5).
3. **Single tsconfig** covering src, tests, scripts and config files, with both DOM and node
   types. One `tsc --noEmit` typechecks everything; less config drift on Windows.
4. **`noUncheckedIndexedAccess` on, `exactOptionalPropertyTypes` off.** The former catches real
   story-data bugs; the latter conflicts with the optional-heavy `StoryNode` shape without
   adding proportional safety here.
5. **vitest environment jsdom for all unit tests.** Engine tests are pure TS and run fine under
   jsdom; component tests need the DOM. Storage adapters are injected, so no fake-localStorage
   hacks in engine tests.
6. **Bundle budget via Vite manifest.** `build.manifest: true`; `scripts/check-bundle.mjs`
   counts the full static entry subtree for mobile and additional desktop-only downloads
   for the lazy renderer. CSS/fonts are informational. Phase 6 correction: the original
   subtraction reported mobile as 0 KB when the lazy module imported shared entry code;
   the manual chunk grouping also hoisted Three.js into the entry. Native dynamic-import
   splitting now preserves the mobile boundary, and the gate rejects a statically loaded
   desktop presenter. This replaces the broken accounting, not the size limits.
7. **git repository initialized locally, branch `main`.** No remote configured (deploy target
   is Vercel; pushing is a user decision).
8. **`tsx` runs `scripts/validate-story.ts`** so validation is plain TypeScript sharing the
   same types as the engine, without a build step.
9. **`never_answered_n3` is expressed as `{not:{flag:'answered_n3'}}`.** Effects cannot
   compute negations, so instead of a derived flag the Ending C gate condition reads
   `answered_n3` (set only by night-3 answer choices) and inverts it. Equivalent semantics,
   one less flag, no conditional effect machinery needed.
10. **Meta-horror flags `late_night` and `return_comment` are shell-injected.** They appear in
    story line conditions but are set by the platform shell at boot (local time 00:00–05:00)
    and on resume-after-abandon. The validator's "never set" warnings for them are expected
    and accepted.
11. **StaticNarrationProvider has a sync fast path (`resolveLineSync`).** The
    NarrationProvider interface stays async (the future AI provider needs it), but the static
    implementation is pure computation; the text presenter uses the sync method so rendering
    needs no waterfalls.
12. **Sanity economy tuned for the Ending C gate.** Night 4's forced drops were reduced after
    a full-path trace showed the C gate (sanity ≥ 40) unreachable; verified end-to-end that a
    careful run arrives at ~50.
13. **Separate test build for the debug API.** Spec 11 forbids `window.__game` in production,
    while e2e needs it. `VITE_GAME_API=1` (in `.env.e2e`) compiles it in; Playwright builds
    `dist-e2e/` and serves it on port 4174, never the production `dist/`. The `?debug=1`
    overlay itself stays available in production builds.
14. **Future-work extension points (spec 15).** An `AiNarrationProvider` can implement the
    existing async `NarrationProvider` interface (every presenter already resolves text
    through it) and fall back to `StaticNarrationProvider` per line. A bot backend for opt-in
    night messages cannot read the client save (localStorage/CloudStorage stay on the device),
    so it would need an opt-in setting that sends the Telegram user id and the saved
    `GameState.lastPlayedAt` to that backend; the save already records that timestamp.

## Fix phases (FIX_PROMPT.md overrides PROMPT.md where they conflict)

15. **Text in YAML, compiled to JSON.** The owner edits `src/content/text/uz/*.yaml`;
    `npm run text:build` compiles them to `src/content/text/uz.gen.json` (committed) and
    regenerates `SCRIPT_UZ.md`. JSON (not a YAML loader) because the same story module is
    imported by Vite, Vitest, tsx scripts and Playwright specs; JSON imports work in all four.
    `text:build` runs first in `npm run check`, before `dev` and before `build`, and
    `lint:text` fails if the generated files are stale. Generated files and the YAML are in
    `.prettierignore`, so the owner's formatting never fails the check.
16. **Story structure stays in TypeScript, text keys are per node.** Lines are `l1, l2…`,
    conditional variants `l3_<reason>`, choice labels `c_<choiceId>`. Missing keys render as
    `⟦file/node.key⟧` instead of crashing; `validate:story` and `lint:text` fail on missing and
    unused keys. UI strings are flat dotted keys in `ui.yaml`, read with `ui('a.b')`.
17. **Tests route by choice id, never by label.** `tests/routes.ts` holds one route per
    ending; presenters expose `data-choice-id`; E2E specs read UI labels through `ui()`. The
    owner can rewrite any Uzbek line without breaking a test.
18. **Mother's messages are inventory items `mom_msg_1…5`.** Ending C reuses the existing
    `itemCountGte` condition (`ENDING_C_CONDITION` in `content/story/features.ts`). A message
    left unheard is lost when the night moves on — that loss is the point.
19. **Content root is `src/content/text/uz`, not `content/text/uz`.** FIX_PROMPT names
    `content/…`; PROMPT.md's architecture keeps content under `src/content/`. Kept the
    existing root so the import alias and build stay unchanged.
20. **Fonts: Literata (narration) and Inter (UI)**, owner's choice. Both latin subsets carry
    ʻ U+02BB and ’ U+2019 (`scripts/verify-fonts.mjs` reads the cmap). IBM Plex Mono and
    Oswald were removed. Narration is 17/18/21 px for text size S/M/L.
21. **Optimised assets are committed; raw downloads are not.** `npm run assets` downloads
    into `.asset-cache/` (git-ignored, md5-checked against Poly Haven's API) and writes the
    optimised copies to `public/assets/` plus `src/assets/manifest.gen.json` and
    `CREDITS.md`. The optimised set (~16 MB) is in git so `npm run check`, CI and a fresh
    clone build without network access. Re-run `npm run assets` only when `sources.ts` changes.
22. **WebP, not KTX2.** KTX2/Basis needs the native `toktx` binary, which is not in this
    toolchain; FIX_PROMPT §3 allows WebP as the fallback. Models use meshopt geometry
    compression (decoder ships with three.js, no external request).
23. **ORM packing.** Each surface ships three WebPs: color (sRGB), normal (OpenGL), and ORM
    (R = AO, G = roughness, B = metalness), which three.js reads from one texture.
24. **Loading starts at boot, not at "Yangi oʻyin".** In desktop mode the shell begins
    loading flat 47 and the 3D chunk while the player reads the warning and title, so the
    key-ring screen is short or skipped. Progress is real bytes for assets; the 3D chunk
    (fetched by the browser, not by us) counts as one fixed block of its gzipped size.
    Stairwell and flat 48 load in the background after flat 47.
25. **Asset bench (`?assetview=1`)** exists in dev and test builds only; `npm run budget`
    fails if it reaches production JS.
26. **One world file.** `src/content/world/layout.ts` is the only place that knows where
    anything is: rooms, walls with openings, doors, lights and every object (room, position,
    rotation, real size, support, purpose). The desktop renderer, walking/collision,
    `validate:world` and `docs/floorplan.svg` all read it. Flat 48 is generated from 47 as
    a mirror image about the shared wall, minus most furniture, tinted for decay.
27. **Plan.** Room 16.5 m² (5.0 × 3.3), kitchen 6.4 m², combined bathroom 3.5 m²,
    corridor 1.2 m wide, built-in wardrobe; flat 47 ≈ 36 m² including the closet. The
    corridor runs room → entrance with the kitchen on the left and the bathroom on the
    right, as the story says. Flat 48 is behind the wall the sofa stands against.
28. **Sketchfab (CC-BY) fills Poly Haven's gaps**: fridge, gas stove, sink run, bathtub,
    pedestal sink, toilet, washing machine, cast-iron radiator, wall carpet, two ceiling
    lamps, window frames, coat hooks, shoe rack. The token lives in `.env.local` only.
    Packs are trimmed at build (`keep`), heavy meshes simplified (`simplify`). A model whose
    title says "low-poly" is refused by the pipeline even when it looks fine.
29. **Scale rule.** Every model is scaled uniformly to its declared real size; validate:world
    fails if any axis then differs by more than 10 % (or 1 cm for thin items).
30. **Rendering.** AgX tone mapping in the composer, N8AO and bloom on the high tier,
    PCF soft shadows from one moving point light (the current room's bulb), the moon and
    the torch (with a projected cookie); DPR up to 2 on real GPUs. SwiftShader (tests only)
    renders at the old small size without shadows; `?quality=ultra` forces full quality.
31. **Primitive figures removed.** The box-and-sphere neighbour and peephole figure are gone;
    F4 builds the figure. The torch now follows the power (off while bulbs burn, on after
    3:17) unless toggled with F.
32. **F3 render profiles share the same plan and assets.** Native GPUs and `quality=ultra`
    keep the full meshes, PBR maps, physical glass, shadows, AO and bloom. The CPU rasterizer
    targets 336/320 lines, with cached mesh LODs, 512 px linear colour maps and vertex lighting (including the torch),
    with AgX applied directly; the peephole retains its effect pass. Its clock glass must
    also use the fallback material: leaving that one refractive physical material enabled
    forced a second full-scene transmission pass and made the software renderer fall back
    mid-story. The existing 55 FPS browser assertion stays in force. Static architecture is
    batched by finish in both profiles, preserving the plan's openings and metric UVs.
33. **The figure is original work, made from a signed distance field.** No Mixamo model was
    supplied, so `scripts/figure/figure.ts` builds a thin man of ~2.03 m in a long coat from
    smoothly blended anatomical parts (skull, jaw, neck, shoulders, chest, sleeves, long
    hands and fingers, trousers, shoes), meshes it with surface nets, projects every vertex
    onto the field and takes normals from its gradient. No primitive is ever visible. It
    goes through the normal asset pipeline as source `original` (CC0, credited to "3:17"),
    simplified to a quarter and meshopt-compressed: 427 KB with its empty coat.
34. **No skeleton.** The figure never walks on screen. It breathes, sways slightly and turns
    its head (the head hangs from a pivot at the neck), and every appearance is a pose.
    A rig would add size and risk for motion the horror rules forbid.
35. **Where it may be is data** (`src/presenters/desktop/figure.ts`): under the entrance door
    (night 4 after 3:17, night 5 while the voice speaks), behind the kitchen's frosted glass
    (night 3 corridor), at the far end of the landing with the timer light off (night 2
    morning), through the peephole with its back turned (night 4), and only in the dark TV
    glass, in the doorway behind the player (night 3). Each appearance ends once it has been seen and the
    player looks away, comes too close, or waits it out. Night 1 has none.
36. **The door gap is a light, not a model.** The entrance leaf hangs 14 mm above the floor;
    a shader decal on the hall floor carries the light from the landing with two foot
    shadows that spread inward and shift weight. The body is really out there (seen through
    the peephole); the decal makes it legible from inside.
37. **Frosted glass is real transmission, but only while needed.** The kitchen door's pane
    becomes a rough `MeshPhysicalMaterial` (blurred second scene pass) only during the
    frosted appearance; otherwise it is a plain translucent pane. Software GL keeps a
    near-opaque pane.
38. **The TV is a convex mirror.** A cube camera at the tube renders the room plus a
    reflection-only layer; the bulged glass bends its normals for a wide view. The figure
    stands in the room's doorway, dark against the lit corridor, on that layer only: it is
    in the glass and not in the room when the player turns around.
39. **The phone is an object.** It lies on the room table with its screen dark and a green
    notification LED; it buzzes now and then and lights up with "Onam". At the phone beats
    it is held up with the missed calls and a playable voice message (canvas screen, HD);
    face down after the kitchen on night 1 (turned while unobserved), under the pillow on
    night 4, dead at 3:17 on night 5. Its lock screen shows the player's real time until
    the story sets one.
40. **Changes while unobserved are frustum-gated.** The coat on the hooks (night 2), the
    chair turned to the wall of 48 (night 3), the loose chain (night 4) wait until their
    spot is out of view; on later nights they are simply so. The bundle, the wet prints to
    48 and visible breath (night 5) are placed directly.
41. **Interaction feel.** Prompts within 1.5 m (on the floor plane) only; walking eases in
    and out (~0.2 s); footsteps follow the floor underfoot (parquet, painted boards,
    tiles, concrete); doors swing on a damped spring with hinge sounds; papers are held up
    unlit (the torch would burn them white) and turn with the mouse; the peephole can be
    used at any time (E at the door).
42. **F5 recording infrastructure (acquisition pending).** Freesound numeric ids and
    exact API license URLs are checked before using HQ previews (original downloads
    require OAuth). Preserve the actual CC-BY version; refuse SA, NC, ND and unknown
    licenses. Ship mono AAC-LC/M4A at 32 kHz / 64 kbps for Chromium/Safari decoding.
    Ambience targets -23 LUFS in two passes; sub-400 ms cues cannot be measured reliably
    with integrated LUFS, so one-shots target -6 dBFS decoded peaks (±0.5 dB), correcting
    AAC overshoot after encoding. Files decode asynchronously from the local manifest;
    synth remains an immediate fallback, never a delayed replay. Desktop panning is HRTF.
    This does not certify the sound selection or mix: no Freesound key is available yet.
43. **F5 final formats replace decision 42's provisional all-AAC choice.** Transient
    recordings and the sparse clock use mono 32 kHz FLAC; continuous ambience uses AAC-LC
    at 96 kbps. AAC introduced coarse peak changes in the pen/footfall recordings, so
    lossless effects preserve the -6 ±0.5 dBFS target and true tick gaps within the existing
    budgets. Loops target -23 LUFS in two passes; the encoded decode is measured again.
    Source ReplayGain/metadata is stripped and gain processing uses floating point.
44. **Recordings are pinned data, never runtime API calls.** Twenty-nine Freesound CC0
    assets yield 41 local files and cover every SfxId, including new `cloth`, plus fridge,
    wind, winter city, neighbour TV and the clock. The drone is the only intentional synth
    layer. Four independently recorded footfalls per floor avoid adjacent repeats and use
    slight random pitch/gain. Freesound API license URLs and original version are checked
    before download; author, URL and license evidence are retained. All 22 authors are
    credited from the manifest. The neighbour-TV source explicitly identifies its underlying
    public-domain 1955 programme; no unlicensed commercial broadcast or ripped game audio.
45. **Silence belongs to the audio clock.** At the cut, remove every ambient source, play
    the ≤350 ms compressor-stop recording, then hold wall knocks/breath for four seconds
    plus 100 ms of panner-tail headroom. Drop incidental phone buzzes in that gap; retain
    player actions. Web Audio schedules the onset; pause and scene changes cancel pending
    sources. No delayed scares replay after a pause or a finished download. HRTF uses the
    plan's actual wall, hinges, phone and scripted-event coordinates.
46. **Audio is optional to loading, but mandatory in the shipped manifest.** The world
    loading gate excludes recordings, so a broken file leaves a playable synth fallback.
    Decoding is bounded to four workers with separate decoded/synth diagnostics. Asset
    builds finish in staging before replacing the working set, roll back failed moves,
    and retry Windows directory locks. Sound-only rebuilds copy/recheck other asset hashes.
47. **F4's software performance carry-over was profiled during F5.** Chrome's JS profile
    was mostly idle while the CPU rasterizer missed 55 FPS. The regular software output
    now uses the specification's allowed ACES filmic curve instead of per-fragment AgX
    logarithms/powers; the native/ultra compositor keeps AgX. Resolution remains 336/320,
    geometry and materials are retained, and the 55 FPS/governor/test limits are unchanged.
    Listener parameters update only when the head moves or turns, instead of about 2,500
    redundant native writes per five seconds at rest. Breathing remains one layer rather
    than overlapping across rapid voice beats. Regression tests cover both audio changes.
    Bright/dark software captures were compared by eye. The focused unchanged benchmark
    measured 59.90 FPS; Ending C and resource stability passed after the change.
48. **Narration timing follows elapsed time under renderer load.** A full F5 sweep's
    reload/resume test restored the correct clock node, but its typewriter had only
    displayed part of the line after five seconds. Chaining one timeout per character
    compounded render delays. The animation now catches up to elapsed time at the same
    authored 24 ms per character; click-to-skip remains available. A blocked-renderer
    unit test covers this. The E2E assertion and its five-second limit are unchanged.
49. **The phone's hidden LED is uploaded with its body.** The repeated-night resource
    gate found one extra geometry after warm-up (187 → 188): the notification circle was
    only uploaded on its first four-second blink. Prime the entire phone on mount so its
    body, glass and hidden LED exist on the GPU before play. Dispose all three meshes'
    owned geometry/materials and the screen texture on unmount. Resource assertions,
    warm-up duration and tolerances remain unchanged.
    Repeating the gate then exposed the night-5 breath texture alternating between
    allocated/disposed on node changes (40/41 textures). Keep one primed breath sprite
    for the world's lifetime, resetting only its timing and visibility. All three
    repetitions of the original resource gate pass with both fixes.
    The final uninterrupted suite passes 177 cases with five expected skips; the
    unchanged desktop benchmark measures 59.71 FPS with 225 geometries / 45 textures
    stable across room tours. F5 ends here; F6 is not started.
50. **Mobile shows renders of the real desktop world, not procedural scenes.** The pixel
    vignettes are removed. `npm run assets:stills` drives the actual world through a
    dev/test-only capture bridge (`?render=still`) and writes 45 portrait 1080×1920 WebP
    stills with 270×480 grayscale depth, SHA-256 hashes and camera-projected anchors to
    `stills.gen.json`. The budget rejects any `__still` leakage into production JS.
    One render per story state (lights on/off, figure, return, revisit changes) keeps
    evidence persistent instead of random. 2.2 MB of the 10 MB mobile budget.
51. **Depth parallax with a Canvas fallback.** A small WebGL2 shader displaces the still by
    its depth map for tilt/drag, restrained push-in, dust, window snow and cold breath.
    Missing WebGL2 or a lost context drops to a 2D Canvas with the same image; the scene
    is never blank. Reduce flashing freezes all motion. Retry is offered for a damaged
    still; GPU/decoded resources are released per scene.
52. **Capture is atomic and isolated from production camera priority.** StillCapture
    renders on demand with four settling frames and reads colour, depth and anchors in one
    step, retrying if HMR replaces the bridge mid-capture. Export poses are applied early;
    CameraRig keeps a late export override so ordinary desktop frame order is unchanged.
    Imported app modules must not be edited while an export runs.
53. **The phone clock is live, not baked.** The portrait phone export leaves its clock area
    blank; `PhoneClock` draws the story's current time at the projected position
    (normalised .505/.349, 102 px source size, cover-crop scaled, following parallax).
    A baked "02:41" would contradict 3:16/3:17. The dead phone gets no clock.
54. **Export exposed a real shifted-clock bug.** The shifted clock was placed inside the
    party wall; World now offsets it by the wall's thickness. Windows are captured in the
    settled dark state during blackout, and Ending C's clock shows 3:18.
55. **Render credits are one row per still pair.** Compositions are credited to the "3:17
    project" under CC-BY-4.0 with the pipeline repository URL; models, textures and HDRIs
    keep their own attribution in the main asset manifest. CREDITS and Settings share
    the generated rows; unit tests check that every pair is listed.
56. **Mobile layout: 58% scene, scrollable panel.** Narration is at least 17 px, controls
    48 px, safe areas respected. Hotspots use projected anchors with shared cover-crop
    math; a choice whose anchor is offscreen or collides stays a panel button.
57. **An unanchored wall leads the panel.** The night hubs face the window, so the shared
    wall is out of frame and hold-to-listen became the third panel button, below the fold
    at 360×640: the unchanged audio E2E pressed outside the viewport. Rather than reframe
    four reviewed room renders, the hold button sorts first among panel choices; the
    hint already names the wall as the scene's main action. Other choices keep story order.
58. **Five-size E2E starts each viewport from a fresh run.** Storage is cleared from a
    static same-origin document; clearing inside the app was overwritten by its unload
    save, and the warning screen no longer appeared.
59. **R0: the story is a timeline of world beats, not a text graph.** `DIAGNOSIS.md` showed
    83–90% of a night was reading, 0 events without text and 100% button transitions.
    `docs/BEATS.md` replaces nodes with clock / zone / gaze / notLooking / interact / idle
    triggers and world actions. Every night reaches 3:17 by itself (3:48–6:58 idle). At
    least 70% of beats per night carry no text, and every text beat also has a non-text
    carrier (BEATS §8).
60. **R0: only in-world words remain.** `SCRIPT_UZ.md` keeps only subtitles, phone screens,
    papers and diary pages: 661 words worst case (was 2,426). The kept material is word for
    word: the mother's five messages, Rustam's rule and note, Muhabbat's story, the voice's
    quoting lines and the diary pages. Variants are lettered IDs so budgets are counted
    mechanically.
61. **R0: choices are physical.** Answering, knocking and silence at the wall work through
    interact, a three-knock gesture and a 20 s window. The night-4 question is chosen from
    what the player knows, and walking away is silence. The endings are entering 48,
    leaving by the stairs, and winding the clock with a circular gesture. The wall clock
    never shows anything but 3:17 until ending C. On night 5 the world holds at 3:17 until
    the player acts (pending owner decision).
62. **R0 open conflicts recorded, not resolved alone.** (a) The required voice lines use
    second-person forms, so the new lint must exempt the `voice` speaker from the -dingiz
    and -yapsiz ban. (b) Replacing the graph-based tests conflicts with "do not delete
    tests", so it waits for the owner's approval (BEATS §9, §11).
63. **R0 owner decisions applied.** (1) Ending C: the clock comes off the wall any time on
    night 5; the key turns only after "Eshikni och". (2) Night 5 never ends by itself: time
    holds at 3:17 and the wall knocks every 45 s. (3) Voices are the owner's own recordings
    (`RECORDING.md`); until they arrive, silence and subtitles, never TTS. (4) Rustam is a
    hand, a sleeve, keys and breath in 47's dark doorway; no face, no body model. (5) The
    second-person lint ban covers narration only; spoken lines are exempt. (6) The rental
    form is paper Rustam hands over (≤ 33 words). (7) Graph tests replaced; mapping below.
    (8) Night 2's day walk goes down to the 3rd floor only.
64. **R1: one Director drives both presenters.** `src/core/director` owns the clock, beats,
    response windows, ambient events (3-minute cooldown, 10 s quiet after speech) and the
    subtitle queue (0.6 s + 0.35 s per word, 300 ms gap). Presenters only report sensors
    (zones, gaze, unseen time, movement) and inputs (interact, hold, three knocks). The story
    graph, narration providers and the text presenter are deleted. Saves are version 2; a v1
    save restarts its night with its meaning kept.
65. **`text:build` never writes `SCRIPT_UZ.md`.** It only generates `uz.gen.json` from the
    YAML; `script.yaml` is generated once from `SCRIPT_UZ.md`, and the lint checks every
    script line is used.
66. **Night 1 arrival: Rustam in 47's doorway, the phone torch on.** The landing bulb is
    dead and the flat's circuits are off until the player switches them on. Rustam offers
    the form at 3.5 s and presses it into the player's hands after 25 s. When he hands the
    keys over, the camera looks down at the palm while his steps go down and stop too
    early.
67. **Desktop input details.** Pointer lock is released while the paper form is open, and
    focus moves to the name field after the paper settles. Light switches rank below story
    objects for the use glyph. Rustam blocks movement while he stands in the doorway.
68. **Mobile is a temporary viewpoint fallback until R5.** Stills of the real flat linked by
    edge arrows, on the same Director; holding the wall listens, three taps knock. R5
    replaces it with the magic window.
69. **New CC0 sounds for the beats:** cough, drip, crows, pipes and a passing car (Freesound,
    `CREDITS.md`). The neighbour-TV ambience is dropped; the TV is now an object beat.
70. **Deferred, not dropped:** the corridor stretch, the mobile return puzzle and the
    voice-reveal chat move to R3 and R5, where their nights and the magic window are built.
71. **Test mapping (owner decision 7).** Each deleted graph test, and the test that now
    covers its behaviour. "Removed" means the behaviour no longer exists in the game.

    | Old test (file › title)                                                         | New test                                                                                                                                                                  |
    | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | engine/conditions › all ten cases                                               | director/conditions.spec › same ten cases (moved)                                                                                                                         |
    | engine/effects › sanity clamps, flag values, item without duplicates            | director.spec › applies actions in order: sanity clamps, items once, cues reach the presenter                                                                             |
    | engine/effects › sfx / fx / haptic emit events; applies in order                | same director.spec test                                                                                                                                                   |
    | engine/effects › handles undefined effect lists                                 | Removed: actions are always arrays (typed)                                                                                                                                |
    | storyRunner › nodePhase, advance, choose, hidden/unknown choices                | Removed: no nodes or choice buttons; physical choices → director.spec › a response window resolves by answer, knock or silence                                            |
    | storyRunner › startGame: sanity 100, profile, night event                       | director.spec › a new run starts at full sanity with the form profile; the next night announces itself                                                                    |
    | storyRunner › resume never re-applies onEnter                                   | save.spec › migrates a v1 save to the start of its night; e2e shell › reload resumes; qa › closing the tab mid-night keeps the night                                      |
    | storyRunner › goTo / getNode errors                                             | Removed: no node ids; debug uses startNight / setClock / playSequence                                                                                                     |
    | storyRunner › ending handling (effects before ending, finished once)            | audio/transitions.spec › an ending plays out, then commits to the gallery and clears the run in one step                                                                  |
    | storyRunner › isLateNight / is317                                               | ui/horror.spec › records a late-night start…; plays the real-clock 3:17 knock once; e2e desktop-horror › late-night launch, real 3:17                                     |
    | storyRunner › createInitialState timestamps, meta hints                         | director.spec › new run test; ui/horror.spec › records a late-night start and a long absence                                                                              |
    | narration/static › placeholders {name}                                          | ui/horror.spec › names the player only in the voice's mouth                                                                                                               |
    | narration/static › {fear}/{door}/{time}, variants, fallbacks                    | Removed: no narrator; variants are lettered lines chosen by `if` actions → director.spec › answering chooses the voice reply by the form                                  |
    | story/playthrough › ending C route meets every requirement                      | director.spec › ending C needs all 7 diary pages, all 5 messages, sanity 40 and no answer on night 3; e2e qa › fast route reaches ending C; desktop › real-input ending C |
    | story/playthrough › the voice says the mother's words, admits a skipped message | director.spec › in 48 the voice says the mother's words, then answers by what the player knows                                                                            |
    | story/playthrough › hidden-choice cases, voice on the wall                      | validate/beats.spec › every static check; director.spec › night 1 tests                                                                                                   |
    | validate/validate.spec › structure (edges, exits, cycles, reachability)         | validate/beats.spec › rejects a narrator, unknown text/object/zone and a dangling "after"                                                                                 |
    | validate/validate.spec › line rules, placeholders                               | validate/beats.spec › rejects a subtitle over 10 words…; textLint › ignores {placeholders}, every word a night asks for exists                                            |
    | validate/validate.spec › endings missing / unreachable                          | `npm run metrics:design` gate (all endings reached) and qa fast routes A/B/C                                                                                              |
    | validate/validate.spec › exactly 7 diary pages, none twice                      | director.spec › ending C test (7 pages)                                                                                                                                   |
    | validate/validate.spec › flags read but never set (warning)                     | Removed: flags are now set and read inside typed beats; validate:beats checks "after" targets                                                                             |
    | ui/horror › narration catch-up after a blocked renderer                         | Removed: no typed narration; ui/horror › shows a spoken line whole at once                                                                                                |
    | ui/horror › player name at most once per night                                  | ui/horror › names the player only in the voice's mouth                                                                                                                    |
    | ui/horror › pending comments once; absence timestamp; real clock once           | ui/horror › records a late-night start and a long absence…; plays the real-clock 3:17 knock once                                                                          |
    | ui/horror › glitch duration, Reduce flashing                                    | ui/horror › limits the fake glitch…; e2e desktop-horror › glitch has no words / Reduce flashing                                                                           |
    | desktop/horror › figure only at its beats, after the night-4 cut                | desktop/horror › never appears on night 1 (other beats arrive with R3)                                                                                                    |
    | desktop/horror › phone held up and plays the message; face down / pillow / dies | desktop/horror › is picked up, plays tonight's message…; lies under the pillow on night 4 and dies at 3:17 on night 5                                                     |
    | desktop/horror › shows the story's 3:17                                         | desktop/horror › shows the night's clock, or the player's own after midnight on night 1                                                                                   |
    | audio/transitions › ending commit + atomic save                                 | audio/transitions › an ending plays out, then commits…                                                                                                                    |
    | audio/controller › no stacked breathing on a refreshed voice node               | audio/engine › keeps recorded breathing as one layer across rapid voice beats; controller › listening once per hold                                                       |
    | audio/positions › landing step, overhead, wardrobe                              | audio/positions › every sound a night names plays from a real place; night-4 step and wardrobe                                                                            |
    | mobile/stills › resolves every story scene                                      | mobile/stills › resolves every viewpoint on every night before and after the cut                                                                                          |
    | save › walks migrations up to SAVE_VERSION                                      | save › migrates a v1 story-graph save…; takes the night from the old node id                                                                                              |
    | e2e text-presenter (whole file)                                                 | Removed with the text presenter (REDESIGN §2); the debug overlay is its replacement                                                                                       |
    | e2e mobile-playthrough                                                          | e2e qa › fast route plays every night and reaches ending A/B/C (runs on small-android)                                                                                    |
    | e2e mobile-scenes › scenes, hotspot bounds, peephole, hold cancel, glyphs       | e2e mobile-scenes › viewpoints, hotspot bounds, wall listening, pause and glyph evidence                                                                                  |
    | e2e desktop › pointer lock, movement, flashlight, pause, keyboard choices       | e2e desktop › night 1 begins on the dark landing: walk, pointer lock, torch, pause; real-input endings A/B/C                                                              |
    | e2e desktop › drag look, E on the clock, corridor grows                         | e2e desktop › drag look, E picks up the phone; corridor stretch deferred to R3 (item 70); unit quality.spec › grows the corridor                                          |
    | e2e desktop-horror › late-night line, absence line, real 3:17                   | e2e desktop-horror › same three, without narrator lines                                                                                                                   |
    | e2e desktop-horror › mobile return puzzle, voice-reveal chat                    | Deferred to R3/R5 (item 70)                                                                                                                                               |
    | e2e desktop-horror › clock outside the frustum, mirror lag                      | e2e desktop-horror › the clock moves only while unseen; the mirror turns half a second late                                                                               |
    | e2e qa › closing the tab keeps the exact node                                   | e2e qa › closing the tab mid-night keeps the night, the profile and what the player did                                                                                   |
    | e2e audio, mobile-hd, desktop-performance, shell, boot, mode-routing            | Same titles, driven through the Director (setClock, startNight, playSequence, emit) instead of goTo                                                                       |

72. **Furniture is culled by flat and room; heavy multi-part models get a software LOD.**
    three.js has no occlusion culling. From night 1's landing, both flats' furniture was drawn
    through the walls: 379 calls, 231k triangles, 34 FPS on software GL, and the quality
    monitor dropped to the low tier. Now a flat's furniture is drawn whole from inside it.
    From outside, only its hall, corridor and room are drawn, and only while its entrance
    leaf is open (Doors reports the real angle). The software LOD also reduces the parts of
    models over 30k triangles in total (the shelf of books was 67k). The landing now runs at
    60 FPS at the high tier. The furniture and Rustam's parts are drawn once, unculled,
    in their first frames, so nothing uploads to the GPU later (no hitch when a room or his
    keys first appear, and no resource growth across night transitions).
73. **One kitchen chair, not two.** With two chairs on the table's side, the strip in front of
    the fridge and washer was 14 cm wide for a 20 cm player radius. The stove, and night 1's
    kettle, could not be reached. The R2 playthrough found it. The one chair is centred on
    the table's side (z 1.5), which suits a renter living alone. The mobile kitchen still
    still shows two chairs until the stills are rendered again (R5).
74. **The player gets up from the sofa when the night takes time back.** Lying down blocks
    movement, so the "any movement wakes" rule never fired, and the 3:16 beat reset the time
    scale without a sit-up. The player stayed on the sofa through 3:17. Now any return to
    normal time sends `sitUp`, and a movement key counts as moving while lying. Found by
    the R2 playthrough; a unit test covers it.
