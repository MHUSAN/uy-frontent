import { ChevronsUpDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { LANGUAGE_LABELS, type Language } from '@/types/i18n'

const ORDER: Language[] = ['uz', 'ru', 'en']

function Flag({ language }: { language: Language }) {
  const common = {
    width: 20,
    height: 14,
    viewBox: '0 0 20 14',
    'aria-hidden': true,
    className: 'shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.12)]',
  } as const
  if (language === 'uz')
    return (
      <svg {...common}>
        <rect width="20" height="14" fill="#fff" />
        <rect width="20" height="4.5" fill="#1eb4e6" />
        <rect y="9.5" width="20" height="4.5" fill="#1eb53a" />
        <rect y="4.5" width="20" height="0.6" fill="#ce1126" />
        <rect y="8.9" width="20" height="0.6" fill="#ce1126" />
      </svg>
    )
  if (language === 'ru')
    return (
      <svg {...common}>
        <rect width="20" height="14" fill="#fff" />
        <rect y="4.67" width="20" height="4.67" fill="#0039a6" />
        <rect y="9.33" width="20" height="4.67" fill="#d52b1e" />
      </svg>
    )
  return (
    <svg {...common}>
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#fff" strokeWidth="2.6" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#c8102e" strokeWidth="1" />
      <path d="M10 0v14M0 7h20" stroke="#fff" strokeWidth="4.4" />
      <path d="M10 0v14M0 7h20" stroke="#c8102e" strokeWidth="2.4" />
    </svg>
  )
}

export function LanguageSwitcher({
  placement = 'bottom',
}: {
  placement?: 'bottom' | 'top'
}) {
  const { t, i18n } = useTranslation()
  const current = ((i18n.resolvedLanguage ?? i18n.language).slice(0, 2) as Language)
  const active: Language = ORDER.includes(current) ? current : 'uz'
  const [open, setOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    list.current?.focus()
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  const openMenu = () => {
    setFocusIndex(ORDER.indexOf(active))
    setOpen(true)
  }
  const close = (restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) trigger.current?.focus()
  }
  const choose = (language: Language) => {
    void i18n.changeLanguage(language)
    close()
  }

  const onListKey = (event: KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusIndex((i) => (i + 1) % ORDER.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusIndex((i) => (i - 1 + ORDER.length) % ORDER.length)
        break
      case 'Home':
        event.preventDefault()
        setFocusIndex(0)
        break
      case 'End':
        event.preventDefault()
        setFocusIndex(ORDER.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(ORDER[focusIndex])
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        close()
        break
      case 'Tab':
        close(false)
        break
    }
  }

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${t('language.label')}: ${LANGUAGE_LABELS[active]}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            openMenu()
          }
        }}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-soft"
      >
        <Flag language={active} />
        <span className="hidden sm:inline">{active.toUpperCase()}</span>
        <ChevronsUpDown size={15} aria-hidden="true" className="text-muted" />
      </button>

      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={t('language.label')}
          aria-activedescendant={`${id}-${ORDER[focusIndex]}`}
          onKeyDown={onListKey}
          className={`absolute right-0 z-50 w-52 origin-top-right rounded-2xl border border-line bg-white p-1.5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.16)] outline-none motion-safe:animate-[fadeIn_120ms_ease-out] ${
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {ORDER.map((language, index) => {
            const selected = language === active
            return (
              <li
                key={language}
                id={`${id}-${language}`}
                role="option"
                aria-selected={selected}
                onClick={() => choose(language)}
                onPointerMove={() => setFocusIndex(index)}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
                  selected ? 'bg-neutral-100 font-semibold' : ''
                } ${focusIndex === index && !selected ? 'bg-soft' : ''}`}
              >
                <Flag language={language} />
                {LANGUAGE_LABELS[language]}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
