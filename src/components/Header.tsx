import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { AccountMenu } from '@/components/AccountMenu'
import { Brand } from '@/components/Brand'
import { HashLink } from '@/components/HashLink'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'

const DESKTOP_LINK =
  'inline-flex h-9 items-center whitespace-nowrap rounded-md px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-accent-soft hover:text-ink'
const MOBILE_LINK =
  'flex min-h-11 items-center rounded-md px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-soft'

function GuestActions() {
  const { t } = useTranslation()
  return (
    <>
      <Link
        to="/login"
        className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-accent-soft"
      >
        {t('nav.login')}
      </Link>
      <Link
        to="/register"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-3 text-center text-sm font-semibold text-on-accent hover:opacity-90"
      >
        {t('authFlow.register')}
      </Link>
    </>
  )
}

export function Header() {
  const { t } = useTranslation()
  const auth = useAuth()
  const location = useLocation()
  const [mobilePath, setMobilePath] = useState<string | null>(null)
  const header = useRef<HTMLElement>(null)
  const mobileTrigger = useRef<HTMLButtonElement>(null)
  const routeKey = location.pathname + location.search
  const menuOpen = mobilePath === routeKey
  const closeMenu = () => setMobilePath(null)
  const admin = !auth.loading && auth.user?.role === 'ADMIN'
  const guest = !auth.loading && !auth.user

  useEffect(() => {
    if (!menuOpen) return
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMobilePath(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobilePath(null)
        mobileTrigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [menuOpen])

  const navigation = (mobile: boolean) => (
    <nav
      aria-label={t('nav.primary')}
      className={
        mobile ? 'grid gap-0.5' : 'ml-2 hidden items-center gap-0.5 xl:flex'
      }
    >
      <NavLink
        to="/"
        end
        className={mobile ? MOBILE_LINK : DESKTOP_LINK}
        onClick={closeMenu}
      >
        {t('nav.home')}
      </NavLink>
      {!admin && (
        <>
          <HashLink
            sectionId="elonlar"
            className={mobile ? MOBILE_LINK : DESKTOP_LINK}
            onNavigate={closeMenu}
          >
            {t('nav.listings')}
          </HashLink>
          <HashLink
            sectionId="kategoriyalar"
            className={mobile ? MOBILE_LINK : DESKTOP_LINK}
            onNavigate={closeMenu}
          >
            {t('nav.categories')}
          </HashLink>
        </>
      )}
    </nav>
  )

  return (
    <header
      ref={header}
      className="sticky top-0 z-40 border-b border-line bg-canvas"
    >
      <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Brand onClick={closeMenu} />
        {navigation(false)}
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 md:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          {auth.loading ? (
            <div
              role="status"
              aria-label={t('account.restoring')}
              className="flex h-11 w-36 shrink-0 items-center gap-2 rounded-lg border border-line px-2 sm:w-48"
            >
              <span
                aria-hidden="true"
                className="size-8 rounded-full bg-line"
              />
              <span aria-hidden="true" className="h-2 w-16 rounded bg-line" />
              <span className="sr-only">{t('account.restoring')}</span>
            </div>
          ) : auth.user ? (
            <AccountMenu
              onOpen={closeMenu}
              key={`${auth.user.id}:${auth.user.role}:${routeKey}`}
            />
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <GuestActions />
            </div>
          )}
          <button
            ref={mobileTrigger}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={t(menuOpen ? 'nav.closeMenu' : 'nav.openMenu')}
            onClick={() => setMobilePath(menuOpen ? null : routeKey)}
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink hover:border-accent xl:hidden"
          >
            {menuOpen ? (
              <X size={17} aria-hidden="true" />
            ) : (
              <Menu size={17} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {guest && (
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 border-t border-line px-4 py-2 sm:hidden">
          <GuestActions />
        </div>
      )}
      {menuOpen && (
        <div
          id="mobile-navigation"
          className="max-h-[70vh] overflow-y-auto border-t border-line bg-surface px-4 py-4 sm:px-6 xl:hidden"
        >
          {navigation(true)}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 md:hidden">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  )
}
