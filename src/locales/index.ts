import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '@/locales/en'
import ru from '@/locales/ru'
import uz from '@/locales/uz'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  isLanguage,
  type Language,
} from '@/types/i18n'

function detectLanguage(): Language {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE
  }

  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isLanguage(storedLanguage)) {
      return storedLanguage
    }
  } catch {
    // Fall through to browser and default language detection.
  }

  const browserLanguage = window.navigator.language.slice(0, 2).toLowerCase()
  return isLanguage(browserLanguage) ? browserLanguage : DEFAULT_LANGUAGE
}

const initialLanguage = detectLanguage()

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    uz: { translation: uz },
  },
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
})

i18n.on('languageChanged', (language) => {
  const normalizedLanguage = language.slice(0, 2).toLowerCase()

  if (!isLanguage(normalizedLanguage)) {
    return
  }

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage)
  } catch {
    // Language switching still works for the current session.
  }

  document.documentElement.lang = normalizedLanguage
})

document.documentElement.lang = initialLanguage

export default i18n
