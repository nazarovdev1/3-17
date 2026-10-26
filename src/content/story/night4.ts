import type { StoryNode } from '@/core/engine/types'
import { flag, haptic, item, sanity, sfx } from './features'

/**
 * Night 4 — "48". The peephole figure, the ajar door, the decayed copy of flat
 * 47 with the player's own belongings. Diary pages 5–6. The single allowed fake
 * glitch lives here (spec 6.3), behind the fx system so "Reduce flashing" can
 * remove it.
 */
export const night4Nodes: StoryNode[] = [
  {
    id: 'n4_start',
    night: 4,
    location: 'room',
    checkpoint: true,
    mobile: { vignette: 'room' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Toʻrtinchi tun. Uy odatdagidan tinch. Bu yomon belgi.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Dahlizdan — shivir. Xuddi eski eshik haqida gapirilayotganday.' }],
      },
    ],
    next: 'n4_hub',
  },
  {
    id: 'n4_hub',
    night: 4,
    location: 'room',
    mobile: { vignette: 'room', hotspots: ['front_door', 'peephole', 'shared_wall', 'carpet'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Bu tun bir narsa boshqacha: old eshikdan shovqin eshitiladi.' }],
      },
    ],
    choices: [
      {
        id: 'peephole',
        label: 'Kozachokka qarash',
        to: 'n4_peephole',
        when: { not: { flag: 'saw_figure' } },
      },
      {
        id: 'carpet',
        label: 'Gilamni koʻtarish',
        to: 'n4_diary6',
        when: { not: { flag: 'found_diary6' } },
      },
      {
        id: 'corridor',
        label: 'Dahliga chiqish',
        to: 'n4_door48',
        when: { flag: 'saw_figure' },
      },
      {
        id: 'tea',
        label: 'Oshxonada choy damlash',
        to: 'n4_tea',
        when: { not: { flag: 'tea_n4' } },
      },
      { id: 'wait', label: 'Kutish', to: 'n4_317' },
    ],
  },
  {
    id: 'n4_tea',
    night: 4,
    location: 'kitchen',
    onEnter: [flag('tea_n4', true), sfx('kettle'), sanity(6)],
    desktop: { trigger: 'interact', objectId: 'kettle' },
    mobile: { vignette: 'kitchen', hotspots: ['kettle'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Bir qultum choy. Qoʻlingiz qanday iliq — siz buni sezib ololmaysiz endi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Piyolada choy titraydi. Yoki bu qoʻlingizniki. Farqi yoʻq.' }],
      },
    ],
    next: 'n4_hub',
  },
  {
    id: 'n4_317',
    night: 4,
    location: 'room',
    onEnter: [flag('time', '3:17'), sfx('fridge_stop'), sanity(-3)],
    desktop: { trigger: 'scripted', eventId: 'power_cut' },
    mobile: { vignette: 'room_dark' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Soat 3:17. Yorugʻlik oʻchdi. Uy kutganingizdek tutdi.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Devorda urish boʻlmadi. Bu safar sukut kutishga oʻxshaydi — eshigingiz oldidan.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Zinapoya maydonchasidan oyoq ovozi. Bittasi. Yaqqol. Keyin jimlik.' }],
      },
    ],
    next: 'n4_hub',
  },
  {
    id: 'n4_peephole',
    night: 4,
    location: 'corridor',
    onEnter: [flag('saw_figure', true), sanity(-5), haptic('medium')],
    desktop: { trigger: 'interact', objectId: 'peephole' },
    mobile: { vignette: 'peephole', hotspots: ['figure'] },
    lines: [
      { speaker: 'narrator', variants: [{ text: 'Kozachok. Barcha narsa burama, uchli, sariq.' }] },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Zinapoya maydonchasi. Kimdir palto kiyib turibdi. Orqasi sizga qaragan.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Kozachokdan uzoqlashdingiz. Yana qaradingiz — hech kim yoʻq.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Faqat oyoq iz. Qorda. Ichida, zinapoya maydonchasida, qor yogʻmayapti.' },
        ],
      },
    ],
    next: 'n4_hub',
  },
  {
    id: 'n4_diary6',
    night: 4,
    location: 'room',
    onEnter: [item('diary_6'), flag('found_diary6', true), sfx('page')],
    mobile: { vignette: 'room', hotspots: ['carpet'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Gilam ostidagi taxta cheti qayrilgan. Tagida quruq, sargʻaygan sahifa.' },
        ],
      },
      {
        speaker: 'diary',
        variants: [
          {
            text: '“…Ertaga 48ga kiraman. Agar kirgan boʻlsam va qaytmasam — yozuvni shu yerga qoldiraman.”',
          },
        ],
      },
      {
        speaker: 'diary',
        variants: [{ text: '“48 — bu 47. Faqat eski. Faqat toʻlgan. Faqat… band.”' }],
      },
    ],
    next: 'n4_hub',
  },
  {
    id: 'n4_door48',
    night: 4,
    location: 'corridor',
    onEnter: [sfx('door_open'), sanity(-2)],
    desktop: { trigger: 'zone', zoneId: 'landing_48' },
    mobile: { vignette: 'landing48', hotspots: ['door48'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Zinapoya maydonchasi. 47 — oʻngda. 48 — chapda.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: '48 eshigi qiya ochiq. Yigirma yil yopiq turgan eshik. Muhrning izi bor, oʻzi yoʻq.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Eshik ogʻzi qorongʻi. Undan eski xona hidi keladi: chang, nam, sovun.' },
        ],
      },
    ],
    choices: [
      {
        id: 'enter',
        label: '48-xonadonga kirish',
        to: 'n4_inside48',
        effects: [sanity(-4), sfx('door_open')],
      },
      { id: 'retreat', label: 'Orqaga qaytish', to: 'n4_retreat' },
    ],
  },
  {
    id: 'n4_retreat',
    night: 4,
    location: 'room',
    onEnter: [sanity(3)],
    mobile: { vignette: 'room' },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Qaytdingiz. Eshikni berkitdingiz — u yopilmadi, faqat suyangancha qoldi.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Uy siz kutgan tartibda. Endi u tartibsiz boʻlib qoldi.' }],
      },
    ],
    next: 'n4_hub',
  },
  {
    id: 'n4_inside48',
    night: 4,
    location: 'flat48',
    checkpoint: true,
    onEnter: [flag('entered_48', true), sanity(-4)],
    desktop: { trigger: 'zone', zoneId: 'flat48' },
    mobile: { vignette: 'flat48', hotspots: ['calendar', 'belongings', 'clock48'] },
    lines: [
      { speaker: 'narrator', variants: [{ text: 'Bu — 47. Aynan 47. Faqat oʻlik 47.' }] },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Gilam devorda, lekin rangi yoʻq. Rubin televizor, lekin ekrani boʻsh.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Chiroq yoʻq. Yorugʻlik eshigingiz ortidan kelgan nurdan qolgan.' }],
      },
    ],
    next: 'n4_copy_room',
  },
  {
    id: 'n4_copy_room',
    night: 4,
    location: 'flat48',
    mobile: { vignette: 'flat48', hotspots: ['calendar', 'belongings', 'clock48'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Xonada sizniki boʻlgan narsalar bor. Sizniki. Aynan sizniki.' }],
      },
    ],
    choices: [
      { id: 'calendar', label: 'Devordagi kalendarga yaqinlashish', to: 'n4_calendar' },
      {
        id: 'belongings',
        label: 'Sizning buyumlaringizni koʻrish',
        to: 'n4_belongings',
        when: { not: { flag: 'saw_belongings' } },
      },
      {
        id: 'diary',
        label: 'Stuldagi qogʻozni olish',
        to: 'n4_diary5',
        when: { not: { flag: 'found_diary5' } },
      },
      { id: 'glitch', label: 'Chuqurroq yurish', to: 'n4_glitch', when: { flag: 'saw_calendar' } },
    ],
  },
  {
    id: 'n4_calendar',
    night: 4,
    location: 'flat48',
    onEnter: [flag('saw_calendar', true), sanity(-4)],
    mobile: { vignette: 'flat48', hotspots: ['calendar'] },
    lines: [
      { speaker: 'narrator', variants: [{ text: 'Devor taqvimi. Qattiq qogʻoz, 2006 yozuvi.' }] },
      {
        speaker: 'narrator',
        variants: [{ text: 'Sanalar ustidan chiziq tortilgan. Birma-bir. Uzluksiz.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Yili — 2006. Lekin oyi hozirgi oy. Kunlar ham shu oyga toʻgʻri keladi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Oxirgi chizilgan sana — kecha. Bugungi sana chizilmagan.' }],
      },
      { speaker: 'narrator', variants: [{ text: 'Hali.' }] },
    ],
    next: 'n4_copy_room',
  },
  {
    id: 'n4_belongings',
    night: 4,
    location: 'flat48',
    onEnter: [flag('saw_belongings', true), sanity(-7), haptic('heartbeat')],
    mobile: { vignette: 'flat48', hotspots: ['belongings'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Stol ustida sizniki: telefon qutisi, darz ketgan piyola, mogʻorlagan non.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Bularni siz bu uyga olib kelmadingiz. Yoki… kelgan edingiz, faqat boshqa 47ga.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Stul ostida pasport. {name}’ning pasporti. Ism sizniki. Rasm sizniki. Sana — kecha.',
          },
        ],
      },
    ],
    next: 'n4_copy_room',
  },
  {
    id: 'n4_diary5',
    night: 4,
    location: 'flat48',
    onEnter: [item('diary_5'), flag('found_diary5', true), sfx('page')],
    mobile: { vignette: 'flat48', hotspots: ['chair'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Stulda — daftar varagʻi. Yozuv tanish: shkafdagi chiziqlarning egasi.' },
        ],
      },
      {
        speaker: 'diary',
        variants: [
          {
            text: '“…Men 48ga kirdim. U 47ning nusxasi, faqat unda vaqt bor: men oʻtkazgan vaqt.”',
          },
        ],
      },
      {
        speaker: 'diary',
        variants: [
          {
            text: '“Agar sen buni oʻqiyotgan boʻlsang, demak men allaqachon… gapiraman. Sen menga javob berding, shunday emasmi?”',
          },
        ],
      },
    ],
    next: 'n4_copy_room',
  },
  {
    id: 'n4_glitch',
    night: 4,
    location: 'flat48',
    onEnter: [
      { type: 'fx', id: 'glitch_fake', intensity: 0.8, durationMs: 2500 },
      sfx('static'),
      haptic('heavy'),
      sanity(-6),
      flag('glitch_done', true),
    ],
    desktop: { trigger: 'scripted', eventId: 'fake_glitch' },
    mobile: { vignette: 'flat48', overlay: 'none' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Chuqur xona. Shkaf. Unda — kiyimlar. Sizniki.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Signal yoʻqoldi — taxminan ikki soniyaga. Xonaning tasviri surilib ketdi. Devor chiziqlari tutashmadi.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Keyin hammasi joyiga qaytdi. Siz eshikka qaradingiz. Bir zum qaysi tomondaligini eslay olmadingiz.',
          },
        ],
      },
    ],
    next: 'n4_voice_identity',
  },
  {
    id: 'n4_voice_identity',
    night: 4,
    location: 'flat48',
    onEnter: [sfx('knock_triple'), haptic('knock'), sanity(-4)],
    mobile: { vignette: 'flat48', overlay: 'chat' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Devor. Bu xonaning devori. Uch zarba — yaqindan.' }],
      },
      { speaker: 'voice', variants: [{ text: 'Men oldin ham sen edim, {name}.' }] },
      {
        speaker: 'narrator',
        variants: [{ text: 'U buni oddiy bir narsani tushuntirgandek aytdi. Shoshilmadi.' }],
      },
    ],
    choices: [
      {
        id: 'who',
        label: '“Sardormisan?” deb soʻrash',
        to: 'n4_ask_sardor',
        when: { flag: 'knows_sardor' },
      },
      { id: 'why', label: '“Nega men?” deb soʻrash', to: 'n4_why' },
      { id: 'no_talk', label: 'Javob bermaslik', to: 'n4_no_talk' },
    ],
  },
  {
    id: 'n4_ask_sardor',
    night: 4,
    location: 'flat48',
    onEnter: [flag('asked_sardor', true), sanity(-4)],
    mobile: { vignette: 'flat48', overlay: 'chat' },
    lines: [
      { speaker: 'player', variants: [{ text: 'Sardor… sizmisiz?' }] },
      {
        speaker: 'voice',
        variants: [{ text: 'Sardor boʻlganman. Keyin — boshqa ism boʻldim. Endi — {name}.' }],
      },
      {
        speaker: 'voice',
        variants: [{ text: 'Ism bizniki emas. Uyning. U ismlarni almashtirib turadi.' }],
      },
    ],
    next: 'n4_return',
  },
  {
    id: 'n4_why',
    night: 4,
    location: 'flat48',
    mobile: { vignette: 'flat48', overlay: 'chat' },
    lines: [
      { speaker: 'player', variants: [{ text: 'Nega… men?' }] },
      {
        speaker: 'voice',
        variants: [{ text: 'Chunki sen kelding. Shu javob boʻldi. Har safar shu javob boʻladi.' }],
      },
      {
        speaker: 'voice',
        variants: [{ text: 'Uy kutadi. Uy kutgani koʻrinadi. Uy kutganini toʻxtatmaydi.' }],
      },
    ],
    next: 'n4_return',
  },
  {
    id: 'n4_no_talk',
    night: 4,
    location: 'flat48',
    mobile: { vignette: 'flat48', overlay: 'chat' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Javob bermadingiz. Devor iliq boʻlib qoldi — xuddi nafas olganday.' }],
      },
      {
        speaker: 'voice',
        variants: [{ text: 'Mayli, {name}. Ertaga gaplashamiz. Ertaga doim bor.' }],
      },
    ],
    next: 'n4_return',
  },
  {
    id: 'n4_return',
    night: 4,
    location: 'room',
    onEnter: [sanity(6)],
    mobile: { vignette: 'room' },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          {
            text: '47ga qaytdingiz. Oʻz eshigingiz oldida toʻxtab, raqamga qaradingiz. Toʻrt-yetti.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Toʻrtinchi tun tugadi. Sizniki boʻlgan narsalar ikki xonada yashayapti endi.' },
        ],
      },
    ],
    next: 'n4_sleep',
  },
  {
    id: 'n4_sleep',
    night: 4,
    location: 'room',
    checkpoint: true,
    mobile: { vignette: 'room_dark' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Ertaga — oxirgi kecha. Buni uy ham, siz ham bilasiz.' }],
      },
    ],
    next: 'n5_start',
  },
]
