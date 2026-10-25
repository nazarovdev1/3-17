import type { StoryNode } from '@/core/engine/types'
import { flag, item, sanity, sfx, haptic } from './features'

/**
 * Night 1 — "Koʻchib kelish". Free exploration of flat 47, first contact at 3:17.
 * The first reaction (javob / jim / urdi) becomes a flag the voice remembers.
 */
export const night1Nodes: StoryNode[] = [
  {
    id: 'n1_start',
    night: 1,
    location: 'room',
    checkpoint: true,
    onEnter: [sfx('door_close'), haptic('light')],
    desktop: { trigger: 'scripted', eventId: 'arrival' },
    mobile: { vignette: 'room_entry' },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          {
            when: { flag: 'late_night' },
            text: 'Soat tungi uchlar. Haqiqiy uchlar. Siz endigina koʻchib keldingiz — aqlsizlik, lekin ijara puli arzon edi.',
          },
          { text: 'Chilonzor. Toʻqqiz qavatli paneli uy. Tashqarida qor sekin yogʻilyapti.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Xonadon 47. Toʻrtinchi qavat. Kalitlar qoʻlingizda hanuz iliq — Rustam akadan endigina oldingiz.',
          },
        ],
      },
      {
        speaker: 'landlord',
        variants: [
          {
            text: 'Bitta qoida bor, oʻrtoq: 48-xonadonga e’tibor bermang. U yerda hech kim yashamaydi.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'U kalitlarni juda tez berdi. Xayrlashmadi ham.' }],
      },
    ],
    next: 'n1_hub',
  },
  {
    id: 'n1_hub',
    night: 1,
    location: 'room',
    mobile: {
      vignette: 'room',
      hotspots: ['clock', 'note', 'radiator', 'tv', 'window', 'kitchen_door'],
    },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Xonadon sizniki. Hozircha boʻsh, hozircha odatiy.' }],
      },
    ],
    choices: [
      {
        id: 'clock',
        label: 'Devordagi soatga qarash',
        to: 'n1_clock',
        when: { not: { flag: 'inspected_clock' } },
      },
      {
        id: 'note',
        label: 'Rustam akaning qogʻozini oʻqish',
        to: 'n1_note',
        when: { not: { flag: 'inspected_note' } },
      },
      {
        id: 'radiator',
        label: 'Radiatore yaqinlashish',
        to: 'n1_radiator',
        when: { not: { flag: 'inspected_radiator' } },
      },
      {
        id: 'tv',
        label: 'Rubin televizorni sinash',
        to: 'n1_tv',
        when: { not: { flag: 'inspected_tv' } },
      },
      {
        id: 'window',
        label: 'Oynaga qarash',
        to: 'n1_window',
        when: { not: { flag: 'inspected_window' } },
      },
      {
        id: 'tea',
        label: 'Oshxonada choy damlash',
        to: 'n1_tea',
        when: { not: { flag: 'tea_n1' } },
      },
      { id: 'sleep', label: 'Uxlashga yotish', to: 'n1_316', effects: [flag('time', '3:16')] },
    ],
  },
  {
    id: 'n1_clock',
    night: 1,
    location: 'room',
    onEnter: [flag('inspected_clock', true), sfx('clock_tick')],
    desktop: { trigger: 'interact', objectId: 'clock' },
    mobile: { vignette: 'room', hotspots: ['clock'] },
    lines: [
      { speaker: 'narrator', variants: [{ text: 'Katta devor soati. Sommergildan qolgan.' }] },
      { speaker: 'narrator', variants: [{ text: 'Uchrasi toʻxtab qolgan: 3:17.' }] },
      {
        speaker: 'narrator',
        variants: [
          {
            when: { profile: 'fear', eq: 'unutilish' },
            text: 'Sizga tuyuladi: soat kutib turganidek. Kimni — noma’lum.',
          },
          { text: 'Batareyani almashtirish kerak. Ehtimol keyinroq.' },
        ],
      },
    ],
    next: 'n1_hub',
  },
  {
    id: 'n1_note',
    night: 1,
    location: 'room',
    onEnter: [flag('inspected_note', true), item('landlord_note')],
    desktop: { trigger: 'interact', objectId: 'note' },
    mobile: { vignette: 'room', hotspots: ['note'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Stol ustida borjali qogʻoz. Rustam akaning qoʻlyozmasi, shoshilinch yozilgan.' },
        ],
      },
      {
        speaker: 'landlord',
        variants: [{ text: 'Ijara: oyiga ikki yarim million. Komunalni men toʻlayman.' }],
      },
      {
        speaker: 'landlord',
        variants: [{ text: 'Qoida: tunda eshik zanjirini uring. Kim eshakni soʻrasa — ochmang.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: '“Kim eshakni soʻrasa”. Oddiy qogʻozda gʻalati jumla.' }],
      },
    ],
    next: 'n1_hub',
  },
  {
    id: 'n1_radiator',
    night: 1,
    location: 'room',
    onEnter: [flag('inspected_radiator', true), sfx('radiator'), haptic('light')],
    desktop: { trigger: 'interact', objectId: 'radiator' },
    mobile: { vignette: 'room', hotspots: ['radiator'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Choʻyan radiator. Issiq, lekin bezovta — u qattiq uriladi.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Urdi. Urdi. Toʻxtadi. Xuddi eshitib qolganday.' }],
      },
    ],
    next: 'n1_hub',
  },
  {
    id: 'n1_tv',
    night: 1,
    location: 'room',
    onEnter: [flag('inspected_tv', true), sfx('static'), sanity(-2)],
    desktop: { trigger: 'interact', objectId: 'tv' },
    mobile: { vignette: 'room', hotspots: ['tv'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Eski Rubin televizor. Yogʻoch korpus, kurak antenna.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Yaqdaganingizda — faqat oq shovqin, uzoqdagi daryoday.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            when: { sanityLt: 90 },
            text: 'Shovqin ichida bir narsa harakatlanayotganday. Ehtimol koʻz olovi.',
          },
          { text: 'Oʻchirdingiz. Xona yana jim.' },
        ],
      },
    ],
    next: 'n1_hub',
  },
  {
    id: 'n1_window',
    night: 1,
    location: 'room',
    onEnter: [flag('inspected_window', true)],
    desktop: { trigger: 'interact', objectId: 'window' },
    mobile: { vignette: 'window', hotspots: ['lamp', 'opposite_building'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Oynada qor. Narigi uyda bitta sariq lampa yonadi.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Uyning oynalarida oʻttiz oyna. Beshtida yorugʻlik.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Qarama-qarshi toʻrtinchi qavatda bir oyna yonadi. Xuddi sizniki kabi.' },
        ],
      },
    ],
    next: 'n1_hub',
  },
  {
    id: 'n1_tea',
    night: 1,
    location: 'kitchen',
    onEnter: [flag('tea_n1', true), sfx('kettle'), sanity(8)],
    desktop: { trigger: 'interact', objectId: 'kettle' },
    mobile: { vignette: 'kitchen', hotspots: ['kettle', 'gas_stove'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Oshxona kichkina, lekin yorugʻ. Gaz plitasi koʻk alanga bilan tutadi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Choynak pichillaydi. Koʻprik choynagi — Rustam akada qolgan.' }],
      },
      { speaker: 'narrator', variants: [{ text: 'Issiq choypiy. Tanangiz biroz boʻshashdi.' }] },
    ],
    next: 'n1_hub',
  },
  {
    id: 'n1_316',
    night: 1,
    location: 'room',
    onEnter: [flag('time', '3:16'), sfx('window_dark')],
    desktop: { trigger: 'timed', delayMs: 4000 },
    mobile: { vignette: 'window', hotspots: ['opposite_building'] },
    lines: [
      { speaker: 'narrator', variants: [{ text: 'Uxlamadingiz. Tanangiz olib ketmadi.' }] },
      {
        speaker: 'narrator',
        variants: [{ text: 'Soat 3:16. Narigi uyda oyna oʻchdi. Keyin yana bittasi. Keyin yana.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Oʻttiz oyna. Bittadan. Qorongʻilik yaqinlashdi — tomonga.' }],
      },
    ],
    next: 'n1_317',
  },
  {
    id: 'n1_317',
    night: 1,
    location: 'room',
    onEnter: [flag('time', '3:17'), sfx('fridge_stop'), haptic('medium')],
    desktop: { trigger: 'scripted', eventId: 'power_cut' },
    mobile: { vignette: 'room_dark', overlay: 'none' },
    lines: [
      { speaker: 'narrator', variants: [{ text: 'Soat 3:17.' }] },
      {
        speaker: 'narrator',
        variants: [{ text: 'Yorugʻlik oʻchdi. Muzlatgichning pichillashi birdan toʻxtadi.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Shunday jimlikki, quloqlaringizda qon shovullaydi.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Va u holda — devor. Oʻng tomondan. Uchta zarba.' }],
      },
    ],
    next: 'n1_knocks',
  },
  {
    id: 'n1_knocks',
    night: 1,
    location: 'room',
    onEnter: [sfx('knock_triple'), haptic('knock'), sanity(-6)],
    desktop: { trigger: 'scripted', eventId: 'knocks' },
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: '48-xonadon tomonidan. U yerda hech kim yashamaydi.' }],
      },
      {
        speaker: 'voice',
        variants: [{ text: 'Qoʻshni… uxlamayapsizmi?' }],
      },
    ],
    choices: [
      {
        id: 'answer',
        label: 'Javob berish: “Yoʻq, uxlayapman”',
        to: 'n1_answer',
        effects: [flag('n1_reaction', 'javob'), flag('answered_n1', true), sanity(-4)],
      },
      {
        id: 'silent',
        label: 'Jim yotish, nafasni ushlab turish',
        to: 'n1_silent',
        effects: [flag('n1_reaction', 'sukut'), sanity(-2)],
      },
      {
        id: 'knock_back',
        label: 'Devorga qarshi urish',
        to: 'n1_knock_back',
        effects: [flag('n1_reaction', 'urdi'), haptic('knock'), sanity(-8)],
      },
    ],
  },
  {
    id: 'n1_answer',
    night: 1,
    location: 'room',
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      { speaker: 'player', variants: [{ text: 'Yoʻq… uxlayapman.' }] },
      { speaker: 'narrator', variants: [{ text: 'Jimlik. Uzoq, tortinchi jimlik.' }] },
      {
        speaker: 'voice',
        variants: [
          {
            when: { profile: 'livesAlone', eq: 'ha' },
            text: 'Yaxshi. Yolgʻiz ovoz — yaxshi ovoz.',
          },
          { text: 'Ovozingizni eshitganim yaxshi boʻldi. Uzoq edi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Endi uxlab qoldingiz. Nima uchun — bilmaysiz.' }],
      },
    ],
    next: 'n1_sleep',
  },
  {
    id: 'n1_silent',
    night: 1,
    location: 'room',
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Nafasingizni ushlab turdingiz. Yostiq ostida yashiringansiz, kattaski odam boʻlib.',
          },
        ],
      },
      {
        speaker: 'voice',
        variants: [
          {
            when: { profile: 'doorAtNight', eq: 'yopiq' },
            text: 'Eshigingiz yopiq, bilaman. Baribir eshitaman: yuragingiz.',
          },
          { text: 'Nafasingizni ushlab turdingiz. Baribir eshitdim.' },
        ],
      },
      { speaker: 'narrator', variants: [{ text: 'Bundan keyin jimlik odatlanib qoldi.' }] },
    ],
    next: 'n1_sleep',
  },
  {
    id: 'n1_knock_back',
    night: 1,
    location: 'room',
    onEnter: [sfx('knock')],
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Barmoqlaringiz bilan devorga uch marta urdingiz. Aniq, qattiq.' }],
      },
      { speaker: 'narrator', variants: [{ text: 'Devor sovuq. Urdi — toʻxtadi.' }] },
      { speaker: 'voice', variants: [{ text: 'Javob berdingiz. Rahmat.' }] },
      {
        speaker: 'narrator',
        variants: [{ text: 'Siz savol bermadingiz. U buni javob deb hisobladi.' }],
      },
    ],
    next: 'n1_sleep',
  },
  {
    id: 'n1_sleep',
    night: 1,
    location: 'room',
    checkpoint: true,
    onEnter: [sanity(4)],
    mobile: { vignette: 'room_dark' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Tong ochilmaydi — lekin bir narsa oʻzgaradi. Uyga quyosh tushadi.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Birinchi tun oʻtdi. Soat yana 3:17’da toʻxtab turadi.' }],
      },
    ],
    next: 'n2_day_start',
  },
]
