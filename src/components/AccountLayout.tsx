import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

const TABS = [
  { to: '/dashboard', key: 'account.listings' },
  { to: '/sevimlilar', key: 'account.favorites' },
  { to: "/so'rovlar", key: 'account.inquiries' },
  { to: '/profile', key: 'dashboard.profileTitle' },
] as const

export function AccountLayout({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 pb-16 pt-6 sm:px-6">
      <div className="rounded-3xl bg-surface px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {action ?? (
            <Link
              to="/elon-berish"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-on-accent hover:brightness-95"
            >
              <Plus size={18} aria-hidden="true" />
              {t('account.create')}
            </Link>
          )}
        </div>
        <nav aria-label={t('dashboard.nav')} className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `inline-flex min-h-11 shrink-0 items-center rounded-full border px-5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-accent bg-accent text-on-accent'
                    : 'border-line text-ink hover:border-ink/40'
                }`
              }
            >
              {t(tab.key)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}
