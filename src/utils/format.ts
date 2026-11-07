import type { Language } from '@/types/i18n'

const INTL_LOCALES: Record<Language, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  uz: 'uz-UZ',
}

export function getIntlLocale(language: string): string {
  return (
    INTL_LOCALES[language.slice(0, 2).toLowerCase() as Language] ??
    INTL_LOCALES.uz
  )
}

export function formatPrice(
  value: number,
  currency: string,
  language: string,
): string {
  if (!Number.isFinite(value)) {
    return '—'
  }

  const locale = getIntlLocale(language)
  const normalizedCurrency = currency?.trim().toUpperCase() || 'USD'

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(value)} ${normalizedCurrency}`
  }
}

export function formatArea(value: number, language: string): string {
  if (!Number.isFinite(value)) {
    return '—'
  }

  return new Intl.NumberFormat(getIntlLocale(language), {
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(
  value: number,
  language: string,
  maximumFractionDigits = 2,
): string {
  return Number.isFinite(value)
    ? new Intl.NumberFormat(getIntlLocale(language), {
        maximumFractionDigits,
      }).format(value)
    : '—'
}

export function formatDate(value: string, language: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(getIntlLocale(language), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}
