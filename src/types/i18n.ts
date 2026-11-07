export const SUPPORTED_LANGUAGES = ['en', 'ru', 'uz'] as const

export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'uz'
export const LANGUAGE_STORAGE_KEY = 'tezuy.language'

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  uz: 'O‘zbekcha',
}

export type TranslationResource = typeof import('../locales/en').default

export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  )
}
