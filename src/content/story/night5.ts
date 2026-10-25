import type { StoryNode } from '@/core/engine/types'
import { flag, haptic, item, sanity, sfx } from './features'

/**
 * Night 5 — "3:17". The final night. Ending A (open the door), Ending B (leave
 * before 3:17), Ending C (hidden: wind the stopped clock — needs all 7 diary
 * pages, sanity >= 40, and never having answered the voice on night 3).
 */
export const night5Nodes: StoryNode[] = [
  {
    id: 'n5_start',
    night: 5,
    location: 'room',
    checkpoint: true,
    mobile: { vignette: 'room' },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Beshinchi tun. Uy sizni oʻziga oʻxshatib boʻldi — yoki siz uni oʻzingizga.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            when: { flag: 'entered_48' },
            text: '48 eshigi endi yopilmaydi. Siz u yerni bilibsiz. U ham sizni.',
          },
          { text: 'Devor bugun oʻzgacha tinch. Kutishning oʻzi bir turi.' },
        ],
      },
    ],
    next: 'n5_hub',
  },
  {
    id: 'n5_hub',
    night: 5,
    location: 'room',
    mobile: { vignette: 'room', hotspots: ['clock', 'front_door', 'window', 'carpet'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          { text: 'Soat yana toʻxtab turgan joyda. Yoki u umuman toʻxtagan emas — u kutadi.' },
        ],
      },
    ],
    choices: [
      {
        id: 'clock',
        label: 'Soatni diqqat bilan tekshirish',
        to: 'n5_clock',
        when: { not: { flag: 'clock_examined' } },
      },
      {
        id: 'chain',
        label: 'Eshik zanjirini tekshirish',
        to: 'n5_chain',
        when: { not: { flag: 'chain_checked' } },
      },
      {
        id: 'carpet',
        label: 'Soat ostidagi pollarni koʻrish',
        to: 'n5_diary7',
        when: { all: [{ flag: 'clock_examined' }, { not: { flag: 'found_diary7' } }] },
      },
      { id: 'leave_early', label: 'Hozirqinoq uydan chiqib ketish', to: 'endB' },
      {
        id: 'tea',
        label: 'Oxirgi marta choy damlash',
        to: 'n5_tea',
        when: { not: { flag: 'tea_n5' } },
      },
      { id: 'stay', label: 'Qolish. Oxirigacha qolish', to: 'n5_316' },
    ],
  },
  {
    id: 'n5_tea',
    night: 5,
    location: 'kitchen',
    onEnter: [flag('tea_n5', true), sfx('kettle'), sanity(6)],
    desktop: { trigger: 'interact', objectId: 'kettle' },
    mobile: { vignette: 'kitchen', hotspots: ['kettle'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Oxirgi choy. Hozircha oxirgi deb aytmang — shunchaki choy.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Issiq. Oddiy. Uy sizni tomosha qilayotganini his qilmaysiz. Hozircha.' },
        ],
      },
    ],
    next: 'n5_hub',
  },
  {
    id: 'n5_clock',
    night: 5,
    location: 'room',
    onEnter: [flag('clock_examined', true), sfx('clock_tick')],
    desktop: { trigger: 'interact', objectId: 'clock' },
    mobile: { vignette: 'room', hotspots: ['clock'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Soatni oldingiz. Ogʻir, issiq — xuddi tirikddek.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Mil ichida — tishli gʻildiraklar. Bittasi siniq. Yana bittasi yetib bormaydi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Uchrani oʻrash mumkin. Mil teskari emas — oldinga siljiydi. Faqat birmarta.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: '3:17 → 3:18. Bu yoʻl bor. Uy uni bilmayapti. Yoki biladi — va qoʻrqadi.' },
        ],
      },
    ],
    next: 'n5_hub',
  },
  {
    id: 'n5_chain',
    night: 5,
    location: 'corridor',
    onEnter: [flag('chain_checked', true), sfx('chain')],
    desktop: { trigger: 'interact', objectId: 'front_door' },
    mobile: { vignette: 'corridor', hotspots: ['front_door'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Eshik. Zanjir sovuq, ishlaydi. Kaltak ishlaydi.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Zanjirni uring. Ertaga tong otguncha ochiq boʻladi. Agar… ketmoqchi boʻlsangiz.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            when: { profile: 'doorAtNight', eq: 'ochiq' },
            text: 'Anketada yozgandingiz: tuni eshigingiz ochiq. Uy buni eslab qolgan.',
          },
          { text: 'Bu eshik sizni ozod qilishi mumkin. Faqat bir savol qolgan: qachon.' },
        ],
      },
    ],
    next: 'n5_hub',
  },
  {
    id: 'n5_diary7',
    night: 5,
    location: 'room',
    onEnter: [item('diary_7'), flag('found_diary7', true), sfx('page')],
    mobile: { vignette: 'room', hotspots: ['carpet'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Soat tagidagi taxta boʻshashgan. Ichida — oxirgi varaq.' }],
      },
      {
        speaker: 'diary',
        variants: [
          {
            text: '“…Soat toʻxtagan emas. U toʻxtatilgan. Uni oʻrash mumkin, faqat uy buni istamaydi.”',
          },
        ],
      },
      {
        speaker: 'diary',
        variants: [
          {
            text: '“3:18 — agar paydo boʻlsa, zanjir uziladi. Men ucha olmadim. Uyinganman. Sen uchishni tanla.”',
          },
        ],
      },
      {
        speaker: 'diary',
        variants: [{ text: '“Ismim Sardor edi. Uni esla. Men oʻzim eslay olmay qoldim.”' }],
      },
    ],
    next: 'n5_hub',
  },
  {
    id: 'n5_316',
    night: 5,
    location: 'room',
    onEnter: [flag('time', '3:16'), sfx('window_dark')],
    desktop: { trigger: 'scripted', eventId: 'windows_dark' },
    mobile: { vignette: 'window', hotspots: ['opposite_building'] },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Soat 3:16. Narigi uyning oynalari bittadan oʻchmoqda.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Oxirgi oyna — qarama-qarshi toʻrtinchi qavatda. U ham oʻchdi.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Endi koʻchada faqat sariq lampa. Va sizning oynangiz.' }],
      },
    ],
    next: 'n5_317',
  },
  {
    id: 'n5_317',
    night: 5,
    location: 'room',
    onEnter: [flag('time', '3:17'), sfx('fridge_stop'), haptic('medium')],
    desktop: { trigger: 'scripted', eventId: 'power_cut' },
    mobile: { vignette: 'room_dark' },
    lines: [
      { speaker: 'narrator', variants: [{ text: 'Soat 3:17.' }] },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Yorugʻlik yoʻq. Muzlatgich yoʻq. Uy ham nafas olayotganini toʻxtatdi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Uch zarba — bu safar yengil, tanish, deyarli samimiy.' }],
      },
    ],
    next: 'n5_voice_final',
  },
  {
    id: 'n5_voice_final',
    night: 5,
    location: 'room',
    onEnter: [sfx('knock_triple'), haptic('knock'), sanity(-6)],
    desktop: { trigger: 'scripted', eventId: 'knocks' },
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      {
        speaker: 'voice',
        variants: [
          {
            when: { flag: 'asked_sardor' },
            text: 'Sardor deb soʻragandingiz. Men sizga rostini aytdim. Endi yana bir rost gapiraman.',
          },
          { text: 'Oxirgi kecha degan gap yoʻq. Faqat oxirgi tanlov bor.' },
        ],
      },
      {
        speaker: 'voice',
        variants: [
          {
            when: { flag: 'n1_reaction', eq: 'urdi' },
            text: 'Birinchi kunda menga urdingiz. U javob edi, bilardingizmi? Men uni javob deb oldim.',
          },
          {
            when: { flag: 'n1_reaction', eq: 'javob' },
            text: 'Birinchi kunda meni javobsiz qoldirmadingiz. Shu sababli hozir ham gapirishimiz mumkin.',
          },
          { text: 'Birinchi kunda jim edingiz. Men sukutingizni eslab qoldim. Uni sevdim.' },
        ],
      },
      {
        speaker: 'voice',
        variants: [
          { text: 'Keling, tanlang: eshik, yoki zanjir, yoki soat. Bittasi sizniki boʻladi.' },
        ],
      },
    ],
    next: 'n5_final_choice',
  },
  {
    id: 'n5_final_choice',
    night: 5,
    location: 'room',
    mobile: { vignette: 'room_dark' },
    lines: [
      { speaker: 'narrator', variants: [{ text: 'Eshik — chapda. U yerda 48 kutadi.' }] },
      { speaker: 'narrator', variants: [{ text: 'Zanjir — old eshikda. U yerda koʻcha kutadi.' }] },
      {
        speaker: 'narrator',
        variants: [{ text: 'Soat — devorda. U yerda hech narsa kutmaydi. Faqat boʻsh vaqt.' }],
      },
    ],
    choices: [
      {
        id: 'open48',
        label: 'Eshikni ochish. 48 tomonga yurish',
        to: 'endA',
        effects: [sanity(-10), sfx('door_open'), haptic('heavy')],
      },
      {
        id: 'leave',
        label: 'Zanjirni yechib, uydan chiqib ketish',
        to: 'endB',
        effects: [sfx('chain'), sfx('door_open')],
      },
      {
        id: 'wind',
        label: 'Soatni oʻrash',
        to: 'endC',
        when: {
          all: [
            { itemCountGte: { prefix: 'diary_', count: 7 } },
            { sanityGte: 40 },
            { not: { flag: 'answered_n3' } },
          ],
        },
        effects: [sfx('clock_tick')],
      },
    ],
  },
  {
    id: 'endA',
    night: 5,
    location: 'flat48',
    ending: 'A',
    checkpoint: true,
    desktop: { trigger: 'scripted', eventId: 'ending_a' },
    mobile: { vignette: 'ending_a' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Eshik ochilganda uy nafas oldi. Uzoq, toʻyingan nafas.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Ichida sovutgan xona. Siz oʻtirdingiz — stul sizniki edi endi.' }],
      },
      { speaker: 'narrator', variants: [{ text: 'Soat 3:18. Bir soniyaga. Keyin yana 3:17.' }] },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Bir necha kundan keyin 47ga yangi ijarachi keldi. Arzon ijara, deyishdi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'U soat tungi uchlarda eshik urilishini eshitdi. Uch marta.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: '“Qoʻshni… uxlamayapsizmi?” — devor ichidan ovoz kelganini u ham eshitdi.' },
        ],
      },
      { speaker: 'narrator', variants: [{ text: 'Ovoz sizniki edi.' }] },
      { speaker: 'narrator', variants: [{ text: 'Xonadon 48. Sizniki.' }] },
    ],
  },
  {
    id: 'endB',
    night: 5,
    location: 'stairwell',
    ending: 'B',
    checkpoint: true,
    desktop: { trigger: 'scripted', eventId: 'ending_b' },
    mobile: { vignette: 'ending_b' },
    lines: [
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Zanjir chiqdi. Eshik. Pardaxona. Zinapoya — beshinchi qavat, toʻrtinchi, uchinchi…',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Muhabbat opaning eshigi ostida yorugʻlik yoʻq. Uni uygʻotmadingiz. Yaxshisi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Hovli. Qor. Sariq lampa. Havo toza — oʻpka birinchi marta toʻliq nafas oldi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Yurasiz. Koʻcha. Chilonzorning tanish kvartali. Rahmatingiz joyiga tushdi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Oʻralib qaradingiz. Toʻqqiz qavatli uy. Toʻrtinchi qavatda bitta oyna yonadi.' },
        ],
      },
      { speaker: 'narrator', variants: [{ text: 'Sizniki oyna. Chiroq oʻchirmagan edingiz.' }] },
      {
        speaker: 'narrator',
        variants: [{ text: 'Yoki u oʻzi yoqdi. Kim biladi. Uy kutishni yaxshi koʻradi.' }],
      },
      { speaker: 'narrator', variants: [{ text: 'Siz ketyapsiz. U kutadi.' }] },
    ],
  },
  {
    id: 'endC',
    night: 5,
    location: 'room',
    ending: 'C',
    checkpoint: true,
    desktop: { trigger: 'scripted', eventId: 'ending_c' },
    mobile: { vignette: 'ending_c' },
    lines: [
      {
        speaker: 'narrator',
        variants: [{ text: 'Soatni oldingiz. Milni ushlab, oldinga burdingiz.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Tishli gʻildirak qarshilik qildi. Uy qarshilik qildi. Davom etdingiz.' },
        ],
      },
      { speaker: 'narrator', variants: [{ text: 'Uch… oʻn sakkiz.' }] },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Tik-tik. Tik-tik. Bu ovozni uy eshitdi. Besh yilda birinchi marta eshitdi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Devorda urish boʻlmadi. Uch zarba — keldi, toʻxtab qoldi. Yana keldi. Yana toʻxtadi.',
          },
        ],
      },
      { speaker: 'voice', variants: [{ text: 'Sardor…' }] },
      {
        speaker: 'narrator',
        variants: [{ text: 'Ovoz bu ismni eslab qolganidek aytdi. Uzun, hayron, tinch.' }],
      },
      {
        speaker: 'narrator',
        variants: [
          {
            text: 'Keyin devor sovudi. Birinchi marta u oddiy devor boʻldi — beton, sovuq, boʻsh.',
          },
        ],
      },
      {
        speaker: 'narrator',
        variants: [
          { text: 'Soat 3:18. Yorugʻlik qaytdi. Muzlatgich pichilladi. Dunyo davom etdi.' },
        ],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Ertaga siz uydan ketasiz. Uy sizni toʻxtatmaydi — u endi kutmaydi.' }],
      },
      {
        speaker: 'narrator',
        variants: [{ text: 'Sardorni eslaysiz. Uni endi ikki kishi eslaydi.' }],
      },
    ],
  },
]
