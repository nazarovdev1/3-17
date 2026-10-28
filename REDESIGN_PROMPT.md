# REDESIGN PROMPT — "3:17": from a book with buttons to a game

## 0. Read this first

You wrote `DIAGNOSIS.md`. It is correct, and it is the reason for this prompt. Summary of what it proved:

- 83–90% of a night is reading or waiting for text. Moving and looking are required 0 seconds.
- 0 events happen without text. 100% of transitions are triggered by buttons. Idle for 90 s and the world is frozen.
- The narrator has 74% of all lines; 44% of narrator lines describe the player's body, feelings or actions.
- 71 choice buttons, 20 menus, 67 "Continue" nodes. On desktop the 3D world is a frame around a menu.
- 3:17 is reached by a button. Silence, waiting and dread cannot happen by themselves.
- Endings are text cards over a thumbnail.

Root cause: the game is a text story graph that two presenters skin. **This prompt replaces that model.** The world becomes the source of events, time passes by itself, and the narrator is deleted.

Precedence: `REDESIGN_PROMPT.md` > `FIX_PROMPT.md` > `PROMPT.md`. Everything from the earlier prompts that this one does not contradict stays: assets, PBR flat, floor plan and world validator, recorded audio, save system, Telegram adapter, Uzbek language rules, content limits, credits, budgets, testing discipline.

What is kept as material, not as structure: the 3D flat, stairwell, flat 48, figure, audio library, phone UI, and the best writing from `SCRIPT_UZ.md` (section 4.1 lists what must survive).

## 1. The new design rules (non-negotiable)

1. **No narrator. At all.** The `narrator` speaker type is deleted from the data model. Nothing on screen ever describes what the player sees, hears, does or feels. If the player should feel silence, the game makes it silent. If the hands should shake, the camera and the cup shake.
2. **Text exists only inside the world** (diegetic): the phone screen (missed calls, message transcripts, clock), paper you pick up (note, diary pages, calendar), and short subtitles of what a character says out loud (the voice, Muhabbat opa, Rustam aka). Nothing else.
3. **The player never speaks in text and never picks lines from a menu.** Choices are actions in the world: walk to the door or not, knock on the wall, answer, stay silent by doing nothing, pick up the phone or leave it buzzing.
4. **Time passes by itself.** Each night has an in-game clock. 3:17 arrives because time reached it, not because a button was pressed. The player can speed time only by a world action (lie down on the sofa).
5. **The world is never frozen.** If the player stands still, things still happen: sounds from wrong places, objects changing when not observed, the phone buzzing, the radiator knocking.
6. **Every important beat must work without its text.** If you mute all subtitles, a player must still understand what happened at 3:17, in flat 48 and in every ending.
7. **No menus during play.** No choice lists, no numbered buttons, no "Continue". The only UI during play: a tiny centre dot, a contextual prompt when looking at an interactable within reach ("E" / tap), and subtitles when someone speaks. Pause stays in the pause menu.
8. **Show it, then let the player find meaning.** Never explain a twist. The player connects the dots.

## 2. New core model: Director + Beats + World

Replace the `StoryNode` flow. Keep the save system, flags, profile, sanity and inventory concepts.

```ts
interface NightDef {
  night: 1 | 2 | 3 | 4 | 5;
  start: GameClock;            // e.g. 23:40
  realSecondsPerGameMinute: number; // tune so a night lasts ~6–9 real minutes
  beats: Beat[];
  ambientPool: AmbientEvent[]; // untold background events for this night
  end: NightEndRule;           // usually: after the 3:17 sequence resolves + dawn
}

interface Beat {
  id: string;
  trigger: Trigger;            // when it can fire
  when?: Condition;            // flags, sanity, profile, items, prior beats
  once?: boolean;
  actions: Action[];           // what happens in the world
  waitFor?: PlayerResponse;    // optional: actions that resolve it (see §3)
}

type Trigger =
  | { type: 'clock'; at: GameClock }                       // 03:16, 03:17
  | { type: 'zone'; zone: ZoneId; dwellMs?: number }        // enter / stay in an area
  | { type: 'gaze'; target: ObjectId; minMs?: number }      // look at something
  | { type: 'notLooking'; target: ObjectId; minMs: number } // for unobserved changes
  | { type: 'interact'; target: ObjectId }                  // E / tap on an object
  | { type: 'idle'; ms: number }                            // player does nothing
  | { type: 'after'; beat: string; delayMs?: number }
  | { type: 'sanityBelow'; value: number };

type Action =
  | { type: 'sound'; id: SfxId; at?: ObjectId | Position; volume?: number }
  | { type: 'ambience'; layer: string; on: boolean; fadeMs?: number }
  | { type: 'light'; id: LightId; state: 'on' | 'off' | 'flicker'; ms?: number }
  | { type: 'power'; on: boolean }                          // whole flat: lights, fridge hum, TV
  | { type: 'object'; id: ObjectId; change: ObjectChange }  // move, open, swap variant
  | { type: 'figure'; placement: FigurePlacement; ms: number }
  | { type: 'phone'; event: PhoneEvent }                    // buzz, missed call, new message, screen on/off
  | { type: 'say'; speaker: Speaker; line: TextKey; from?: ObjectId | Position }
  | { type: 'haptic'; pattern: HapticPattern }
  | { type: 'camera'; effect: CameraEffect }                // breath sway, shake, slow push
  | { type: 'fx'; id: FxId; intensity?: number; ms?: number }
  | { type: 'flag'; key: string; value: unknown }
  | { type: 'sanity'; delta: number }
  | { type: 'readable'; id: ReadableId }                    // opens a paper / diary page in hand
  | { type: 'endNight' } | { type: 'ending'; id: EndingId };

type Speaker = 'voice' | 'muhabbat' | 'landlord' | 'player_spoken'; // no narrator
```

`player_spoken` is used only for the few lines the player character says out loud as a result of an action (section 3). They are shown as subtitles, never as options.

**Director:** runs the game clock, evaluates triggers every frame (cheaply), fires beats, schedules ambient events, and owns the night lifecycle. It must be deterministic given a seed and a list of player inputs, so it can be tested headlessly with accelerated time.

**Ambient scheduler:** picks untold events from `ambientPool` (footsteps above, radiator knock, a chair creak, TV static turning on by itself, a phone buzz, a door click somewhere) by night and sanity, never the same event twice within 3 minutes, never while another beat is speaking. Object changes only fire when the object is out of view (frustum check on desktop, out of the current viewpoint on mobile).

**Remove:** the hub menus, typewriter, "Continue", numbered HUD buttons, glowing choice spheres, the text presenter as the reference for the story, the "night/floor/flat" top line, the quality and torch buttons in the HUD (keep F key; on mobile keep one small torch icon only after the power cut), the persistent controls card (show controls for the first 15 s of night 1, then fade).

**Keep a debug view** (`?debug=1`) that lists the clock, beats fired, flags and sanity. That replaces the text presenter for development.

## 3. How choices become actions

| Old menu choice | New action |
|---|---|
| Answer the voice / stay silent / knock back | At the shared wall after the knocks: press E/tap on the wall to answer (the player says the short line out loud as a subtitle), click/tap with a knock gesture to knock back, or do nothing for 20 s = silence. All three are valid, none is labelled. |
| Inspect clock / note / TV / window / radiator | Walk there and look or interact. The object reacts physically. No description text. |
| Listen to a mother's voice message or not | The phone buzzes on the table. Pick it up to see the screen. A new message plays only if the player taps it. Ignoring the phone is a choice. |
| Write "Yaxshiman, ona" or not | On the phone screen, a draft field is already filled with "Yaxshiman, ona. Ishdaman". A send button exists. The player can send it, delete it, or put the phone down. (Sending is allowed and becomes a flag; the voice uses it later either way.) |
| Ask Muhabbat opa about 48 / about Sardor | Proximity conversation: she starts talking when the player passes her door. If the player stays close, she keeps talking and tells more (48 first, then Sardor). If the player walks up the stairs, she stops mid-sentence and calls after them once. |
| Night 3 corridor: run or stop and look back | Already a gaze mechanic. Keep it, delete the text. Running keeps the corridor long; stopping and turning around resets it and reveals the raised floorboard. |
| "Wait for the power cut" / "Lie down" | Lie down on the sofa (interact) = time speeds up ×8 with darkened vignette and the clock ticking, until 03:16 or until something interrupts. Otherwise time passes normally. |
| Night 4: enter 48 or retreat | Walk through the door of 48, or walk back into 47 and chain the door. |
| Night 4 questions to the voice | No question menu. The player's spoken line is chosen automatically by what they know: if they heard about Sardor from Muhabbat → "Sardormisan?"; else if they heard the mother's 3rd message → "Buni qayerdan bilasan?"; else they say nothing. The player triggers it by walking towards the voice; walking away = silence. |
| Final choice (enter 48 / leave / wind the clock) | Three physical actions on night 5: open the door of 48 on the landing, walk down the stairs and out of the building, or take the clock off the wall and wind it with the brass key (only possible if the conditions of Ending C are met; otherwise the key turns but the spring will not catch, with a dry click). |

## 4. Text budget and rules

- Total visible words in a full playthrough: **≤ 900** (currently 2426). Per night ≤ 180, excluding diary pages.
- Subtitles: max 10 words per line, max 2 lines on screen, appear whole (no typewriter), stay for `0.6 s + 0.35 s × words`, positioned at the bottom, each speaker with its own subtle style (the voice: dimmer, slightly letter-spaced; Muhabbat: warm off-white; Rustam: plain).
- The voice speaks rarely. Silence between its lines is part of the line.
- Diary pages: max 35 words each, readable in hand as a paper object in HD, never summarised.
- Phone: missed call counts, the date, the time, message transcripts as chat bubbles with a waveform icon and duration.
- `lint:text` additions: fail on any `narrator` speaker; fail on second-person past/present action or body verbs in any subtitle (`-dingiz`, `-yapsiz`, `siz … qildingiz` patterns, nafas/yurak/qoʻl/koʻz + verb); fail on subtitle lines > 10 words; fail on any night over its word budget.

### 4.1 Writing that must survive (move it into the world, keep the words)

- All five mother messages, word for word — they are the heart of the game. Shown as phone transcripts.
- Rustam aka's rule about 48 and his note, including "Ismingizni aytib chaqirsa ham." in a different pen.
- Muhabbat opa's voice: halva, "Voy, bolam…", the story of 48 and of Sardor, "Onangga qoʻngʻiroq qilib tur, xoʻpmi? Onalar kutadi."
- The voice's lines that quote the player's own answers and choices, and "Bolam, nega telefonni olmayapsan?" on night 4.
- Diary pages, including "Ertaga. Ertaga albatta." in the player's own handwriting and "Bu yerda meni hech kim kutmaydi. U yerda esa kutishadi."
- The food parcel (somsa, qatlama, qatiq) as a real object on the threshold.

Everything the narrator used to say about these must now be shown or cut.

## 5. Night designs (rewrite every night as beats; this is the target shape)

Write `docs/BEATS.md` first: for every night, a table `time | trigger | what happens (sound/light/object/figure/phone) | text on screen (if any)` and a tension curve. Use these as the spine; improve them, but keep the rules.

**Night 1 — Koʻchib kelish (target 7 min).**
Start on the dark stairwell, phone torch on, the player walking up behind Rustam aka. At the door he hands the keys (subtitle: his rule about 48), then leaves fast; his steps go down and stop too early, a few floors below, and never continue. Inside: the flat is quiet and lived-in. The phone on the table lights up: "Onam — 3". The clock on the wall is stopped at 3:17 and the player sees it themselves. The note on the table is readable (Rustam's lines, the last one in a different pen). TV turns on to static if touched; once, a cough inside the static, no text. Across the street one window on the 4th floor is lit. Ambient: radiator knocks, fridge hum, distant traffic.
At 03:16 the opposite windows go dark floor by floor (visible from the window; audible clicks if the player is elsewhere). At 03:17 power dies: lights, fridge hum, traffic layer. **At least 6 s of real silence**, nothing on screen. Then three knocks on the shared wall, spatialised. Then the voice, one subtitle: "Qoʻshni… uxlamayapsizmi?" Then nothing. The player answers, knocks or stays silent (§3). Dawn: fade to black, the fridge hum returns, birds, the phone screen shows the new date and one more missed call.

**Night 2 — Devor.** Day beat: the player goes down for bread (the door and stairwell are open, a bakery bag waits at the bottom); Muhabbat opa's proximity monologue with halva on the 3rd floor; the figure stands at the far end of the stairwell below her, only visible over her shoulder for 2 s. Night: the coat in the wardrobe that is not the player's, tally marks scratched in the back (visible texture, no text), diary page in the coat pocket. Mirror lag in the bathroom (pure visual). Hold-to-listen at the wall: breathing that matches the player's rhythm and stops when the player stops holding. Phone: "Onam (11)", a second voice message, the draft "Yaxshiman, ona. Ishdaman". 3:17: knocks; the voice now quotes the rental form answers.

**Night 3 — Takror.** The phone shows Tuesday; a work message "Bugun ham kelmaysizmi?". Rustam aka calls; the call is picked up automatically, 16 s, while the screen behind the call shows "Onam — 24". Corridor loop (gaze). The clock now hangs on a different wall; the old spot shows a lighter rectangle of wallpaper. The TV shows the room from the top corner with someone on the sofa turning their head; when the player looks at the real sofa it is empty. Diary page in the bread box; a page in the player's own handwriting under the carpet. 3:17: no knocks — a cough behind the wall, then the voice very close, now using "sen" and the player's own night-1 response.

**Night 4 — 48.** The phone is under the pillow and buzzes; 40 missed calls; the mother's message about the food parcel. The 3:17 silence; one step on the landing. Feet shadows under the entrance door (the player sees them only if looking). Peephole: fisheye view of the landing with the figure's back turned; look away and back — gone; wet footprints lead to 48. On the landing: the food parcel on the threshold, still warm (steam), the door of 48 ajar, the seal torn. Inside 48: the decayed copy of 47, the calendar crossed out up to yesterday with a pen on a string, the player's own bag with their passport under thick dust, a diary page on the chair. The voice speaks from inside this room, in the mother's words: "Bolam, nega telefonni olmayapsan?" One short fake glitch (respect Reduce flashing).

**Night 5 — 3:17.** The day the player did not leave. Cold air coming from the ajar door of 48 (visible breath, draught moving the curtain). The brass key on the key ring (planted on night 1: Rustam handed two keys, the small one never explained). Clock removable from the wall; behind it the last diary page. Phone: 52, the mother's last message ("eshigimiz ochiq"). 03:16: the opposite 4th-floor window goes dark last — just before, someone there holds a lit phone to their face. 03:17: everything dies, including the player's phone screen. Three slow knocks. The voice, in the player's own words from earlier nights. Then the three physical endings (§3).

## 6. Endings as playable set pieces (no ending card during the ending)

- **A — Qoʻshni:** the player walks into 48; the door closes behind them by itself; darkness, the sound of the player's own breathing. Cut: same room, weeks later, daylight through dirty glass. The player can only move a little. Through the wall: a suitcase rolling, keys, a young voice, a phone ringing in 47 and not answered. The clock in 48 shows 3:17; the light dies; a prompt appears on the wall for the first time: knock. The player knocks. Subtitle in the voice's style, but it is the player's line: "Qoʻshni… uxlamayapsizmi?" Black. Silence. Credits.
- **B — Ketish:** the player unchains the door and walks down the stairs (playable). Light under Muhabbat opa's door; the TV murmur inside; the player can pass. Outside: snow, the orange streetlamp, the empty courtyard, an early bus with its door open (new small exterior scene). Inside the bus the phone buzzes in the pocket; taking it out shows "Onam". There is no answer button in this ending — the screen only shows the call until it stops. The bus moves; the dark window shows the player's tired reflection, and for one frame, behind it, a figure sitting at the back of the bus. Credits.
- **C — 3:18:** the player puts the brass key in the clock and winds it with a physical gesture (circular mouse drag / circular touch, with resistance, clicks and haptics). Ticking starts. The minute hand moves to 3:18 with a loud tick. Silence; no knock comes. Power returns gradually: fridge hum, the bulb warming up, the phone lighting up in the player's hand on its own showing "Onam". The player taps call. Black screen, nothing else. Two real ringing tones. Then, alone in the centre: "Alo… bolam?" Three seconds of silence. Credits.

Ending titles ("Qoʻshni", "Ketish", "3:18") appear only in the endings gallery, never before or during the ending.

## 7. The player's inner state without words

Show insomnia, fear and loneliness through: camera breathing sway that grows with low sanity; slight tremor when holding a cup or the phone; tinnitus ring after the power cut; heartbeat audio + haptic only when the player holds still near the wall; vision narrowing; the player's own footsteps becoming louder in silence; time skips (a blink to black and the clock jumped 20 minutes) at very low sanity. Never a sentence.

## 8. Mobile

Primary mobile mode = "magic window" 3D (same scene, same Director, same beats): device orientation controls the look (Telegram DeviceOrientation API → DeviceOrientationEvent with iOS permission → touch-drag), recenter button, movement by tapping a subtle floor marker to glide between 5–7 fixed viewpoints per room, interaction by tapping objects. Mobile quality tier: no SSAO, cheaper shadows, DPR ≤ 1.5. The HD stills from F6 remain the automatic fallback for weak devices; in fallback the same beats fire, using still variants, sounds, haptics and subtitles — still no narrator, no menus.

Optional night-4 camera moment (front camera at the peephole, ask permission only then, never store or send frames, stop the stream after the scene, normal peephole if denied).

## 9. Visual fixes found in the diagnosis

- The ceiling lamp is blown out in almost every frame: fix exposure and bloom thresholds; the bulb may glow, the frame may not clip.
- When the player interacts with an object, the camera must show that object (desktop: the player is looking at it by definition; mobile: the viewpoint for that object).

## 10. Measurable gates (automated, in `npm run check` where possible)

Add `npm run metrics:design` that plays each night headlessly with accelerated time and scripted inputs, and fails if:

- any narrator line exists, or any menu/Continue UI element is rendered during play;
- visible words per night exceed the budget, or the whole game exceeds 900;
- fewer than 70% of beats in a night contain no text;
- idle test: the player stands still for 90 s at the start of each night and fewer than 2 events happen;
- 3:17 does not arrive by itself when the player does nothing (cap: ≤ 9 real minutes per night);
- the 3:17 silence before the knocks is shorter than 6 s;
- any ending shows its title before its last frame;
- muted-subtitle test: in each ending the key events (door closing / bus / clock reaching 3:18 / call) are still fired as non-text actions.

Report reading time vs total time per night; target ≤ 15%.

## 11. Phases (stop at every ✋ and wait for the owner)

- **R0 — Design ✋.** `docs/BEATS.md` for all 5 nights and 3 endings, the new data model sketch, the list of what is deleted, and a new `SCRIPT_UZ.md` that contains only what is heard or read in the world (subtitles, phone, paper), in play order. No code. Stop.
- **R1 — Engine.** Director, game clock, triggers, ambient scheduler, new save format with a migration, debug view, headless simulation for tests, `metrics:design`. Remove menus, typewriter, narrator, HUD clutter. Tests green.
- **R2 — Vertical slice: Night 1 on desktop ✋.** Fully playable, all beats, audio, silence, ending of the night. Record a real-time video of a playthrough with Playwright (`video: 'on'`) plus one idle run. Stop: the owner plays it. Do not touch nights 2–5 before approval.
- **R3 — Nights 2–5 on desktop.** Same standard.
- **R4 — Endings ✋.** The three set pieces, including the bus scene for B and the winding gesture for C. Stop with videos.
- **R5 — Mobile ✋.** Magic window + fallback stills on the new Director. Stop with videos at 390×844 and 360×640; the owner tests on a real phone.
- **R6 — Fear pass.** Play every night in both modes in real time, tune timings against `BEATS.md` tension curves, fix every idle/pacing issue, update QA rubric scores.
- **R7 — Full QA.** Everything green, budgets, performance, Telegram + plain browser.

Working rules from before still apply: update `PROGRESS.md` after every meaningful step and commit; record decisions in `DECISIONS.md`; never claim something works or looks good without having run it and looked at it; at each stop show one contact sheet and the videos, not hundreds of screenshots.

## 12. Definition of done

A first-time player can finish the game without reading a single narrator sentence, because none exist. They understand what happened from what they saw, heard and did. They were never shown a menu. When they stood still, the flat kept living. At 3:17 they heard the silence instead of reading about it. The endings happened to them; they did not read about them.
