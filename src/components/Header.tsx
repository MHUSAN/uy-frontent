import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { AccountMenu } from '@/components/AccountMenu'
import { Brand } from '@/components/Brand'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useAuth } from '@/hooks/useAuth'

const LINK_BASE =
  'inline-flex items-center whitespace-nowrap rounded-full border px-5 text-sm font-medium transition-colors'
const LINK_IDLE = 'border-transparent text-white/80 hover:text-white'
const LINK_ACTIVE = 'border-accent text-white'

function GuestActions({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <Link
        to="/login"
        onClick={onNavigate}
        className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-white hover:bg-white/10"
      >
        {t('nav.login')}
      </Link>
      <Link
        to="/register"
        onClick={onNavigate}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-center text-sm font-semibold text-on-accent hover:brightness-95"
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
  const guest = !auth.loading && !auth.user

  const onHome = location.pathname === '/'
  const listingType = new URLSearchParams(location.search).get('type')
  const items: Array<{ key: string; to: string; active: boolean }> = [
    { key: 'buy', to: '/?type=SALE', active: onHome && listingType === 'SALE' },
    { key: 'rent', to: '/?type=RENT', active: onHome && listingType === 'RENT' },
    {
      key: 'postListing',
      to: '/elon-berish',
      active: location.pathname === '/elon-berish',
    },
    {
      key: 'favorites',
      to: '/sevimlilar',
      active: location.pathname === '/sevimlilar',
    },
  ]

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

  return (
    <header ref={header} className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className="mx-auto max-w-[1440px] rounded-3xl bg-nav text-white shadow-lg">
        <div className="flex min-h-16 items-center gap-3 px-4 sm:px-8">
          <Brand onClick={closeMenu} />

          <nav
            aria-label={t('nav.primary')}
            className="mx-auto hidden h-11 items-center gap-1 lg:flex"
          >
            {items.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                aria-current={item.active ? 'page' : undefined}
                className={`${LINK_BASE} h-11 ${item.active ? LINK_ACTIVE : LINK_IDLE}`}
              >
                {t(`nav.${item.key}`)}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2 lg:ml-0">
            <LanguageSwitcher />
            {auth.loading ? (
              <span
                role="status"
                aria-label={t('account.restoring')}
                className="size-10 shrink-0 animate-pulse rounded-full bg-white/15"
              />
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
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 lg:hidden"
            >
              {menuOpen ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            id="mobile-navigation"
            className="max-h-[75vh] overflow-y-auto border-t border-white/10 px-4 py-4 sm:px-8 lg:hidden"
          >
            <nav aria-label={t('nav.primary')} className="grid gap-1">
              {items.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  onClick={closeMenu}
                  aria-current={item.active ? 'page' : undefined}
                  className={`${LINK_BASE} min-h-12 ${item.active ? LINK_ACTIVE : LINK_IDLE}`}
                >
                  {t(`nav.${item.key}`)}
                </NavLink>
              ))}
            </nav>
            {guest && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 sm:hidden">
                <GuestActions onNavigate={closeMenu} />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
