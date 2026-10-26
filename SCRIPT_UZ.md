# 3:17 — oʻzbekcha ssenariy

> Bu fayl avtomatik yaratiladi (`npm run text:build`). Uni tahrirlamang — matnni
> `src/content/text/uz/*.yaml` fayllarida oʻzgartiring. Har bir sahna sarlavhasida
> tugun nomi (`n1_start`) va YAML kaliti koʻrsatilgan.

---

## 1-tun — Koʻchib kelish

### `n1_start` · xona

**Hikoyachi:** Chilonzordagi toʻqqiz qavatli panel uy, toʻrtinchi qavat.  
**Hikoyachi:** Zinapoyada chiroq yoʻq edi, telefon chirogʻida chiqib keldingiz. Smenadan keyin oyoqlaringiz oʻzingizniki emasdek.  
**Rustam aka:** Mana kalit. Tok ba’zan oʻchib turadi, sham shkafda bor. Yana bitta gap — qirq sakkizga e’tibor bermang, u yerda hech kim turmaydi.  
**Hikoyachi:** U kalit dastasini qoʻlingizga tutqazdi-yu, pasportingizni ham soʻramay, zinadan tushib ketdi.  
**Hikoyachi:** Dastada ikkita kalit bor: biri eshikniki, ikkinchisi kichkina, mis. U haqda Rustam aka hech narsa demadi.  
**Hikoyachi:** Dasta iliq edi. Uni ancha vaqt qoʻlida siqib turgan boʻlsa kerak.  

→ `n1_hub`

### `n1_hub` · xona

**Hikoyachi:** Xona sovuq, lekin toza. Polda hali hoʻl latta hidi bor, kimdir sizdan oldin yuvib ketgan.  

Tanlovlar:
1. Devordagi soatga qarash → `n1_clock` *(faqat: bir marta)*
1. Stol ustidagi xatni oʻqish → `n1_note` *(faqat: bir marta)*
1. Radiatorni ushlab koʻrish → `n1_radiator` *(faqat: bir marta)*
1. Televizorni yoqish → `n1_tv` *(faqat: bir marta)*
1. Derazadan qarash → `n1_window` *(faqat: bir marta)*
1. Telefonga qarash → `n1_phone` *(faqat: onaning 1-xabari hali eshitilmagan)*
1. Oshxonaga oʻtib, choy qoʻyish → `n1_tea` *(faqat: bir marta)*
1. Chiroqni oʻchirib yotish → `n1_316`

### `n1_clock` · xona

**Hikoyachi:** Devorda katta soat osilib turibdi, oynasi changli, yogʻoch gardishi qorayib ketgan.  
**Hikoyachi:** Millari uchdan oʻn yetti daqiqa oʻtganda toʻxtab qolgan.  
**Hikoyachi** (variantlar, l3):
- *agar anketada qoʻrquv: unutilish:* Negadir tugʻilgan kuningiz esingizga tushdi. Oxirgi marta uni kim bilan nishonlagan edingiz?
- *boshqa hollarda:* Orqasidagi batareya joyi boʻsh. Batareyani kimdir ataylab olib qoʻygan.

→ `n1_hub`

### `n1_note` · xona
*Topiladi: landlord_note*

**Hikoyachi:** Stol ustida buklangan qogʻoz yotibdi. Rustam akaning qoʻli, shoshib yozilgan.  
**Rustam aka:** Ijara oyiga ikki yarim million, har oyning beshinchisigacha. Kommunalni oʻzim toʻlayman.  
**Rustam aka:** Kechasi eshikni zanjirlab yoting va kim chaqirsa ham ochmang.  
**Rustam aka:** Ismingizni aytib chaqirsa ham.  
**Hikoyachi:** Oxirgi gap boshqa ruchkada yozilgan, xuddi keyinroq eslab qoʻshilgandek.  

→ `n1_hub`

### `n1_radiator` · xona

**Hikoyachi:** Choʻyan radiatorning ustida eski paypoq izi qolgan, issigʻi esa zoʻrgʻa seziladi.  
**Hikoyachi:** Ichida suv shildirab oqdi, keyin bir marta quruq taq etdi.  
**Hikoyachi:** Panel uylarda radiator doim shunaqa qiladi. Uyda ham shunaqa edi.  

→ `n1_hub`

### `n1_tv` · xona

**Hikoyachi:** Yogʻoch qutili eski «Rubin» televizori, antennasi skotch bilan yopishtirilgan.  
**Hikoyachi:** Yoqdingiz. Ekranda oq-qora «qor» shitirlay boshladi.  
**Hikoyachi:** Shitirlash orasida kimdir bir marta yoʻtaldi.  
**Hikoyachi:** Oʻchirdingiz. Qoramtir ekranda xona aks etdi: divan, gilam va ortingizdagi ochiq eshik.  

→ `n1_hub`

### `n1_window` · xona

**Hikoyachi:** Roʻparada xuddi shunday toʻqqiz qavatli uy, qator-qator derazalari qorongʻi.  
**Hikoyachi:** Pastda yolgʻiz koʻcha chirogʻi yonib turibdi, uning sariq doirasida qor aylanadi.  
**Hikoyachi:** Roʻparadagi toʻrtinchi qavatda bitta deraza yorugʻ. Pardasi yoʻq, lekin ichida hech kim koʻrinmaydi.  

→ `n1_hub`

### `n1_phone` · xona

**Hikoyachi:** Telefon stol ustida, quvvatlagichga ulangan holda yotibdi.  
**Hikoyachi:** Ekranda «Onam — 3 ta javobsiz qoʻngʻiroq» degan yozuv, ostida bitta ovozli xabar.  

Tanlovlar:
1. Ovozli xabarni eshitish → `n1_message`
1. Keyinroq eshitaman, deb telefonni qoʻyish → `n1_hub`

### `n1_message` · xona
*Topiladi: mom_msg_1*

**Onam:** Bolam, yetib bordingmi? Uy issiqmi oʻzi? Bir ogʻiz yozib qoʻy, xavotir olyapman.  
**Hikoyachi:** Xabar oʻn bir soniya davom etdi. Oxirida u yana nimadir demoqchi boʻldi, lekin yozuv uzilib qoldi.  
**Hikoyachi:** Javob yozmoqchi boʻldingiz, ammo barmogʻingiz ekran ustida qotib qoldi.  

→ `n1_hub`

### `n1_tea` · oshxona

**Hikoyachi:** Oshxona tor: plita, muzlatgich va bitta taburetka. Muzlatgich bir tekis gʻuvillab turibdi.  
**Hikoyachi:** Choynakni olovga qoʻyib, gazning koʻk tili yonida qoʻllaringizni isitdingiz.  
**Hikoyachi:** Birinchi qultumdan keyin yelkalaringiz pastga tushdi. Ularni qachondan beri koʻtarib yurgan ekansiz?  

→ `n1_hub`

### `n1_316` · xona

**Hikoyachi:** Yotdingiz, lekin uyqu kelmadi. Telefonda soat 3:16.  
**Hikoyachi:** Roʻparadagi uyda derazalar pastdan yuqoriga, qavatma-qavat, birin-ketin oʻchyapti.  
**Hikoyachi:** Toʻrtinchi qavatdagi deraza hammasidan keyin oʻchdi.  

→ `n1_317`

### `n1_317` · xona

**Hikoyachi:** 3:17.  
**Hikoyachi:** Chiroq oʻchdi va muzlatgich gʻuvillashdan toʻxtadi.  
**Hikoyachi:** Uy shu qadar jim boʻldiki, qulogʻingiz oʻz-oʻzidan biror tovush qidira boshladi.  
**Hikoyachi:** Keyin oʻng tomondagi devor uch marta taqilladi.  

→ `n1_knocks`

### `n1_knocks` · xona

**Hikoyachi:** Bu devorning ortida qirq sakkizinchi xonadon turibdi.  
**Ovoz:** Qoʻshni… uxlamayapsizmi?  

Tanlovlar:
1. «Yoʻq, uxlayapman», deyish → `n1_answer`
1. Indamay yotish → `n1_silent`
1. Devorni uch marta taqillatish → `n1_knock_back`

### `n1_answer` · xona

**Siz:** Yoʻq… uxlayapman.  
**Hikoyachi:** Gapingiz ahmoqona chiqdi.  
**Ovoz:** Men ham.  
**Ovoz** (variantlar, l4):
- *agar anketada «yolgʻiz yashaysizmi»: ha:* Yolgʻiz odam kechasi har bir tovushni eshitadi. Toʻgʻrimi?
- *boshqa hollarda:* Yaxshi tush koʻring, qoʻshni.
**Hikoyachi:** Tong otguncha devorga tikilib yotdingiz.  

→ `n1_sleep`

### `n1_silent` · xona

**Hikoyachi:** Nafasingizni ichingizga yutdingiz. Bolalikda qorongʻida xuddi shunday yotardingiz: qimirlamasang, koʻrishmaydi.  
**Ovoz** (variantlar, l2):
- *agar anketada eshik: yopiq:* Eshigingiz yopiq ekan. Yaxshi, men ham yopib yotaman.
- *boshqa hollarda:* Mayli. Ertaga gaplasharmiz.
**Hikoyachi:** Boshqa tovush boʻlmadi, siz esa tong otguncha qimirlamadingiz.  

→ `n1_sleep`

### `n1_knock_back` · xona

**Hikoyachi:** Musht bilan devorga uch marta urdingiz, barmoq boʻgʻinlaringiz achishib ketdi.  
**Hikoyachi:** Devor ortida uzoq jimlik choʻkdi.  
**Ovoz:** Rahmat. Javob berganingiz uchun.  
**Hikoyachi:** Siz esa hech narsa demagan edingiz.  

→ `n1_sleep`

### `n1_sleep` · xona

**Hikoyachi:** Tong otdi. Tok qaytdi, muzlatgich yana gʻuvillay boshladi.  
**Hikoyachi:** Devordagi soat esa hamon oʻsha vaqtni koʻrsatib turibdi.  
**Hikoyachi:** Telefonni ekrani bilan pastga qaratib qoʻydingiz.  

→ `n2_day_start`

---

## 2-tun — Devor

### `n2_day_start` · zinapoya

**Hikoyachi:** Kunduzi atigi uch soat uxladingiz, keyin non olgani pastga tushdingiz.  
**Hikoyachi:** Uchinchi qavatda bir eshik ochiq turibdi. Ostonada roʻmol oʻragan kampir qoʻlida bir likopcha halva ushlab turibdi.  
**Muhabbat opa:** Voy, bolam, oʻsha qirq yettiga koʻchdingmi? Kel, kel, halva ol, hali issiq.  
**Muhabbat opa:** Men Muhabbat opangman. Shu uyda qirq yildan beri turaman, hammani bilaman.  
**Muhabbat opa:** Oʻzing qayerdansan? Ota-onang bormi? Yolgʻiz turasanmi?  
**Hikoyachi:** U javobingizni kutib oʻtirmadi, likopchani qoʻlingizga tutqazdi.  

→ `n2_muhabbat_talk`

### `n2_muhabbat_talk` · zinapoya

**Muhabbat opa** (variantlar, l1):
- *agar (Muhabbat opadan 48 haqida soʻralgan yoki Muhabbat opadan Sardor haqida soʻralgan):* Yana nimani soʻramoqchisan? Soʻrayver, uyalma.
- *boshqa hollarda:* Nima soʻramoqchisan, bolam? Yuzingdan koʻrinib turibdi.

Tanlovlar:
1. Qirq sakkiz haqida soʻrash → `n2_ask_48` *(faqat: bir marta)*
1. Oldin bu yerda kim turganini soʻrash → `n2_ask_sardor` *(faqat: bir marta)*
1. Rahmat aytib, yuqoriga chiqish → `n2_day_end`

### `n2_ask_48` · zinapoya

**Muhabbat opa:** Qirq sakkiz? Voy, uni gapirma, yigirma yildan beri yopiq turibdi.  
**Muhabbat opa:** Ikki ming oltinchi yili muhrlab ketishgan. Eshigida qogʻoz bor edi, keyin u ham yoʻqolib qoldi.  
**Muhabbat opa:** Ba’zan kechalari u yoqdan televizor ovozi keladi. Men eshitmaganga olaman, yoshim bir joyga borib qoldi.  

→ `n2_muhabbat_talk`

### `n2_ask_sardor` · zinapoya

**Muhabbat opa:** Sendan oldin Sardor degan bola turardi. Qishloqdan kelgan, odobli, kitobga oʻch bola edi.  
**Muhabbat opa:** Keyin birdan oʻzgarib, uydan chiqmay qoʻydi. «Qoʻshnim bilan gaplashib oʻtiraman», derdi.  
**Muhabbat opa:** Qaysi qoʻshni, desam, kulib qoʻyardi. Qirq sakkizda u paytda ham hech kim yoʻq edi.  
**Muhabbat opa:** Onasi qishloqdan kelib-ketib yurdi, eshik oldida soatlab oʻtirib kutardi. Sardor esa ochmasdi.  
**Muhabbat opa:** Bir kuni yoʻq boʻlib qoldi. Na koʻrgan bor, na eshitgan.  

→ `n2_muhabbat_talk`

### `n2_day_end` · zinapoya

**Muhabbat opa:** Onangga qoʻngʻiroq qilib tur, xoʻpmi? Onalar kutadi.  
**Hikoyachi:** U eshigini yopdi, halva esa qoʻlingizda asta soviy boshladi.  

→ `n2_night_hub`

### `n2_night_hub` · xona

**Hikoyachi:** Tun. Ishdan qaytganingizda radiator zoʻrgʻa iliq, derazada esa muz gullari ochilgan edi.  

Tanlovlar:
1. Shkafni ochish → `n2_wardrobe` *(faqat: bir marta)*
1. Hammomga kirib, oynaga qarash → `n2_mirror` *(faqat: bir marta)*
1. Vanna ostini qarash → `n2_diary2` *(faqat: oynaga qaralgan va bir marta)*
1. Devorga quloq solish → `n2_listen` *(faqat: bir marta)*
1. Telefonga qarash → `n2_phone` *(faqat: bir marta)*
1. Choy qoʻyish → `n2_tea` *(faqat: bir marta)*
1. Kiyimni yechmay yotish → `n2_317`

### `n2_phone` · xona

**Hikoyachi:** Ekranning yuqorisida «Onam (11)» degan belgi, yana bitta ovozli xabar kelibdi.  

Tanlovlar:
1. Ovozli xabarni eshitish → `n2_message`
1. Keyinroq eshitaman, deb telefonni qoʻyish → `n2_night_hub`

### `n2_message` · xona
*Topiladi: mom_msg_2*

**Onam:** Bolam, otang soʻrayapti: pul yetyaptimi? Ovqat qilyapsanmi oʻzi? Yetmasa ayt, uyalma.  
**Onam:** Bizda qor yogʻdi. Sen tomonda ham yogʻdimi? Issiq kiyin, shamollab qolma.  
**Hikoyachi:** Orqada televizor gapiryapti, choynakning qopqogʻi shiqirlayapti. Uyning ovozi.  

Tanlovlar:
1. «Yaxshiman, ona» deb yozish → `n2_draft`
1. Telefonni teskari qoʻyish → `n2_night_hub`

### `n2_draft` · xona

**Hikoyachi:** «Yaxshiman, ona. Ishdaman», deb yozdingiz.  
**Hikoyachi:** Aslida ishda emassiz — qorongʻi xonada, kurtkangizni ham yechmay yotibsiz.  
**Hikoyachi:** Barmogʻingiz joʻnatish tugmasi ustida toʻxtab qoldi. Keyin harflarni bittalab oʻchirib chiqdingiz.  

→ `n2_night_hub`

### `n2_tea` · oshxona

**Hikoyachi:** Choynak shivillayapti. Gazning koʻk alangasi bu uydagi eng tirik narsa.  
**Hikoyachi:** Issiq piyolani ikki qoʻllab ushladingiz va bir zumga devor oddiy devorga aylandi.  

→ `n2_night_hub`

### `n2_wardrobe` · xona
*Topiladi: diary_1*

**Hikoyachi:** Shkafda uzun, qora palto osilib turibdi. Bu sizning paltongiz emas.  
**Hikoyachi:** Orqa taxtasiga tirnab chiziqlar chizilgan: toʻrttasi tik, beshinchisi ustidan. Bunday guruhlar juda koʻp.  
**Hikoyachi:** Eng oxirgi chiziq yangi, tokchada hali yogʻoch qirindisi turibdi.  
**Hikoyachi:** Palto choʻntagidan buklangan qogʻoz chiqdi.  
**Kundalik:** «Bugun yana uch marta taqilladi, javob bermadim. Onam ham qoʻngʻiroq qildi. Unga ham javob bermadim.»  

→ `n2_night_hub`

### `n2_mirror` · hammom

**Hikoyachi:** Hammom tor: vanna, rakovina va uning ustida oynali javoncha.  
**Hikoyachi:** Oynada koʻz osti koʻkargan, sochlari yogʻlanib qolgan yuz turibdi. Necha kundan beri shundaysiz?  
**Hikoyachi:** Boshingizni oʻngga burdingiz, oynadagi siz esa bir lahza kech burildi.  
**Hikoyachi** (variantlar, l4):
- *agar anketada qoʻrquv: kuzatuv:* Yana burilib koʻrdingiz, bu safar aks oʻz vaqtida burildi. Ortingizdagi eshik esa qiya ochiq edi, holbuki siz uni yopgan edingiz.
- *boshqa hollarda:* Yana burilib koʻrdingiz, bu safar aks oʻz vaqtida burildi. Faqat koʻzini sizdan uzmadi.

→ `n2_night_hub`

### `n2_diary2` · hammom
*Topiladi: diary_2*

**Hikoyachi:** Vanna ostida, quvurning orqasida namdan qavargan qogʻoz yotibdi.  
**Kundalik:** «Bugun ishga bormadim, kecha ham. Devor ortidagi odam meni tushunadi, boshqalar tushunmaydi.»  

→ `n2_night_hub`

### `n2_listen` · xona

**Hikoyachi:** Qulogʻingizni devorga qoʻydingiz. Gilam ortidagi suvoq muzdek.  
**Hikoyachi:** Avvaliga hech narsa eshitilmadi. Keyin sekin, bir tekis nafas keldi — siz bilan bir vaqtda.  
**Hikoyachi:** Nafasingizni toʻxtatdingiz. Devorning u tomonidagi nafas ham toʻxtadi.  

→ `n2_night_hub`

### `n2_317` · xona

**Hikoyachi:** 3:17. Muzlatgich yana jim boʻldi.  
**Hikoyachi:** Bu safar taqillashni kutib yotgan edingiz. Devor uch marta taqilladi.  
**Ovoz** (variantlar, l3):
- *agar 1-tundagi munosabat: javob:* Kecha javob berdingiz. Ovozingiz charchagan ekan.
- *agar 1-tundagi munosabat: urdi:* Kecha devorni qattiq urdingiz. Qoʻlingiz ogʻrimadimi?
- *boshqa hollarda:* Kecha indamadingiz, lekin uxlamadingiz ham. Bilaman.
**Ovoz** (variantlar, l4):
- *agar anketada «yolgʻiz yashaysizmi»: ha:* Yolgʻiz yashaysiz-a? Men ham.
- *agar anketada «yolgʻiz yashaysizmi»: hozircha:* «Hozircha yolgʻizman», debsiz. Bu «hozircha» qancha davom etadi?
- *boshqa hollarda:* Yolgʻiz emasman, debsiz. Unda nega hech kimga qoʻngʻiroq qilmaysiz?

→ `n2_voice_fear`

### `n2_voice_fear` · xona

**Ovoz** (variantlar, l1):
- *agar anketada qoʻrquv: qorongʻulik:* Qorongʻidan qoʻrqasiz. Men ham qoʻrqardim, keyin koʻnikib ketdim.
- *agar anketada qoʻrquv: yolgʻizlik:* Yolgʻizlikdan qoʻrqasiz. Endi yolgʻiz emassiz, men borman-ku.
- *agar anketada qoʻrquv: kuzatuv:* Kimdir kuzatayotgandek tuyuladi sizga. Toʻgʻri tuyuladi.
- *agar anketada qoʻrquv: unutilish:* Unutilishdan qoʻrqasiz. Men sizni unutmayman.
- *boshqa hollarda:* Har kim nimadandir choʻchiydi, siz ham.
**Hikoyachi:** Ertalab kiyimingiz bilan uygʻondingiz. Telefon koʻkragingizda yotgan ekan.  

→ `n2_sleep`

### `n2_sleep` · xona

**Hikoyachi:** Tushlikka yaqin turdingiz. Telefonda yana bitta javobsiz qoʻngʻiroq bor edi.  

→ `n3_start`

---

## 3-tun — Takror

### `n3_start` · xona

**Hikoyachi:** Telefonda seshanba deb turibdi, siz esa bugun dushanba deb yurgan edingiz.  
**Hikoyachi:** Ishxonadan xabar keldi — «Bugun ham kelmaysizmi?» Kecha ishga borgandingiz-ku. Yoki bormagan edingizmi?  
**Hikoyachi:** Shu payt telefon jiringladi. Ekranda «Rustam aka». Siz birinchi signaldayoq oldingiz.  
**Rustam aka:** Alo, hammasi joyidami? Muhabbat opa sizga nimadir dedimi? U kishi koʻp gapiradi.  
**Rustam aka:** Ijarani beshinchigacha bersangiz boʻldi. Xayr.  
**Hikoyachi:** Suhbat oʻn olti soniya davom etdi. Ekranda uning ostida hamon «Onam — 24 ta javobsiz» degan yozuv turardi.  

→ `n3_hub`

### `n3_hub` · xona

**Hikoyachi:** Xona tanish, juda tanish. Har bir dogʻini yoddan bilasiz.  

Tanlovlar:
1. Oshxonadagi non qutisini ochish → `n3_kitchen` *(faqat: bir marta)*
1. Dahlizga chiqish → `n3_corridor_loop` *(faqat: bir marta)*
1. Televizorni qayta yoqish → `n3_tv` *(faqat: bir marta)*
1. Gilamning chetini koʻtarish → `n3_diary4` *(faqat: dahlizda toʻxtab, orqaga qaralgan va bir marta)*
1. Telefonga qarash → `n3_phone` *(faqat: onaning 3-xabari hali eshitilmagan)*
1. Choy qoʻyish → `n3_tea` *(faqat: bir marta)*
1. Divanga choʻzilish → `n3_317`

### `n3_phone` · xona

**Hikoyachi:** Yangi ovozli xabar. Yuboruvchi — «Onam».  

Tanlovlar:
1. Ovozli xabarni eshitish → `n3_message`
1. Keyinroq eshitaman, deb telefonni qoʻyish → `n3_hub`

### `n3_message` · xona
*Topiladi: mom_msg_3*

**Onam:** Bolam, nega telefonni olmayapsan?  
**Onam:** Kecha tushimda koʻrdim seni. Kichkina ekansan, qorda yalangoyoq turgan ekansan.  
**Onam:** Bir ogʻiz «yaxshiman» deb yoz, boshqa hech narsa kerakmas.  
**Hikoyachi:** Xabar tugadi. Ekran oʻchdi va xona yana qorongʻilikka choʻmdi.  

→ `n3_hub`

### `n3_tea` · oshxona

**Hikoyachi:** Issiq piyola qoʻlingizda. Hozir bu yerdagi eng haqiqiy narsa shu.  
**Hikoyachi:** Choy tugaguncha hech narsani oʻylamadingiz.  

→ `n3_hub`

### `n3_kitchen` · oshxona
*Topiladi: diary_3*

**Hikoyachi:** Non qutisi boʻm-boʻsh, faqat tubida buklangan qogʻoz yotibdi.  
**Kundalik:** «U mening gaplarimni qaytaryapti. Men aytgan gaplarni — lekin men ularni unga aytmaganman.»  

→ `n3_hub`

### `n3_corridor_loop` · dahliz

**Hikoyachi:** Dahliz: chapda oshxona, oʻngda hammom, oxirida kirish eshigi. Hammasi besh qadam.  
**Hikoyachi:** Eshik tomon yurdingiz. Oʻn qadam, oʻn besh qadam.  
**Hikoyachi:** Eshik esa hamon oʻsha masofada turibdi.  
**Hikoyachi** (variantlar, l4):
- *agar es-hush < 55:* Devor qogʻozidagi gullar takrorlanyapti — oʻsha dogʻ, oʻsha yirtiq, yana va yana.
- *boshqa hollarda:* Ortingizdagi xona eshigi ham uzoqlashib qolibdi.

Tanlovlar:
1. Yugurib ketish → `n3_corridor_run`
1. Toʻxtab, orqaga qarash → `n3_corridor_stop`

### `n3_corridor_run` · dahliz

**Hikoyachi:** Yugurdingiz, lekin shippaklaringiz polda shapillamadi. Hech qanday tovush yoʻq edi.  
**Hikoyachi:** Bir payt qoʻlingiz eshik tutqichiga tegdi. Eshikda raqam yoʻq, faqat burama mixlarning izi qolgan.  
**Hikoyachi:** Koʻzingizni yumib ochdingiz va xonada, divan oldida turganingizni koʻrdingiz.  

→ `n3_hub`

### `n3_corridor_stop` · dahliz

**Hikoyachi:** Toʻxtab, orqangizga qaradingiz.  
**Hikoyachi:** Dahliz odatdagidek kalta, xona eshigi ikki qadamda turibdi.  
**Hikoyachi:** Faqat bitta pol taxtasi koʻtarilib qolibdi. Oldin bunday emas edi.  

→ `n3_room_return`

### `n3_room_return` · xona

**Hikoyachi:** Xonaga qaytdingiz. Hammasi joyida. Deyarli.  
**Hikoyachi:** Soat boshqa devorda osilib turibdi. Eski joyida devor qogʻozi ochroq: toʻrtburchak iz qolgan.  

Tanlovlar:
1. Soatni yaqindan koʻrish → `n3_clock_close`

### `n3_clock_close` · xona

**Hikoyachi:** Soatni yaqindan koʻrdingiz. Millar hamon 3:17 da turibdi.  
**Hikoyachi:** Oynadagi changda bitta barmoq izi qolibdi. Yangi.  

→ `n3_hub`

### `n3_tv` · xona

**Hikoyachi:** Televizorni yoqdingiz. Bu safar shitirlash oʻrniga tasvir chiqdi.  
**Hikoyachi:** Ekranda shu xona, tepadagi burchakdan olingan. Divanda kimdir sizga orqasi bilan oʻtiribdi.  
**Hikoyachi:** Tasvirdagi odam asta boshini bura boshladi.  
**Hikoyachi:** Oʻchirdingiz. Qora ekranda xona aks etdi — divan boʻsh, siz esa tik turibsiz.  

→ `n3_hub`

### `n3_diary4` · xona
*Topiladi: diary_4*

**Hikoyachi:** Gilamning chetini koʻtardingiz, ostidan buklangan qogʻoz chiqdi.  
**Hikoyachi:** Xat tanish, juda tanish. Bu sizning xatingiz.  
**Kundalik:** «Onamga qoʻngʻiroq qilish kerak. Ertaga. Ertaga albatta.»  
**Hikoyachi:** Buni qachon yozganingizni eslay olmaysiz, qogʻoz esa allaqachon sargʻayib ketgan.  

→ `n3_hub`

### `n3_317` · xona

**Hikoyachi:** 3:17. Tok oʻchdi, uy jimib qoldi.  
**Hikoyachi:** Bu safar taqillash boʻlmadi. Faqat devor ortida kimdir yoʻtalib qoʻydi.  
**Hikoyachi:** Keyin juda yaqindan ovoz keldi.  

→ `n3_voice_repeat`

### `n3_voice_repeat` · xona

**Ovoz** (variantlar, l1):
- *agar 1-tundagi munosabat: javob:* «Yoʻq, uxlayapman». Esingdami? Men ham birinchi kechasi shunday degandim.
- *agar 1-tundagi munosabat: sukut:* Birinchi kechasi men ham nafasimni ichimga yutib yotgandim. Qimirlamasang, koʻrishmaydi, deb oʻylagandim.
- *boshqa hollarda:* Birinchi kechasi men ham devorni musht bilan urgandim. Barmoqlarim achishib ketgandi.
**Ovoz** (variantlar, l2):
- *agar Muhabbat opadan Sardor haqida soʻralgan:* Muhabbat opa senga Sardor haqida gapirib berdi-a? Bilaman, hamma shuni gapiradi.
- *boshqa hollarda:* Muhabbat opa senga halva berdi-a? Menga ham bergan edi. Issiqqina edi.

→ `n3_voice_echo`

### `n3_voice_echo` · xona

**Ovoz** (variantlar, l1):
- *agar 4-sahifa topilgan:* «Ertaga», deysan. Men ham doim «ertaga» derdim.
- *boshqa hollarda:* Sen menga oʻxshab qolyapsan. Men ham boshida buni sezmagandim.

Tanlovlar:
1. «Sen kimsan?» deb soʻrash → `n3_answered`
1. Indamaslik → `n3_silent`

### `n3_answered` · xona

**Siz:** Sen… kimsan?  
**Ovoz:** Qoʻshningman. Devorning u tomonidagi qoʻshning.  
**Ovoz:** Yaqinda sen ham kimgadir qoʻshni boʻlasan.  

→ `n3_sleep`

### `n3_silent` · xona

**Hikoyachi:** Indamadingiz. Tizzalaringizni quchoqlab, tong otguncha oʻtirdingiz.  
**Ovoz:** Mayli, gaplashmasak ham boʻladi. Men shu yerdaman.  
**Hikoyachi:** Ertalab devorga kaftingizni qoʻydingiz. Devor iliq edi, holbuki qirq sakkizda isitish yoʻq.  

→ `n3_sleep`

### `n3_sleep` · xona

**Hikoyachi:** Kun qanday oʻtganini eslay olmaysiz. Derazaga qarasangiz, tashqari yana qorongʻi.  

→ `n4_start`

---

## 4-tun — 48

### `n4_start` · xona

**Hikoyachi:** Ishxonadan yana xabar keldi — «Ertaga kelmasangiz, oʻrningizga boshqa odam olamiz.»  
**Hikoyachi:** Javob yozmadingiz, telefonni yostiq ostiga tiqib qoʻydingiz.  
**Hikoyachi:** Dahlizda nimadir shitirladi, xuddi kimdir polda nimanidir sudrab oʻtgandek.  

→ `n4_hub`

### `n4_hub` · xona

**Hikoyachi** (variantlar, l1):
- *agar 3:17 dan keyin:* Atrof qorongʻi, derazadan faqat koʻcha chirogʻining sariq nuri tushyapti.
- *boshqa hollarda:* Yostiq ostida telefon bir-ikki titrab qoʻydi.

Tanlovlar:
1. Telefonni yostiq ostidan olish → `n4_phone` *(faqat: onaning 4-xabari hali eshitilmagan)*
1. Dahlizdagi koʻtarilgan taxtani ochish → `n4_diary6` *(faqat: bir marta)*
1. Choy qoʻyish → `n4_tea` *(faqat: bir marta va 3:17 dan oldin)*
1. Tokning oʻchishini kutish → `n4_317` *(faqat: 3:17 dan oldin)*
1. Eshik koʻzidan qarash → `n4_peephole` *(faqat: 3:17 dan keyin va bir marta)*
1. Maydonchaga chiqish → `n4_door48` *(faqat: eshik koʻzidan qaralgan)*
1. Hech qayoqqa chiqmay, yotish → `n4_sleep` *(faqat: tugun ichkariga olingan)*

### `n4_phone` · xona

**Hikoyachi:** Ekran yorishdi. Javobsiz qoʻngʻiroqlar soni qirqqa yetibdi, oxirgisi — 23:58. Yangi ovozli xabar ham bor.  

Tanlovlar:
1. Ovozli xabarni eshitish → `n4_message`
1. Keyinroq eshitaman, deb telefonni qoʻyish → `n4_hub`

### `n4_message` · xona
*Topiladi: mom_msg_4*

**Onam:** Bolam… Shuhrat akaning mashinasida ovqat berib yubordim. Somsa, qatlama, bir banka qatiq.  
**Onam:** Eshigingga qoʻyib ketadi, olib qolarsan.  
**Onam:** …Eshityapsanmi? Mayli. Sogʻ boʻl.  
**Hikoyachi:** Uning «mayli» degani uzoq choʻzilib qoldi.  

→ `n4_hub`

### `n4_tea` · oshxona

**Hikoyachi:** Choy qoʻydingiz. Gazning koʻk alangasi devorga titroq soya tashlayapti.  
**Hikoyachi:** Piyoladagi choy titrab turibdi. Yoki qoʻlingiz titrayaptimi?  

→ `n4_hub`

### `n4_317` · xona

**Hikoyachi:** 3:17. Tok yana ketdi va muzlatgich tindi.  
**Hikoyachi:** Taqillash boʻlmadi. Uning oʻrniga maydonchadan bitta qadam tovushi keldi, keyin yana jimlik.  

→ `n4_hub`

### `n4_peephole` · dahliz

**Hikoyachi:** Eshik koʻzidan qaradingiz. Maydoncha egilib, xira shar ichiga yigʻilib qolgan.  
**Hikoyachi:** Zinapoya yonida baland boʻyli kimdir turibdi. Egnida uzun palto, orqasi sizga qaragan.  
**Hikoyachi:** Koʻzingizni olib, yana qaradingiz. Hech kim yoʻq.  
**Hikoyachi:** Faqat beton polda qirq sakkizinchi eshik tomon ketgan hoʻl izlar qolibdi.  

→ `n4_hub`

### `n4_diary6` · dahliz
*Topiladi: diary_6*

**Hikoyachi:** Kecha koʻtarilib qolgan taxtani qoʻporib oldingiz, tagidan qogʻoz chiqdi.  
**Kundalik:** «Qirq sakkizga kirdim. U yerda mening stulim bor, mening piyolam bor, hatto tirnalgan joyi ham bir xil.»  
**Kundalik:** «Bu yerda meni hech kim kutmaydi. U yerda esa kutishadi.»  

→ `n4_hub`

### `n4_door48` · dahliz

**Hikoyachi:** Maydonchada sovuq. Lift ishlamaydi, zinapoya zim-ziyo.  
**Hikoyachi** (variantlar, l2):
- *agar tugun ichkariga olingan:* Ostonada hech narsa yoʻq, tugun ichkarida, stol ustida turibdi.
- *boshqa hollarda:* Ostonangizda tugun turibdi: somsa, qatlama, bir banka qatiq. Tugun hali iliq.
**Hikoyachi:** Qirq sakkizinchi eshik qiya ochiq. Muhr qogʻozi yirtilgan, yarmi yerda yotibdi.  

Tanlovlar:
1. Qirq sakkizga kirish → `n4_inside48`
1. Tugunni olib, ichkariga qaytish → `n4_retreat` *(faqat: bir marta)*

### `n4_retreat` · xona

**Hikoyachi:** Tugunni ichkariga olib kirdingiz va qatlamadan bir tishlab koʻrdingiz. Uyning ta’mi.  
**Hikoyachi:** Eshikni zanjirladingiz. Qirq sakkizning eshigi esa ochiqligicha qoldi.  

→ `n4_hub`

### `n4_inside48` · qirq sakkizinchi xonadon

**Hikoyachi:** Ichkarida sovuq va chang hidi. Gilam, divan, soat — hammasi xuddi sizning xonangizdagidek.  
**Hikoyachi:** Faqat bu yerda hammasi eskirib ketgan. Devor qogʻozi koʻchib tushgan, gilamning rangi oʻchgan.  
**Hikoyachi:** Soat bu yerda ham oʻsha vaqtda toʻxtab qolgan.  

→ `n4_copy_room`

### `n4_copy_room` · qirq sakkizinchi xonadon

**Hikoyachi:** Koʻzingiz qorongʻiga asta koʻnikib boryapti.  

Tanlovlar:
1. Devordagi kalendarni koʻrish → `n4_calendar` *(faqat: bir marta)*
1. Divandagi sumkani ochish → `n4_belongings` *(faqat: bir marta)*
1. Stuldagi qogʻozni olish → `n4_diary5` *(faqat: bir marta)*
1. Yotoq tomonga yurish → `n4_glitch` *(faqat: kalendar koʻrilgan)*

### `n4_calendar` · qirq sakkizinchi xonadon

**Hikoyachi:** Devorda yirtma kalendar osilgan. Yili yozilmagan, faqat oy va kunlar bor.  
**Hikoyachi:** Kunlar birma-bir chizib chiqilgan, oxirgisi — kecha.  
**Hikoyachi:** Bugungi kun hali chizilmagan. Yonida ipga bogʻlangan ruchka osilib turibdi.  

→ `n4_copy_room`

### `n4_belongings` · qirq sakkizinchi xonadon

**Hikoyachi:** Divanda sumka yotibdi. Sizning sumkangiz — yirtilgan bandi oq ip bilan tikilgan.  
**Hikoyachi:** Ichida pasport. Rasmda siz, ismi ham sizniki: {name}.  
**Hikoyachi:** Pasportni qalin chang bosgan, goʻyo uni yillar davomida hech kim qoʻzgʻatmagan.  

→ `n4_copy_room`

### `n4_diary5` · qirq sakkizinchi xonadon
*Topiladi: diary_5*

**Hikoyachi:** Stul ustida bir varaq qogʻoz. Xati shkafdagi qogʻozniki bilan bir xil.  
**Kundalik:** «Bugun onam keldi va eshik oldida oʻtirdi. Men ichkarida edim. Ochmadim.»  
**Kundalik:** «Kechqurun u ketdi. Zinada uning qadamlari uzoq eshitilib turdi.»  

→ `n4_copy_room`

### `n4_glitch` · qirq sakkizinchi xonadon

**Hikoyachi:** Yotoq tomonga yurdingiz. Qorongʻida nimadir qimirladi.  
**Hikoyachi:** Koʻz oldingiz chayqalib, tasvir surilib ketdi, devor chiziqlari bir-biriga tutashmay qoldi.  
**Hikoyachi:** Keyin hammasi joyiga tushdi, lekin bir lahza eshik qaysi tomonda ekanini eslay olmadingiz.  

→ `n4_voice_identity`

### `n4_voice_identity` · qirq sakkizinchi xonadon

**Hikoyachi:** Bu safar ovoz devor ortidan emas, shu xonaning oʻzidan keldi.  
**Ovoz:** Bolam, nega telefonni olmayapsan?  
**Hikoyachi:** Ovoz onangizniki emas edi. Soʻzlar esa uniki.  
**Hikoyachi** (variantlar, l4):
- *agar onaning 3-xabari hali eshitilmagan:* Siz bu xabarni eshitmagan edingiz. U eshitgan.
- *boshqa hollarda:* Bu soʻzlarni kecha, qorongʻi xonada, telefondan eshitgan edingiz.
**Ovoz:** Ovqat qilyapsanmi oʻzi? Issiq kiyin, shamollab qolma.  

Tanlovlar:
1. «Sardormisan?» deb soʻrash → `n4_ask_sardor` *(faqat: Muhabbat opadan Sardor haqida soʻralgan)*
1. «Bu gaplarni qayerdan bilasan?» deb soʻrash → `n4_why`
1. Indamaslik → `n4_no_talk`

### `n4_ask_sardor` · qirq sakkizinchi xonadon

**Siz:** Sen… Sardormisan?  
**Ovoz:** Sardor edim. Keyin qoʻshni boʻlib qoldim.  
**Ovoz:** Bu yerda ism uzoq turmaydi. Meni Sardor deb faqat onam chaqirardi.  

→ `n4_return`

### `n4_why` · qirq sakkizinchi xonadon

**Siz:** Bu gaplarni qayerdan bilasan?  
**Ovoz:** Telefoning yostiq ostida yotadi. Yostiq esa devorga tegib turadi.  
**Ovoz:** Sen eshitmaganni men eshitaman. Kimdir eshitishi kerak-ku.  

→ `n4_return`

### `n4_no_talk` · qirq sakkizinchi xonadon

**Hikoyachi:** Indamadingiz va orqaga, eshik tomon yurdingiz.  
**Ovoz:** Ertaga yana kelasan. Hamma ertaga yana keladi.  

→ `n4_return`

### `n4_return` · xona

**Hikoyachi:** Oʻz xonangizga qaytdingiz va eshikdagi raqamga qaradingiz: 47.  
**Hikoyachi:** Kaftlaringiz chang boʻlib qolgan, ularni yuvishga ham kuchingiz yetmadi.  
**Hikoyachi** (variantlar, l3):
- *agar tugun ichkariga olingan:* Tugun stol ustida turibdi. Unga qoʻl tekkizmadingiz.
- *boshqa hollarda:* Tugun ostonada qolib ketdi. Ertalab u yerda yoʻq edi.

→ `n4_sleep`

### `n4_sleep` · xona

**Hikoyachi:** Uxlay olmadingiz. Yostiq ostida telefon bir necha marta titradi.  
**Hikoyachi:** Siz olmadingiz.  

→ `n5_start`

---

## 5-tun — 3:17

### `n5_start` · xona

**Hikoyachi:** Bugun koʻchaga chiqmadingiz. Kecha ham, undan oldingi kun ham chiqmagandingiz, shekilli.  
**Hikoyachi** (variantlar, l2):
- *agar qirq sakkizga kirilgan:* Qirq sakkizning eshigi endi yopilmaydi, ochiq tirqishdan dahlizga sovuq oqib kiryapti.
- *boshqa hollarda:* Maydonchadan sovuq kiryapti. Qirq sakkizning eshigi qiya ochiq qolgan boʻlsa kerak.

→ `n5_hub`

### `n5_hub` · xona

**Hikoyachi:** Soat devorda, millari qimirlamaydi. Muzlatgich esa gʻuvillab turibdi.  

Tanlovlar:
1. Soatni devordan olish → `n5_clock` *(faqat: bir marta)*
1. Eshik zanjirini ushlab koʻrish → `n5_chain` *(faqat: bir marta)*
1. Soat osilgan joyni koʻrish → `n5_diary7` *(faqat: soat koʻrilgan va bir marta)*
1. Telefonga qarash → `n5_phone` *(faqat: onaning 5-xabari hali eshitilmagan)*
1. Hoziroq kiyinib, uydan chiqib ketish → `endB`
1. Oxirgi marta choy qoʻyish → `n5_tea` *(faqat: bir marta)*
1. Shu yerda qolib, kutish → `n5_316`

### `n5_phone` · xona

**Hikoyachi:** «Onam» — 52. Oxirgi qoʻngʻiroq bir soat oldin boʻlgan, yangi ovozli xabar ham kelibdi.  

Tanlovlar:
1. Ovozli xabarni eshitish → `n5_message`
1. Keyinroq eshitaman, deb telefonni qoʻyish → `n5_hub`

### `n5_message` · xona
*Topiladi: mom_msg_5*

**Onam:** Bolam, endi koʻp qoʻngʻiroq qilmayman, bezor qilmay.  
**Onam:** Faqat bilib qoʻy: eshigimiz ochiq. Kelsang ham, kelmasang ham, qachon boʻlsa ham.  
**Hikoyachi:** Xabar tugadi, siz esa telefonni ancha vaqtgacha qoʻlingizdan qoʻymadingiz.  

→ `n5_hub`

### `n5_tea` · oshxona

**Hikoyachi** (variantlar, l1):
- *agar tugun ichkariga olingan:* Oxirgi marta choy qoʻydingiz va somsaning qolganini isitdingiz.
- *boshqa hollarda:* Oxirgi marta choy qoʻydingiz. Choynak shivillab, oshxona biroz iliqlashdi.
**Hikoyachi:** Bir piyola choy ichguncha hech narsa boʻlmadi. Shuning oʻzi koʻp edi.  

→ `n5_hub`

### `n5_clock` · xona

**Hikoyachi:** Soatni devordan oldingiz. U ogʻir, qopqogʻi ostida changli mexanizm koʻrinadi.  
**Hikoyachi:** Prujinasi boʻshab qolgan, yon tomonida esa kichkina kalit teshigi bor.  
**Hikoyachi:** Dastadagi kichkina mis kalitni teshikka tutdingiz. Aynan shu teshik uchun ekan.  

→ `n5_hub`

### `n5_chain` · dahliz

**Hikoyachi:** Zanjirni ushladingiz. Har kecha uni taqib yotgansiz.  
**Hikoyachi** (variantlar, l2):
- *agar anketada eshik: ochiq:* Anketada «eshigim ochiq» deb yozgan edingiz, lekin bu yerda uni bir marta ham ochiq qoldirmadingiz.
- *boshqa hollarda:* Anketada «eshigim yopiq» deb yozgan edingiz. Toʻgʻri yozgan ekansiz.
**Hikoyachi:** Koʻchaga chiqish uchun bitta harakat yetadi.  

→ `n5_hub`

### `n5_diary7` · xona
*Topiladi: diary_7*

**Hikoyachi:** Soat osilgan joyda devor qogʻozi koʻchib turibdi, ortida esa buklangan qogʻoz.  
**Kundalik:** «Soatni burash kerak edi. Men qoʻrqdim: soat yursa, men ham yurishim kerak boʻladi.»  
**Kundalik:** «Kalit dastada turibdi. Har kecha qoʻlimga olaman, har kecha qaytarib qoʻyaman. Ismim Sardor. Buni ham unutib qoʻymay deb yozib qoʻydim.»  

→ `n5_hub`

### `n5_316` · xona

**Hikoyachi:** 3:16. Roʻparadagi derazalar yana birin-ketin oʻchyapti.  
**Hikoyachi:** Toʻrtinchi qavat eng oxirida oʻchdi. U yerda kimdir telefon ushlab turgan edi, ekranning yorugʻi uning yuziga tushib turardi.  

→ `n5_317`

### `n5_317` · xona

**Hikoyachi:** 3:17. Xonadagi chiroq, muzlatgich, koʻcha chirogʻi — hammasi bir vaqtda oʻchdi.  
**Hikoyachi:** Telefon ekrani ham qorayib qoldi, holbuki quvvati toʻla edi.  
**Hikoyachi:** Keyin devordan uch marta taqillash eshitildi — sekin, deyarli mehr bilan.  

→ `n5_voice_final`

### `n5_voice_final` · xona

**Ovoz** (variantlar, l1):
- *agar «Yaxshiman, ona» deb yozilgan:* «Yaxshiman, ona. Ishdaman». Yozganding, lekin joʻnatmading. Men ham shunday yozardim.
- *agar 1-tundagi munosabat: javob:* «Yoʻq, uxlayapman». Birinchi kechasi shunday deganding. Hali ham uxlamayapsan.
- *boshqa hollarda:* Birinchi kechasi sen indamading. Men jimligingni ham eslab qoldim.
**Ovoz** (variantlar, l2):
- *agar «Sardormisan?» deb soʻralgan:* «Sardormisan?» deb soʻraganding. Sardor shu yerda, men ham shu yerdaman. Sen ham kelasan.
- *agar «Qayerdan bilasan?» deb soʻralgan:* «Bu gaplarni qayerdan bilasan?» deganding. Endi bilasan.
- *boshqa hollarda:* {name}. Ismingni hamma unutadi, men esa unutmayman.
**Ovoz:** Eshikni och. Bu yerda seni hech kim qoʻngʻiroq bilan bezor qilmaydi.  

→ `n5_final_choice`

### `n5_final_choice` · xona

**Hikoyachi:** Qirq sakkiz devor ortida, uning eshigi maydonchada ochiq turibdi.  
**Hikoyachi:** Kirish eshigi dahliz oxirida. Undan keyin zinapoya, hovli va koʻcha.  
**Hikoyachi** (variantlar, l3):
- *agar soat koʻrilgan:* Soat qoʻlingizda. Mis kalit uning teshigiga mos keladi.
- *boshqa hollarda:* Soat devorda, millari qimirlamaydi.

Tanlovlar:
1. Eshikni ochib, qirq sakkizga kirish → `endA`
1. Zanjirni yechib, uydan chiqib ketish → `endB`
1. Soatni burash → `endC` *(faqat: kundalik sahifalari ≥ 7 va es-hush ≥ 40 va 3-tunda ovozga javob berilgan — EMAS va onaning barcha 5 xabari eshitilgan)*

---

## Yakunlar

### `endA` · qirq sakkizinchi xonadon

**Hikoyachi:** Maydonchaga chiqdingiz. Qirq sakkizning eshigi sizni kutib turgan edi.  
**Hikoyachi:** Ichkarida chang, sovuq va sizning stulingiz. Siz oʻtirdingiz.  
**Hikoyachi:** Devor ortida, qirq yettida telefoningiz titrab yotardi. Keyin u ham titrashdan toʻxtadi.  
**Hikoyachi:** Bahorda qirq yettiga yangi ijarachi koʻchib keldi — yosh, yolgʻiz, qoʻlida bitta sumka.  
**Hikoyachi:** Birinchi kechasi uning stoli ustida telefon yorishdi. Ekranda «Onam», lekin u olmadi.  
**Hikoyachi:** Soat 3:17 boʻlganda siz devorni uch marta taqillatdingiz.  
**Ovoz:** Qoʻshni… uxlamayapsizmi?  

**Yakun A: Qoʻshni**

### `endB` · zinapoya

**Hikoyachi:** Zanjirni yechib, zinapoyadan pastga tushdingiz: toʻrtinchi qavat, uchinchi.  
**Hikoyachi:** Muhabbat opaning eshigi ostidan yorugʻ tushib turibdi — u ham uxlamagan ekan. Siz toʻxtamadingiz.  
**Hikoyachi:** Hovlida qor yogʻyapti. Sariq chiroq ostida nafasingiz bugʻ boʻlib koʻtariladi.  
**Hikoyachi:** Chuqur nafas oldingiz. Sovuq havo oʻpkangizni achitdi.  
**Hikoyachi:** Bekatda birinchi avtobus turibdi, haydovchi sizga qaramay eshikni ochdi.  
**Hikoyachi:** Choʻntagingizda telefon titradi. Ekranda «Onam» degan yozuv.  
**Hikoyachi:** Siz unga uzoq qarab turdingiz, keyin telefonni choʻntagingizga solib qoʻydingiz.  
**Hikoyachi:** Avtobus joyidan qoʻzgʻaldi, telefon esa yana titray boshladi.  
**Hikoyachi:** Derazaga qaradingiz. Qorongʻi oynada oʻsha charchagan yuz.  

**Yakun B: Ketish**

### `endC` · xona

**Hikoyachi:** Mis kalitni soatning teshigiga solib buradingiz. Prujina gʻijirlab ketdi.  
**Hikoyachi:** Soat chiqillay boshladi. Tik. Tik.  
**Hikoyachi:** Uzun mil qimirladi. Soat endi 3:18.  
**Hikoyachi:** Devor jim. Uch marta taqillashini kutdingiz, lekin taqillamadi.  
**Hikoyachi:** Ovoz chiqarib «Sardor», dedingiz.  
**Hikoyachi:** Muzlatgich gʻuvillab ishga tushdi, tok qaytdi, telefon ekrani yorishdi.  
**Hikoyachi:** Siz «Onam» degan yozuvni bosdingiz. Bir marta chaqirdi. Ikki.  
**Onam:** Alo… bolam?  

**Yakun C: 3:18**
