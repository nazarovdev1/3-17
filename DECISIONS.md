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
