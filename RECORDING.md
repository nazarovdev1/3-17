# 3:17 — Ovoz yozish varagʻi

Bu varaq ikki kishi uchun: **onam** rolini yozadigan ayol va **devor ortidagi ovozni** yozadigan
siz (egasi). Matnlar `SCRIPT_UZ.md` dan olingan, harfma-harf bir xil. Matn oʻzgarsa, avval
`SCRIPT_UZ.md` oʻzgaradi, keyin bu varaq.

Yozuv kelmaguncha oʻyinda shu joylarda **jimlik va subtitr** boʻladi. TTS yoki soxta ovoz
ishlatilmaydi.

## Birinchi navbat (R2 uchun)

1-tunni ovoz bilan koʻrsatish uchun faqat shular kerak:

- `vo_n1-08_1.wav` — onamning birinchi ovozli xabari.
- `vo_n1-12_1.wav` … `vo_n1-13e_1.wav` — 1-tundagi devor ovozi (7 ta fayl).

Qolganlari R3–R4 da (2–5-tunlar va yakunlar) kerak boʻladi.

## Texnik talablar

- **Format:** WAV, 48 kHz, 24-bit (16-bit ham boʻladi), **mono**.
- **Bitta fayl — bitta qator.** Fayl nomi jadvaldagidek boʻlsin (kichik harf, `vo_` bilan).
- Har bir qatorni **2–3 marta** yozing. Dublni nomning oxiriga harf qoʻshib bering:
  `vo_n1-12_1a.wav`, `vo_n1-12_1b.wav`. Eng yaxshisini men tanlayman yoki ikkalasini
  oʻyinda navbatma-navbat ishlataman.
- Boshida va oxirida **0,5–1 soniya jimlik** qoldiring. Kesmang, normalize qilmang,
  effekt qoʻshmang. Hammasini men qilaman.
- Xona: kichik, yumshoq (shkaf ichidagi kiyimlar, yopiq parda). Muzlatgich, ventilyator,
  koʻcha shovqini boʻlmasin. Mikrofonga **20–30 sm** dan gapiring.
- Baland gapirmang. Bu oʻyinda hech kim baqirmaydi. Choʻqqi taxminan −12 dBFS atrofida boʻlsin,
  hech qachon 0 ga yetmasin.
- **Uzunlik** — moʻljal. ±30% farq boʻlsa ham boʻladi. Shoshilishdan koʻra sekinroq yaxshi.
- Yozuvlarni `audit/recordings/` papkasiga tashlang (gitga kirmaydi) yoki menga
  boshqa yoʻl bilan bering. Men ularni `public/assets/voice/` ga ishlab, `CREDITS.md` ga
  yozaman.

## Men qanday ishlayman

- **Devor ovozi:** pitch 2–3 yarim ton pastga, low-pass (devor orqali eshitilgandek, ~2,5 kHz),
  kichik xona reverbi, ostiga sekin nafas qatlami. Oʻyinda ovoz devordagi nuqtadan
  (3D) eshitiladi.
- **Onam:** telefon ovozli xabari: band-pass (~300–3400 Hz), yengil siqish, telefon
  dinamigidan chiqqandek. Yakun C dagi «Alo… bolam?» — jonli qoʻngʻiroq, sal tozaroq.
- Har bir faylning uzunligini oʻlchab, subtitr vaqtini shu yozuvga moslayman.

---

## Onam

**Kim:** 50–60 yoshlardagi ona, qishloqda yoki viloyatda. Farzandi shaharga ketgan. U koʻp
gapirmaydi, lekin har bir gapida xavotir bor. Yigʻlamaydi. Ovozli xabarni telefonni
yuziga yaqin tutib, uyda, kechqurun yozyapti. Tabiiy, uy tilida, shoshilmay. Ba’zan
gap orasida toʻxtab, keyingi soʻzni qidiradi.

**Umumiy qoida:** «oʻqiyotgandek» emas, «oʻgʻliga/qiziga gapirayotgandek». Soʻzlarni
oʻz shevasiga moslasa boʻladi, lekin ma’no oʻzgarmasin (subtitr `SCRIPT_UZ.md` dagi matnni
koʻrsatadi).

| ID    | Fayl             | Matn                                                                                      | Yoʻnalish                                                                                                         | Uzunlik |
| ----- | ---------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------- |
| N1-08 | `vo_n1-08_1.wav` | Bolam, yetib bordingmi? Uy issiqmi oʻzi? Bir ogʻiz yozib qoʻy, xavotir olyapman.          | Yengil, mehribon. Hali hech narsa boʻlmagan. Oxirgi gapda xavotir sal sezilsin, lekin kulimsirab aytilsin.        | ~6 s    |
| N2-16 | `vo_n2-16_1.wav` | Bolam, otang soʻrayapti: pul yetyaptimi? Ovqat qilyapsanmi oʻzi? Yetmasa ayt, uyalma.     | Amaliy, tez-tez. «Otang soʻrayapti» — oʻzi soʻrayotganini yashiradi. «Uyalma» — yumshoq.                          | ~6 s    |
| N2-17 | `vo_n2-17_1.wav` | Bizda qor yogʻdi. Sen tomonda ham yogʻdimi? Issiq kiyin, shamollab qolma.                 | Birinchi gapda deraza oldida turgandek, xotirjam. Keyin yana gʻamxoʻr.                                            | ~6 s    |
| N3-08 | `vo_n3-08_1.wav` | Bolam, nega telefonni olmayapsan?                                                         | Javob kelmagani sezilyapti. Ayblamaydi — xafa. Qisqa.                                                             | ~2,5 s  |
| N3-09 | `vo_n3-09_1.wav` | Kecha tushimda koʻrdim seni. Kichkina ekansan, qorda yalangoyoq turgan ekansan.           | Sekin, oʻzi ham qoʻrqib eslayotgandek. Ovoz pasayadi. «Yalangoyoq» dan keyin kichik toʻxtash.                     | ~5,5 s  |
| N3-10 | `vo_n3-10_1.wav` | Bir ogʻiz «yaxshiman» deb yoz, boshqa hech narsa kerakmas.                                | Iltimos. Charchagan. «Yaxshiman» ni sal boshqacha, uning ovozini eslab aytadi.                                    | ~4,5 s  |
| N4-04 | `vo_n4-04_1.wav` | Bolam… Shuhrat akaning mashinasida ovqat berib yubordim. Somsa, qatlama, bir banka qatiq. | «Bolam…» dan keyin uzun toʻxtash (javob kutadi). Keyin oʻzini qoʻlga olib, roʻyxatni sanaydi — gʻamxoʻrlik bilan. | ~7 s    |
| N4-05 | `vo_n4-05_1.wav` | Eshigingga qoʻyib ketadi, olib qolarsan.                                                  | Oddiy, amaliy.                                                                                                    | ~2,5 s  |
| N4-06 | `vo_n4-06_1.wav` | …Eshityapsanmi? Mayli. Sogʻ boʻl.                                                         | Avval 1 s jimlik. «Eshityapsanmi?» — deyarli pichirlab. «Mayli» — taslim. «Sogʻ boʻl» — muloyim, xayrlashuv.      | ~4 s    |
| N5-03 | `vo_n5-03_1.wav` | Bolam, endi koʻp qoʻngʻiroq qilmayman, bezor qilmay.                                      | Tinch, qaror qilgan. Achchiq emas. Bu gapni u oldindan oʻylab qoʻygan.                                            | ~3,5 s  |
| N5-04 | `vo_n5-04_1.wav` | Faqat bilib qoʻy: eshigimiz ochiq. Kelsang ham, kelmasang ham, qachon boʻlsa ham.         | Butun oʻyindagi eng muhim gap. Sekin, aniq, iliq. «Eshigimiz ochiq» — urgʻu. Oxirgi qism — deyarli kulimsirab.    | ~6,5 s  |
| EC-02 | `vo_ec-02_1.wav` | Alo… bolam?                                                                               | Jonli qoʻngʻiroq. Kutmagan, ishonmayapti. «Alo» — oddiy; uzun toʻxtash; «bolam?» — titrab, savol.                 | ~2 s    |

---

## Devor ortidagi ovoz (siz)

**Kim:** Sardor. Bir paytlar shu xonadonda yashagan yigit, endi «qoʻshni». U yolgʻiz,
juda sabrli, juda xushmuomala. **Hech qachon tahdid qilmaydi, ovozini koʻtarmaydi.**
Qoʻrqinchli tomoni shunda: u muloyim va hamma narsani biladi.

**Umumiy qoida:**

- Devorga yaqin turib, **past va sekin**, deyarli pichirlab, lekin pichirlash emas — yarim ovoz.
  Har gapdan oldin kichik nafas olsangiz yaxshi (men uni ham ishlataman).
- Gap oxirida ovoz koʻtarilmasin (savollardan tashqari). Tabassum sezilsa boʻladi.
- 1–2-tunda **«siz»** deydi (begona qoʻshni). 3-tundan boshlab **«sen»** — yaqinlashgan.
  Ovoz ham shunga mos: 1-tunda odobli, 5-tunda juda yaqin, xuddi qulogʻingiz tagida.
- Soʻzlar orasidagi jimlik — eng qoʻrqinchli qismi. Shoshilmang.

### 1-tun (birinchi navbat)

| ID     | Fayl              | Matn                                                       | Yoʻnalish                                                                                                                         | Uzunlik |
| ------ | ----------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------- |
| N1-12  | `vo_n1-12_1.wav`  | Qoʻshni… uxlamayapsizmi?                                   | Taqillatgandan keyingi birinchi soʻz. «Qoʻshni…» — sekin, choʻzib; keyin 1 s jimlik; savol — muloyim, xuddi xavotir olayotgandek. | ~3 s    |
| N1-13a | `vo_n1-13a_1.wav` | Men ham.                                                   | Javob eshitib xursand. Juda yumshoq, qisqa. Oldidan kichik kulgi-nafas.                                                           | ~1,5 s  |
| N1-13a | `vo_n1-13a_2.wav` | Yolgʻiz odam kechasi har bir tovushni eshitadi. Toʻgʻrimi? | Oʻylanib, oʻziga gapirgandek. «Toʻgʻrimi?» — 1 s kutib, yaqinroq.                                                                 | ~5 s    |
| N1-13b | `vo_n1-13b_1.wav` | Eshigingiz yopiq ekan. Yaxshi, men ham yopib yotaman.      | Zanjir ovozini eshitgan. Xotirjam, lekin «yopiq ekan» da sal hafsalasi pir. «Yaxshi» — oʻzini qoʻlga olib.                        | ~5 s    |
| N1-13c | `vo_n1-13c_1.wav` | Mayli. Ertaga gaplasharmiz.                                | Sabrli. Xafa emas. «Ertaga» — va’da kabi.                                                                                         | ~3 s    |
| N1-13d | `vo_n1-13d_1.wav` | Rahmat. Javob berganingiz uchun.                           | Chin dildan minnatdor, deyarli ta’sirlangan. Uzoq kutgan odam.                                                                    | ~3,5 s  |
| N1-13e | `vo_n1-13e_1.wav` | Yaxshi tush koʻring, qoʻshni.                              | Mehribon tilak. Boshqa hech narsa emas. Oʻyinchi «yolgʻiz emasman» degan.                                                         | ~2,5 s  |

### 2-tun

| ID     | Fayl              | Matn                                                                | Yoʻnalish                                                                              | Uzunlik |
| ------ | ----------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------- |
| N2-19a | `vo_n2-19a_1.wav` | Kecha javob berdingiz. Ovozingiz charchagan ekan.                   | Kechagi suhbatni eslab, iliq. Ikkinchi gap — kuzatuv, gʻamxoʻrlikdek.                  | ~4,5 s  |
| N2-19b | `vo_n2-19b_1.wav` | Kecha indamadingiz, lekin uxlamadingiz ham. Bilaman.                | Ayblamaydi. «Bilaman» — alohida, past, yaqin.                                          | ~4,5 s  |
| N2-19c | `vo_n2-19c_1.wav` | Kecha devorni urdingiz. Uch marta. Men sanadim.                     | Har gap orasida toʻxtash. «Men sanadim» — xursand, bolalarcha.                         | ~5 s    |
| N2-20a | `vo_n2-20a_1.wav` | Yolgʻiz yashaysiz-a? Men ham.                                       | Anketani bilgandek, lekin oddiy suhbatdek.                                             | ~3 s    |
| N2-20b | `vo_n2-20b_1.wav` | «Hozircha», debsiz. Bu «hozircha» qancha davom etadi?               | Birinchi «hozircha» — anketadan iqtibos, sal boshqacha ohangda. Savol — chin qiziqish. | ~5 s    |
| N2-20c | `vo_n2-20c_1.wav` | Yolgʻiz emasman, debsiz. Unda nega hech kimga qoʻngʻiroq qilmaysiz? | Muloyim, lekin ikkinchi gap tegib ketadi. Ovozni koʻtarmang.                           | ~5,5 s  |
| N2-21a | `vo_n2-21a_1.wav` | Qorongʻidan qoʻrqasiz. Men ham qoʻrqardim, keyin koʻnikdim.         | Tasalli bermoqchi. «Koʻnikdim» — tinch, sal gʻamgin.                                   | ~5 s    |
| N2-21b | `vo_n2-21b_1.wav` | Yolgʻizlikdan qoʻrqasiz. Endi yolgʻiz emassiz, men borman-ku.       | Iliq, xursand. «Men borman-ku» — yaqin.                                                | ~5 s    |
| N2-21c | `vo_n2-21c_1.wav` | Kimdir kuzatayotgandek tuyuladi sizga. Toʻgʻri tuyuladi.            | Birinchi gap — oddiy. Toʻxtash. Ikkinchisi — juda sokin, deyarli tabassum bilan.       | ~4,5 s  |
| N2-21d | `vo_n2-21d_1.wav` | Unutilishdan qoʻrqasiz. Men sizni unutmayman.                       | Va’da. Sekin, aniq.                                                                    | ~4 s    |

### 3-tun

| ID     | Fayl              | Matn                                                  | Yoʻnalish                                                               | Uzunlik |
| ------ | ----------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- | ------- |
| N3-11a | `vo_n3-11a_1.wav` | «Yoʻq, uxlayapman». Esingdami?                        | Iqtibosni oʻyinchining ohangida, sal masxara qilmay aytadi. Endi «sen». | ~3 s    |
| N3-11a | `vo_n3-11a_2.wav` | Men ham birinchi kechasi shunday degandim.            | Xotira. Sekin.                                                          | ~3,5 s  |
| N3-11b | `vo_n3-11b_1.wav` | Birinchi kechasi men ham indamagandim.                | Xotira, tinch.                                                          | ~3 s    |
| N3-11b | `vo_n3-11b_2.wav` | Qimirlamasang, koʻrishmaydi, deb oʻylagandim.         | Bolalarcha mantiq, oʻziga kulgandek.                                    | ~3,5 s  |
| N3-11c | `vo_n3-11c_1.wav` | Birinchi kechasi men ham devorni urgandim. Uch marta. | «Uch marta» — alohida, sekin.                                           | ~4,5 s  |
| N3-12a | `vo_n3-12a_1.wav` | Muhabbat opa senga Sardor haqida gapirdi-a?           | Biladi. Yashirmaydi. Oddiy, deyarli quvnoq.                             | ~3,5 s  |
| N3-12b | `vo_n3-12b_1.wav` | Muhabbat opa senga halva berdi-a? Menga ham bergan.   | Iliq xotira.                                                            | ~4 s    |
| N3-13a | `vo_n3-13a_1.wav` | «Ertaga», deysan. Men ham doim «ertaga» derdim.       | Kundalikni oʻqiganini biladi. Ikkinchi gap — gʻamgin.                   | ~4,5 s  |
| N3-13b | `vo_n3-13b_1.wav` | Sen menga oʻxshab qolyapsan.                          | Juda past. Mamnun.                                                      | ~2,5 s  |
| N3-14a | `vo_n3-14a_1.wav` | Qoʻshningman. Devorning u tomonidagi qoʻshning.       | «Sen… kimsan?» ga javob. Tinch, oddiy fakt.                             | ~4 s    |
| N3-14a | `vo_n3-14a_2.wav` | Yaqinda sen ham kimgadir qoʻshni boʻlasan.            | Xotirjam bashorat. Tahdid emas — xuddi yaxshi xabar.                    | ~3,5 s  |
| N3-14b | `vo_n3-14b_1.wav` | Mayli, gaplashmasak ham boʻladi. Men shu yerdaman.    | Sabrli. «Men shu yerdaman» — devorga tegib turgandek yaqin.             | ~4,5 s  |

### 4-tun (48 ichida)

N4-09 va N4-10 — ovoz **onamning gaplarini** takrorlaydi. Onamni taqlid qilmang: soʻzlari
onamniki, ovoz — Sardorniki, xuddi onasidan eshitgan gapni oʻzi takrorlayotgandek.

| ID     | Fayl              | Matn                                                          | Yoʻnalish                                                 | Uzunlik |
| ------ | ----------------- | ------------------------------------------------------------- | --------------------------------------------------------- | ------- |
| N4-09  | `vo_n4-09_1.wav`  | Bolam, nega telefonni olmayapsan?                             | Onamning soʻzlari, yod olingan. Bir tekis, sekin, hissiz. | ~3 s    |
| N4-10  | `vo_n4-10_1.wav`  | Ovqat qilyapsanmi oʻzi? Issiq kiyin, shamollab qolma.         | Xuddi shunday — eslab, takrorlab. Oxiri soʻnib boradi.    | ~4,5 s  |
| N4-11a | `vo_n4-11a_1.wav` | Sardor edim. Keyin qoʻshni boʻlib qoldim.                     | Birinchi marta ismini aytadi. Oddiy, lekin ogʻir.         | ~4 s    |
| N4-11a | `vo_n4-11a_2.wav` | Meni Sardor deb faqat onam chaqirardi.                        | Gʻamgin. «Onam» — sekin.                                  | ~3,5 s  |
| N4-11b | `vo_n4-11b_1.wav` | Telefoning yostiq ostida yotadi. Yostiq devorga tegib turadi. | Xotirjam tushuntiradi. Ikkinchi gap — juda yaqin.         | ~5 s    |
| N4-11b | `vo_n4-11b_2.wav` | Sen eshitmaganni men eshitaman.                               | Past.                                                     | ~2,5 s  |
| N4-11c | `vo_n4-11c_1.wav` | Ertaga yana kelasan. Hamma ertaga yana keladi.                | Ishonch bilan, tinch. Ikkinchi gap — deyarli qoʻshiqdek.  | ~4,5 s  |

### 5-tun

| ID     | Fayl              | Matn                                                                | Yoʻnalish                                                                                                                                                                                                       | Uzunlik |
| ------ | ----------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| N5-05a | `vo_n5-05a_1.wav` | «Yaxshiman, ona. Ishdaman». Yozganding, lekin joʻnatmading.         | Qoralamani oʻqiydi — oʻyinchining ohangida. Keyin oʻzining ovozi: muloyim tanbeh.                                                                                                                               | ~5 s    |
| N5-05b | `vo_n5-05b_1.wav` | «Yaxshiman, ona. Ishdaman». Joʻnatding. Rost emasdi-ku.             | Xuddi shunday. «Rost emasdi-ku» — tabassum bilan.                                                                                                                                                               | ~5 s    |
| N5-06a | `vo_n5-06a_1.wav` | «Sardormisan?» deb soʻraganding. Sardor shu yerda. Sen ham kelasan. | Uchta gap, uchta toʻxtash. Oxirgisi — taklif.                                                                                                                                                                   | ~6 s    |
| N5-06b | `vo_n5-06b_1.wav` | «Buni qayerdan bilasan?» deganding. Endi bilasan.                   | «Endi bilasan» — juda past.                                                                                                                                                                                     | ~4,5 s  |
| N5-06c | `vo_n5-06c_1.wav` | {name}. Ismingni hamma unutadi, men esa unutmayman.                 | **Ismni aytmang.** Boshida 1,5 s nafas/jimlik qoldiring (ekranda ism chiqadi), keyin «Ismingni…» dan boshlang.                                                                                                  | ~5 s    |
| N5-07  | `vo_n5-07_1.wav`  | Eshikni och.                                                        | Butun oʻyindagi yagona buyruq. Lekin baqirmaydi: past, sekin, aniq. 3 xil dubl yozing (biri juda muloyim, biri charchagan, biri deyarli eshitilmas) — 3:17 da u har 45 soniyada qaytariladi va sekin oʻzgaradi. | ~1,5 s  |
| N5-08  | `vo_n5-08_1.wav`  | Bu yerda seni hech kim qoʻngʻiroq bilan bezor qilmaydi.             | Onamning «bezor qilmay» gapini biladi. Tasalli kabi — eng qoʻrqinchlisi shu.                                                                                                                                    | ~4,5 s  |

### Yakun A

| ID    | Fayl             | Matn                     | Yoʻnalish                                                                                                   | Uzunlik |
| ----- | ---------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- | ------- |
| EA-02 | `vo_ea-02_1.wav` | Qoʻshni… uxlamayapsizmi? | Endi oʻyinchi devor ortida. N1-12 bilan **bir xil** ohangda yozing; men uni ham devor ovozi kabi ishlayman. | ~3 s    |

---

## Bu varaqda yoʻq qatorlar

Rustam aka (N1-01…04, N3-04…06, EA-01), Muhabbat opa (N2-02…14) va oʻyinchining oʻz
gaplari (N1-13a «Yoʻq… uxlayapman.», N3-14a, N4-11a, N4-11b) hozircha faqat subtitr.
Agar ularni ham yozmoqchi boʻlsangiz, ayting — xuddi shu shaklda varaq qoʻshaman.
