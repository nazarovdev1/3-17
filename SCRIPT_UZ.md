# 3:17 — SSENARIY (R0, yangi)

Bu faylda **faqat oʻyin dunyosida eshitiladigan yoki oʻqiladigan** soʻzlar bor: kimdir ovoz chiqarib
aytgan gap (subtitr), telefon ekrani, qoʻlga olinadigan qogʻoz. Hikoyachi yoʻq. Tanlov tugmalari yoʻq.
Oʻyinchi nima qilgani, nimani his qilgani hech qayerda yozilmaydi — u buni oʻzi qiladi va oʻzi his qiladi.

Voqealar, tovushlar va vaqt jadvali: `docs/BEATS.md`.

**Belgilar.**

- **ID**: `N1-07` — tun va tartib raqami. Bir xil raqam, har xil harf (`N1-14a`, `N1-14b`) —
  bir-birining oʻrniga chiqadigan variantlar: bitta oʻyinda faqat bittasi koʻrinadi.
- **Qayerda**: `sub` — subtitr (ovoz chiqarib aytilgan gap, pastda, butunligicha chiqadi, typewriter yoʻq);
  `tel` — telefon ekrani; `qogʻoz` — qoʻlga olinadigan xat; `kundalik` — kundalik varagʻi;
  `anketa` — oʻyin boshidagi ijara anketasi.
- **Kim**: `rustam`, `muhabbat`, `ovoz` (devor ortidagi), `onam` (ovozli xabar matni), `oʻyinchi`
  (oʻyinchi biror harakat qilganda oʻzi ovoz chiqarib aytadigan qisqa gap), `ish` (ishxona xabari),
  `sardor` (kundalik muallifi).
- Subtitr qatori 10 soʻzdan oshmaydi. Kundalik varagʻi 35 soʻzdan oshmaydi.
- `{name}` — anketadagi ism.

---

## Anketa (oʻyin boshlanishidan oldin, qogʻozda)

| ID | Qayerda | Matn |
| --- | --- | --- |
| A-01 | anketa | IJARA ANKETASI |
| A-02 | anketa | Xonadon 47, Chilonzor, Toshkent. Ijaraga beruvchi — Rustam aka. Toʻldiring va imzolang. |
| A-03 | anketa | Ismingiz |
| A-04 | anketa | Yolgʻiz yashaysizmi? — Ha / Yoʻq / Hozircha |
| A-05 | anketa | Eng koʻp nimadan qoʻrqasiz? — Qorongʻilik / Yolgʻizlik / Kimdir kuzatayotgani / Unutilish |
| A-06 | anketa | Uxlaganingizda eshigingiz… — Ochiq / Yopiq |
| A-07 | anketa | Imzolash |

---

## 1-tun — Koʻchib kelish

| ID | Vaqt | Qayerda | Kim | Matn | Shart |
| --- | --- | --- | --- | --- | --- |
| N1-01 | 01:58 | sub | rustam | Mana kalit. | |
| N1-02 | 01:58 | sub | rustam | Tok ba’zan oʻchib turadi, sham shkafda bor. | |
| N1-03 | 01:59 | sub | rustam | Yana bitta gap — qirq sakkizga e’tibor bermang. | |
| N1-04 | 01:59 | sub | rustam | U yerda hech kim turmaydi. | |
| N1-05 | ekranni yoqqanda | tel | — | 02:07 · Juma, 12-dekabr | |
| N1-06 | ekranni yoqqanda | tel | — | Onam — 3 ta javobsiz qoʻngʻiroq | |
| N1-07 | ekranni yoqqanda | tel | — | Onam · ovozli xabar · 0:11 | |
| N1-08 | xabarga bossa | tel | onam | Bolam, yetib bordingmi? Uy issiqmi oʻzi? Bir ogʻiz yozib qoʻy, xavotir olyapman. | |
| N1-09 | xatni olsa | qogʻoz | rustam | Ijara oyiga ikki yarim million, har oyning beshinchisigacha. Kommunalni oʻzim toʻlayman. | |
| N1-10 | xatni olsa | qogʻoz | rustam | Kechasi eshikni zanjirlab yoting va kim chaqirsa ham ochmang. | |
| N1-11 | xatni olsa | qogʻoz | rustam | Ismingizni aytib chaqirsa ham. *(boshqa ruchka bilan)* | |
| N1-12 | 03:17 + ~10 s | sub | ovoz | Qoʻshni… uxlamayapsizmi? | |
| N1-13a | devorga E / bir marta tegsa | sub | oʻyinchi | Yoʻq… uxlayapman. | javob |
| N1-13a | +3 s | sub | ovoz | Men ham. | javob |
| N1-13a | +4 s | sub | ovoz | Yolgʻiz odam kechasi har bir tovushni eshitadi. Toʻgʻrimi? | javob + anketa: Ha / Hozircha |
| N1-13b | 20 s hech narsa qilmasa | sub | ovoz | Eshigingiz yopiq ekan. Yaxshi, men ham yopib yotaman. | sukut + zanjir taqilgan |
| N1-13c | 20 s hech narsa qilmasa | sub | ovoz | Mayli. Ertaga gaplasharmiz. | sukut + zanjir taqilmagan |
| N1-13d | devorni 3 marta urganda | sub | ovoz | Rahmat. Javob berganingiz uchun. | urdi |
| N1-13e | N1-13a dagi 3-qator oʻrniga | sub | ovoz | Yaxshi tush koʻring, qoʻshni. | javob + anketa: Yoʻq |
| N1-14 | tong | tel | — | 07:40 · Shanba, 13-dekabr · Onam — 4 ta javobsiz qoʻngʻiroq | |

*Izoh: N1-13a dagi uchinchi qator anketada «Yoʻq» deganlarga chiqmaydi; ular uning oʻrniga N1-13e ni eshitadi.*

---

## 2-tun — Devor

**Kunduz.** Non olgani pastga tushganda Muhabbat opa eshigini zanjir bilan ochadi. Oʻyinchi yaqin
tursa, u gapirishda davom etadi; zinadan yuqoriga ketsa, gapi yarmida uziladi va orqasidan N2-14 ni
bir marta aytadi.

| ID | Vaqt | Qayerda | Kim | Matn | Shart |
| --- | --- | --- | --- | --- | --- |
| N2-01 | 13:20 | tel | — | 13:20 · Shanba, 13-dekabr · Onam — 6 ta javobsiz qoʻngʻiroq | |
| N2-02 | 3-qavat | sub | muhabbat | Voy, bolam, oʻsha qirq yettiga koʻchdingmi? | |
| N2-03 | | sub | muhabbat | Kel, kel, halva ol, hali issiq. | |
| N2-04 | | sub | muhabbat | Men Muhabbat opangman. Qirq yildan beri shu uydaman. | |
| N2-05 | | sub | muhabbat | Oʻzing qayerdansan? Yolgʻiz turasanmi? | |
| N2-06 | yaqin tursa | sub | muhabbat | Qirq sakkiz? Voy, uni gapirma, yigirma yildan beri yopiq. | → `heard_48` |
| N2-07 | | sub | muhabbat | Ikki ming oltinchi yili muhrlab ketishgan. | |
| N2-08 | | sub | muhabbat | Ba’zan kechasi u yoqdan televizor ovozi keladi. | |
| N2-09 | yana yaqin tursa | sub | muhabbat | Sendan oldin Sardor degan bola turardi. Qishloqdan kelgan. | → `heard_sardor` |
| N2-10 | | sub | muhabbat | Keyin uydan chiqmay qoʻydi. «Qoʻshnim bilan gaplashaman», derdi. | |
| N2-11 | | sub | muhabbat | Qirq sakkizda u paytda ham hech kim yoʻq edi. | |
| N2-12 | | sub | muhabbat | Onasi kelib, eshik oldida soatlab kutardi. Sardor ochmasdi. | |
| N2-13 | | sub | muhabbat | Bir kuni yoʻq boʻlib qoldi. | |
| N2-14 | oxirida yoki ketayotganda | sub | muhabbat | Onangga qoʻngʻiroq qilib tur, xoʻpmi? Onalar kutadi. | |

**Tun.**

| ID | Vaqt | Qayerda | Kim | Matn | Shart |
| --- | --- | --- | --- | --- | --- |
| N2-15 | ekranni yoqqanda | tel | — | 02:05 · Onam (11) · ovozli xabar · 0:19 | |
| N2-16 | xabarga bossa | tel | onam | Bolam, otang soʻrayapti: pul yetyaptimi? Ovqat qilyapsanmi oʻzi? Yetmasa ayt, uyalma. | |
| N2-17 | | tel | onam | Bizda qor yogʻdi. Sen tomonda ham yogʻdimi? Issiq kiyin, shamollab qolma. | |
| N2-18 | xabardan keyin | tel | — | Yaxshiman, ona. Ishdaman *(yozilgan, joʻnatilmagan qoralama)* · Yuborish | |
| N2-19a | 03:17 | sub | ovoz | Kecha javob berdingiz. Ovozingiz charchagan ekan. | n1: javob |
| N2-19b | 03:17 | sub | ovoz | Kecha indamadingiz, lekin uxlamadingiz ham. Bilaman. | n1: sukut |
| N2-19c | 03:17 | sub | ovoz | Kecha devorni urdingiz. Uch marta. Men sanadim. | n1: urdi |
| N2-20a | | sub | ovoz | Yolgʻiz yashaysiz-a? Men ham. | anketa: Ha |
| N2-20b | | sub | ovoz | «Hozircha», debsiz. Bu «hozircha» qancha davom etadi? | anketa: Hozircha |
| N2-20c | | sub | ovoz | Yolgʻiz emasman, debsiz. Unda nega hech kimga qoʻngʻiroq qilmaysiz? | anketa: Yoʻq |
| N2-21a | | sub | ovoz | Qorongʻidan qoʻrqasiz. Men ham qoʻrqardim, keyin koʻnikdim. | anketa: Qorongʻilik |
| N2-21b | | sub | ovoz | Yolgʻizlikdan qoʻrqasiz. Endi yolgʻiz emassiz, men borman-ku. | anketa: Yolgʻizlik |
| N2-21c | | sub | ovoz | Kimdir kuzatayotgandek tuyuladi sizga. Toʻgʻri tuyuladi. | anketa: Kuzatuv |
| N2-21d | | sub | ovoz | Unutilishdan qoʻrqasiz. Men sizni unutmayman. | anketa: Unutilish |
| N2-22 | tong | tel | — | 11:50 · Onam — 12 ta javobsiz qoʻngʻiroq | |

**Kundalik (2-tun).**

| ID | Qayerda | Kim | Matn |
| --- | --- | --- | --- |
| K-1 | kundalik (shkafdagi begona palto choʻntagida) | sardor | Bugun yana uch marta taqilladi, javob bermadim. Onam ham qoʻngʻiroq qildi. Unga ham javob bermadim. |
| K-2 | kundalik (vanna ostida, quvur orqasida) | sardor | Bugun ishga bormadim, kecha ham. Devor ortidagi odam meni tushunadi, boshqalar tushunmaydi. |

---

## 3-tun — Takror

| ID | Vaqt | Qayerda | Kim | Matn | Shart |
| --- | --- | --- | --- | --- | --- |
| N3-01 | 02:10 | tel | — | 02:10 · Seshanba, 16-dekabr | |
| N3-02 | 02:10 | tel | ish | Bugun ham kelmaysizmi? | |
| N3-03 | 02:11 | tel | — | Rustam aka · 0:16 *(qoʻngʻiroq oʻzi ulanadi; orqa fonda: Onam — 24 ta javobsiz)* | |
| N3-04 | | sub | rustam | Alo, hammasi joyidami? | |
| N3-05 | | sub | rustam | Muhabbat opa sizga nimadir dedimi? U kishi koʻp gapiradi. | |
| N3-06 | | sub | rustam | Ijarani beshinchigacha bersangiz boʻldi. Xayr. | |
| N3-07 | ekranni yoqqanda | tel | — | Onam · ovozli xabar · 0:14 | |
| N3-08 | xabarga bossa | tel | onam | Bolam, nega telefonni olmayapsan? | |
| N3-09 | | tel | onam | Kecha tushimda koʻrdim seni. Kichkina ekansan, qorda yalangoyoq turgan ekansan. | |
| N3-10 | | tel | onam | Bir ogʻiz «yaxshiman» deb yoz, boshqa hech narsa kerakmas. | |
| N3-11a | 03:17 + yoʻtal | sub | ovoz | «Yoʻq, uxlayapman». Esingdami? | n1: javob |
| N3-11a | | sub | ovoz | Men ham birinchi kechasi shunday degandim. | n1: javob |
| N3-11b | | sub | ovoz | Birinchi kechasi men ham indamagandim. | n1: sukut |
| N3-11b | | sub | ovoz | Qimirlamasang, koʻrishmaydi, deb oʻylagandim. | n1: sukut |
| N3-11c | | sub | ovoz | Birinchi kechasi men ham devorni urgandim. Uch marta. | n1: urdi |
| N3-12a | | sub | ovoz | Muhabbat opa senga Sardor haqida gapirdi-a? | `heard_sardor` |
| N3-12b | | sub | ovoz | Muhabbat opa senga halva berdi-a? Menga ham bergan. | aks holda |
| N3-13a | | sub | ovoz | «Ertaga», deysan. Men ham doim «ertaga» derdim. | K-4 topilgan |
| N3-13b | | sub | ovoz | Sen menga oʻxshab qolyapsan. | aks holda |
| N3-14a | devorga E | sub | oʻyinchi | Sen… kimsan? | javob → `n3_answered` |
| N3-14a | | sub | ovoz | Qoʻshningman. Devorning u tomonidagi qoʻshning. | |
| N3-14a | | sub | ovoz | Yaqinda sen ham kimgadir qoʻshni boʻlasan. | |
| N3-14b | 20 s hech narsa qilmasa | sub | ovoz | Mayli, gaplashmasak ham boʻladi. Men shu yerdaman. | sukut |
| N3-15 | tong | tel | — | 16:40 · Onam — 31 ta javobsiz qoʻngʻiroq | |

**Kundalik (3-tun).**

| ID | Qayerda | Kim | Matn |
| --- | --- | --- | --- |
| K-3 | kundalik (non qutisi tubida) | sardor | U mening gaplarimni qaytaryapti. Men aytgan gaplarni — lekin men ularni unga aytmaganman. |
| K-4 | kundalik (gilam ostida, **oʻyinchining oʻz xati**) | oʻyinchi | Onamga qoʻngʻiroq qilish kerak. Ertaga. Ertaga albatta. |

---

## 4-tun — 48

| ID | Vaqt | Qayerda | Kim | Matn | Shart |
| --- | --- | --- | --- | --- | --- |
| N4-01 | 02:15 | tel | ish | Ertaga kelmasangiz, oʻrningizga boshqa odam olamiz. | |
| N4-02 | yostiq ostidan olganda | tel | — | 02:2x · Chorshanba, 17-dekabr · Onam — 40 ta javobsiz qoʻngʻiroq · oxirgisi 23:58 | |
| N4-03 | | tel | — | Onam · ovozli xabar · 0:17 | |
| N4-04 | xabarga bossa | tel | onam | Bolam… Shuhrat akaning mashinasida ovqat berib yubordim. Somsa, qatlama, bir banka qatiq. | |
| N4-05 | | tel | onam | Eshigingga qoʻyib ketadi, olib qolarsan. | |
| N4-06 | | tel | onam | …Eshityapsanmi? Mayli. Sogʻ boʻl. | |
| N4-07 | 48 ichida | qogʻoz | — | Kalendar: DEKABR · 1 … 16 chizilgan · 17 chizilmagan *(ipga bogʻlangan ruchka)* | |
| N4-08 | sumkani ochsa | qogʻoz | — | Pasport: {name} | |
| N4-09 | 48 ichida, ovoz | sub | ovoz | Bolam, nega telefonni olmayapsan? | |
| N4-10 | | sub | ovoz | Ovqat qilyapsanmi oʻzi? Issiq kiyin, shamollab qolma. | |
| N4-11a | ovoz tomon yursa | sub | oʻyinchi | Sen… Sardormisan? | `heard_sardor` |
| N4-11a | | sub | ovoz | Sardor edim. Keyin qoʻshni boʻlib qoldim. | |
| N4-11a | | sub | ovoz | Meni Sardor deb faqat onam chaqirardi. | |
| N4-11b | ovoz tomon yursa | sub | oʻyinchi | Buni qayerdan bilasan? | N3-08 eshitilgan, `heard_sardor` yoʻq |
| N4-11b | | sub | ovoz | Telefoning yostiq ostida yotadi. Yostiq devorga tegib turadi. | |
| N4-11b | | sub | ovoz | Sen eshitmaganni men eshitaman. | |
| N4-11c | orqaga ketsa / hech narsa bilmasa | sub | ovoz | Ertaga yana kelasan. Hamma ertaga yana keladi. | |
| N4-12 | tong | tel | — | 12:10 · Onam — 41 ta javobsiz qoʻngʻiroq | |

*Agar oʻyinchi 3:17 dan keyin xonadan chiqmasa, N4-09 va N4-10 ni ovoz ochilib qolgan kirish eshigi
ortidan, maydonchadan aytadi. N4-11 chiqmaydi.*

**Kundalik (4-tun).**

| ID | Qayerda | Kim | Matn |
| --- | --- | --- | --- |
| K-5 | kundalik (48, stul ustida) | sardor | Bugun onam keldi va eshik oldida oʻtirdi. Men ichkarida edim. Ochmadim. Kechqurun u ketdi. Zinada uning qadamlari uzoq eshitilib turdi. |
| K-6 | kundalik (47, dahlizdagi koʻtarilgan taxta ostida) | sardor | Qirq sakkizga kirdim. U yerda mening stulim bor, mening piyolam bor, hatto tirnalgan joyi ham bir xil. Bu yerda meni hech kim kutmaydi. U yerda esa kutishadi. |

---

## 5-tun — 3:17

| ID | Vaqt | Qayerda | Kim | Matn | Shart |
| --- | --- | --- | --- | --- | --- |
| N5-01 | ekranni yoqqanda | tel | — | 02:20 · Payshanba, 18-dekabr · Onam — 52 ta javobsiz qoʻngʻiroq | |
| N5-02 | | tel | — | Onam · ovozli xabar · 0:12 | |
| N5-03 | xabarga bossa | tel | onam | Bolam, endi koʻp qoʻngʻiroq qilmayman, bezor qilmay. | |
| N5-04 | | tel | onam | Faqat bilib qoʻy: eshigimiz ochiq. Kelsang ham, kelmasang ham, qachon boʻlsa ham. | |
| N5-05a | 03:17 | sub | ovoz | «Yaxshiman, ona. Ishdaman». Yozganding, lekin joʻnatmading. | qoralama joʻnatilmagan |
| N5-05b | 03:17 | sub | ovoz | «Yaxshiman, ona. Ishdaman». Joʻnatding. Rost emasdi-ku. | qoralama joʻnatilgan |
| N5-06a | | sub | ovoz | «Sardormisan?» deb soʻraganding. Sardor shu yerda. Sen ham kelasan. | n4: Sardormisan |
| N5-06b | | sub | ovoz | «Buni qayerdan bilasan?» deganding. Endi bilasan. | n4: qayerdan |
| N5-06c | | sub | ovoz | {name}. Ismingni hamma unutadi, men esa unutmayman. | aks holda |
| N5-07 | | sub | ovoz | Eshikni och. | |
| N5-08 | | sub | ovoz | Bu yerda seni hech kim qoʻngʻiroq bilan bezor qilmaydi. | |

*Agar oʻyinchi hech narsa qilmasa, soat 3:17 dan oʻtmaydi: har 45 soniyada devor sekin uch marta
taqillaydi va N5-07 qaytariladi (soʻzlar hisobiga bir marta kiradi).*

**Kundalik (5-tun).**

| ID | Qayerda | Kim | Matn |
| --- | --- | --- | --- |
| K-7 | kundalik (soat ortida, devor qogʻozi ostida) | sardor | Soatni burash kerak edi. Men qoʻrqdim: soat yursa, men ham yurishim kerak boʻladi. Kalit dastada turibdi. Har kecha qoʻlimga olaman, har kecha qaytarib qoʻyaman. Ismim Sardor. Buni ham unutib qoʻymay deb yozib qoʻydim. |

---

## Yakunlar

Yakun nomlari («Qoʻshni», «Ketish», «3:18») faqat yakunlar roʻyxatida koʻrinadi, yakun davomida emas.

**A — Qoʻshni** (48 ga kirsa).

| ID | Qayerda | Kim | Matn |
| --- | --- | --- | --- |
| EA-01 | sub (devor ortidan, boʻgʻiq) | rustam | Mana kalit. Tok ba’zan oʻchib turadi. |
| EA-02 | sub (ovoz uslubida, lekin oʻyinchining gapi) | oʻyinchi | Qoʻshni… uxlamayapsizmi? |

**B — Ketish** (zinadan tushib, uydan chiqsa).

| ID | Qayerda | Kim | Matn |
| --- | --- | --- | --- |
| EB-01 | tel | — | Onam · kiruvchi qoʻngʻiroq *(javob tugmasi yoʻq)* |

**C — 3:18** (barcha shartlar bajarilgan boʻlsa, soatni buraganda).

| ID | Qayerda | Kim | Matn |
| --- | --- | --- | --- |
| EC-01 | tel | — | Onam · Qoʻngʻiroq qilish |
| EC-02 | qora ekran, oʻrtada | onam | Alo… bolam? |
