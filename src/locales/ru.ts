import type { TranslationResource } from '@/types/i18n'

const ru = {
  a11y: {
    skipToContent: 'Перейти к содержимому',
  },
  brand: {
    tagline: 'Недвижимость по всему Узбекистану',
  },
  home: {
    eyebrow: 'Недвижимость · Узбекистан',
    title: 'Найдите своё место в Узбекистане.',
    subtitle:
      'Понятный маркетплейс для покупки и аренды недвижимости в Узбекистане.',
    foundationLabel: 'Основа платформы',
    foundationTitle: 'Фронтенд готов.',
    foundationBody:
      'Далее — поиск, аккаунты и инструменты продавца. Объявлений пока нет.',
    languagesLabel: 'Языки',
    languagesValue: 'Узбекский · Русский · Английский',
    themeLabel: 'Тема',
    themeValue: 'Светлая · Тёмная · Системная',
  },
  theme: {
    label: 'Тема',
    light: 'Светлая',
    dark: 'Тёмная',
    system: 'Системная',
  },
  language: {
    label: 'Язык',
  },
  footer: {
    rights: '© {{year}} TezUy',
  },
  notFound: {
    title: 'Страница не найдена',
    body: 'Страница, которую вы ищете, не существует.',
    back: 'На главную',
  },
} satisfies TranslationResource

export default ru
