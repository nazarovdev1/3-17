# Fear design — "3:17"

Written before scripting (FIX_PROMPT §7). Every night follows the same five-step curve:
**quiet → unease → build → peak → release**. The release is never full relief. It is a smaller,
quieter unease that carries into the next day.

## The core

The player is a young person from a region, alone in Tashkent, working night shifts and studying,
sleeping badly. Their mother calls every day. They do not answer. Flat 48 is what loneliness turns
into when you let it in.

The horror engine is **the gap between the phone and the wall**:

- On the phone, a warm voice the player keeps ignoring.
- Behind the wall, a cold voice the player keeps listening to.

Over five nights the wall learns the phone's words.

Two readings stay open to the very end and are never confirmed:

| Supernatural                                                      | Psychological                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Sardor's diary pages, Muhabbat opa's story, the sealed door of 48 | Insomnia, days that blur, missed work the player doesn't remember      |
| The voice knows the rental form (left with Rustam aka)            | A diary page in the player's own handwriting, a fresh tally mark       |
| Flat 48 holds the player's passport and bag                       | The player stops leaving the flat, then stops counting days            |
| The stopped clock; time won't pass 3:17                           | The player can't make themselves "start the clock" — call home, go out |

## Global rules

- **Silence is the main tool.** The fridge hum stopping at 3:17 is the scariest sound in the game.
  After it, nothing plays except the room tone and the player's own actions.
- **At most one jump scare per night**, earned by at least 2 minutes of build. Marked ★ below.
- **Things change when not observed.** Desktop uses frustum checks; mobile uses revisits.
- **Sounds come from the wrong place:**
  - footsteps above (flat 57 is empty)
  - a knock from inside the wardrobe
  - breathing behind the wall, in sync with the player's
- **The game knows the player:**
  - the rental form
  - the real clock
  - leaving and coming back
  - the player's own earlier words, quoted back
- **The threat is never seen clearly.** It only appears as a silhouette, a shadow, a backlit shape or
  a reflection (FIX_PROMPT §4.4).
- **Forbidden:** monsters, blood, red "blood" text, screaming faces, loud stingers without build.

## The phone — escalation table

| Night | Missed calls "Onam" | New voice message                                   | Voice behind the wall                |
| ----- | ------------------- | --------------------------------------------------- | ------------------------------------ |
| 1     | 3                   | "Yetib bordingmi? Uy issiqmi?"                      | polite _siz_, asks if you sleep      |
| 2     | 11                  | money, snow at home, "issiq kiyin"                  | _siz_, quotes the rental form        |
| 3     | 24                  | **"Bolam, nega telefonni olmayapsan?"** + the dream | switches to **sen**, no comment      |
| 4     | 40                  | food sent with Shuhrat aka, "Eshityapsanmi?"        | **speaks in the mother's words**     |
| 5     | 52                  | "Endi koʻp qoʻngʻiroq qilmayman… eshigimiz ochiq"   | **speaks in the player's own words** |

Each message can be listened to (`mom_msg_N`) or left. One that is left is gone. On night 4 the wall
speaks the words of messages the player **never heard**. Ending C requires all five.

## Night 1 — "Koʻchib kelish" (arrival)

| Beat    | Time in play | Events                                                                                                                                                                                                                         |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quiet   | 0:00–2:00    | Rustam aka hands over the keys too fast (the key is warm from his grip). Fridge hum, radiator tick, snow.                                                                                                                      |
| Unease  | 2:00–5:00    | The note has a line added in a different pen ("Ismingizni aytsa ham ochmang"). TV static: someone coughs once. The opposite building has one lit window on the 4th floor, curtains open, nobody inside. Phone: 3 missed calls. |
| Build   | 5:00–7:00    | Lying awake. 3:16: the opposite windows go dark floor by floor, the 4th floor last.                                                                                                                                            |
| Peak    | 3:17         | Power cut. **The fridge stops.** Long silence (≥ 4 s, no music). Then three knocks from the wall of 48. "Qoʻshni… uxlamayapsizmi?"                                                                                             |
| Release | dawn         | The power is back and the fridge hums again. The clock still says 3:17. The phone goes face down.                                                                                                                              |

No jump scare. The silence is the scare.

## Night 2 — "Devor" (the wall)

| Beat    | Time      | Events                                                                                                                                                                                                                                                    |
| ------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quiet   | day       | Stairwell: Muhabbat opa with warm halva, nosy and kind. Sardor's story: the mother who waited at his door. "Onangga qoʻngʻiroq qilib tur."                                                                                                                |
| Unease  | 0:00–3:00 | Back from the shift. A coat in the wardrobe that isn't yours. Tally marks; the last one is fresh, wood dust still on the shelf. Diary page 1 in the coat pocket.                                                                                          |
| Build   | 3:00–6:00 | Bathroom: the reflection turns half a second late, then turns in time but keeps looking at you. Diary page 2 behind the bath. Listening at the wall: breathing, in sync with yours. When you stop, it stops.                                              |
| Peak    | 3:17      | Fridge stops. Knocks. The voice answers the rental form ("Yolgʻiz yashaysiz-a? Men ham."). ★ **Jump scare (optional, earned):** while listening, the knock lands right at your ear (desktop: spatial knock at the listen position; mobile: heavy haptic). |
| Release | dawn      | The player wakes dressed, with the phone on their chest. 11 missed calls.                                                                                                                                                                                 |

## Night 3 — "Takror" (repetition)

| Beat    | Time      | Events                                                                                                                                                                                                                           |
| ------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quiet   | evening   | The phone says Tuesday; the player thought it was Monday. Work: "Bugun ham kelmaysizmi?" Rustam aka calls and is answered on the first ring (the contrast with the mother is the point).                                         |
| Unease  | 0:00–3:00 | The corridor stretches when unobserved. The clock is on another wall when you come back; a pale rectangle marks where it hung.                                                                                                   |
| Build   | 3:00–6:00 | Diary page 4 under the carpet, **in the player's own handwriting**: "Onamga qoʻngʻiroq qilish kerak. Ertaga." The TV shows this room from above; the figure on the sofa turns its head. The black screen reflects an empty sofa. |
| Peak    | 3:17      | No knock. A cough behind the wall. Then the voice, **now in _sen_**, tells the player's night-1 reaction as its own memory.                                                                                                      |
| Release | dawn      | If silent: the wall is warm in the morning, and 48 has no heating.                                                                                                                                                               |

Jump scare: none. The tension comes from the voice saying "sen" for the first time.

## Night 4 — "48"

| Beat    | Time       | Events                                                                                                                                                                                                                                                                                                                                                     |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quiet   | evening    | Work: "Ertaga kelmasangiz, boshqa odam olamiz." The phone goes under the pillow. 40 missed calls.                                                                                                                                                                                                                                                          |
| Unease  | 0:00–3:00  | The mother's message: food sent with Shuhrat aka. Diary page 6. Something is slid along the corridor floor.                                                                                                                                                                                                                                                |
| Build   | 3:17       | Power cut **without knocks**. One step on the landing. ★ **Peephole (the jump, earned by the missing knocks):** a tall figure in a long coat, back turned. Look away and look back: nobody. Wet footprints lead to door 48.                                                                                                                                |
| Peak    | inside 48  | The doorstep bundle (somsa, still warm) sits outside 47. 48 is a decayed copy: your bag, your passport covered in dust, the calendar crossed out up to yesterday. A short in-game glitch. Then the voice, **in the mother's words**: "Bolam, nega telefonni olmayapsan?" If that message was never heard: "Siz bu xabarni eshitmagan edingiz. U eshitgan." |
| Release | back in 47 | Dust on your hands. The phone vibrates under the pillow several times; you don't pick it up.                                                                                                                                                                                                                                                               |

## Night 5 — "3:17"

| Beat    | Time      | Events                                                                                                                                                                                                                            |
| ------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quiet   | evening   | You didn't go out today, or yesterday. The cold flows in from the open door of 48.                                                                                                                                                |
| Unease  | 0:00–3:00 | The last message: "Eshigimiz ochiq. Kelsang ham, kelmasang ham." The clock has a keyhole, and a small brass key is on your ring. Diary 7: Sardor was afraid that if the clock moved, he would have to move too.                   |
| Build   | 3:16      | The windows go dark. The phone screen dies at 3:17 although it was fully charged.                                                                                                                                                 |
| Peak    | 3:17      | Three soft, almost tender knocks. The voice quotes **the player's own words**: the unsent "Yaxshiman, ona", the night-1 answer, the question about Sardor. "Eshikni och. Bu yerda hech kim seni qoʻngʻiroq bilan bezor qilmaydi." |
| Release | ending    | A — the voice passes on. B — the street, relief, the phone buzzes, not answered. C — 3:18, silence, a call, "Alo… bolam?"                                                                                                         |

## Things that change when not observed (implementation hooks for F4/F6)

| Night | Change                                                                           |
| ----- | -------------------------------------------------------------------------------- |
| 1     | The phone is face down when you return from the kitchen.                         |
| 2     | A coat on the hook that isn't yours; the wardrobe door ajar.                     |
| 3     | The clock on another wall; one chair moved to face the wall of 48.               |
| 4     | The front door's chain hanging loose though you fastened it; the bundle outside. |
| 5     | Door 48 open; the cold makes breath visible in the corridor.                     |
