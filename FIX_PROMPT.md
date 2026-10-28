# FIX PROMPT — "3:17" quality rebuild

## 0. Context — read this first

This folder contains "3:17", a psychological horror game built from `PROMPT.md`. The engine, story graph, save system, Telegram adapter and test setup exist. **The result failed.** The owner played it and reported:

1. **Mobile:** the flat and its details are unreadable — you cannot tell what you are looking at. The layout is broken ("everything is falling apart").
2. **Desktop 3D:** objects are scattered randomly, overlapping, with no spatial logic. It does not look like a real flat.
3. **Characters look like cubes.** Nothing is scary. It looks like a cartoon, not horror.
4. **Uzbek text is badly written** — unnatural, hard to understand, reads like a machine translation.
5. **The story has no psychological depth**, especially the ending. It does not make you anxious or think.
6. Expected: HD, crisp, realistic, frightening, anxiety-inducing. Got: a low-res cartoon that a player would close within 10 seconds.

Root causes (be aware of them, do not repeat them): the original spec forced a low-res PS1 look, primitive geometry only, procedural pixel art on mobile and zero external assets. **This prompt overrides those parts of `PROMPT.md`.** Where this prompt and `PROMPT.md` conflict, this prompt wins. Everything in `PROMPT.md` that is not contradicted here (architecture, engine, story data model, save system, Telegram integration, testing discipline, content limits, debug tools) stays in force.

You are a senior game developer, environment artist, horror designer and narrative designer. Quality bar: a player who opens this on a laptop or a phone should feel uneasy within the first 30 seconds and want to keep going.

### Working rules

- Work in the phases of section 10. At the end of each phase: all checks green, `PROGRESS.md` updated, commit, then **stop and show the owner screenshots** of what changed.
- Keep `npm run check` and the existing test suite green throughout. Extend tests, do not delete them to make things pass.
- Look at your own screenshots (read the image files) after every visual change. Never claim something looks good without having looked at it.
- If you are unsure whether something is scary or readable, assume it is not, and improve it.

## 1. Phase F0 first: honest audit (no fixing yet)

1. Run the game. Capture screenshots of every location and every story beat in both modes (desktop 1440×900, mobile 390×844 and 360×640).
2. Write `AUDIT.md`: for each screenshot, what is wrong (readability, scale, placement, lighting, mood, text, layout), using the rubric in section 9. Be brutal and specific.
3. Read the full Uzbek script and list language problems with examples.
4. Write the fix plan mapped to the phases below.
5. **Stop. Show the audit and plan. Wait for the owner's approval before changing code.**

## 2. New art direction (overrides the PS1 / pixel style)

- **Realistic, HD, crisp.** Native resolution rendering, no pixelation, no nearest-neighbour upscaling, no pixel fonts. Use device pixel ratio up to 2 on high tier.
- **Physically based:** `MeshStandardMaterial` / `MeshPhysicalMaterial` with real PBR texture sets (albedo, normal, roughness, AO). Filmic tone mapping (AgX or ACES), correct sRGB output.
- **Lighting is the horror.** Darkness must be readable, not black. The player should always be able to make out shapes, and the frightening thing should live at the edge of visibility. Sources: a weak warm ceiling bulb before the outage, cold moonlight and orange streetlamp through the window, the flashlight after 3:17 (shadow-casting spotlight with a cookie/gobo texture), the TV's blue glow. Use real shadows, ambient occlusion (N8AO or SSAO), subtle bloom on light sources, volumetric-looking dust in light beams, and distance fog.
- **Post effects, restrained:** light film grain, vignette, slight chromatic aberration only at low sanity, motion blur off by default. No scanlines.
- **Palette:** desaturated, cold. Warm light only from the bulb and the streetlamp. No bright saturated colours anywhere. No cartoon outlines.
- **Typography:** a clean, highly readable serif or sans for narration (e.g., a good OFL font self-hosted via `@fontsource`), minimum 17 px on mobile, comfortable line height, strong contrast on a dark translucent panel. Verify ʻ (U+02BB) and ’ (U+2019) render.
- **References for mood** (do not copy assets): P.T., Visage, Silent Hill 2 interiors, Soviet panel-flat photography. Real, lived-in, slightly dirty, quiet.

## 3. Asset policy (overrides "no external assets")

Real assets are now required. Download them during development, optimise them, and bundle them. At runtime still no requests to external domains except Telegram's script.

- **Allowed licenses:** CC0 (preferred), CC-BY (with attribution). Mixamo is allowed for one humanoid figure and its animations. **Forbidden:** CC-NC, CC-ND, unknown licenses, ripped game assets, cartoon/low-poly stylised packs (no Kenney, no Quaternius, no "low poly" kits).
- **Sources:** Poly Haven (models, PBR textures, HDRIs — has an API), ambientCG (PBR textures — has an API), Sketchfab CC0/CC-BY realistic models, Freesound (CC0/CC-BY sounds), Sonniss GDC royalty-free bundles for sound.
- Every asset gets an entry in `CREDITS.md` (name, author, source URL, license) and the credits are shown in the game's settings screen.
- **Pipeline:** `scripts/assets/` downloads assets reproducibly; `gltf-transform` optimises models (meshopt or Draco, deduplicate, resize textures, KTX2/Basis where possible, otherwise WebP). Texture resolution: 2K for hero objects, 1K for the rest, 512 for small props.
- **Size budgets:** desktop total ≤ 60 MB, with flat 47 playable after ≤ 25 MB (load stairwell and flat 48 in the background). Mobile stills ≤ 10 MB total, loaded per night.
- Show a diegetic loading screen with real progress (e.g., the landlord's key ring and a progress line), never a frozen page.

## 4. Desktop rebuild: a flat that makes sense

### 4.1 Floor plan first

Before placing anything, write `content/world/layout.ts`: a real floor plan of a Soviet one-room flat in a 9-storey panel building, in **metres**, with coordinates for every wall, door and window. Approximate realistic sizes: total ~33 m²; room ~17 m²; kitchen ~7 m²; combined bathroom ~3.5 m²; corridor ~1.2 m wide; ceiling 2.6 m; interior doors 0.8 × 2.0 m; entrance door 0.9 × 2.05 m; window sill at 0.9 m. Add the 4th-floor stairwell landing (doors 46, 47, 48, 49, the lift, the stairs, a window) and flat 48 as a mirrored, decayed copy of 47.

Also produce `docs/floorplan.svg` (top-down plan with every object labelled) and include it in the phase screenshots.

### 4.2 Every object has a reason and a place

Each object in `layout.ts` declares: room, position, rotation, real-world size, what it stands on or is mounted to, and its story purpose. Furnish like a real person lives there: sofa-bed, wardrobe, wall carpet above the sofa, old CRT TV on a stand, table with two chairs in the kitchen, gas stove, fridge, sink, kettle, shoe rack and coat hooks in the corridor, bathtub, sink, mirror cabinet, washing machine, radiators under windows, light switches by every door at 1.0 m height. Clutter belongs where people leave clutter.

### 4.3 Placement validator (automated test)

`npm run validate:world` fails if: any object's bounding box intersects a wall or another object (except declared containment, e.g., a kettle on a stove); anything floats (not resting on floor, furniture or a wall mount within 2 cm); anything is outside its room; any object's scale deviates from its declared real-world size by more than 10%; any doorway is blocked; the player capsule cannot walk from the entrance to every room (navigation check on a grid). Add it to `npm run check`.

### 4.4 The figure — no cubes, ever

Primitive humanoids are forbidden. Use one realistic humanoid model (Mixamo or CC0/CC-BY), rigged, with a few animations (standing still, slow head turn, step back). Horror rule: **the figure is never fully seen in good light.** Show it only as: feet shadows in the gap under the entrance door; a silhouette behind the frosted glass of the kitchen door; a backlit shape at the far end of the stairwell; a figure through the fisheye peephole, first with its back turned, later facing the door, too close; a reflection in the dark TV screen that is not in the room when you turn around. Keep it dark, backlit, partially occluded, and gone within seconds.

### 4.5 Interaction feel

Smooth first-person movement with slight inertia, realistic footsteps per surface, interaction prompt that appears only when looking at an object within 1.5 m, objects that can be picked up rotate in the hand for inspection (diary pages readable in HD), doors that open with physical animation and sound.

## 5. Mobile rebuild: pre-rendered HD scenes

Drop the procedural pixel-art scenes completely. Mobile uses **pre-rendered stills of the same 3D world**, so both modes show the same flat.

- `scripts/render-stills.ts`: launch the desktop scene through Playwright in a special route (`?render=still&cam=<id>&state=<state>&quality=ultra`), wait until all assets are loaded and the frame is settled, capture at 1080×1920 portrait. Also render a depth pass for each camera.
- Define cameras per location and states per camera (lights on, power off with flashlight, changed variant for "things change when unobserved", figure present). Expect roughly 30–45 stills. Export WebP (quality ~80) and a small grayscale depth map.
- On the phone, each still is shown with: depth-based parallax driven by gyroscope (tiny WebGL2 shader, no Three.js; fallback to a gentle pan on touch-drag or if WebGL fails), slow push-in on tense moments, overlays for flicker, dust in light, breath of cold air, snow outside the window.
- Hotspots are positioned in the still's coordinate space and must sit exactly on the object. Add a test that every hotspot's rectangle lies inside the still and that hotspots never overlap.
- **Layout:** scene on top (about 58% of the height), narration panel below with readable text and large tap targets (≥ 48 px). Safe areas respected. No overlapping, no text cut off. Test at 360×640, 375×667, 390×844, 412×915, 430×932 — screenshot every one.

## 6. Story rewrite: deep, personal, Uzbek

### 6.1 The theme

Psychological horror works when the monster is about something real. Keep the setting (Chilonzor, flat 47, the wall of 48, 3:17, the stopped clock), but give it a core:

**The player is a young person who moved to Tashkent from a region, alone, working and studying, sleeping badly, slowly cutting themselves off from everyone.** Their mother keeps calling. They keep not answering. Flat 48 is what loneliness becomes when you let it in.

Weave it in through the phone that lies on the table every night: missed calls from "Onam" rising night by night (e.g., 3 → 11 → 24 → 40), unread voice messages the player can choose to listen to or ignore. On night 4 the voice behind the wall starts speaking with words from those messages ("Bolam, nega telefonni olmayapsan?"). That is the moment the game turns from creepy to devastating.

**Keep reality ambiguous.** Plant evidence for both readings: the supernatural (Sardor's diary, Muhabbat opa's story, the sealed door) and the psychological (insomnia, days blurring, the player's own handwriting in places they don't remember writing). Never confirm which is true.

**The voice's arc:** polite "siz" on nights 1–2; switches to "sen" on night 3 without comment (the player should feel the shift); on night 4 it speaks in the mother's words; on night 5 it speaks in the player's own words from earlier choices.

### 6.2 Endings, rewritten with meaning

- **A — "Qoʻshni":** the player opens the door at 3:17. They become the voice. Final scene: a new young tenant moves into 47; the phone on their table lights up with a call from their own mother; the player knocks on the wall. Message: loneliness passes itself on.
- **B — "Ketish":** the player leaves before 3:17 and walks into the snowy street. Relief. Then their phone buzzes: a missed call from "Onam", and they still don't call back. The last line shows that running from a place is not the same as running from yourself.
- **C — "3:18" (hidden):** all 7 diary pages, sanity ≥ 40, never answered the voice on night 3, **and listened to all of the mother's voice messages.** The player winds the clock; it shows 3:18 for the first time; the knocking stops; the player picks up the phone and calls their mother. Black screen. Only her voice, as text: "Alo… bolam?" Credits. Quiet, earned, human.

Content limits from `PROMPT.md` still apply: no suicide or self-harm themes, no gore. Sadness and loneliness, yes. Hopelessness as a message, no.

### 6.3 Uzbek language rules

All Uzbek text moves into human-editable files: `content/text/uz/night-1.yaml` … `night-5.yaml`, `endings.yaml`, `ui.yaml`, keyed by line id. The owner (a native speaker) will edit these files directly; the validator must catch any missing or extra keys.

Writing rules:

- Narration: modern literary Uzbek, but plain and short. Max ~14 words per sentence on average. Dialogue: natural colloquial Tashkent speech.
- **Show, don't tell.** Forbidden clichés: "yuragim tez ura boshladi", "sovuq ter bosdi", "qoʻrquv meni qamrab oldi", "dahshatli", "vahimali", "sirli". Describe what is seen and heard, never name the feeling.
- **No calques** from English or Russian. Examples of what to avoid and what to write instead:
  - "Men oʻzimni yomon his qilyapman" → "Koʻnglim gʻash."
  - "Menda bir savol bor" → "Bir narsa soʻrasam maylimi?"
  - "Bu juda qoʻrqinchli edi" → describe the thing instead and let the player be scared.
  - "Siz qanday qilib bu yerga keldingiz?" → "Bu yerga qanday kelib qoldingiz?"
- Characters sound different: Muhabbat opa is warm, talkative, a little nosy ("Voy, bolam, oʻsha qirq yettiga koʻchdingmi? Ehtiyot boʻl…"); Rustam aka is short and evasive; the mother's messages are simple, loving, worried; the voice is calm and too familiar.
- Correct characters: ʻ (U+02BB) in oʻ, gʻ; ’ (U+2019) for tutuq belgisi.

`npm run lint:text` fails on: Cyrillic letters; English words; wrong apostrophes (`'`, `` ` ``, `ʼ` in the wrong place); any forbidden cliché; sentences over 25 words; the same 4-word phrase repeated more than twice across the script. Add it to `npm run check`.

Generate `SCRIPT_UZ.md`: the full script in reading order (night by night, with node ids, speakers and choices) for the owner to read like a book. Regenerate it whenever text changes.

## 7. Fear design

Write `docs/fear-design.md` before scripting events, with a tension curve for each night (quiet → unease → build → peak → release) and the exact events at each point.

Rules:

- Silence is a tool. The fridge hum stopping at 3:17 should be more frightening than any monster.
- Maximum one jump scare per night, and it must be earned by at least two minutes of build-up.
- Things change when not observed (frustum check on desktop, revisit on mobile): a chair moved, a door now ajar, the phone face down, a coat on the hook that isn't the player's.
- Sound from where it shouldn't be: footsteps above when the flat above is empty, a knock from inside the wardrobe, breathing on the other side of the wall when the player holds to listen.
- The game knows the player: profile answers, real local time, returning after quitting, the player's own earlier choices quoted back.
- Never show the threat clearly (section 4.4).
- Forbidden: cartoonish monsters, bright red "blood" text, screaming faces, cheap loud stingers without build-up.

## 8. Audio overhaul

Replace the synthesized one-shots with real recorded sounds from the allowed sources: footsteps on linoleum, parquet, tiles and concrete; old door hinges and chain; radiator knocks; fridge hum; kettle; distant city winter ambience; wind against old window frames; muffled TV from a neighbour; knocks on a panel wall; cloth rustle; breath. Keep the procedural drone only as a low layer. Spatial audio (HRTF panning) on desktop, recommend headphones. Loudness-normalise all sounds. Add a short "headphones recommended" hint at the start.

## 9. Visual quality gate (screenshot rubric)

For every screenshot, score 1–5 on each axis and record the scores in `QA.md`:

- **Readability:** can a stranger tell which room and which object this is within 2 seconds?
- **Spatial logic:** realistic scale, nothing floating or intersecting, furnished like a real home.
- **Lighting and mood:** dark but legible; not more than ~60% of pixels near pure black; the key subject is visible.
- **Fear:** is there tension, something slightly wrong, something at the edge of sight?
- **Polish:** no z-fighting, stretched textures, clipping, aliasing shimmer, cut-off text, overlapping UI.

Anything scoring below 4 on any axis must be fixed before the phase ends.

## 10. Phases

- **F0 — Audit and plan.** Section 1. Stop for approval.
- **F1 — Story and language.** Theme, new beats for all 5 nights, rewritten endings, YAML text files, `lint:text`, `SCRIPT_UZ.md`. Play the whole story in the text presenter. Stop: the owner reviews `SCRIPT_UZ.md`.
- **F2 — Asset pipeline.** Download scripts, optimisation, `CREDITS.md`, loading screen, budgets enforced.
- **F3 — Desktop flat rebuild.** Floor plan, `floorplan.svg`, furnished flat 47, stairwell, flat 48, `validate:world`, PBR materials, lighting, post effects. Stop with screenshots.
- **F4 — Desktop horror.** Figure, scripted events per `fear-design.md`, interaction feel, phone and voice messages.
- **F5 — Audio.** Section 8.
- **F6 — Mobile.** Stills pipeline, depth parallax, hotspots, new layout, all 5 screen sizes. Stop with screenshots.
- **F7 — Fear pass.** Play every night in both modes, adjust pacing against the tension curves, apply the rubric to every screenshot.
- **F8 — Full QA.** Entire test suite, performance (desktop ≥ 55 FPS on a mid laptop at default tier with auto quality fallback; mobile ≥ 30 FPS under 4× CPU throttling), memory, budgets, Telegram and plain browser.

## 11. Definition of done

Done means: every rubric score is ≥ 4; `npm run check` (including `validate:world` and `lint:text`) and the Playwright suite are green; all three endings work in both modes; no primitive humanoids, no pixel art, no cartoon look anywhere; every asset is credited; and the owner has approved the screenshots and the Uzbek script.
