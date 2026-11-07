import type { TranslationResource } from '@/types/i18n'

const uz = {
  a11y: {
    skipToContent: 'Asosiy tarkibga o‘tish',
  },
  brand: {
    tagline: 'O‘zbekiston bo‘ylab ko‘chmas mulk',
  },
  home: {
    eyebrow: 'Ko‘chmas mulk · O‘zbekiston',
    title: 'O‘zbekistondan o‘z joyingizni toping.',
    subtitle:
      'O‘zbekiston bo‘ylab ko‘chmas mulkni sotib olish va ijaraga olish uchun sodda marketplace.',
    foundationLabel: 'Platforma asosi',
    foundationTitle: 'Frontend tayyor.',
    foundationBody:
      'Keyingi bosqichda qidiruv, akkauntlar va sotuvchi vositalari. Hozircha e’lonlar mavjud emas.',
    languagesLabel: 'Tillar',
    languagesValue: 'O‘zbek · Rus · Ingliz',
    themeLabel: 'Mavzu',
    themeValue: 'Yorug‘ · Qorong‘i · Tizim',
  },
  theme: {
    label: 'Mavzu',
    light: 'Yorug‘',
    dark: 'Qorong‘i',
    system: 'Tizim',
  },
  language: {
    label: 'Til',
  },
  footer: {
    rights: '© {{year}} TezUy',
  },
  notFound: {
    title: 'Sahifa topilmadi',
    body: 'Siz izlagan sahifa mavjud emas.',
    back: 'Bosh sahifaga qaytish',
  },
} satisfies TranslationResource

export default uz
