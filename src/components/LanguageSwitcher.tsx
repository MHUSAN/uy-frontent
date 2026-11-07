import { useTranslation } from 'react-i18next'

import {
  LANGUAGE_LABELS,
  type Language,
} from '@/types/i18n'

const LANGUAGE_ORDER: Language[] = ['uz', 'ru', 'en']

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const activeLanguage = (i18n.resolvedLanguage ?? i18n.language).slice(0, 2)

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-line bg-surface p-0.5"
    >
      {LANGUAGE_ORDER.map((language) => {
        const isActive = activeLanguage === language

        return (
          <button
            key={language}
            type="button"
            title={LANGUAGE_LABELS[language]}
            aria-label={LANGUAGE_LABELS[language]}
            aria-pressed={isActive}
            onClick={() => {
              void i18n.changeLanguage(language)
            }}
            className={`inline-flex h-7 items-center justify-center rounded-[5px] px-1.5 text-[10px] font-semibold tracking-[0.08em] transition-colors sm:h-8 sm:px-2.5 sm:text-[11px] ${
              isActive
                ? 'bg-accent-soft text-accent'
                : 'text-muted hover:bg-canvas hover:text-ink'
            }`}
          >
            {language.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
