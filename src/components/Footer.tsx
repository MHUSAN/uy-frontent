import { useTranslation } from 'react-i18next'

const CURRENT_YEAR = new Date().getFullYear()

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          <span className="font-semibold text-ink">TezUy</span>
          <span aria-hidden="true"> · </span>
          {t('brand.tagline')}
        </p>
        <p>{t('footer.rights', { year: CURRENT_YEAR })}</p>
      </div>
    </footer>
  )
}
