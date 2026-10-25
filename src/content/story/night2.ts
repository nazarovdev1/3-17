import type { StoryNode } from '@/core/engine/types'
import { flag, haptic, item, sanity, sfx } from './features'

/**
 * Night 2 — "Devor". Daytime stairwell scene with Muhabbat opa (the history of
 * flat 48), then the voice starts using the player's profile. Diary pages 1–2.
 */
export const night2Nodes: StoryNode[] = [
  {
    id: 'n2_day_start',
    night: 2,
    location: 'stairwell',
    checkpoint: true,
    onEnter: [sfx('step_tile')],
    desktop: { trigger: 'zone', zoneId: 'landing' },
    mobile: { vignette: 'stairwell', hotspots: ['muhabbat_door'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Kunduzi. Non olib qaytayapsiz, qoʻlingizda issiq non.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Uchinchi qavatda eshik ochiq. Katta yoshli ayol halvani idish bilan turibdi.' },
        ],
      },
      {
        speaker: 'muhabbat',
        variants: [{ text: 'Assalomu alaykum, qoʻshni! Yangimisiz? Kel, kel, halva ol.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Muhabbat opa. Gapirishni yaxshi koʻradi, koʻrinadi.' }],
      },
    ],
    next: 'n2_muhabbat_talk',
  },
  {
    id: 'n2_muhabbat_talk',
    night: 2,
    location: 'stairwell',
    onEnter: [flag('muhabbat_met', true)],
    desktop: { trigger: 'interact', objectId: 'muhabbat' },
    mobile: { vignette: 'stairwell', hotspots: ['muhabbat_door'] },
    lines: [
      {
        speaker: 'muhabbat',
        variants: [{ text: 'Nima soʻramoqchisan, jonim? Yuzingdan sezyapti.' }],
      },
    ],
    choices: [
      {
        id: 'ask48',
        label: '“48-xonadon haqida…”',
        to: 'n2_ask_48',
        when: { not: { flag: 'knows_48' } },
      },
      {
        id: 'asksardor',
        label: '“Bu yerdagi eski ijarachilar kim edi?”',
        to: 'n2_ask_sardor',
        when: { not: { flag: 'knows_sardor' } },
      },
      { id: 'leavetalk', label: 'Rahmat aytib, xonadonga chiqish', to: 'n2_day_end' },
    ],
  },
  {
    id: 'n2_ask_48',
    night: 2,
    location: 'stairwell',
    onEnter: [flag('knows_48', true), sanity(-3)],
    lines: [
      {
        speaker: 'muhabbat',
        variants: [{ text: 'Ooo… 48mi. U yerda hech kim yashamaydi, jonim. Yigirma yildan beri.' }],
      },
      {
        speaker: 'muhabbat',
        variants: [
          {
            text: '2006-yilda mohrlandi. Ichidagi odam… Sardor edi ismi. Bir kunda gʻoyib boʻldi.',
          },
        ],
      },
      {
        speaker: 'muhabbat',
        variants: [{ text: 'Ishonchim komil: hech qayerga ketmadi. Uyning oʻzi qaror qildi.' }],
      },
      {
        speaker: 'muhabbat',
        variants: [
          {
            text: 'Sen 47da yashaysan-ku?.. Yaxshi, yaxshi, muhokama qilmaymiz. Halvani ol, chiqdi.',
          },
        ],
      },
    ],
    next: 'n2_muhabbat_talk',
  },
  {
    id: 'n2_ask_sardor',
    night: 2,
    location: 'stairwell',
    onEnter: [flag('knows_sardor', true)],
    lines: [
      {
        speaker: 'muhabbat',
        variants: [
          { text: 'Sardor… Ozgina jim, kitobxon yigit edi. 47da yashar edi, sen xonadonda.' },
        ],
      },
      {
        speaker: 'muhabbat',
        variants: [
          { text: 'Koʻchib kelgandan keyin oʻzgarib qoldi. “Qoʻshnim gapiradi”, derdi. Kulardi.' },
        ],
      },
      {
        speaker: 'muhabbat',
        variants: [{ text: 'U qoʻshni esa — 48. U yerda oʻsha paytda ham hech kim yashamas edi.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Muhabbat opa gapini tugatmadi. Idishini olib, eshigini yopdi.' }],
      },
    ],
    next: 'n2_muhabbat_talk',
  },
  {
    id: 'n2_day_end',
    night: 2,
    location: 'room',
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Xonadon. Non, choy, sukut. Kunduz hali davom etmoqda.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Lekin bilib qoʻyadingiz: tunga hozirlanish kerak.' }],
      },
    ],
    next: 'n2_night_hub',
  },
  {
    id: 'n2_night_hub',
    night: 2,
    location: 'room',
    mobile: { vignette: 'room', hotspots: ['wardrobe', 'mirror', 'shared_wall', 'bathroom_door'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Tun. Chiroq kuchsiz. Uy sekin oʻziga kelgandek.' }],
      },
    ],
    choices: [
      {
        id: 'wardrobe',
        label: 'Kiyim shkafini ochish',
        to: 'n2_wardrobe',
        when: { not: { flag: 'saw_tally' } },
      },
      {
        id: 'mirror',
        label: 'Hammomdagi oynaga qarash',
        to: 'n2_mirror',
        when: { not: { flag: 'saw_mirror' } },
      },
      {
        id: 'bathroom',
        label: 'Hammomni qidirish',
        to: 'n2_diary2',
        when: { all: [{ flag: 'saw_mirror' }, { not: { flag: 'found_diary2' } }] },
      },
      {
        id: 'listen',
        label: 'Devorni tinglash',
        to: 'n2_listen',
        when: { not: { flag: 'listened_n2' } },
      },
      {
        id: 'tea',
        label: 'Oshxonada choy damlash',
        to: 'n2_tea',
        when: { not: { flag: 'tea_n2' } },
      },
      { id: 'wait317', label: '3:17’ni kutib yotish', to: 'n2_317' },
    ],
  },
  {
    id: 'n2_tea',
    night: 2,
    location: 'kitchen',
    onEnter: [flag('tea_n2', true), sfx('kettle'), sanity(6)],
    desktop: { trigger: 'interact', objectId: 'kettle' },
    mobile: { vignette: 'kitchen', hotspots: ['kettle'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Choynak pichillaydi. Gaz koʻk alanga — uyning eng oddiy, eng tirik narsasi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Choypiy. Qoʻllaringiz iliydi. Bir zumga devor oddiy devor boʻlib qoldi.' },
        ],
      },
    ],
    next: 'n2_night_hub',
  },
  {
    id: 'n2_wardrobe',
    night: 2,
    location: 'room',
    onEnter: [flag('saw_tally', true), item('diary_1'), sfx('page'), sanity(-4)],
    desktop: { trigger: 'interact', objectId: 'wardrobe' },
    mobile: { vignette: 'room', hotspots: ['wardrobe'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Shkaf ichida eski kiyimlar. Va — devorning orqa tomonida.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Barmoq bilan chizilgan chiziqlar. Toʻrttasi qirgʻoq bilan, bittasi oralab. Guruhlarga boʻlingan.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Chizilgan chiziqlar yigirma guruh. Yigirma yil.' }],
      },
      {
        speaker: 'diary',
        variants: [{ text: 'Shkaf tagida qattiq bukilgan sahifa yotibdi. Lekin oʻqiladi.' }],
      },
      {
        speaker: 'diary',
        variants: [
          {
            text: '“…21-marta hisoblab chiqdim: chiziqlar meniki emas. Menimcha, oldingilar ham hisoblagan.”',
          },
        ],
      },
    ],
    next: 'n2_night_hub',
  },
  {
    id: 'n2_mirror',
    night: 2,
    location: 'bathroom',
    onEnter: [flag('saw_mirror', true), sanity(-6), haptic('light')],
    desktop: { trigger: 'interact', objectId: 'mirror' },
    mobile: { vignette: 'bathroom', hotspots: ['mirror'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Hammom kichkina. Oynada sochingiz tartibsiz, koʻzlaringiz charchagan.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Boshingizni burdingiz. Aks… yarim soniya kech qoldi.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            when: { profile: 'fear', eq: 'kuzatuv' },
            text: 'Sizni kimdir kuzatayotganini sezganingizda ham shunday ediku — huddi shu his.',
          },
          {
            text: 'Yana sinab koʻrdingiz. Endi aks siz bilan birga harakat qiladi. Baribir… kechikkan.',
          },
        ],
      },
    ],
    next: 'n2_night_hub',
  },
  {
    id: 'n2_diary2',
    night: 2,
    location: 'bathroom',
    onEnter: [flag('found_diary2', true), item('diary_2'), sfx('page')],
    mobile: { vignette: 'bathroom', hotspots: ['vent'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Yuvinish oynasi ostida, santexnika kanalining yonida — qogʻoz.' }],
      },
      {
        speaker: 'diary',
        variants: [
          { text: '“…Oyna menga emas, devorga qaraydi. Buni tushungan kungim yomon boʻldi.”' },
        ],
      },
      {
        speaker: 'diary',
        variants: [{ text: '“Agar kimdir buni oʻqisa: 3:17’da ochmang. Ochmang. OCHMANG.”' }],
      },
    ],
    next: 'n2_night_hub',
  },
  {
    id: 'n2_listen',
    night: 2,
    location: 'room',
    onEnter: [flag('listened_n2', true), sfx('whisper'), haptic('heartbeat'), sanity(-5)],
    desktop: { trigger: 'interact', objectId: 'shared_wall' },
    mobile: { vignette: 'wall', hotspots: ['shared_wall'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Quloqingizni devorga qoʻydingiz. Sovuq, gʻadir-budur sirgʻaladi.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Ichida — bir narsa. Pichillov, uzoq. Soʻzlar yoʻq, faqat diqqat.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'U sizni eshitayotir. Siz ham uning eshitayotganini eshitayapsiz.' }],
      },
    ],
    next: 'n2_night_hub',
  },
  {
    id: 'n2_317',
    night: 2,
    location: 'room',
    onEnter: [
      flag('time', '3:17'),
      sfx('fridge_stop'),
      sfx('knock_triple'),
      haptic('knock'),
      sanity(-6),
    ],
    desktop: { trigger: 'scripted', eventId: 'knocks' },
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Soat 3:17. Yorugʻlik oʻchdi. Bu safar hayron qolmadingiz.' }],
      },
      { speaker: 'narrator', variants: [{ text: 'Uch zarba. Aynan uch. Har tun — aynan uch.' }] },
      {
        speaker: 'voice',
        variants: [
          {
            when: { flag: 'n1_reaction', eq: 'javob' },
            text: 'Kechdagi ovozingiz yoqimli edi. Yana eshitgim keldi.',
          },
          {
            when: { flag: 'n1_reaction', eq: 'urdi' },
            text: 'Kecha menga javob berdingiz — urish orqali. Men buni unutmadyam.',
          },
          { text: 'Kecha jim edingiz. Jimlik ham javob, bilasizmi.' },
        ],
      },
      {
        speaker: 'voice',
        variants: [
          {
            when: { profile: 'livesAlone', eq: 'ha' },
            text: 'Yolgʻiz yashaysiz-a? Men ham. Yaxshi mos kelamiz.',
          },
          {
            when: { profile: 'livesAlone', eq: 'hozircha' },
            text: '“Hozircha yolgʻiz”, dedingiz. “Hozircha” soʻzi… uzoq choʻziladi.',
          },
          { text: 'Oldingizdagilar ham bor edi. Hammasi… bir martta edi.' },
        ],
      },
    ],
    next: 'n2_voice_fear',
  },
  {
    id: 'n2_voice_fear',
    night: 2,
    location: 'room',
    onEnter: [sanity(-4)],
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      {
        speaker: 'voice',
        variants: [
          {
            when: { profile: 'fear', eq: 'qorongʻulik' },
            text: 'Qorongʻulikdan qoʻrqasiz, shundaymi? Men uyda yashayman. Unga odatlaning.',
          },
          {
            when: { profile: 'fear', eq: 'yolgʻizlik' },
            text: 'Yolgʻizlikdan qoʻrqasiz? Bas, endi yolgʻiz emassiz. Men bor.',
          },
          {
            when: { profile: 'fear', eq: 'kuzatuv' },
            text: 'Kuzatilishdan qoʻrqasiz… Lekin sizni kuzatayotganim haq, shunday emasmi?',
          },
          {
            when: { profile: 'fear', eq: 'unutilish' },
            text: 'Unutilishdan qoʻrqasiz. Kecha sizni esladim. Yana eslayman.',
          },
          { text: 'Siz nima dan qoʻrqsangiz, men oʻsha narsa boʻlib qolaman.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'U anketangizni qayerdan biladi — bunga tegmaysiz. Tegish qoʻrqinchli.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Uxlab qoldingiz. Uyushgan qoʻl bilan, kiyim bilan.' }],
      },
    ],
    next: 'n2_sleep',
  },
  {
    id: 'n2_sleep',
    night: 2,
    location: 'room',
    checkpoint: true,
    mobile: { vignette: 'room_dark' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Ikkinchi tun. Uy sizga oʻrganayapti. Siz ham — unga.' }],
      },
    ],
    next: 'n3_start',
  },
]
