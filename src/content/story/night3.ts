import type { StoryNode } from '@/core/engine/types'
import { flag, haptic, item, sanity, sfx } from './features'

/**
 * Night 3 — "Takror". The voice repeats the player's own earlier choices as if
 * they were its memories; the flat starts to lie (looping corridor on desktop,
 * a changed familiar detail on mobile). Diary pages 3–4. Answering the voice
 * tonight sets answered_n3, which gates the hidden ending.
 */
export const night3Nodes: StoryNode[] = [
  {
    id: 'n3_start',
    night: 3,
    location: 'room',
    checkpoint: true,
    mobile: { vignette: 'room' },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Uchinchi tun. Yoki birinchi. Farqi qolmadi — kechalar bir-biriga oʻxshaydi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Uy sizni kutib olgandek. Juda… poylab turgandek.' }],
      },
    ],
    next: 'n3_hub',
  },
  {
    id: 'n3_hub',
    night: 3,
    location: 'room',
    mobile: { vignette: 'room', hotspots: ['kitchen_door', 'corridor_door', 'tv', 'shared_wall'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Xona tanish. Tanishi… ortiqcha boʻlib qolgan.' }],
      },
    ],
    choices: [
      {
        id: 'kitchen',
        label: 'Oshxonaga borish',
        to: 'n3_kitchen',
        when: { not: { flag: 'found_diary3' } },
      },
      { id: 'corridor', label: 'Dahliga chiqish', to: 'n3_corridor_loop' },
      { id: 'tv', label: 'Televizorni yoqish', to: 'n3_tv', when: { not: { flag: 'saw_tv_n3' } } },
      {
        id: 'carpet',
        label: 'Gilamning ostini tekshirish',
        to: 'n3_diary4',
        when: { all: [{ flag: 'corridor_looped' }, { not: { flag: 'found_diary4' } }] },
      },
      {
        id: 'tea',
        label: 'Oshxonada choy damlash',
        to: 'n3_tea',
        when: { not: { flag: 'tea_n3' } },
      },
      { id: 'wait', label: 'Toʻshakka yotish', to: 'n3_317', effects: [flag('time', '3:16')] },
    ],
  },
  {
    id: 'n3_tea',
    night: 3,
    location: 'kitchen',
    onEnter: [flag('tea_n3', true), sfx('kettle'), sanity(6)],
    desktop: { trigger: 'interact', objectId: 'kettle' },
    mobile: { vignette: 'kitchen', hotspots: ['kettle'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Bir qultum choy. Issiq piyola qoʻllaringizda — reallikning eng oddiy dalili.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Bir zumga hammasi joyida. Faqat bir zum.' }],
      },
    ],
    next: 'n3_hub',
  },
  {
    id: 'n3_kitchen',
    night: 3,
    location: 'kitchen',
    onEnter: [item('diary_3'), flag('found_diary3', true), sfx('page')],
    desktop: { trigger: 'interact', objectId: 'bread_bin' },
    mobile: { vignette: 'kitchen', hotspots: ['bread_bin'] },
    lines: [
      { speaker: 'narrator', variants: [{ text: 'Oshxona. Non qutisi chinnigul rangda, eski.' }] },
      { speaker: 'narrator', variants: [{ text: 'Ichida non yoʻq. Ichida qogʻoz bor.' }] },
      {
        speaker: 'diary',
        variants: [
          {
            text: '“…Bugun ovoz menga oʻz soʻzlarimni qaytardi. Oʻz soʻzlarimni — lekin men ularni aytganimni eslamayman.”',
          },
        ],
      },
      {
        speaker: 'diary',
        variants: [
          {
            text: '“Agar u sening ovozing bilan gapirsa — bu u emas. Bu sen boʻlib qolgan narsa.”',
          },
        ],
      },
    ],
    next: 'n3_hub',
  },
  {
    id: 'n3_corridor_loop',
    night: 3,
    location: 'corridor',
    onEnter: [sanity(-5)],
    desktop: { trigger: 'zone', zoneId: 'corridor_loop' },
    mobile: { vignette: 'corridor', hotspots: ['front_door', 'corridor_length'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Dahliz. Old eshik oʻngda, oshxona chapda. Oddiy.' }],
      },
      { speaker: 'narrator', variants: [{ text: 'Old eshikka yoʻl oldingiz.' }] },
      { speaker: 'narrator', variants: [{ text: 'Besh qadam. Oʻn. Eshik yaqinlashmayapti.' }] },
      {
        speaker: 'narrator',
        variants: [
          {
            when: { sanityLt: 55 },
            text: 'Dahliz choʻzildi. Yoki siz qisqardingiz. Endi farqiga ham bormayapsiz.',
          },
          { text: 'Devorlar orasidagi masofa… oshib bordi.' },
        ],
      },
    ],
    choices: [
      { id: 'keep', label: 'Yugurib davom etish', to: 'n3_corridor_run', effects: [sanity(-6)] },
      { id: 'stop', label: 'Toʻxtab, orqaga qarash', to: 'n3_corridor_stop' },
    ],
  },
  {
    id: 'n3_corridor_run',
    night: 3,
    location: 'corridor',
    onEnter: [sfx('step_wood'), haptic('medium'), sanity(-4)],
    mobile: { vignette: 'corridor', hotspots: ['front_door'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Yugurdingiz. Qadamlaringiz eshitilmaydi. Tagʻin yurib koʻrdingiz. Hali ham jim.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Eshik oldingizda. Faqat… bu 47-eshik emas. Raqam yoʻq.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Koʻzingizni yumdingiz. Ochdingiz. Siz oʻz xonangizda turibsiz.' }],
      },
    ],
    next: 'n3_hub',
  },
  {
    id: 'n3_corridor_stop',
    night: 3,
    location: 'corridor',
    onEnter: [flag('corridor_looped', true), flag('clock_shifted', true), sanity(-2)],
    lines: [
      { speaker: 'narrator', variants: [{ text: 'Toʻxtadingiz. Orqaga qaradingiz.' }] },
      {
        speaker: 'narrator',
        variants: [{ text: 'Dahliz oddiy uzunlikda. Faqat siz koʻrmayotganda u oʻsadi, ehtimol.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Gilamning bir burchagi koʻtarilgan. Hech qachon koʻrilmagan burchak.' },
        ],
      },
    ],
    next: 'n3_room_return',
  },
  {
    id: 'n3_room_return',
    night: 3,
    location: 'room',
    onEnter: [flag('clock_shifted', true)],
    mobile: { vignette: 'room_shifted', hotspots: ['shifted_clock'] },
    desktop: { trigger: 'interact', objectId: 'clock' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Xonaga qaytdingiz. Hamma narsa oʻz joyida. Deyarli.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Soat… avval bu yerda emasdi. Devorda eski joyining izi qolgan.' }],
      },
    ],
    choices: [
      { id: 'shifted_clock', label: 'Joyini oʻzgartirgan soatni tekshirish', to: 'n3_hub' },
    ],
  },
  {
    id: 'n3_tv',
    night: 3,
    location: 'room',
    onEnter: [flag('saw_tv_n3', true), sfx('static'), sanity(-3)],
    desktop: { trigger: 'interact', objectId: 'tv' },
    mobile: { vignette: 'room', hotspots: ['tv'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Televizor. Bu safar shovqin tez oʻtdi — ekranda tasvir paydo boʻldi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Sizning xonangiz. Yuqoridan koʻrinish. Siz oʻtiribsiz, hozir oʻtirgan joyingizda.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Tasvirdagi siz boshni koʻtardi. Televizorni oʻchirdi.' }],
      },
    ],
    next: 'n3_hub',
  },
  {
    id: 'n3_diary4',
    night: 3,
    location: 'room',
    onEnter: [item('diary_4'), flag('found_diary4', true), sfx('page')],
    mobile: { vignette: 'room', hotspots: ['carpet'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Gilam ostida, pol taxtalari orasida — yana bir sahifa.' }],
      },
      {
        speaker: 'diary',
        variants: [
          {
            text: '“…U meni 47 deb oʻylamaydi. U uyning oʻzini eshitadi. Biz — mehmonmiz. Ikkalamiz.”',
          },
        ],
      },
      {
        speaker: 'diary',
        variants: [
          { text: '“Soat 3:17 — uyning chiqish vaqti. Chiqish esa… u yerdan. Devor orasidan.”' },
        ],
      },
    ],
    next: 'n3_hub',
  },
  {
    id: 'n3_317',
    night: 3,
    location: 'room',
    onEnter: [flag('time', '3:17'), sfx('fridge_stop'), sanity(-3)],
    mobile: { vignette: 'room_dark' },
    lines: [
      { speaker: 'narrator', variants: [{ text: 'Soat 3:16. Nafasingizni tekisladingiz.' }] },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Yorugʻlik oʻchdi. Aniq bir soniya oldin oynadagi aks oʻchgan edi — undan keyin chiroq.',
          },
        ],
      },
      { speaker: 'narrator', variants: [{ text: 'Va devor. Uch zarba.' }] },
    ],
    next: 'n3_voice_repeat',
  },
  {
    id: 'n3_voice_repeat',
    night: 3,
    location: 'room',
    onEnter: [sfx('knock_triple'), haptic('knock'), sanity(-5)],
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      {
        speaker: 'voice',
        variants: [
          {
            when: { flag: 'n1_reaction', eq: 'javob' },
            text: 'Eslayapsizmi: “Yoʻq, uxlayapman”, dedingiz. Oʻsha soʻzlar mening sevimli soʻzlarim boʻlib qoldi.',
          },
          {
            when: { flag: 'n1_reaction', eq: 'sukut' },
            text: 'Bir kuni jim yotdingiz. Nafasingizni ushlab. Men oʻsha sukutni oʻzimnikiga aylantirdim.',
          },
          { text: 'Bir kuni menga devor bilan javob berdingiz. Uchta zarba. Xuddi shunday.' },
        ],
      },
      {
        speaker: 'voice',
        variants: [
          {
            when: { flag: 'knows_48' },
            text: 'Muhabbat opa seni ogohlantirdi, shundaymi? U yaxshi odam. Lekin xato qildi.',
          },
          { text: 'Qoʻshnilaring gapiradi. Ularni eshitaman. Ular koʻp narsani bilmaydi.' },
        ],
      },
    ],
    next: 'n3_voice_echo',
  },
  {
    id: 'n3_voice_echo',
    night: 3,
    location: 'room',
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      {
        speaker: 'voice',
        variants: [
          {
            when: { profile: 'fear', eq: 'unutilish' },
            text: 'Sen unutilishdan qoʻrqarding. Men ham. Shuning uchun bir-birimizni eslaymiz.',
          },
          {
            when: { profile: 'fear', eq: 'yolgʻizlik' },
            text: 'Yolgʻizlik… men uni yutib yubordim. Sen ham yutasan, yutqazsang.',
          },
          { text: 'Sen menga oʻxshab qolyapsan. Men ham boshida sezmagandim.' },
        ],
      },
    ],
    choices: [
      {
        id: 'answer',
        label: '“Sen kimsan?” deb soʻrash',
        to: 'n3_answered',
        effects: [flag('answered_n3', true), sanity(-6)],
      },
      {
        id: 'silent',
        label: 'Devorga umuman javob bermaslik',
        to: 'n3_silent',
        effects: [sanity(-3)],
      },
    ],
  },
  {
    id: 'n3_answered',
    night: 3,
    location: 'room',
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      { speaker: 'player', variants: [{ text: 'Sen… kimsan?' }] },
      {
        speaker: 'voice',
        variants: [{ text: 'Men oldin ham sen edim. Bu savolga boshqa javobim yoʻq.' }],
      },
      { speaker: 'narrator', variants: [{ text: 'Bu javob ma’nosiz edi. Va butunlay aniq.' }] },
    ],
    next: 'n3_sleep',
  },
  {
    id: 'n3_silent',
    night: 3,
    location: 'room',
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Javob bermadingiz. Hech narsa. Bir zumda — koʻproq narsa.' }],
      },
      {
        speaker: 'voice',
        variants: [{ text: 'Jimlik. Yaxshi. Men ham gapirmayman. Suhbatlashamiz, faqat soʻzsiz.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Tonggacha devor iliq boʻlib qoldi. Normal boʻlishi mumkin emas edi.' }],
      },
    ],
    next: 'n3_sleep',
  },
  {
    id: 'n3_sleep',
    night: 3,
    location: 'room',
    checkpoint: true,
    mobile: { vignette: 'room_dark' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Uchinchi tun tugadi. Dahliz endi doʻst boʻlmaydi.' }],
      },
      { speaker: 'narrator', variants: [{ text: 'Siz oʻzingizni eslayapsiz. Hozircha.' }] },
    ],
    next: 'n4_start',
  },
]
