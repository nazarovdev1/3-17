# DIAGNOSIS — why "3:17" plays like a book

Date: 2026-10-28. Build: commit `d5a3898` (F6). No game code was changed for this report.
Evidence lives in `audit/screenshots/diagnosis/` (ignored): playthrough JSON logs, every
per-node screenshot, idle logs, ending captures and the two contact sheets.

**How it was measured.** A Playwright harness played the real build in real time on desktop
(1440×900, 3D) and mobile emulation (360×640). It acted like a reader: it waited for the
typewriter, read every shown word at 180 wpm, then pressed what was offered. It used the
on-screen buttons, which the game accepts on desktop too; it did not walk. Sounds were logged
from the audio engine's own record. Limits: night 4 was entered by jumping to `n4_start`
(no flags from nights 1–3), and SwiftShader software rendering was used.

---

## 1. STATE

**Phase.** F6 Mobile is committed (`d5a3898`) and awaits owner visual review. F4 is marked
"verified; awaiting owner review" and was never signed off. **F7 (Fear pass: play every
night, tune pacing) and F8 (Full QA) have not started.** No fear tuning has ever been done
against actual play.

Recent history (`git log --oneline -20`): Phases 2–9 of the original PROMPT built a text
game first, then pixel presenters. FIX_PROMPT phases F0–F6 rebuilt the art, audio, world
and mobile on top of the same story graph:

```
d5a3898 F6 mobile HD stills · 8685684 F5 audio · 2bc1be4 F4 desktop horror ·
eb16e8e/2702c2e F3 desktop flat · 7005dfa F2 assets · 9c4dbb7/48edd1b F0–F1 story ·
4b52065…3e56475 original phases 2–9 (text presenter first, "77 nodes … text presenter
with real-click e2e playthroughs to every ending")
```

| FIX_PROMPT feature                         | Status           | Reality in the build                                                                                                                                                                                                                                                                                         |
| ------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PBR materials / lighting                   | done             | Real PBR flat, HDRI, shadows. Flaw: the ceiling lamp is blown out at the top of nearly every desktop room frame (contact sheet).                                                                                                                                                                             |
| Real assets (models/textures/HDRI)         | done             | Shipped and credited.                                                                                                                                                                                                                                                                                        |
| Figure (§4.4)                              | partial          | 6 scripted appearances (n2 day, n3 corridor/TV, n4 under-door/peephole, n5 final). **Zero on night 1.** On desktop it appears only if the camera happens to be pointed there. F4 is unreviewed.                                                                                                              |
| Recorded audio + HRTF (§8)                 | done             | 41 recorded files, spatial knocks. But sound is mostly a consequence of pressing a button (§3).                                                                                                                                                                                                              |
| Fear events (§7)                           | partial          | Events exist, but almost all are **narrated** in the text panel rather than experienced. Only 3 "sound from the wrong place" cues exist (n2 footsteps above, n3 wardrobe knock, n4 step). The first two are desktop-only and fire only after 38/44 s of staying in a hub. The F7 pacing pass never happened. |
| Things change when unobserved              | partial          | Desktop has the corridor stretch (gaze) and the moved clock/coat. Mobile has revisit variants. Both are usually also stated in text.                                                                                                                                                                         |
| Mobile mode (§5)                           | done, unreviewed | HD stills, depth parallax, hotspots. The scene sits on top of a text panel; same story graph.                                                                                                                                                                                                                |
| Meta-horror (late hour, return, real 3:17) | done             | Delivered as **extra text lines** (`metaLines`) prepended to the narration.                                                                                                                                                                                                                                  |

---

## 2. TEXT METRICS

Script: `metrics.ts` (scratchpad). It iterates over the compiled story; per line it counts the unconditional text.

```
## night 1  nodes 17 | lines 57 | words 492 | reading 2.7 min @180wpm
speakers {"narrator":46,"landlord":4,"mother":1,"voice":5,"player":1}
narrator lines with body/feeling/2nd-person action: 15 of 46 (32%)
choice buttons 13 | menus 3 | avg options 4.33 | longest 8 | "continue"-only nodes 14

## night 2  nodes 17 | lines 48 | words 486 | reading 2.7 min
speakers {"narrator":28,"muhabbat":13,"mother":2,"diary":2,"voice":3}
narrator body/feeling/action: 14 of 28 (50%)
choice buttons 14 | menus 4 | avg 3.50 | longest 7 | continue-only 13

## night 3  nodes 19 | lines 51 | words 441 | reading 2.5 min
speakers {"narrator":37,"landlord":2,"mother":3,"diary":2,"voice":6,"player":1}
narrator body/feeling/action: 18 of 37 (48%)
choice buttons 14 | menus 5 | avg 2.80 | longest 7 | continue-only 14

## night 4  nodes 22 | lines 59 | words 517 | reading 2.9 min
speakers {"narrator":43,"mother":3,"diary":4,"voice":7,"player":2}
narrator body/feeling/action: 19 of 43 (44%)
choice buttons 18 | menus 5 | avg 3.60 | longest 7 | continue-only 17

## night 5  nodes 12 | lines 29 | words 294 | reading 1.6 min
speakers {"narrator":22,"mother":2,"diary":2,"voice":3}
narrator body/feeling/action: 7 of 22 (31%)
choice buttons 12 | menus 3 | avg 4.00 | longest 7 | continue-only 9

## endings  nodes 3 | lines 24 | words 196 | reading 1.1 min
speakers {"narrator":22,"voice":1,"mother":1}
narrator body/feeling/action: 16 of 22 (72%)

## TOTAL  nodes 90 | lines 268 | words 2426 | reading 13.5 min @180wpm (+267 words of conditional variants)
speakers {"narrator":198,"voice":25,"muhabbat":13,"mother":12,"diary":10,"landlord":6,"player":4}
narrator lines describing the player's body / feelings / actions: 89 of 198 (44%)
  of which stating body or inner state outright: 30 (n1 7, n2 5, n3 6, n4 6, n5 1, endings 5)
choice buttons 71 | menus 20 | avg options 3.55 | longest 8 (n1_hub)
hub menus: n1_hub 8, n2_night_hub 7, n3_hub 7, n4_hub 7, n5_hub 7
"Continue"-only nodes: 67 of 90
desktop trigger hints: none 47 · interact 26 · scripted 12 · zone 4 · timed 1
```

The narrator speaks **198 of 268 lines (74%)**. The voice behind the wall, the supposed
antagonist, has **25 lines (9%)**. The mother, the emotional core, has **12 (4%)**.

**The 20 worst narrator lines** (detector hits | node | text). They tell the player's body,
actions or feelings in the second person. The owner's example, "Chuqur nafas oldingiz", is
`endB` l4; it scores 1 hit and so is just below this list.

```
4 | n1_silent | Nafasingizni ichingizga yutdingiz. Bolalikda qorongʻida xuddi shunday yotardingiz: qimirlamasang, koʻrishmaydi.
3 | n3_corridor_run | Koʻzingizni yumib ochdingiz va xonada, divan oldida turganingizni koʻrdingiz.
3 | n1_message | Javob yozmoqchi boʻldingiz, ammo barmogʻingiz ekran ustida qotib qoldi.
3 | n2_listen | Nafasingizni toʻxtatdingiz. Devorning u tomonidagi nafas ham toʻxtadi.
3 | n3_silent | Indamadingiz. Tizzalaringizni quchoqlab, tong otguncha oʻtirdingiz.
3 | n4_tea | Piyoladagi choy titrab turibdi. Yoki qoʻlingiz titrayaptimi?
2 | n1_start | Zinapoyada chiroq yoʻq edi, telefon chirogʻida chiqib keldingiz. Smenadan keyin oyoqlaringiz oʻzingizniki emasdek.
2 | n3_start | Ishxonadan xabar keldi — «Bugun ham kelmaysizmi?» Kecha ishga borgandingiz-ku. Yoki bormagan edingizmi?
2 | n2_draft | Barmogʻingiz joʻnatish tugmasi ustida toʻxtab qoldi. Keyin harflarni bittalab oʻchirib chiqdingiz.
2 | n3_silent | Ertalab devorga kaftingizni qoʻydingiz. Devor iliq edi, holbuki qirq sakkizda isitish yoʻq.
2 | n5_start | Bugun koʻchaga chiqmadingiz. Kecha ham, undan oldingi kun ham chiqmagandingiz, shekilli.
2 | endA | Devor ortida, qirq yettida telefoningiz titrab yotardi. Keyin u ham titrashdan toʻxtadi.
2 | n4_retreat | Tugunni ichkariga olib kirdingiz va qatlamadan bir tishlab koʻrdingiz. Uyning ta’mi.
2 | endB | Siz unga uzoq qarab turdingiz, keyin telefonni choʻntagingizga solib qoʻydingiz.
2 | n1_knock_back | Musht bilan devorga uch marta urdingiz, barmoq boʻgʻinlaringiz achishib ketdi.
2 | n1_tea | Choynakni olovga qoʻyib, gazning koʻk tili yonida qoʻllaringizni isitdingiz.
2 | n5_message | Xabar tugadi, siz esa telefonni ancha vaqtgacha qoʻlingizdan qoʻymadingiz.
2 | n2_day_start | Kunduzi atigi uch soat uxladingiz, keyin non olgani pastga tushdingiz.
2 | n2_mirror | Boshingizni oʻngga burdingiz, oynadagi siz esa bir lahza kech burildi.
2 | n4_sleep | Uxlay olmadingiz. Yostiq ostida telefon bir necha marta titradi.
```

Also: `endB` "Chuqur nafas oldingiz. Sovuq havo oʻpkangizni achitdi." and `n1_317` "Uy shu
qadar jim boʻldiki, qulogʻingiz oʻz-oʻzidan biror tovush qidira boshladi." These narrate the
very perception the scene should create. The FIX_PROMPT cliché ban ("yuragim tez ura
boshladi"…) was obeyed literally. The underlying problem, second-person narration of the
player's acts and body, was never banned or linted.

---

## 3. MOMENT-TO-MOMENT PLAY

Timelines are below. "N buttons" counts every visible button. `*` marks the player's own
footsteps/cloth/page sounds. "no ambience" means every ambient layer is off after the power cut.

#### desktop-n1 — 315.7 s total

| t (s) | on screen                                           | player does                           | text shown                                                                      | sound                    |
| ----- | --------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- | ------------------------ |
| 0     | n1_start; text panel, 5 buttons                     | Continue                              | "Chilonzordagi toʻqqiz qavatli panel uy, toʻrtinchi qavat.…" (80 w)             | door_close, phone_buzz   |
| 43.8  | n1_hub; text panel, 12 buttons                      | choose clock                          | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                               | —                        |
| 52.9  | n1_clock; text panel, 5 buttons                     | Continue                              | "Devorda katta soat osilib turibdi, oynasi changli,…" (28 w)                    | —                        |
| 71    | n1_hub; text panel, 11 buttons                      | choose note                           | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                               | phone_buzz               |
| 80.6  | n1_note; text panel, 5 buttons                      | Continue                              | "Stol ustida buklangan qogʻoz yotibdi. Rustam akaning…" (43 w)                  | —                        |
| 105.6 | n1_hub; text panel, 10 buttons                      | choose radiator                       | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                               | —                        |
| 115.4 | n1_radiator; text panel, 5 buttons                  | Continue                              | "Choʻyan radiatorning ustida eski paypoq izi qolgan,…" (31 w)                   | radiator                 |
| 132.6 | n1_hub; text panel, 9 buttons                       | choose tv                             | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                               | phone_buzz               |
| 142.4 | n1_tv; text panel, 5 buttons                        | Continue                              | "Yogʻoch qutili eski «Rubin» televizori, antennasi skotch…" (33 w)              | static                   |
| 162.3 | n1_hub; text panel, 8 buttons                       | choose window                         | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                               | —                        |
| 171.2 | n1_window; text panel, 5 buttons                    | Continue                              | "Roʻparada xuddi shunday toʻqqiz qavatli uy, qator-qator…" (33 w)               | —                        |
| 189.7 | n1_hub; text panel, 7 buttons                       | choose phone                          | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                               | —                        |
| 198.8 | n1_phone; text panel, 6 buttons                     | choose hear                           | "Telefon stol ustida, quvvatlagichga ulangan holda yotibdi.…" (20 w)            | —                        |
| 210.7 | n1_message; text panel, 5 buttons                   | Continue                              | "Bolam, yetib bordingmi? Uy issiqmi oʻzi? Bir…" (37 w)                          | cloth*                   |
| 231.1 | n1_hub; text panel, 6 buttons                       | choose tea                            | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                               | phone_buzz               |
| 239.9 | n1_tea; text panel, 5 buttons                       | Continue                              | "Oshxona tor: plita, muzlatgich va bitta taburetka.…" (33 w)                    | kettle, step_board*      |
| 258.6 | n1_hub; text panel, 5 buttons                       | choose sleep                          | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                               | step_wood*               |
| 267.3 | n1_316 → n1_317 (timer fired mid-read); no ambience | Continue (lands on 3:17 and skips it) | "Yotdingiz, lekin uyqu kelmadi. Telefonda soat 3:16.…" (21 w)                   | window_dark, fridge_stop |
| 279.7 | n1_knocks; text panel, 7 buttons; no ambience       | choose silent                         | "Bu devorning ortida qirq sakkizinchi xonadon turibdi.…" (9 w)                  | knock_triple, whisper    |
| 286.2 | n1_silent; text panel, 5 buttons; no ambience       | Continue                              | "Nafasingizni ichingizga yutdingiz. Bolalikda qorongʻida xuddi shunday…" (26 w) | whisper                  |
| 302.4 | n1_sleep; text panel, 5 buttons; no ambience        | Continue                              | "Tong otdi. Tok qaytdi, muzlatgich yana gʻuvillay…" (22 w)                      | phone_buzz               |
| 315.7 | next night begins                                   | —                                     | —                                                                               | —                        |

#### mobile-n1 — 315 s total

| t (s) | on screen                                     | player does     | text shown                                                           | sound                 |
| ----- | --------------------------------------------- | --------------- | -------------------------------------------------------------------- | --------------------- |
| 0     | n1_start; text panel, 2 buttons               | Continue        | "Chilonzordagi toʻqqiz qavatli panel uy, toʻrtinchi qavat.…" (80 w)  | —                     |
| 43.8  | n1_hub; text panel, 9 buttons                 | choose clock    | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                    | —                     |
| 52.2  | n1_clock; text panel, 2 buttons               | Continue        | "Devorda katta soat osilib turibdi, oynasi changli,…" (28 w)         | —                     |
| 67.9  | n1_hub; text panel, 8 buttons                 | choose note     | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                    | —                     |
| 76.9  | n1_note; text panel, 2 buttons                | Continue        | "Stol ustida buklangan qogʻoz yotibdi. Rustam akaning…" (43 w)       | —                     |
| 100.7 | n1_hub; text panel, 7 buttons                 | choose radiator | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                    | —                     |
| 109.1 | n1_radiator; text panel, 2 buttons            | Continue        | "Choʻyan radiatorning ustida eski paypoq izi qolgan,…" (31 w)        | radiator              |
| 125.9 | n1_hub; text panel, 6 buttons                 | choose tv       | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                    | —                     |
| 134.5 | n1_tv; text panel, 2 buttons                  | Continue        | "Yogʻoch qutili eski «Rubin» televizori, antennasi skotch…" (33 w)   | static                |
| 153.3 | n1_hub; text panel, 5 buttons                 | choose window   | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                    | —                     |
| 161.8 | n1_window; text panel, 2 buttons              | Continue        | "Roʻparada xuddi shunday toʻqqiz qavatli uy, qator-qator…" (33 w)    | —                     |
| 180.2 | n1_hub; text panel, 4 buttons                 | choose phone    | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                    | —                     |
| 188.5 | n1_phone; text panel, 3 buttons               | choose hear     | "Telefon stol ustida, quvvatlagichga ulangan holda yotibdi.…" (20 w) | —                     |
| 200.2 | n1_message; text panel, 2 buttons             | Continue        | "Bolam, yetib bordingmi? Uy issiqmi oʻzi? Bir…" (37 w)               | cloth*                |
| 220   | n1_hub; text panel, 3 buttons                 | choose tea      | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                    | —                     |
| 228.5 | n1_tea; text panel, 2 buttons                 | Continue        | "Oshxona tor: plita, muzlatgich va bitta taburetka.…" (33 w)         | kettle, step_board*   |
| 247.3 | n1_hub; text panel, 2 buttons                 | choose sleep    | "Xona sovuq, lekin toza. Polda hali hoʻl…" (15 w)                    | step_wood*            |
| 255.5 | n1_316; text panel, 2 buttons                 | Continue        | "Yotdingiz, lekin uyqu kelmadi. Telefonda soat 3:16.…" (21 w)        | window_dark           |
| 268.1 | n1_317; text panel, 2 buttons; no ambience    | Continue        | "3:17. Chiroq oʻchdi va muzlatgich gʻuvillashdan toʻxtadi.…" (25 w)  | fridge_stop           |
| 282   | n1_knocks; text panel, 4 buttons; no ambience | choose silent   | "Qoʻshni… uxlamayapsizmi? / Bu devorning ortida qirq…" (10 w)        | knock_triple, whisper |
| 288   | n1_silent; text panel, 2 buttons; no ambience | Continue        | "Eshigingiz yopiq ekan. Yaxshi, men ham yopib…" (27 w)               | whisper               |
| 302.4 | n1_sleep; text panel, 2 buttons; no ambience  | Continue        | "Tong otdi. Tok qaytdi, muzlatgich yana gʻuvillay…" (22 w)           | —                     |
| 315   | next night begins                             | —               | —                                                                    | —                     |

#### desktop-n4 — 311.4 s total

| t (s) | on screen                                             | player does                            | text shown                                                                    | sound                                  |
| ----- | ----------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| 0–4.1 | n4_start, scripted arrival; no text yet               | nothing possible                       | —                                                                             | door_close                             |
| 4.1   | n4_start; text panel, 5 buttons                       | Continue                               | "Ishxonadan yana xabar keldi — «Ertaga kelmasangiz,…" (27 w)                  | —                                      |
| 18    | n4_hub; text panel, 8 buttons                         | choose phone                           | "Yostiq ostida telefon bir-ikki titrab qoʻydi." (6 w)                         | —                                      |
| 22.8  | n4_phone; text panel, 6 buttons                       | choose hear                            | "Ekran yorishdi. Javobsiz qoʻngʻiroqlar soni qirqqa yetibdi,…" (15 w)         | —                                      |
| 31.8  | n4_message; text panel, 5 buttons                     | Continue                               | "Bolam… Shuhrat akaning mashinasida ovqat berib yubordim.…" (27 w)            | cloth*                                 |
| 47.6  | n4_hub; text panel, 7 buttons                         | choose carpet                          | "Yostiq ostida telefon bir-ikki titrab qoʻydi." (6 w)                         | phone_buzz                             |
| 52.4  | n4_diary6; text panel, 5 buttons                      | Continue                               | "Kecha koʻtarilib qolgan taxtani qoʻporib oldingiz, tagidan…" (36 w)          | page*, step_wood*, door_open           |
| 71.5  | n4_hub; text panel, 6 buttons                         | choose tea                             | "Yostiq ostida telefon bir-ikki titrab qoʻydi." (6 w)                         | step_wood*                             |
| 76.1  | n4_tea; text panel, 5 buttons                         | Continue                               | "Choy qoʻydingiz. Gazning koʻk alangasi devorga titroq…" (16 w)               | kettle, step_board*                    |
| 85.8  | n4_hub; text panel, 5 buttons                         | **choose "Tokning oʻchishini kutish"** | "Yostiq ostida telefon bir-ikki titrab qoʻydi." (6 w)                         | step_wood*                             |
| 90    | n4_317; text panel, 5 buttons; no ambience            | Continue                               | "3:17. Tok yana ketdi va muzlatgich tindi.…" (19 w)                           | fridge_stop, step_concrete, phone_buzz |
| 101.6 | n4_hub; text panel, 5 buttons; no ambience            | choose peephole                        | "Atrof qorongʻi, derazadan faqat koʻcha chirogʻining sariq…" (9 w)            | —                                      |
| 109.3 | n4_peephole; text panel, 5 buttons; no ambience       | Continue                               | "Eshik koʻzidan qaradingiz. Maydoncha egilib, xira shar…" (40 w)              | step_wood*                             |
| 131.2 | n4_hub; text panel, 5 buttons; no ambience            | choose corridor                        | "Atrof qorongʻi, derazadan faqat koʻcha chirogʻining sariq…" (9 w)            | step_wood*                             |
| 137.3 | n4_door48; text panel, 6 buttons; no ambience         | choose enter                           | "Maydonchada sovuq. Lift ishlamaydi, zinapoya zim-ziyo. Ostonangizda…" (28 w) | door_open, step_wood*, door_open       |
| 153.4 | n4_inside48; text panel, 5 buttons; no ambience       | Continue                               | "Ichkarida sovuq va chang hidi. Gilam, divan,…" (34 w)                        | door_open, step_wood*, phone_buzz      |
| 172.1 | n4_copy_room; text panel, 7 buttons; no ambience      | choose calendar                        | "Koʻzingiz qorongʻiga asta koʻnikib boryapti." (5 w)                          | —                                      |
| 176.2 | n4_calendar; text panel, 5 buttons; no ambience       | Continue                               | "Devorda yirtma kalendar osilgan. Yili yozilmagan, faqat…" (28 w)             | —                                      |
| 192.2 | n4_copy_room; text panel, 7 buttons; no ambience      | choose belongings                      | "Koʻzingiz qorongʻiga asta koʻnikib boryapti." (5 w)                          | —                                      |
| 196.4 | n4_belongings; text panel, 5 buttons; no ambience     | Continue                               | "Divanda sumka yotibdi. Sizning sumkangiz — yirtilgan…" (31 w)                | —                                      |
| 213.5 | n4_copy_room; text panel, 6 buttons; no ambience      | choose diary                           | "Koʻzingiz qorongʻiga asta koʻnikib boryapti." (5 w)                          | —                                      |
| 217.7 | n4_diary5; text panel, 5 buttons; no ambience         | Continue                               | "Stul ustida bir varaq qogʻoz. Xati shkafdagi…" (31 w)                        | page*, phone_buzz                      |
| 234.9 | n4_copy_room; text panel, 5 buttons; no ambience      | **choose "glitch"**                    | "Koʻzingiz qorongʻiga asta koʻnikib boryapti." (5 w)                          | —                                      |
| 239.1 | n4_glitch; text panel, 5 buttons; no ambience         | Continue                               | "Yotoq tomonga yurdingiz. Qorongʻida nimadir qimirladi. Koʻz…" (30 w)         | static                                 |
| 256.9 | n4_voice_identity; text panel, 6 buttons; no ambience | choose why                             | "Bu safar ovoz devor ortidan emas, shu…" (35 w)                               | whisper                                |
| 276.4 | n4_why; text panel, 5 buttons; no ambience            | Continue                               | "Bu gaplarni qayerdan bilasan? Telefoning yostiq ostida…" (20 w)              | whisper                                |
| 288.7 | n4_return; text panel, 5 buttons; no ambience         | Continue                               | "Oʻz xonangizga qaytdingiz va eshikdagi raqamga qaradingiz:…" (26 w)          | step_wood*, phone_buzz                 |
| 303.9 | n4_sleep; text panel, 5 buttons; no ambience          | Continue                               | "Uxlay olmadingiz. Yostiq ostida telefon bir necha…" (11 w)                   | —                                      |
| 311.4 | next night begins                                     | —                                      | —                                                                             | —                                      |

#### mobile-n4 — 289.6 s total

| t (s) | on screen                                                  | player does       | text shown                                                                    | sound                 |
| ----- | ---------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------- | --------------------- |
| 0     | n4_start; text panel, 2 buttons                            | Continue          | "Ishxonadan yana xabar keldi — «Ertaga kelmasangiz,…" (27 w)                  | door_close            |
| 16    | n4_hub; text panel, 5 buttons                              | choose phone      | "Yostiq ostida telefon bir-ikki titrab qoʻydi." (6 w)                         | —                     |
| 20.2  | n4_phone; text panel, 3 buttons                            | choose hear       | "Ekran yorishdi. Javobsiz qoʻngʻiroqlar soni qirqqa yetibdi,…" (15 w)         | —                     |
| 28.8  | n4_message; text panel, 2 buttons                          | Continue          | "Bolam… Shuhrat akaning mashinasida ovqat berib yubordim.…" (27 w)            | cloth*                |
| 43.9  | n4_hub; text panel, 4 buttons                              | choose carpet     | "Yostiq ostida telefon bir-ikki titrab qoʻydi." (6 w)                         | —                     |
| 48.2  | n4_diary6; text panel, 2 buttons                           | Continue          | "Kecha koʻtarilib qolgan taxtani qoʻporib oldingiz, tagidan…" (36 w)          | page*, step_wood*     |
| 67    | n4_hub; text panel, 3 buttons                              | choose tea        | "Yostiq ostida telefon bir-ikki titrab qoʻydi." (6 w)                         | step_wood*            |
| 71.3  | n4_tea; text panel, 2 buttons                              | Continue          | "Choy qoʻydingiz. Gazning koʻk alangasi devorga titroq…" (16 w)               | kettle, step_board*   |
| 81    | n4_hub; text panel, 2 buttons                              | choose wait       | "Yostiq ostida telefon bir-ikki titrab qoʻydi." (6 w)                         | step_wood*            |
| 85.2  | n4_317; text panel, 2 buttons; no ambience                 | Continue          | "3:17. Tok yana ketdi va muzlatgich tindi.…" (19 w)                           | fridge_stop           |
| 96.1  | n4_hub; text panel, 2 buttons; no ambience                 | choose peephole   | "Atrof qorongʻi, derazadan faqat koʻcha chirogʻining sariq…" (9 w)            | —                     |
| 102.2 | n4_peephole; text panel, 2 buttons; no ambience            | Continue          | "Eshik koʻzidan qaradingiz. Maydoncha egilib, xira shar…" (40 w)              | step_wood*            |
| 124.5 | n4_hub; text panel, 2 buttons; no ambience                 | choose corridor   | "Atrof qorongʻi, derazadan faqat koʻcha chirogʻining sariq…" (9 w)            | step_wood*            |
| 130.2 | n4_door48; text panel, 3 buttons; no ambience              | choose enter      | "Maydonchada sovuq. Lift ishlamaydi, zinapoya zim-ziyo. Ostonangizda…" (28 w) | door_open, step_wood* |
| 145.9 | n4_inside48; text panel, 2 buttons; no ambience            | Continue          | "Ichkarida sovuq va chang hidi. Gilam, divan,…" (34 w)                        | door_open, step_wood* |
| 164.1 | n4_copy_room; text panel, 4 buttons; no ambience           | choose calendar   | "Koʻzingiz qorongʻiga asta koʻnikib boryapti." (5 w)                          | —                     |
| 168.2 | n4_calendar; text panel, 2 buttons; no ambience            | Continue          | "Devorda yirtma kalendar osilgan. Yili yozilmagan, faqat…" (28 w)             | —                     |
| 183.9 | n4_copy_room; text panel, 4 buttons; no ambience           | choose belongings | "Koʻzingiz qorongʻiga asta koʻnikib boryapti." (5 w)                          | —                     |
| 187.8 | n4_belongings; text panel, 2 buttons; no ambience          | Continue          | "Divanda sumka yotibdi. Sizning sumkangiz — yirtilgan…" (31 w)                | —                     |
| 204.5 | n4_copy_room; text panel, 3 buttons; no ambience           | choose diary      | "Koʻzingiz qorongʻiga asta koʻnikib boryapti." (5 w)                          | —                     |
| 208.6 | n4_diary5; text panel, 2 buttons; no ambience              | Continue          | "Stul ustida bir varaq qogʻoz. Xati shkafdagi…" (31 w)                        | page*                 |
| 225.2 | n4_copy_room; text panel, 2 buttons; no ambience           | choose glitch     | "Koʻzingiz qorongʻiga asta koʻnikib boryapti." (5 w)                          | —                     |
| 229.1 | n4_glitch; text panel, 2 buttons; no ambience              | Continue          | "Yotoq tomonga yurdingiz. Qorongʻida nimadir qimirladi. Koʻz…" (30 w)         | static                |
| 246.4 | n4_voice_identity; chat overlay, 3 buttons; no ambience    | choose why        | "Bolam, nega telefonni olmayapsan? Ovqat qilyapsanmi oʻzi?…" (36 w)           | whisper               |
| 263.5 | n4_why; chat overlay ("yozmoqda…"), 3 buttons; no ambience | Continue          | "yozmoqda… Hammasini koʻrsatish / Bu gaplarni qayerdan…" (8 w)                | whisper               |
| 268.3 | n4_return; text panel, 2 buttons; no ambience              | Continue          | "Oʻz xonangizga qaytdingiz va eshikdagi raqamga qaradingiz:…" (26 w)          | step_wood*            |
| 282.8 | n4_sleep; text panel, 2 buttons; no ambience               | Continue          | "Uxlay olmadingiz. Yostiq ostida telefon bir necha…" (11 w)                   | —                     |
| 289.6 | next night begins                                          | —                 | —                                                                             | —                     |

**Total time split** (typewriter = waiting for the text to type; reading = 180 wpm; the rest
is button clicks plus harness polling):

| Run        | Total   | Waiting on typewriter | Reading     | Moving / looking | Other |
| ---------- | ------- | --------------------- | ----------- | ---------------- | ----- |
| desktop n1 | 315.7 s | 95 s (30%)            | 179 s (57%) | **0 s required** | 42 s  |
| mobile n1  | 315 s   | 96 s (30%)            | 188 s (60%) | 0 s possible     | 31 s  |
| desktop n4 | 311.4 s | 85 s (27%)            | 172 s (55%) | **0 s required** | 54 s  |
| mobile n4  | 289.6 s | 83 s (29%)            | 168 s (58%) | 0 s possible     | 39 s  |

**83–90% of a night is reading or waiting for text.** A desktop player who walks adds
walking time, but no node requires it.

**Events with no text at all: 0.** Every one of the 21–28 beats per night arrives as a text
block; the sound or picture comes together with or after the words. The only things that happen without words are:

- the desktop phone buzzing (every 50–60 s);
- the player's own footsteps;
- the 3:16 window lights going out, which arrive together with a text describing them;
- on desktop only, the night-4 feet under the door, visible only if the camera faces the door.

**What triggers each beat:**

| Run        | Transitions | By button (choice / Continue) | By timer            | By position / gaze |
| ---------- | ----------- | ----------------------------- | ------------------- | ------------------ |
| desktop n1 | 21          | 20                            | 1 (`n1_316`, timed) | **0**              |
| mobile n1  | 22          | 22                            | 0                   | **0**              |
| desktop n4 | 27          | 27                            | 0                   | **0**              |
| mobile n4  | 28          | 28                            | 0                   | **0**              |

Across all 90 nodes, 4 have a `zone` trigger and 1 has a `timed` trigger. A zone trigger
only replaces the Continue button, which is still shown. The only gaze mechanic in the game
is the night-3 corridor stretch. **Both 3:17 events are reached through a menu.** Night 1
needs "Chiroqni oʻchirib yotish"; night 4 has a literal button "Tokning oʻchishini kutish"
(wait for the power cut).

**Desktop: free walking, or a frame around a menu?** WASD and mouse-look work, but the world
is a frame around the menu:

- Each choice is rendered twice: as a glowing sphere in the room and as a numbered button in the HUD.
- Keys 1–8 choose directly, and E with nothing in reach advances the text.
- Choosing "Televizorni yoqish" or "Devordagi soatga qarash" from the HUD does not show the
  TV or the clock. The camera stays on the window while the text describes the object
  (contact sheet frames 3 and 5). Mobile does the same: the clock, note and TV beats show the
  same room still.

**Ignoring the text.** The harness left the game alone for 90 s at `n1_start` and 60 s at
`n1_hub`. **Nothing happened, on either platform.** The node never changed. Desktop played
only `phone_buzz` at 27, 77 and 137 s; mobile played nothing besides ambience. 3:17 never
comes unless the player asks for it from a menu.

**Desktop pacing bug found during the run.** `n1_316` auto-advances after
max(4 s, characters × 24 ms + 1.8 s) ≈ 4.8 s, which is shorter than reading its 21 words.
The reader's Continue click then lands on `n1_317` and skips it. In the desktop run the 3:17
power cut, the game's central beat, was on screen for under one second.

**Time to first possible unease:**

- First unease written into the text: about 35–43 s (`n1_start` l6, the warm key), then
  80–105 s (the note: "Ismingizni aytib chaqirsa ham").
- First unease the player **experiences** other than through text:
  - TV static at 134–142 s, a plain static sound; the "cough" is only in the text.
  - The opposite windows going dark at **255–267 s**, then the fridge stopping at **268 s**.
  - About 4.5 minutes in, and only after the player chooses to sleep.

---

## 4. FEAR AUDIT

| Night | Intended moment                             | Delivery (as built)                                                                                                                  | Score 1–5                                    |
| ----- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| 1     | Warm key from Rustam aka                    | text                                                                                                                                 | 1                                            |
| 1     | Note: "even if it calls your name"          | text (+ desktop paper close-up)                                                                                                      | 2                                            |
| 1     | TV static, someone coughs                   | static sound; the cough exists only in text                                                                                          | 1                                            |
| 1     | One lit window opposite, nobody inside      | text; the image is a generic night window                                                                                            | 1                                            |
| 1     | 3:16 windows go dark floor by floor         | sound + darkened windows, in the same moment as the text describing it                                                               | 2                                            |
| 1     | 3:17 fridge stops, silence ≥ 4 s            | real 4.42 s audio hush, but the text says "then the wall knocked three times" before the knock plays; desktop can skip the beat (§3) | 2                                            |
| 1     | Three knocks + "Qoʻshni… uxlamayapsizmi?"   | HRTF knock (desktop) / knock + chat bubble (mobile) + whisper; announced by the text                                                 | 2                                            |
| 2     | Figure at the far end of the stairwell      | desktop 3D / mobile still, during Muhabbat's dialogue text                                                                           | 2                                            |
| 2     | Footsteps in the empty flat above           | desktop-only spatial audio, **only after 38 s idle in the hub; untold**                                                              | 3 if heard, 0 in practice                    |
| 2     | Mirror lags 0.5 s                           | desktop shader / mobile delayed region; **also stated in text**                                                                      | 2                                            |
| 2     | Hold to listen, breathing behind wall       | hold gesture + audio + haptic, then "Nafasingizni toʻxtatdingiz…"                                                                    | 3                                            |
| 3     | Corridor stretches when you look away       | desktop gaze mechanic; mobile changed still                                                                                          | 3                                            |
| 3     | Silhouette behind kitchen frosted glass     | visual + text                                                                                                                        | 2                                            |
| 3     | Reflection in the dark TV                   | visual + text                                                                                                                        | 2                                            |
| 3     | Knock inside the wardrobe                   | desktop-only, **after 44 s in the hub; untold**                                                                                      | 3 if heard, 0 in practice                    |
| 3     | Voice switches to "sen"                     | text                                                                                                                                 | 2                                            |
| 4     | 40 missed calls                             | phone UI (still + overlay)                                                                                                           | 2                                            |
| 4     | 3:17 by menu, one step on the landing       | button "wait for the power cut", fridge stop, step sound + text saying it                                                            | 1                                            |
| 4     | Feet under the door                         | desktop visual only, untold, only if facing the door                                                                                 | 3 if seen                                    |
| 4     | Peephole figure                             | fisheye view + 40-word description                                                                                                   | 2                                            |
| 4     | Flat 48 is a decayed copy of 47             | desktop 3D walk-in possible; mobile stills; 3 menu items to "inspect"                                                                | 2                                            |
| 4     | Fake glitch                                 | the player must press a button labelled for it; FX + static                                                                          | 1                                            |
| 4     | Voice speaks in the mother's words          | text + whisper (mobile chat bubble)                                                                                                  | 3 (best idea in the game, delivered as text) |
| 5     | Dead phone, voice at the door, final choice | stills/3D + text + a 3-option menu                                                                                                   | 2                                            |
| End   | A / B / C                                   | 2D text card (§5)                                                                                                                    | 1                                            |

**Silence, darkness or waiting the player experiences themselves:**

- **Silence:** one real case per 3:17. The engine holds 4.42 s of true silence before the
  knocks, but the player spends it reading text about the silence. The text has already
  announced the knocks.
- **Darkness:** yes on desktop after 3:17 (torch on), and in mobile "off" stills. It is never
  required for anything.
- **Waiting:** never. Nothing in the game happens because time passes, except the two hidden
  hub sounds. Idle for 90 s and the world is frozen.

**Anything not told to the player:**

- Desktop footsteps above (n2), the wardrobe knock (n3) and the feet under the door (n4).
- The desktop phone buzzing periodically.
- Mobile has 0 untold events, apart from still variants.
- All of these are optional, all desktop-only, and two of them require lingering in a menu
  screen the flow pushes you out of. Everything important is written down.

---

## 5. ENDINGS

The same template in both modes: `EndingScreen`. The 3D world is unmounted. The screen
shows a small still thumbnail (about 60×105 px on desktop), **the ending's title above the
text**, the typewritten paragraphs, a hint "Matn davomi pastda." and two buttons
("Yakunlar roʻyxati", "Bosh menyuga"). It is reached by choosing one of three options in
the `n5_final_choice` menu.

| Ending      | Text          | Typing | + reading @180 wpm | Image                     | Sound                                                        | Why it feels cheap                                                                                                                                                                                                                                                             |
| ----------- | ------------- | ------ | ------------------ | ------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A "Qoʻshni" | 7 lines, 72 w | 12 s   | ≈ 36 s             | thumbnail of the lit room | desktop: whisper, knock_triple; mobile: none                 | The title "Qoʻshni" gives away the twist before the first line. "You become the voice / a new tenant arrives / their phone shows «Onam»" is told in 3 sentences instead of shown. 4 of 7 lines are "siz … qildingiz".                                                          |
| B "Ketish"  | 9 lines, 88 w | 16 s   | ≈ 45 s             | thumbnail                 | nothing ending-specific (no street, snow, bus or phone buzz) | Contains "Chuqur nafas oldingiz. Sovuq havo oʻpkangizni achitdi." The relief and the phone buzz are text. The "quietly wrong" last line explains itself ("oʻsha charchagan yuz").                                                                                              |
| C "3:18"    | 8 lines, 60 w | 10 s   | ≈ 30 s             | thumbnail of the clock    | clock ambience only                                          | The title "3:18" is printed above "Soat endi 3:18", so the payoff is spoiled. FIX_PROMPT wanted "Black screen. Only her voice". The build shows "Alo… bolam?" as one more paragraph, same font, same card, with no call sound. Winding the clock is a menu choice, not an act. |

All three take 30–45 s and are 100% text over a static thumbnail. The player does nothing in
the world, and no ending has its own audio or camera set piece. They feel cheap because
they are the same web card as the gallery, with different paragraphs.

---

## 6. UI

**Desktop, normal play** (from screenshots and the button census; the hub shows 12 buttons):

- top-left topline: "1-tun · 4-qavat · 47";
- top-right: "Sifat: yuqori" button, "Fonus: oʻchiq · F" button, "II" pause;
- controls card (WASD … 8 rows + "Tushunarli"), visible until dismissed (per session);
- centre crosshair "·"; interaction prompt "E · <label>" / "Q bosib turing · …";
- a glowing sphere on every available choice object;
- bottom HUD:
  - narration block, up to ~6 lines;
  - numbered choice buttons, up to 8 in two columns;
  - "Davom etish" on 67 of 90 nodes.

**Mobile, normal play:**

- "II" pause; scene caption "1-tun · 47 · 3:17";
- hotspot circles on the still;
- chat bubble overlay for the voice, with a "Hammasini koʻrsatish" button;
- narration panel; panel choice buttons; "Davom etish";
- hint text "Yorishib turgan joylarni bosing. Devorni bosib turing.";
- loading progress/retry when a still loads.

**Ending:** thumbnail, title, text, "Matn davomi pastda.", 2 buttons.

**Removable without losing anything:**

- "Sifat" and "Fonus" buttons (keyboard F exists; quality is automatic);
- the topline and mobile caption: night, floor, flat and time are already in the text;
- the persistent controls card;
- the numbered HUD duplicates of in-world objects;
- most "Davom etish" presses (67 nodes);
- repeating the 15-word hub text on every return (seen 8× on night 1);
- the mobile hint paragraph;
- the ending title above the text; "Matn davomi pastda.";
- the voice chat's "Hammasini koʻrsatish".

---

## 7. CONTACT SHEETS

- Desktop: `audit/screenshots/diagnosis/contact-desktop-n1.jpg`. 12 frames:
  t = 0, 43.8, 52.9, 80.6, 142.4, 171.2, 210.7, 239.9, 267.3, 279.7, 286.2, 302.4 s.
- Mobile: `audit/screenshots/diagnosis/contact-mobile-n1.jpg`. 12 frames:
  t = 0, 43.8, 76.9, 134.5, 161.8, 200.2, 228.5, 255.5, 268.1, 282.0, 288.0, 302.4 s.

What they show:

- Desktop: 10 of 12 frames are the same window-facing view with a text block over the lower
  third. The clock frame shows no clock and the TV frame shows no TV. The ceiling lamp is
  blown out at the top.
- Mobile: 9 of 12 frames are the same room still. The 3:17 knock frame is an over-exposed
  white torch blob on the wall, with the voice in a chat bubble.
- On both, the text panel holds more information than the picture.

---

## 8. ROOT CAUSE

1. PROMPT §1/§4.1 makes the game **one text story graph** (`StoryNode { lines[], choices[], next }`) that two "presenters" skin. The world is decoration hung on nodes, not the source of events.
2. Every beat must be a node with lines; an event cannot exist without text, and a node cannot advance without `choices` or `next` → 67 "Continue" nodes + 20 menus (71 buttons).
3. `DesktopHint` (`interact/zone/timed/scripted`) is optional metadata: 47 of 90 nodes have none, 4 zones and 1 timer exist, and the HUD menu stays on screen anyway.
4. The build order made the text presenter the reference: Phase 2 "full Uzbek story … text presenter with real-click e2e playthroughs to every ending". The tests and FIX_PROMPT F1 ("play the whole story in the text presenter", SCRIPT_UZ.md "to read like a book") made the book the spec.
5. PROMPT §6 mandates "typewriter text" and "choices numbered on desktop"; §5.4 scripts nights as menus of objects to inspect; FIX_PROMPT §6.2 writes the endings as prose.
6. The writing rule banned clichés but not second-person narration of the player's body and acts; 89/198 narrator lines do exactly that, and lint:text cannot catch it.
7. Time does not exist in the model: 3:17 is a node reached by a button, so silence, waiting and dread cannot happen unless the player clicks toward them.
8. The fear pass (F7), the only phase meant to play and tune pacing, has not happened. F3–F6 polished pictures and sound around an unchanged reading loop.
