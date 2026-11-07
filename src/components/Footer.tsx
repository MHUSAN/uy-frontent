import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { Brand } from '@/components/Brand'
import { HashLink } from '@/components/HashLink'

const CURRENT_YEAR = new Date().getFullYear()

const FOOTER_LINK = 'transition-colors hover:text-ink'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Brand />
            <p className="mt-3 max-w-sm text-xs leading-5 text-muted">
              {t('footer.note')}
            </p>
          </div>

          <nav
            aria-label={t('footer.navigation')}
            className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted"
          >
            <NavLink to="/" end className={FOOTER_LINK}>
              {t('nav.home')}
            </NavLink>
            <HashLink sectionId="elonlar" className={FOOTER_LINK}>
              {t('nav.listings')}
            </HashLink>
            <HashLink sectionId="kategoriyalar" className={FOOTER_LINK}>
              {t('nav.categories')}
            </HashLink>
            <HashLink sectionId="viloyatlar" className={FOOTER_LINK}>
              {t('nav.regions')}
            </HashLink>
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.rights', { year: CURRENT_YEAR })}</p>
          <p>{t('brand.tagline')}</p>
        </div>
      </div>
    </footer>
  )
}
