# AUDIT — Phase F0 (honest audit of the current build)

Date: 2026-10-26 · Build: `main` @ `4b52065` · Auditor: Claude (as senior dev / env artist / horror & narrative designer)

**No game code was changed in this phase.** The only additions are this file and the audit capture
tooling in `audit/` (`capture.spec.ts`, `playwright.audit.config.ts`). It runs separately from the
regular suite: `npx playwright test -c audit/playwright.audit.config.ts`.

## 0. How the evidence was captured

| Set          | Viewport        | Count                                                          | Folder                            |
| ------------ | --------------- | -------------------------------------------------------------- | --------------------------------- |
| Desktop 3D   | 1440×900, DPR 1 | 115 (shell + 78 story nodes + 8 locations × 4 look directions) | `audit/screenshots/desktop-1440/` |
| Mobile       | 390×844, DPR 2  | 82 (shell + 78 story nodes)                                    | `audit/screenshots/mobile-390/`   |
| Mobile small | 360×640, DPR 2  | 82                                                             | `audit/screenshots/mobile-360/`   |

Each story node was reached with `window.__game.goTo(id)`, then the typewriter text was skipped. The
files are named `NNN-<nodeId>.png`, so each one maps straight to the script. Every image was opened
and looked at, in contact sheets and then at full size for the representative ones cited below.

Capture notes (these are findings too):

- **Desktop fell back to mobile mode mid-capture** on the first run, when 3 browsers shared the CPU
  (`05-look-n4_inside48-270.png` in the first run showed the "Tasvir yengil rejimga oʻtdi" toast). The
  auto-fallback works, but it also fires on an ordinary busy machine. The second run used one worker
  and stayed in 3D.
- The desktop `00-warning.png` caught "Yuklanmoqda…" on a black page, so the first paint on desktop
  is a frozen-looking loader with no progress.
- The debug overlay seen on the title/settings/form shots comes from my `?debug=1` and is not a bug.

## 1. Rubric scores (section 9 of FIX_PROMPT, 1–5)

Scores are given per **group of screenshots that share one camera/scene**, because the build re-uses
the same frame for most beats (that itself is a finding, see D-2). Every group fails the ≥ 4 gate.

| Group (example files)                                                | Read. | Spatial | Light/mood | Fear | Polish |
| -------------------------------------------------------------------- | ----- | ------- | ---------- | ---- | ------ |
| D: room, lights on (`011-n1_hub`, `05-look-n1_hub-*`)                | 2     | 2       | 2          | 1    | 2      |
| D: room after 3:17 (`019-n1_317`, `049-n3_317`, `082-n5_317`)        | 2     | 2       | 1          | 1    | 2      |
| D: window / opposite building (`016-n1_window`, `018-n1_316`)        | 2     | 1       | 2          | 2    | 2      |
| D: kitchen (`017-n1_tea`, `05-look-n1_tea-*`)                        | 1     | 1       | 1          | 1    | 1      |
| D: bathroom / mirror (`033-n2_mirror`, `05-look-n2_mirror-*`)        | 1     | 1       | 1          | 1    | 1      |
| D: corridor & front door (`043-n3_corridor_loop`, `079-n5_chain`)    | 3     | 2       | 2          | 1    | 2      |
| D: stairwell + Muhabbat opa (`025`–`028`, `05-look-n2_day_start-*`)  | 1     | 1       | 2          | 1    | 1      |
| D: peephole + figure (`059-n4_peephole`)                             | 3     | 2       | 3          | 1    | 2      |
| D: flat 48 (`063`–`072`, `05-look-n4_inside48-*`)                    | 1     | 1       | 1          | 2    | 1      |
| D: endings (`085-endA`…`087-endC`)                                   | 3     | –       | 1          | 1    | 2      |
| M: room (`mobile-*/011-n1_hub`)                                      | 1     | 1       | 2          | 1    | 2      |
| M: kitchen (`017-n1_tea`)                                            | 2     | 1       | 2          | 1    | 2      |
| M: bathroom (`033-n2_mirror`)                                        | 1     | 1       | 2          | 1    | 2      |
| M: wall / voice (`020-n1_knocks`, `050-n3_voice_repeat`)             | 1     | –       | 2          | 2    | 2      |
| M: stairwell (`025-n2_day_start`)                                    | 2     | 1       | 2          | 1    | 2      |
| M: corridor (`043-n3_corridor_loop`)                                 | 2     | 1       | 2          | 1    | 2      |
| M: peephole (`059-n4_peephole`)                                      | 1     | –       | 2          | 1    | 2      |
| M: flat 48 (`063-n4_inside48`)                                       | 1     | 1       | 2          | 1    | 2      |
| M: 360×640 text panel (`mobile-360/010-n1_start`, `032-n2_wardrobe`) | 2     | –       | –          | –    | 1      |
| Shell: warning / title / form / settings                             | 3     | –       | 2          | 1    | 3      |

Measured darkness (share of pixels with luminance < 20/255):

- Desktop scenes: median **16 %**. The desktop is not too dark. It is **flat grey**: one ambient
  level, no contrast and no edge of visibility.
- Mobile: median **54 %**, but the scene is a small pixel box and the dark part is mostly empty panel.

## 2. Desktop findings (the owner's complaints 2, 3 and 6, confirmed)

**D-1. Nothing reads as a real object.** At 1440×900 the room (`05-look-n1_hub-0.png`) contains:

- A **flat beige disc with two black ticks** (the clock). It has no numerals, no case and no glass.
- A **window that is a grey slab** with a black hole in it.
- A **white box floating in front of the window** (the radiator). It is not under the sill and not
  mounted.
- A **red box with a keyboard-like texture** (the sofa-bed / blanket).
- A **pixel-dithered disc on the ceiling** (the lamp).

The wallpaper pattern is tiled at roughly 3× real scale, which makes the walls look like a toy house.

**D-2. One camera per location, reused for every beat.** Nodes `n1_hub` → `n1_clock` → `n1_note` →
`n1_radiator` → `n1_tv` → `n1_317` → `n1_knocks` → `n1_answer` … all show the **same frame**. Only the
text changes. When you read "the clock", you are not looking at the clock. The power cut at 3:17
(`019-n1_317`) looks almost identical to the lit room: same grey, with one extra flashlight blob.
**The game's key moment has no visual event.**

**D-3. No spatial logic.**

- From the room you look straight down a corridor into a blue void with two light switches floating
  at different heights (`05-look-n1_hub-270`).
- The kitchen (`05-look-n1_tea-*`) is a grey tower block (the fridge?) and a crumpled white shape on
  the floor (the stove?). There is no table, sink or window, and no sense of a 7 m² room.
- The bathroom (`05-look-n2_mirror-*`) is a pale-green grid of tiles with a blue square (the mirror)
  hovering in the middle of the wall and a black square elsewhere. There is no bathtub, sink or
  washing machine.
- The window view (`016-n1_window`) shows orange rectangles scattered at random heights next to a
  floating orange pole (the streetlamp). It does not read as a nine-storey building across a yard.
- Doors have no frames and no thickness. The light switches are at 1.45 m (`layout.ts` `SWITCHES`); the spec says 1.0 m.

**D-4. The flashlight is the ugliest thing on screen.** It is an over-exposed white circle with
dithered edges, and it lands on walls at 50 cm (`05-look-n2_mirror-180`, `05-look-n1_tea-270`). It
does not light a cone of space. It pastes a sticker.

**D-5. Characters are primitives.**

- **Muhabbat opa is a cone on a sphere on a green box, holding a yellow disc** (`026-n2_muhabbat_talk`).
  It reads as a table lamp next to door 47. This is the exact "cubes" complaint.
- The **figure in the peephole is a black capsule with a ball on top**, centred and lit from behind
  like a lollipop (`059-n4_peephole`).
- There is no figure anywhere else: none under the door, behind glass, in the stairwell or in the TV.

**D-6. The stairwell is a fog box.** In `05-look-n2_day_start-90/180/270` every direction except door
47 is the same grey wall with the flashlight disc on it. There are no stairs, lift, window or other
doors (46, 48, 49).

**D-7. Flat 48 is a black screen** with a flashlight disc, a clock disc and some dark vertical sticks
(`063`–`072`). The text says "an exact copy of 47, decayed". The image shows nothing that proves it,
and there is no calendar or passport you can actually see.

**D-8. Image quality.**

- The PS1 low-res render plus nearest-neighbour upscale gives blocky aliasing on every edge.
- Textures are canvas-generated pixel patterns.
- There are no PBR materials, no real shadows and no AO, so everything looks pasted on.
- The film grain plus pixelation makes text-sized details (the note, the calendar) unreadable.

**D-9. The HUD fights the scene.**

- The controls card stays open in the top-left of **every** desktop screenshot.
- The narration panel covers the bottom 25–30 % of the view with up to 7 choice buttons
  (`011-n1_hub`).
- The status chips "Sifat: past / Chiroq: yoqilgan · F" read like a debug readout.
- Story choices appear as a menu instead of being things you do in the world, which breaks the
  first-person fantasy.

**D-10. The endings** (`085`–`087`) are a 90 px thumbnail of the **mobile pixel vignette**, an orange
Oswald title with a glow, and a block of monospace text in the middle of a black 1440 px page. There
is no scene, no final image and no sound cue. Ending A's last beat (the new tenant) is told, not
shown.

## 3. Mobile findings (the owner's complaints 1 and 6, confirmed)

**M-1. The room scene cannot be read** (`mobile-390/011-n1_hub.png`, full size):

- A brown **oval blob** fills the back wall (the wall carpet, drawn as an egg).
- The sofa is drawn as **vertical bars**, which read as a radiator or a crib.
- A second set of bars in the foreground floats in the middle of the floor (a radiator? a chair?).
- The clock sits **in front of the window** at sofa height.
- The TV floats on a dark slab.
- The wardrobe has "IIII" on it.

A stranger cannot name the room or a single object in 2 seconds. Hotspots are faint white dots that
are almost invisible.

**M-2. One drawing per location, reused across all five nights.** `room` is the same picture for about
40 beats. Nothing visibly changes, except the "shifted" variant in night 3, where the clock moves a few
pixels. The rule that "things change when unobserved" is not visible on mobile.

**M-3. Scenes that are just symbols.**

- The wall/voice scene (`020-n1_knocks`, `035-n2_listen`, `050`–`053`) is **concentric rings on
  striped wallpaper**, like a Wi-Fi icon.
- The peephole (`059-n4_peephole`) is a grey ellipse with nothing inside. The text says someone in a
  coat is standing there; **the image shows no one**.
- The bathroom (`033-n2_mirror`) is a toilet-sign pictogram in a teal rectangle above a black slab.
- The corridor (`043-n3_corridor_loop`) is a door at the end of a navy box with a **red cone on the
  floor**, which reads as blood or a road cone.

**M-4. Muhabbat opa does not exist on mobile.** The stairwell (`025`–`028`) shows a door, grey steps
and a black square. The talkative neighbour you are speaking to is not in the picture.

**M-5. Flat 48 = the room, darker, with a red-lined poster** (`063`–`072`). It does not feel like a
different place, and it does not feel like decay.

**M-6. Layout breaks at 360×640.**

- `mobile-360/010-n1_start.png`: the narration overflows the panel, the last line is cut off by the
  screen edge, and there is **no visible Continue button and no scroll hint**.
- The same overflow happens at 360 in `027-n2_ask_48`, `028-n2_ask_sardor`, `032-n2_wardrobe`,
  `060-n4_diary6`, `066-n4_belongings`, `078-n5_clock` and `080-n5_diary7`.
- The 4th choice in `076-n5_hub` is cut off.
- At 390 the wardrobe text (`mobile-390/032-n2_wardrobe`) also runs into the button area.
- On the endings, the text is clipped inside a scroll box with a tiny "Matnni pastga surib oʻqing"
  hint (`086-endB`).

**M-7. The voice chat overlay** (`050-n3_voice_repeat`, `083-n5_voice_final`) stacks small bubbles at
the top of the scene. The narration panel below is **empty**, so the most important lines sit in the
smallest type, over the art.

**M-8. Hub screens hide the real choices.** In `011-n1_hub` only "Oshxonada choy damlash" and
"Uxlashga yotish" are buttons. Everything else is behind almost invisible hotspots, with the hint
"Yaltirayotgan joylarni bosing". On a 360 px screen a player will not find the clock, note, radiator,
TV or window.

**M-9. Typography.**

- IBM Plex Mono at 16 px (default text size M; S is 13 px) is below the 17 px minimum. The panel stays readable
  but feels like a terminal, not a story.
- **ʻ (U+02BB) renders as a raised acute with a gap** ("boʻsh" looks like "bo´sh"). This hurts every
  third word in Uzbek.
- The voice and player lines differ only by colour (orange); there are no speaker cues.
- The landlord's rule in `010-n1_start` looks exactly like narration.

## 4. Shell findings

- **Warning:** a sensible text, but it sits in a dark box in a black void. It sets no mood. The
  desktop first paint is a frozen "Yuklanmoqda…".
- **Title:** an orange "3:17" in Oswald with a glow, a subtitle and three bordered buttons. It has
  **no image**. The spec's window-from-outside-in-snow title scene is missing. "Tugamlar" is not an
  Uzbek word (see §5). The line "rejim: telefon (2D)" is a debug detail.
- **Form:** functional, but plain HTML chips. It does not look like a paper rental form.
- **Settings:** "BOBKLAR" (typo) in the pause menu. "Bosh silkinishi (koʻchish rejimi)" is a calque
  that a player won't understand. There are no credits yet; FIX_PROMPT requires them.

## 5. Uzbek script — language audit

The source is the full dump of all 78 nodes: 257 lines, about 2,100 words. I read it start to finish.

### 5.1 Systemic problems

1. **Telegraphic fragments.** The average sentence is **3.4 words**. "Uch zarba. Aynan uch. Har tun —
   aynan uch." Used everywhere, it stops being tense and reads like a robotic translation. Good Uzbek
   prose needs rhythm: short sentences _between_ normal ones.
2. **Telling instead of showing.** The narrator names the meaning after every image:
   - "Siz savol bermadingiz. U buni javob deb hisobladi."
   - "Qorongʻilik siz tomonga yaqinlashmoqda."
   - "Bu javob ma’nosiz edi. Va butunlay aniq."
   - "Ertaga — oxirgi kecha. Buni uy ham, siz ham bilasiz."
3. **The diary explains the mystery and kills the ambiguity:**
   - "48 — bu 47. Faqat eski."
   - "Agar u sening ovozing bilan gapirsa — bu u emas. Bu sen boʻlib qolgan narsa."
   - "Soat 3:17 — uyning chiqish vaqti."

   By night 3 there is nothing left to wonder about.

4. **Siz/sen is chaotic, not designed.**
   - The voice uses "siz" in nights 1–2, slips to "sen" in the middle of `n3_voice_repeat` ("Muhabbat
     opa **seni** ogohlantirdi"), goes back to "siz" in `n5_voice_final`, then "sen" again.
   - Muhabbat opa mixes both in one breath ("Yangimisiz? Kel, kel, halva ol").

   FIX_PROMPT wants one deliberate switch on night 3.

5. **Repetition.** In 2,100 words: "faqat" ×20, "sizniki" ×14, "hozircha" ×7, "jimlik" ×7, "xuddi" ×7,
   "uch zarba" ×5, "uy kutadi" variants ×5. "…shunday emasmi?" (a calque of Russian «не так ли?») ×2.
6. **No emotional core.** There is no mother, no phone, no loneliness theme and no life outside the
   flat. The player character is a camera, so the endings have nothing to land on.
7. **Clichés** (from the FIX_PROMPT forbidden list, or right next to it):
   - "Shunday jimlikki, quloqlaringizda qon shovullaydi"
   - "Yuragingizning urishi sekinlashdi" (`endB`)
   - "Baribir eshitaman: yuragingiz" (`n1_silent`)

### 5.2 Line-level problems (examples, not exhaustive)

| Node          | Current                                                                           | Problem                                                                | Direction                                               |
| ------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| n1_start      | "Bitta qoida bor, **oʻrtoq**"                                                     | Soviet «товарищ»; no Tashkent landlord talks like this                 | "Bitta shartim bor, uka/singlim" or no address at all   |
| n1_hub        | "**Radiatore** yaqinlashish"                                                      | Typo / wrong case                                                      | "Radiatorga yaqinlashish"                               |
| n1_tv         | "faqat **oq shovqin**"                                                            | Calque of "white noise"                                                | "ekranda faqat «qor», shitirlaydi"                      |
| n1_answer     | "Yolgʻiz ovoz — yaxshi ovoz."                                                     | Meaningless aphorism                                                   | Cut, or a concrete detail                               |
| n1_silent     | "Eshigingiz yopiq, bilaman. Baribir eshitaman: yuragingiz."                       | Broken syntax + cliché                                                 | Rewrite                                                 |
| n1_silent     | "Bundan keyin jimlik **odatlanib qoldi**."                                        | Silence can't "get used to"                                            | Rewrite                                                 |
| n2_day_end    | "Kunduz hali davom etmoqda."                                                      | Calque «день ещё продолжается»                                         | "Hali kun."                                             |
| n2_day_end    | "Lekin **bilib qoʻyadingiz**"                                                     | Wrong verb form                                                        | "bilasiz" / "bilib qoʻydingiz"                          |
| n2_listen     | "U sizni **eshitayotir**."                                                        | Archaic/bookish                                                        | "U ham sizni tinglayapti."                              |
| n2_sleep      | "Uy **sizga oʻrganayapti**."                                                      | Wrong verb (oʻrganmoq = learn)                                         | "Uy sizga koʻnikyapti."                                 |
| n2_voice_fear | "Unga **odatlaning**." / "kuzatayotganim **haq**, shunday emasmi?"                | Calques                                                                | "Koʻnikasiz." / rewrite                                 |
| n3_tea        | "**reallikning** eng oddiy dalili"                                                | Russianism + abstract                                                  | Concrete detail (the warm piyola)                       |
| n3_voice_echo | "Sen ham yutasan, yutqazsang."                                                    | Nonsense                                                               | Rewrite                                                 |
| n3_silent     | "**Normal** boʻlishi mumkin emas edi."                                            | Russianism + telling                                                   | Cut                                                     |
| n3_sleep      | "Dahliz endi **doʻst boʻlmaydi**."                                                | Calque                                                                 | Cut                                                     |
| n4_tea        | "Qoʻlingiz qanday iliq — siz buni sezib ololmaysiz endi."                         | Ungrammatical                                                          | Rewrite                                                 |
| n4_317        | "Uy kutganingizdek **tutdi**." / "sukut kutishga oʻxshaydi — eshigingiz oldidan"  | Calques, broken                                                        | Rewrite                                                 |
| n4_peephole   | "**Kozachok**. Barcha narsa burama, uchli, sariq."                                | "Kozachok" is not the word for a peephole; the description is nonsense | "Eshik koʻzi" / "koʻzcha"; describe the fisheye plainly |
| n4_peephole   | "Faqat oyoq iz. Qorda. Ichida, zinapoya maydonchasida, qor yogʻmayapti."          | Logic is broken                                                        | Rewrite (wet footprints on concrete)                    |
| n4_inside48   | "Faqat **oʻlik** 47."                                                             | Harsh calque                                                           | Show the decay instead                                  |
| n4_retreat    | "Eshikni berkitdingiz — u yopilmadi" / "Uy siz kutgan tartibda. Endi u tartibsiz" | Self-contradictions                                                    | Rewrite                                                 |
| n4_no_talk    | "Ertaga doim bor."                                                                | Calque                                                                 | "Ertaga gaplasharmiz."                                  |
| n5_hub        | "**Hozirqinoq** uydan chiqib ketish"                                              | Typo                                                                   | "Hoziroq…"                                              |
| n5_clock      | "Uy uni **bilmayapti**."                                                          | Wrong aspect                                                           | "bilmaydi"                                              |
| n5_diary7     | "**Kuta berdim**."                                                                | Spelling                                                               | "Kutaverdim."                                           |
| endC          | "Uch… oʻn sakkiz."                                                                | Not how a time is read                                                 | "Uch-u oʻn sakkiz."                                     |
| UI            | "**Tugamlar**", "Tugamlar galereyasi"                                             | Not a word                                                             | "Yakunlar"                                              |
| UI            | "**BOBKLAR**"                                                                     | Typo                                                                   | "BOBLAR" / "Tunlar"                                     |
| UI            | "Sarlavha ekraniga"                                                               | Calque of "title screen"                                               | "Bosh menyuga"                                          |
| UI            | "Bosh silkinishi (koʻchish rejimi)"                                               | Calque of "head bob"                                                   | "Yurganda kamera chayqalishi"                           |

### 5.3 What is worth keeping

- Rustam aka's rule.
- "Kim ismingizni aytsa ham — ochmang".
- The tally marks.
- The calendar ("Oxirgi chizilgan sana — kecha… Hali.").
- The TV showing you from above.
- Muhabbat opa's halva and "Sovib qolmasin".

These are good, concrete, local details. The rewrite should keep them and build on them.

## 6. Technical findings that affect the plan

- **T-1.** The desktop scene is built from primitives in `src/presenters/desktop/World.tsx` and
  `layout.ts` (143 lines, ad-hoc coordinates). There is no floor-plan model, so it cannot be fixed by
  tuning; it must be rebuilt from `content/world/layout.ts`.
- **T-2.** Mobile is the procedural Canvas 2D vignettes in `src/presenters/mobile/vignettes.ts`
  (400 lines). Per FIX_PROMPT this is **deleted and replaced**, not improved.
- **T-3.** The text lives in TS story files, not YAML. Story **logic** (the graph, flags, conditions)
  can stay; the **text** moves to `content/text/uz/*.yaml`.
- **T-4.** Existing E2E tests assert old Uzbek copy and pixel-vignette selectors (for example
  `/Kozachokka/`, `'Tugamlar'`, `.hotspot` bounds ≤ 352 px). They will be **updated alongside** the
  changes, keeping the same coverage. Nothing will be deleted to make things pass.
- **T-5.** Headless SwiftShader cannot measure the desktop FPS budget of a realistic PBR+AO scene
  honestly. The perf gate will need a headed Chrome on real GPU. Still rendering for mobile is fine
  in headless (it is offline).
- **T-6.** The 250 KB mobile JS budget is still fine. Asset budgets (60 MB desktop / 10 MB mobile)
  are new and need an asset-size check in `npm run budget`.

## 7. Fix plan (mapped to FIX_PROMPT §10)

### F1 — Story and language (stop: owner reviews `SCRIPT_UZ.md`)

1. `docs/fear-design.md`: a tension curve per night (quiet → unease → build → peak → release) with
   exact events, including one earned jump scare per night at most.
2. Rewrite the beats of all 5 nights around the new core: the player is alone in Tashkent, the phone
   shows missed calls from "Onam" (3 → 11 → 24 → 40), and there are voice messages the player can
   listen to or skip. The voice's arc is:
   - siz (N1–2)
   - a silent switch to sen (N3)
   - the mother's words (N4: "Bolam, nega telefonni olmayapsan?")
   - the player's own words (N5)
3. Plant evidence for **both** readings: the diary and the sealed door on one side; insomnia,
   blurred days and the player's own handwriting on the other. Cut every diary line that explains
   the rules.
4. Rewrite the endings A, B and C per §6.2. C adds "listened to all of mother's messages" and ends on
   "Alo… bolam?".
5. Engine and story data:
   - new flags and effects for the phone and messages, and the ending C condition
   - unit tests for every new condition
   - the story validator extended
6. Move all text to `content/text/uz/night-1…5.yaml`, `endings.yaml` and `ui.yaml`, keyed by line id,
   with a missing/extra key validator.
7. `npm run lint:text`:
   - Cyrillic and English words
   - wrong apostrophes
   - forbidden clichés
   - sentences over 25 words
   - 4-word phrases repeated more than twice

   Add it to `npm run check`.

8. Generate `SCRIPT_UZ.md` (reading order, node ids, speakers, choices).
9. Fix all UI strings (§5.2). Play the full story in the text presenter to every ending.

### F2 — Asset pipeline

1. `scripts/assets/` with reproducible downloads from the Poly Haven and ambientCG APIs (CC0); a
   manifest pins each asset and its license.
2. `gltf-transform` optimisation: meshopt, dedupe, KTX2 or WebP, and 2K/1K/512 texture tiers.
3. `CREDITS.md`, plus credits in Settings.
4. A diegetic loading screen (key ring + real progress line) that replaces the frozen
   "Yuklanmoqda…".
5. A budget check for asset sizes (60 MB desktop / ≤ 25 MB to playable / 10 MB mobile), added to
   `npm run budget`.
6. Self-hosted, readable narration font (`@fontsource`). It replaces IBM Plex Mono for body text,
   with a screenshot to prove that ʻ and ’ render properly. Candidates: Literata, PT Serif, Source
   Serif 4, Inter. Decide by test render.

### F3 — Desktop flat rebuild (stop with screenshots)

1. `content/world/layout.ts`: the real floor plan in metres. Flat 47 is about 33 m² (room 17, kitchen
   7, bath 3.5, corridor 1.2 m wide, ceiling 2.6 m). It also covers the 4th-floor landing (doors
   46–49, lift, stairs, window) and flat 48 as a mirrored, decayed copy.
2. `docs/floorplan.svg`, generated from `layout.ts`.
3. Furnish the flat per §4.2. Every object declares its room, transform, real size, support and story
   purpose.
4. `npm run validate:world`, added to `check`:
   - no intersections or floating objects
   - scale within ±10 %
   - doorways clear
   - the grid navigation check passes
5. PBR materials, AgX/ACES tone mapping, DPR ≤ 2, and native resolution (the PS1 pipeline removed).
6. Lighting:
   - a warm bulb
   - moonlight and the streetlamp through the window
   - a shadow-casting flashlight with a gobo
   - TV glow

   Plus N8AO, restrained bloom, fog, dust in the beams, light grain and vignette.

7. **Per-beat cameras / look targets**, so the scene shows what the text is about (fixes D-2), and a
   real visual power-cut event.
8. HUD cleanup (fixes D-9):
   - a world-space interaction prompt within 1.5 m
   - choices only at dialogue moments
   - the controls card auto-hides
   - debug chips hidden

### F4 — Desktop horror

1. One realistic rigged humanoid, shown only as:
   - feet shadows under the door
   - a silhouette behind frosted glass
   - a backlit shape in the stairwell
   - the peephole (back turned, then facing the door, too close)
   - a TV reflection
2. No primitive people anywhere. Muhabbat opa is heard and partly seen (door chain, a hand with the
   halva plate, a shadow) rather than modelled in full light.
3. Scripted events per `fear-design.md`: frustum-checked changes, sound from the wrong place, the
   fridge hum stopping.
4. Interaction feel: inertia, an inspect-rotate for pickups, HD-readable diary pages, physical doors.
5. The phone object with the missed-calls counter and voice messages.

### F5 — Audio

1. Recorded CC0/CC-BY sounds (§8), loudness-normalised, credited.
2. HRTF spatial audio on desktop.
3. A "headphones recommended" hint.
4. The procedural drone kept only as a low bed.

### F6 — Mobile (stop with screenshots at 5 sizes)

1. Delete `vignettes.ts`.
2. `scripts/render-stills.ts` renders about 30–45 stills (1080×1920 WebP + depth) of the F3/F4 world
   through `?render=still`.
3. A WebGL2 depth-parallax shader (no Three.js), with a pan fallback and overlays (flicker, dust,
   breath, snow).
4. Hotspots in still coordinates, with tests that they stay inside the still and never overlap. They
   must be visible enough to find (fixes M-8).
5. New layout:
   - scene about 58 %
   - narration panel at least 17 px, with speaker cues
   - choices always reachable (fixes M-6)
   - voice lines in the main panel (fixes M-7)
6. Screenshots at 360×640, 375×667, 390×844, 412×915 and 430×932.

### F7 — Fear pass

1. Play every night in both modes and tune the pacing against the curves.
2. Apply the rubric to every screenshot. Every score must be ≥ 4, recorded in `QA.md`.

### F8 — Full QA

1. The full suite, perf (headed GPU for desktop, see T-5), memory, budgets, Telegram, plain browser.

## 8. Decisions I need from the owner before F1/F2

1. **Mixamo needs an Adobe login.** I cannot download it unattended. Options:
   - (a) you export one character with 3 animations from Mixamo and drop the FBX/GLB in a folder
   - (b) I use a CC0 / CC-BY realistic rigged human (Sketchfab / Poly Haven), credited
2. **Sonniss GDC bundles** are multi-GB manual downloads. I propose Freesound CC0/CC-BY only, plus
   your own recordings if you have any.
3. **Order of phases.** F1 (story and Uzbek) first, as written. It needs your review of
   `SCRIPT_UZ.md` before anything visual depends on it.
4. **Narration font:** serif (literary, e.g. Literata) or sans (clean, e.g. Inter)? I will screenshot
   both with real Uzbek text in F1 for you to pick.
