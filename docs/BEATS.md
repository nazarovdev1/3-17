# BEATS — "3:17" redesign (phase R0)

Source of truth for R1–R6. Based on `REDESIGN_PROMPT.md` and `DIAGNOSIS.md`. Every word the player can
see is in `SCRIPT_UZ.md` (IDs like `N1-12`). Nothing here is shown on screen except those IDs.

**Reading the tables.**

- **Clock / real** is the in-game time and the real time (m:ss) for a player who does nothing.
  Interactive beats have no fixed time.
- **Trigger** uses the types from §1: `clock`, `zone`, `gaze`, `notLooking`, `interact`, `idle`, `after`, `sanityBelow`.
- **Text** is the `SCRIPT_UZ.md` ID, or `—` when the beat has no words. Beats with `—` are what the 70% gate counts.
- Ambient events (untold background) are listed separately per night and are not counted as beats.

---

## 0. Gates this design is built to pass

| Night | Start                   | Real s per game min                  | 3:17 (idle) | Silence before knocks               | Beats | Beats without text | Words (excl. diary) | Idle: events in first 90 s                  |
| ----- | ----------------------- | ------------------------------------ | ----------- | ----------------------------------- | ----- | ------------------ | ------------------- | ------------------------------------------- |
| 1     | 01:58                   | 4.5                                  | 5:56        | 7 s                                 | 22    | 16 (73%)           | 91                  | 4 (keys, Rustam, steps stop, door below)    |
| 2     | day 13:20 → night 02:05 | day: own timeline (~2:10); night 4.0 | 6:58        | 7 s                                 | 23    | 16 (70%)           | 160                 | 3 (wake, radiator, Muhabbat climbs at 0:45) |
| 3     | 02:00                   | 4.5                                  | 5:47        | 7 s, then a cough instead of knocks | 20    | 14 (70%)           | 96                  | 3 (phone, Rustam's call, tap runs)          |
| 4     | 02:15                   | 4.0                                  | 4:08        | 7 s, then one step                  | 27    | 19 (70%)           | 82                  | 3 (pillow buzz, drag in hall, radiator)     |
| 5     | 02:20                   | 4.0                                  | 3:48        | 8 s, then three slow knocks         | 15    | 11 (73%)           | 57                  | 3 (draught, curtain, 48 TV murmur)          |

- **Words:** the whole game, worst-case single playthrough, is **661 words**. The limit is 900.
  - Form: 33.
  - Nights: 91 + 160 + 96 + 82 + 57.
  - Diary pages: 126.
  - Endings: 16.
  - Counted mechanically from `SCRIPT_UZ.md`.
- **Reading time:** under 15% of each night.
  - The longest night (2) has 160 words. That is ≈ 53 s of reading at 180 wpm in ≈ 8 min, about 11%.
- **No beat needs its text to be understood.** Each text row also has a non-text carrier, which is checked again in §8.

## 1. Data model sketch (implemented in R1, not now)

```ts
type GameClock = `${number}:${number}` // '03:17'
type Speaker = 'voice' | 'muhabbat' | 'landlord' | 'player_spoken' | 'mother' // mother = phone transcript only

interface NightDef {
  night: 1 | 2 | 3 | 4 | 5
  segments: Segment[] // night 2 has a 'day' segment before the night
  realSecondsPerGameMinute: number // 4.0–4.5; ×8 while lying on the sofa
  beats: Beat[]
  ambientPool: AmbientEvent[]
  end: NightEndRule // after the 3:17 sequence resolves → quiet → blink → dawn
}
interface Segment {
  id: 'day' | 'night'
  start: GameClock
  light: 'day' | 'night'
  end?: Trigger
}

interface Beat {
  id: string // 'n1.knocks'
  trigger: Trigger
  when?: Condition // existing Condition type is kept
  once?: boolean // default true
  actions: Action[]
  waitFor?: PlayerResponse // wall response window etc.
  text?: TextKey[] // SCRIPT_UZ IDs used by 'say' / 'phone' / 'readable'
}

type PlayerResponse = {
  windowMs: number // 20 000 at the wall
  options: {
    answer?: { input: 'interact'; target: 'party_wall'; then: Action[] }
    knock?: { input: 'knock3'; target: 'party_wall'; then: Action[] } // 3 clicks / taps within 2 s
    silence: { then: Action[] } // the window ran out
  }
}

interface AmbientEvent {
  id: string
  action: Action
  nights: number[]
  minSanity?: number
  maxSanity?: number
  needsUnobserved?: ObjectId // object changes only out of view
  cooldownMs: 180_000 // never the same event twice within 3 minutes
}
// Trigger and Action exactly as REDESIGN_PROMPT §2, plus:
//   Action { type: 'inspect'; id: ObjectId }        — object turns in hand (clock, passport, calendar)
//   Action { type: 'timeScale'; factor: number }    — sofa
//   Action { type: 'control'; limit: 'none' | 'shuffle' | 'locked' } — ending A
//   Trigger { type: 'knock3'; target } / { type: 'hold'; target; minMs } — wall gestures
```

- **Director:** owns the clock, evaluates triggers each frame and fires beats. It schedules ambient events
  but never while a `say` is active or within 10 s of one. It owns the night lifecycle and is deterministic
  given `seed + input log`. It runs headless at ×60 for tests (`metrics:design`).
- **Save v2:** `{ version: 2, night, segment, flags, inventory, heard: Set<'m1'..'m5'>, diary: Set<1..7>,
profile, sanity, endingsSeen }`.
  - Checkpoints are at night start and after the 3:17 resolution. Quitting mid-night resumes at the last checkpoint.
  - Migration from v1: `currentNodeId` → its night's start; flags, items and profile are kept; `mom_msg_N` → `heard`; `diary_N` → `diary`.
- **Debug view** (`?debug=1`): clock, segment, time scale, beats fired, pending responses, flags, sanity, and the last 20 ambient events.
  Controls: set clock, fire beat, ×1 / ×8 / ×60. It replaces the text presenter as the developer view.

### Flags used by the story

| Flag                                    | Set by                         | Read by                              |
| --------------------------------------- | ------------------------------ | ------------------------------------ |
| `n1_response` = answer / silent / knock | N1 wall window                 | N2-19, N3-11                         |
| `chain_on` (live)                       | chain object                   | N1-13b/c                             |
| profile `alone`, `fear`, `door`         | rental form                    | N1-13a, N2-20, N2-21                 |
| `heard_48`, `heard_sardor`              | Muhabbat proximity stages      | N3-12, N4-11                         |
| `heard.m1..m5`                          | tapping a message on the phone | N4-11b, Ending C                     |
| `draft_sent`                            | Send on the N2 draft           | N5-05                                |
| `diary.1..7`                            | reading a page                 | N3-13 (page 4), Ending C             |
| `n3_answered`                           | N3 wall window                 | Ending C (must be false)             |
| `n4_spoke` = sardor / where / none      | N4 approach                    | N5-06                                |
| `took_parcel`                           | parcel on the threshold        | N4 dawn, N5 kettle                   |
| `sanity`                                | see §2                         | inner-state signals, Ending C (≥ 40) |

## 2. Systems shared by all nights

- **Clock.** Runs from the night's start. The wall clock in 47 always shows 3:17 (stopped). Real time
  can be read only on the phone. Lying on the sofa (interact `sofa`) sets the time scale to ×8 with a darker
  vignette and quieter room tone. Any movement or any beat with a `say` cancels it. Reaching 03:16 cancels
  it and the camera sits up.
- **3:16 / 3:17 every night.**
  - 03:16: the opposite building's windows go dark. They are seen from the window; from anywhere else, faint relay clicks run through the walls.
  - 03:17: power off. Lights, fridge (`fridge_stop`), TV, traffic layer and radiator tick all stop within 0.4 s.
  - Then **real silence**: no ambience, no ambient events, no music, no tinnitus. The torch does not switch on by itself (F / mobile torch icon).
- **The phone** is a world object.
  - Picking it up raises it into view: lock screen with time, date and missed calls, then message bubbles with a waveform.
  - A message plays (transcript shown) **only when tapped**.
  - The mother's calls are scheduled only while the player is more than 3 m from the phone. They ring for 6 s and always stop just before the player can reach it.
  - The phone can be put face down (interact while holding).
- **Readables** (note, diary pages, calendar, passport) open in hand as HD paper and close by moving.
  Diary text is never summarised anywhere else.
- **Wall gestures** at `party_wall` (within 1.5 m, looking at it):
  - E or one tap = say the `player_spoken` line;
  - three clicks or taps within 2 s = knock (player's own knock sound + camera jolt);
  - hold Q or press-hold = listen (heartbeat haptic, breathing).
  - No prompt text, only the key glyph or tap ring. Silence = the window runs out.
- **Sanity** (0–100, never fails the game). Values are carried from the old effects and tuned in R6.
  - Down: −5 knocks heard; −5 answering the voice; −5 each figure sighting; −10 entering 48; −5 glitch; −1 per 30 s in the dark without the torch.
  - Up: +5 tea (once per night); +3 a mother's message heard; +1 per minute in a lit room (cap +5 per night).
- **Inner state without words (§7)**, driven by sanity:
  - ≥ 70: steady camera.
  - < 70: breathing sway; slight cup and phone tremor.
  - < 40: louder own footsteps in silence; vision narrowing in the dark.
  - < 25: time skips (blink → the phone shows +20 minutes); heartbeat only while standing still at the wall.
- **UI during play:** centre dot; key glyph or tap ring on an interactable in reach; subtitles at the bottom
  (max 2 lines, whole, `0.6 s + 0.35 s × words`; voice dim and letter-spaced, Muhabbat warm off-white,
  Rustam plain). The pause menu has the mixer and settings. A controls card shows for the first 15 s of
  night 1 only, then fades. On mobile, a torch icon appears only after the power cut.
- **Meta-horror (kept, without words):**
  - Real local time 00:00–05:00 on night 1: the lock screen shows the real minute at first pickup.
  - The real clock reaching 03:17 while playing: one knock from the party wall.
  - Returning after quitting mid-night: on the next 3:17 the voice's first subtitle is delayed by 3 s, plus one extra knock.

---

## Night 1 — Koʻchib kelish (target ≈ 7:15)

Tension: quiet 0:00–2:30 (1) → unease 2:30–5:50 (2) → build 5:51 windows (3) → peak 5:56 silence and knocks (5) → release at dawn (1, the clock still at 3:17).

| #   | Clock / real  | Trigger                       | What happens                                                                                                                                                           | Text     |
| --- | ------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | 01:58 / 0:00  | night start                   | Dark stairwell, phone torch on, on the flight below the 4th floor. Rustam aka on the landing at 47, back turned; key ring rattles in the lock.                         | —        |
| 2   | 0:05–0:12     | `zone landing` or `idle 12 s` | He turns and holds out the key ring. If the player is not up yet, he says it towards the stairs and hangs the ring in the lock.                                        | N1-01–04 |
| 3   | after 2 + 2 s | `after`                       | He goes down fast. His steps descend three floors and **stop between floors**. No door, no further steps, ever.                                                        | —        |
| 4   | —             | `interact key_ring`           | Key ring in hand: a door key and a small brass key. The door opens (hinge).                                                                                            | —        |
| 5   | —             | `zone hall`                   | Inside: lamp on, fridge hum, radiator, traffic. The phone on the table lights up once and buzzes.                                                                      | —        |
| 6   | —             | `interact phone`              | Lock screen; tap → mother's message 1.                                                                                                                                 | N1-05–08 |
| 7   | —             | `interact note`               | Rustam's note in hand; the last line in different ink.                                                                                                                 | N1-09–11 |
| 8   | —             | `interact clock`              | Clock turns in hand: hands at 3:17, battery slot empty. Back on its nail.                                                                                              | —        |
| 9   | —             | `interact tv`                 | Static. After 2–4 s, once, a cough inside the static (positioned at the TV).                                                                                           | —        |
| 10  | —             | `interact tv` (off)           | Dark screen reflects the room and the open door behind the player.                                                                                                     | —        |
| 11  | —             | `gaze room_window ≥ 1 s`      | Opposite building: one lit window on the 4th floor, no curtain, nobody.                                                                                                | —        |
| 12  | —             | `interact room_radiator`      | Water gurgles, then one dry knock.                                                                                                                                     | —        |
| 13  | —             | `interact kettle`             | Gas ignites; whistle after 40 s; cup in hand (tremor by sanity), +5 sanity.                                                                                            | —        |
| 14  | —             | `zone bathroom` (first)       | Tap drips; the drip stops when the player looks at it.                                                                                                                 | —        |
| 15  | —             | `interact chain`              | Chain on/off (sound). Sets `chain_on`.                                                                                                                                 | —        |
| 16  | 02:30–03:00   | `clock` + far from phone      | Phone buzzes 6 s (mother) and stops.                                                                                                                                   | —        |
| 17  | 03:16 / 5:51  | `clock`                       | Opposite windows go dark floor by floor, 4th floor last; relay clicks. The sofa wakes the player.                                                                      | —        |
| 18  | 03:17 / 5:56  | `clock`                       | **Power dies.** Then 7 s of real silence.                                                                                                                              | —        |
| 19  | 03:17 + 7 s   | `after 18`                    | Three knocks on the party wall (HRTF); knock haptic.                                                                                                                   | —        |
| 20  | + 3 s         | `after 19`                    | The voice from the wall.                                                                                                                                               | N1-12    |
| 21  | 20 s window   | `waitFor`                     | Answer → N1-13a; knock back → N1-13d; silence → N1-13b (chain on) or N1-13c. Sets `n1_response`.                                                                       | N1-13    |
| 22  | + 15 s quiet  | `after 21`                    | Blink to black. Dawn: fridge hum first, the bulb, grey light, crows, traffic. The player wakes facing the table: the phone lights up. The wall clock is still at 3:17. | N1-14    |

Ambient pool, untold: radiator knock (60–120 s); fridge compressor restart; a car passing (light sweeps the
ceiling); bathroom pipes; neighbour's TV murmur from below; a door closing on another floor.

---

## Night 2 — Devor (target ≈ 8:00)

Tension: day, quiet but watched (1–2), the figure over Muhabbat's shoulder (3) → night unease (2) → build: footsteps above, TV in 48 (3) → peak 3:17, the voice knows the form (4–5) → release: wake in clothes (2).

| #   | Clock / real  | Trigger                                             | What happens                                                                                                                                                                                                                                                                                                                                                                         | Text     |
| --- | ------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | 13:20 / 0:00  | day start                                           | Wakes on the sofa in clothes, daylight; the phone slides off the chest onto the cushion.                                                                                                                                                                                                                                                                                             | —        |
| 2   | —             | `interact phone`                                    | Lock screen.                                                                                                                                                                                                                                                                                                                                                                         | N2-01    |
| 3   | —             | `interact bread_bin`                                | Empty, crumbs.                                                                                                                                                                                                                                                                                                                                                                       | —        |
| 4   | —             | `zone landing` (day)                                | Daylit stairwell. A paper bag of bread on the 3rd-floor windowsill below.                                                                                                                                                                                                                                                                                                            | —        |
| 5   | —             | `zone landing3` or `idle 45 s` in 47                | **Muhabbat opa.** Her door opens on the chain: headscarf, one eye, a hand with a plate of halva. She talks while the player stays within 2.5 m. Stage 1 → stage 2 (`heard_48`) → stage 3 (`heard_sardor`). Leaving mid-stage cuts her off; she calls N2-14 once. Idle fallback: she climbs to 47 and talks through its door; if it stays shut she leaves the halva on the threshold. | N2-02–14 |
| 6   | during 5      | `gaze stair_gap`                                    | Over her shoulder, at the far end of the flight below: the figure, backlit, 2 s, once.                                                                                                                                                                                                                                                                                               | —        |
| 7   | —             | `interact halva`                                    | Plate in hand, still warm (steam).                                                                                                                                                                                                                                                                                                                                                   | —        |
| 8   | —             | back in 47 with the door shut, or 30 s after 5 ends | Slow blink: day → night 02:05.                                                                                                                                                                                                                                                                                                                                                       | —        |
| 9   | 02:05 / ≈2:10 | night start                                         | Frost flowers on the window; radiator barely warm.                                                                                                                                                                                                                                                                                                                                   | —        |
| 10  | —             | `interact phone`                                    | Message 2, then the draft with Send. Sets `draft_sent`, or the draft is deleted by holding backspace.                                                                                                                                                                                                                                                                                | N2-15–18 |
| 11  | —             | `interact wardrobe`                                 | A long black coat that is not the player's (theirs hangs in the hall). Tally marks on the back panel, fresh shavings on the shelf.                                                                                                                                                                                                                                                   | —        |
| 12  | —             | `interact coat_pocket`                              | Diary page 1.                                                                                                                                                                                                                                                                                                                                                                        | K-1      |
| 13  | —             | `gaze mirror`                                       | Reflection lags 0.5 s on turns.                                                                                                                                                                                                                                                                                                                                                      | —        |
| 14  | —             | `notLooking bathroom_door 3 s`                      | Turn back: the bathroom door is ajar.                                                                                                                                                                                                                                                                                                                                                | —        |
| 15  | —             | `interact bathtub`                                  | Crouch view: diary page 2 behind the pipe, damp.                                                                                                                                                                                                                                                                                                                                     | K-2      |
| 16  | —             | `hold party_wall`                                   | Heartbeat haptic; breathing on the other side matches the player's sway rhythm; it stops when the player lets go.                                                                                                                                                                                                                                                                    | —        |
| 17  | 02:30 / ≈3:50 | `clock` + in room + `idle 10 s`                     | Footsteps cross the empty flat above (57), slowly.                                                                                                                                                                                                                                                                                                                                   | —        |
| 18  | 02:50 / ≈5:10 | `clock`                                             | Muffled TV from 48 through the wall for 20 s; it stops when the player comes within 2 m.                                                                                                                                                                                                                                                                                             | —        |
| 19  | —             | `notLooking mirror_cabinet`                         | The mirror cabinet door is open.                                                                                                                                                                                                                                                                                                                                                     | —        |
| 20  | 03:16 / 6:54  | `clock`                                             | Windows go dark.                                                                                                                                                                                                                                                                                                                                                                     | —        |
| 21  | 03:17 / 6:58  | `clock`                                             | Power dies, then 7 s of silence. Knocks.                                                                                                                                                                                                                                                                                                                                             | —        |
| 22  | + 3 s         | `after 21`                                          | The voice, three lines 4 s apart (night-1 response, form: alone, form: fear). No response window. If the player holds at the wall afterwards: breathing right at the wall, then one tap where the ear is.                                                                                                                                                                            | N2-19–21 |
| 23  | + 20 s        | `after 22`                                          | Blink. Wakes in clothes at 11:50; phone on the chest.                                                                                                                                                                                                                                                                                                                                | N2-22    |

Ambient pool: radiator going cold with a long tick; window frost crackle; pipes; a car door far away; phone
buzz (mother, while far from the phone).

---

## Night 3 — Takror (target ≈ 7:00)

Tension: dislocation from the start (2) → the flat lies: clock, corridor, TV (3–4) → 3:17 has no knocks, a cough, the voice uses "sen" (5) → release at dusk, the wrong time of day (2).

| #   | Clock / real | Trigger                       | What happens                                                                                                                                                                                                                          | Text     |
| --- | ------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | 02:00 / 0:00 | night start                   | The phone lights up on the table: date (Tuesday) and a work message. At 0:05 Rustam aka calls; the phone rises into view by itself and answers; 16 s; "Onam — 24" behind the call screen.                                             | N3-01–06 |
| 2   | 02:40 / 3:00 | `clock` + phone face down     | The face-down phone lights the table edge by itself; nothing on the screen when turned over.                                                                                                                                          | —        |
| 3   | —            | `interact phone`              | Message 3.                                                                                                                                                                                                                            | N3-07–10 |
| 4   | —            | `notLooking bathroom 10 s`    | The bathroom tap runs on its own.                                                                                                                                                                                                     | —        |
| 5   | —            | `notLooking coat_hooks 5 s`   | The black coat from the wardrobe now hangs next to the player's coat.                                                                                                                                                                 | —        |
| 6   | after 02:20  | `notLooking clock 8 s`        | The clock hangs on another wall. The old spot shows a pale rectangle; a fresh fingerprint in the dust on the glass (inspect).                                                                                                         | —        |
| 7   | after 02:25  | `zone corridor`               | **Loop:** each time the player looks away from the entrance door, the corridor is longer. Running 12 s → blink → standing by the sofa. Stopping and turning around → corridor normal; one floorboard is raised (diary 6 is under it). | —        |
| 8   | —            | `zone corridor` + walking     | Footsteps behind, matching the player's, stopping a beat late.                                                                                                                                                                        | —        |
| 9   | —            | `interact tv`                 | The TV shows this room from the top corner: someone on the sofa, back turned, slowly turning their head.                                                                                                                              | —        |
| 10  | during 9     | `gaze sofa`                   | The real sofa is empty. Back at the TV: static.                                                                                                                                                                                       | —        |
| 11  | —            | `interact bread_bin`          | Diary page 3.                                                                                                                                                                                                                         | K-3      |
| 12  | —            | `interact floor_rug` (corner) | Diary page 4, **in the player's handwriting**: the same hand as the rental-form signature.                                                                                                                                            | K-4      |
| 13  | 02:30–02:50  | `gaze room_window`            | Opposite 4th floor: someone stands in the lit window, backlit. Gone on the next look.                                                                                                                                                 | —        |
| 14  | —            | `idle 10 s` in room           | One knock from inside the wardrobe.                                                                                                                                                                                                   | —        |
| 15  | 03:16 / 5:42 | `clock`                       | Windows go dark.                                                                                                                                                                                                                      | —        |
| 16  | 03:17 / 5:47 | `clock`                       | Power dies, then 7 s of silence. **No knocks.**                                                                                                                                                                                       | —        |
| 17  | + 7 s        | `after 16`                    | A cough behind the wall, close; tinnitus ring rises after it (sanity < 70).                                                                                                                                                           | —        |
| 18  | + 3 s        | `after 17`                    | The voice, very close, dry, now "sen", quoting night 1. 20 s window: answer → N3-14a (`n3_answered`); silence → N3-14b.                                                                                                               | N3-11–14 |
| 19  | + 15 s       | `after 18`                    | The party wall is warm: a faint palm-shaped condensation fades on the wallpaper.                                                                                                                                                      | —        |
| 20  | + 10 s       | `after 19`                    | Blink. Wakes at dusk, 16:40, already dark outside.                                                                                                                                                                                    | N3-15    |

Ambient pool: pipes; the radiator; a chair scraping above; the phone face-down glow lighting by itself; the neighbour's TV below.

---

## Night 4 — 48 (target ≈ 8:00)

Tension: pressure (work, 40 calls) (2) → 3:17 with no knocks, one step (4) → peephole and landing (4) → 48 (5) → the mother's words from inside the room (5) → release, numb (1).

| #   | Clock / real | Trigger                                  | What happens                                                                                                                           | Text     |
| --- | ------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | 02:15 / 0:00 | night start                              | The phone buzzes under the pillow (sound from the sofa).                                                                               | —        |
| 2   | —            | `interact pillow`                        | Phone: the work message, 40 missed calls, message 4.                                                                                   | N4-01–06 |
| 3   | 0:20         | `after 1` + in room                      | Something is dragged across the corridor floor.                                                                                        | —        |
| 4   | —            | `interact floorboard`                    | Diary page 6 (if not read on night 3).                                                                                                 | K-6      |
| 5   | —            | `interact kettle`                        | Cup rattles on the saucer; +5 sanity.                                                                                                  | —        |
| 6   | —            | `idle 10 s`                              | The radiator gives one hard knock, then nothing for the rest of the night.                                                             | —        |
| 7   | 03:16 / 4:04 | `clock`                                  | Opposite windows go dark **all at once**.                                                                                              | —        |
| 8   | 03:17 / 4:08 | `clock`                                  | Power dies, then 7 s of silence.                                                                                                       | —        |
| 9   | + 7 s        | `after 8`                                | **One step** on the landing concrete, right outside 47.                                                                                | —        |
| 10  | —            | `gaze front_door`                        | Feet shadows in the gap under the door; they go if looked at for 1.5 s.                                                                | —        |
| 11  | —            | `interact peephole`                      | Fisheye: the figure near the stairs, back turned. Look away ≥ 1 s and back: gone; wet footprints lead to 48.                           | —        |
| 12  | 03:18 / 5:08 | `idle` (door never opened)               | The latch clicks; the entrance door swings ajar by itself. Cold: breath vapour, the curtain stirs.                                     | —        |
| 13  | —            | `zone landing`                           | Food parcel on the threshold, steam rising. 48's door ajar, the seal torn, half of it on the floor.                                    | —        |
| 14  | —            | `interact parcel`                        | Parcel in hand; `took_parcel`.                                                                                                         | —        |
| 15  | —            | `zone hall` + `interact chain` (retreat) | Back in 47, chained. 30 s later, through the chained gap, from the landing: the voice in the mother's words. Then dawn.                | N4-09–10 |
| 16  | —            | `zone flat48`                            | Inside 48: the decayed copy of 47, dust, the clock at 3:17. The muffled TV stops as the player enters.                                 | —        |
| 17  | —            | `gaze floor48`                           | Footprints in the dust: the player's shoe pattern, going in, none coming out.                                                          | —        |
| 18  | —            | `interact calendar`                      | December, 1–16 crossed out; 17 not; a pen on a string.                                                                                 | N4-07    |
| 19  | —            | `interact belongings`                    | The player's bag; passport with the player's name, under thick dust.                                                                   | N4-08    |
| 20  | —            | `interact chair48`                       | Diary page 5.                                                                                                                          | K-5      |
| 21  | —            | `gaze mirror48`                          | 48's bathroom mirror shows the room behind the player, and no player.                                                                  | —        |
| 22  | —            | `zone landing` (second time)             | One knock from inside the dead lift.                                                                                                   | —        |
| 23  | —            | `zone bed48`                             | Short fake glitch (static, heavy haptic; Reduce flashing → a single dim cut).                                                          | —        |
| 24  | + 2 s        | `after 23`                               | **The voice from inside this room**, in the mother's words. Walking towards it → N4-11a or b (sets `n4_spoke`); walking away → N4-11c. | N4-09–11 |
| 25  | —            | `zone landing` leaving 48                | The number plate on the player's own door reads 48 for one glance; on the next look, 47.                                               | —        |
| 26  | —            | `interact phone` after 48                | Dusty fingerprints smear the phone screen.                                                                                             | —        |
| 27  | —            | `zone hall47` + lie down, chain, or 60 s | Blink. Dawn: the parcel on the table (if taken) or the threshold empty.                                                                | N4-12    |

If the player never leaves 47 after 3:17: beat 12 at 3:18, the voice at the ajar door at 3:19:30
(N4-09–10), then dawn at 3:21.

Ambient pool: the lift shaft (dead lift) creaking; a far car alarm; the radiator; the neighbour's TV below. None after 3:17.

---

## Night 5 — 3:17 (target ≈ 6:00 to the choice)

Tension: cold and still (2) → preparation: clock, key, last message (3) → 03:16, the face lit by a phone opposite (4) → 03:17, everything dies including the phone (5) → held at 3:17 until the player acts.

| #   | Clock / real | Trigger                           | What happens                                                                                                                                                                                               | Text     |
| --- | ------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | 02:20 / 0:00 | night start                       | Cold air from the hall: breath vapour, the curtain moving in the draught from 48.                                                                                                                          | —        |
| 2   | —            | `interact phone`                  | 52 missed calls; message 5.                                                                                                                                                                                | N5-01–04 |
| 3   | —            | `interact clock`                  | The clock comes off the wall (heavy, in hands). Behind it, peeling wallpaper and diary page 7.                                                                                                             | K-7      |
| 4   | —            | `gaze key_ring`                   | The small brass key on the hook catches the light.                                                                                                                                                         | —        |
| 5   | —            | `interact keyhole` (before 03:17) | The key fits but will not turn: a soft mechanical stop.                                                                                                                                                    | —        |
| 6   | —            | `interact chain`                  | Chain off/on.                                                                                                                                                                                              | —        |
| 7   | —            | `interact kettle`                 | Last tea; somsa warmed if `took_parcel`.                                                                                                                                                                   | —        |
| 8   | —            | `idle 10 s`                       | 48's TV murmur through the wall, 15 s.                                                                                                                                                                     | —        |
| 9   | 03:16 / 3:44 | `clock`                           | Opposite windows go dark. Just before the 4th floor goes: someone there holds a lit phone to their face. Then dark.                                                                                        | —        |
| 10  | 03:17 / 3:48 | `clock`                           | Everything dies, including the phone in the player's hand. Then 8 s of silence.                                                                                                                            | —        |
| 11  | + 8 s        | `after 10`                        | Three slow knocks.                                                                                                                                                                                         | —        |
| 12  | + 3 s        | `after 11`                        | The voice in the player's own words, then "open the door".                                                                                                                                                 | N5-05–08 |
| 13  | after 12     | `gaze front_door`                 | Feet shadows under the entrance door, still.                                                                                                                                                               | —        |
| 14  | every 45 s   | `idle` (no ending started)        | Three slow knocks again + N5-07. **The clock never passes 3:17** until the player acts.                                                                                                                    | N5-07    |
| 15  | —            | ending inputs                     | Cross 48's threshold → A. Unchain and take the stairs down → B (possible any time tonight). Wind the clock after beat 12 → C if eligible; otherwise the key turns, the spring does not catch, a dry click. | —        |

Ambient pool: the draught door creak; pipes; the radiator cooling. None after 3:17.

---

## Endings — playable set pieces (no title, no card)

**Ending C eligibility:** all seven diary pages, sanity ≥ 40, `n3_answered = false`, and messages m1–m5 heard.
The titles appear only in the endings gallery.

### A — Qoʻshni

| #   | Trigger                   | What happens                                                                                        | Text  |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------- | ----- |
| 1   | `zone flat48` after N5-07 | 48's door closes behind the player by itself; the latch.                                            | —     |
| 2   | `after 1`                 | Darkness 6 s; only the player's breathing; camera sway.                                             | —     |
| 3   | `after 2`                 | Cut: 48, weeks later, daylight through dirty glass. Control limited to a slow shuffle within 1.5 m. | —     |
| 4   | + 5 s                     | Through the wall: a suitcase rolling, keys, a young voice, and Rustam's line, muffled.              | EA-01 |
| 5   | + 8 s                     | A phone ringing in 47, unanswered (5 rings).                                                        | —     |
| 6   | + 4 s                     | The clock in 48 shows 3:17; the daylight dies to night in 10 s.                                     | —     |
| 7   | `after 6`                 | A knock glyph appears on the party wall, the only time in the game.                                 | —     |
| 8   | `knock3 party_wall`       | Three knocks, hollow, from this side.                                                               | —     |
| 9   | `after 8`                 | The player's line, in the voice's subtitle style.                                                   | EA-02 |
| 10  | + 4 s                     | Black. Silence. Credits.                                                                            | —     |

### B — Ketish

| #   | Trigger                               | What happens                                                                                                  | Text  |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | `interact chain` + `zone stairs_down` | The landing; 48 ajar, cold.                                                                                   | —     |
| 2   | descending (playable)                 | Light under Muhabbat's door, her TV murmuring; the player can pass.                                           | —     |
| 3   | `zone entrance_ground`                | Outside: snow, orange streetlamp, empty courtyard.                                                            | —     |
| 4   | `zone bus_door`                       | An early bus, doors open, idling; inside.                                                                     | —     |
| 5   | `after 4` + 3 s                       | The phone buzzes in the pocket and rises into view: "Onam", incoming, no answer button; rings until it stops. | EB-01 |
| 6   | `after 5`                             | The bus moves; the dark window shows the player's reflection (hooded silhouette).                             | —     |
| 7   | + 4 s, one frame                      | Behind the reflection, a figure sits at the back of the bus.                                                  | —     |
| 8   | + 3 s                                 | Fade. Credits.                                                                                                | —     |

### C — 3:18

| #   | Trigger                                  | What happens                                                                                                 | Text  |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----- |
| 1   | `interact keyhole` after N5-07, eligible | Winding gesture (circular drag or touch) with resistance, ratchet clicks, a haptic per click; about 3 turns. | —     |
| 2   | `after 1`                                | Ticking starts, loud in the silence.                                                                         | —     |
| 3   | + 2 s                                    | The minute hand jumps to 3:18 with one loud tick.                                                            | —     |
| 4   | + 5 s                                    | Silence. No knock comes.                                                                                     | —     |
| 5   | `after 4`                                | Power returns gradually: fridge compressor, bulb filament orange → white, the streetlamp.                    | —     |
| 6   | + 2 s                                    | The phone lights up in the player's hand by itself: "Onam", call button.                                     | EC-01 |
| 7   | `interact call`                          | Black screen. Two real ringback tones.                                                                       | —     |
| 8   | `after 7`                                | Alone in the centre: her voice as text.                                                                      | EC-02 |
| 9   | + 3 s                                    | Silence. Credits.                                                                                            | —     |

**Muted-subtitle check.** Each ending's key event is a non-text action:

- A: the door closes, the knock gesture.
- B: the bus, the call screen with no answer button.
- C: the hand reaching 3:18, the ringback tones.

---

## 8. Every text beat has a non-text carrier

| Beat                       | Without the subtitle, the player still…                                                 |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Rustam's rule (N1-01–04)   | sees him hand over two keys and flee; hears his steps stop                              |
| Voice at 3:17 (all nights) | hears knocks and the voice audio from the wall, at the wall's position                  |
| Muhabbat (N2)              | sees her chained door, the halva, the figure over her shoulder                          |
| Mother's messages          | sees the missed-call counts rise 3 → 52 and the waveform of each message                |
| 48 (N4)                    | sees the parcel, the copy of the flat, their own passport, the calendar up to yesterday |
| Endings                    | see §Endings, muted-subtitle check                                                      |

---

## 9. Deleted in R1 (pending owner approval)

**Data model and engine.**

- `src/content/story/*` (90-node graph: `night1–5.ts`, `endings.ts`, `build.ts`, `features.ts`, `index.ts`) → `src/content/nights/n1–n5.ts` (beats) plus `endings.ts`.
- `src/core/engine/storyRunner.ts`, `effects.ts`; `types.ts`: `StoryNode`, `Line`, `Choice`, `DesktopHint`, `MobileHint`; speakers `narrator` and `player`.
  - `conditions.ts` is kept and moved under the Director.
- `src/core/narration/*`, `src/ui/narrationProvider.ts`: text-resolution "AI hook" for narration. Placeholder `{name}` resolution moves to the text table.
- `src/core/validate/validate.ts` (story graph) and `scripts/validate-story.ts` → beat validator (every TextKey exists, every trigger target exists in `layout.ts`, budgets).
- `src/ui/metaHorror.ts` (extra narration lines) → beats (§2 meta-horror).
- Sanity text corruption (`corruptText`) → inner-state signals (§2).

**UI.**

- `src/ui/NarrationText.tsx` (typewriter), `resolveAllLines`.
- `src/presenters/text/TextPresenter.tsx` and text-mode routing.
- Desktop HUD in `DesktopPresenter.tsx`:
  - narration panel, numbered choices, "Davom etish", keys 1–8, E-advances;
  - `.desktop-topline` (night/floor/flat), the Sifat and Fonus buttons;
  - the persistent controls card (→ 15 s on night 1);
  - `Interactor` glowing spheres; prompt labels (→ glyph only);
  - the timed auto-advance; `SCRIPTED_SOUNDS` (`events.ts`) → beats and ambient pool.
- `CameraRig.tsx`: `choose(near)`, zone → `advance`, listen → `choose('listen')` → Director inputs. Movement, look, torch, peephole, stretch and mirror delay are kept.
- `presenters/desktop/layout.ts`: `interactionPoint` / `nodePoint` (choice → object mapping) → object ids directly.
- Mobile (rebuilt in R5): narration panel, panel choices, hotspot hint, `scene-caption`, `ChatOverlay`, `hotspots.ts` choice anchors, `EndingVignette`, `stillId(vignette, node)`.
  - `StillScene`, `still-renderer`, `PhoneClock` and the stills pipeline are kept as the fallback, re-keyed by Director state.
- `src/ui/EndingScreen.tsx` (card) → in-world endings; titles only in `GalleryScreen`. Removed: `ending.scroll_hint`.
- `gameStore.ts`: `currentStep`, `metaLines`, `choose`, `advance`, `goToNode`, `endingCard` → Director store.
- Debug overlay: `goTo` / `choose` / `advance` → clock, beat and flag controls.

**Text.**

- All 198 narrator lines, 71 choice labels and the `player` option lines.
- `night-1..5.yaml` and `endings.yaml` are rewritten keyed by `SCRIPT_UZ` IDs.
- `ui.yaml` keys for removed HUD: `desktop.topline`, `desktop.quality*`, `desktop.flashlight*`, `mobile.hotspot_hint`, `mobile.hold_hint`, `ending.scroll_hint`.
- `scripts/text-build.ts` will generate `SCRIPT_UZ.md` from the new text table and beats in this format.
  - **Until then it would overwrite this file. Do not run `npm run dev/build/check` before R1 changes it.**

**Tests that encode the deleted model.**

This conflicts with the standing rule "do not delete or relax tests", so it needs the owner's explicit approval.

- `tests/unit/engine/storyRunner.spec.ts`, `effects.spec.ts`, `tests/unit/story/playthrough.spec.ts`, `tests/unit/narration/static.spec.ts`, the story part of `tests/unit/validate/validate.spec.ts`, the narration-corruption cases in `tests/unit/ui/horror.spec.tsx`.
- `tests/e2e/text-presenter.spec.ts`, `mobile-playthrough.spec.ts`, `mobile-scenes.spec.ts`.
- The choice/`goTo`-driven parts of `desktop.spec.ts`, `desktop-horror.spec.ts`, `qa.spec.ts`, `shell.spec.ts`, `audio.spec.ts`.
- Screenshots of removed screens (`tests/screenshots/mobile-ending-*`, `phase7-ending-*`).

Each is replaced, not dropped:

- Director headless tests: triggers, clock, response windows, ambient cooldown, determinism.
- `metrics:design` gates.
- Rewritten e2e on real input: walk, look, interact, wait.
- Performance, resource, audio-graph, save and Telegram tests stay as they are and only change how they reach a state (Director debug instead of `goTo`).

**Kept as material.** The world and validator, assets, PBR flat, figure and appearances, the audio engine and
41 recordings, `Phone.tsx`, `Inspect.tsx`, the peephole, stretch and unobserved-change logic, the save service
(→ v2), the Telegram adapter, the rental form, the content warning, settings, credits, budgets, the stills pipeline (fallback).

## 10. New world and asset needs (R1–R4)

1. 3rd-floor landing with Muhabbat's door (chain, light under the door), and the flights down to the ground-floor entrance (night 2, ending B).
2. Daylight states for the flat and the stairwell (night 2 day, ending A).
3. Exterior: courtyard, snow, streetlamp, bus with an interior (ending B).
4. Rustam aka: a second humanoid seen from behind on a dark stairwell. It must not be the figure model.
5. Muhabbat opa: only a sliver through the chained door (scarf, eye, hand with a plate). No full character model needed.
6. Objects:
   - key ring (two keys) and a hook by the door;
   - pillow;
   - halva plate; bread bag;
   - food parcel with steam;
   - wet footprint and dust footprint decals;
   - the clock as a removable, windable object with a keyhole;
   - a peeling wallpaper patch;
   - the coat-pocket page; the raised floorboard;
   - the passport in the bag;
   - palm condensation decal.
7. Phone UI states: lock screen with date, work messages, incoming call with and without an answer button, the call screen, ringback.
8. A player reflection silhouette for the bus window (ending B).
9. Sounds not yet in the library: crows/sparrows at dawn, bus idle and doors, ringback tone, suitcase wheels, ratchet clicks, latch, a cough inside TV static, a muffled young voice.
   - All from the same licensed sources and pipeline.

## 11. Decisions for the owner

**Owner answers (2026-10-28), applied in R1 (DECISIONS 63):** 1 — the clock comes off the wall at any time on night 5, but the key turns only after N5-07. 2 — as recommended; no automatic ending. 3 — real recordings: the owner records the mother (a woman) and the wall voice (himself); lines and directions in `RECORDING.md`. 4 — no second model: only Rustam's hand with the key ring, his sleeve and his breath; his face is never seen. 5 — the ban covers narration only; every spoken line is exempt. 6 — kept, as paper Rustam hands over. 7 — approved, with every surviving behaviour re-tested (mapping in DECISIONS 71). 8 — as recommended.

The questions as asked:

1. **Ending C timing.** Winding catches only after the voice says "Eshikni och" (N5-07); before that the key will not turn. _Recommended._ Alternative: winding works at any time on night 5.
2. **Night 5 idle.** Time stays at 3:17 and the knocks repeat every 45 s until the player acts; no automatic ending. _Recommended._ Alternative: after 5 minutes, ending A starts by itself.
3. **Voice audio.**
   - Mother's messages: transcript only, or a real recorded voice (≈100 words; e.g. a relative, recorded by the owner). _Recording recommended._
   - The wall voice: subtitles + whisper bed, or recorded and processed lines (≈150 words).
4. **Rustam aka's model.** A second CC0 / CC-BY humanoid (recommended), or reuse the figure rig with different clothes (not recommended: it blurs who the figure is).
5. **Lint rule.** The second-person verb ban (`-dingiz`, `-yapsiz`) must exempt the `voice` speaker. Its required lines ("Qoʻshni… uxlamayapsizmi?", "Kecha javob berdingiz…") are dialogue addressed to the player, not narration. The body-word ban (nafas/yurak/qoʻl/koʻz… + verb) applies to everyone.
6. **Rental form.** Keep it as the pre-game paper (33 words; its answers feed the voice). _Recommended._
7. **Test deletions** in §9: approve replacing the graph-based tests.
8. **Night 2 day.** Going down one flight is enough (3rd floor); there is no shop scene.
