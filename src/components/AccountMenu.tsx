import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  UserRound,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import type { User } from '@/types/auth'

export function UserAvatar({ user }: { user: User }) {
  const words = (user.fullName.trim() || user.email).split(/\s+/u)
  const initials = (
    Array.from(words[0])[0] +
    (words.length > 1 ? Array.from(words.at(-1)!)[0] : '')
  ).toLocaleUpperCase()
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent"
    >
      {initials}
    </span>
  )
}

export function AccountMenu({ onOpen }: { onOpen?: () => void }) {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const initialFocus = useRef<'first' | 'last'>('first')
  const id = useId()

  useEffect(() => {
    if (!open) return
    const items =
      menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
    items?.[initialFocus.current === 'last' ? items.length - 1 : 0]?.focus()
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  if (!user) return null
  const entries =
    user.role === 'ADMIN'
      ? [
          { key: 'admin', to: '/admin', Icon: LayoutDashboard },
          {
            key: 'moderation',
            to: '/admin?tab=properties&status=PENDING',
            Icon: ListChecks,
          },
        ]
      : [
          { key: 'profile', to: '/profile', Icon: UserRound },
          { key: 'listings', to: '/dashboard', Icon: LayoutDashboard },
          { key: 'create', to: '/elon-berish', Icon: Plus },
          { key: 'favorites', to: '/sevimlilar', Icon: Heart },
          { key: 'inquiries', to: "/so'rovlar", Icon: MessageSquare },
        ]
  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    )
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
              items.length
      items[next]?.focus()
    }
    // Native Tab navigation is preserved; blur closes the menu after focus leaves.
  }

  return (
    <div
      ref={container}
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false)
      }}
    >
      <button
        ref={trigger}
        id={`${id}-trigger`}
        type="button"
        aria-label={t('account.menuLabel', {
          name: user.fullName || user.email,
        })}
        aria-haspopup="menu"
        aria-controls={`${id}-menu`}
        aria-expanded={open}
        onClick={() => {
          initialFocus.current = 'first'
          if (!open) onOpen?.()
          setOpen(!open)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            onOpen?.()
            initialFocus.current = event.key === 'ArrowUp' ? 'last' : 'first'
            setOpen(true)
          }
        }}
        className="flex min-h-11 min-w-0 items-center gap-2 rounded-full text-left text-white hover:bg-white/10 sm:pr-3"
      >
        <UserAvatar user={user} />
        <span
          title={user.fullName || user.email}
          className="hidden max-w-40 truncate text-sm font-semibold sm:block"
        >
          {user.fullName || user.email}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="hidden shrink-0 text-white/60 sm:block"
        />
      </button>
      {open && (
        <div
          ref={menu}
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={`${id}-trigger`}
          onKeyDown={onMenuKey}
          className="fixed right-4 top-20 z-50 sm:absolute sm:right-0 sm:top-full mt-2 max-h-[70vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-xl"
        >
          <div role="none" className="border-b border-line px-3 py-3">
            <p className="break-words text-sm font-semibold text-ink">
              {user.fullName || user.email}
            </p>
            <p className="mt-1 flex items-start gap-1.5 break-all text-xs text-muted">
              <Mail size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
              {user.email}
            </p>
          </div>
          {entries.map(({ key, to, Icon }) => (
            <Link
              key={key}
              role="menuitem"
              to={to}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-accent-soft focus:bg-accent-soft"
            >
              <Icon
                size={17}
                aria-hidden="true"
                className="shrink-0 text-muted"
              />
              {t(`account.${key}`)}
            </Link>
          ))}
          <div role="none" className="mt-1 border-t border-line pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                logout()
                navigate('/login', { replace: true })
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-canvas focus:bg-canvas"
            >
              <LogOut size={17} aria-hidden="true" />
              {t('authFlow.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
