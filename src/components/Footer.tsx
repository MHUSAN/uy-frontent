import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Brand } from '@/components/Brand'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

const CURRENT_YEAR = new Date().getFullYear()
const FOOTER_LINK = 'transition-colors hover:text-ink'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="mt-auto bg-soft">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-block rounded-2xl bg-nav px-4 py-2">
              <Brand />
            </span>
            <p className="mt-4 text-sm font-semibold text-ink">
              {t('brand.tagline')}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
              {t('footer.note')}
            </p>
          </div>

          <nav
            aria-label={t('footer.navigation')}
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted"
          >
            <Link to="/?type=SALE" className={FOOTER_LINK}>
              {t('nav.buy')}
            </Link>
            <Link to="/?type=RENT" className={FOOTER_LINK}>
              {t('nav.rent')}
            </Link>
            <Link to="/elon-berish" className={FOOTER_LINK}>
              {t('nav.postListing')}
            </Link>
            <Link to="/sevimlilar" className={FOOTER_LINK}>
              {t('nav.favorites')}
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.rights', { year: CURRENT_YEAR })}</p>
          <LanguageSwitcher placement="top" />
        </div>
      </div>
    </footer>
  )
}
