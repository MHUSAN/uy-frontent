import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
  Check,
  ChevronDown,
  Clock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { SortValue } from '@/types/search'

const OPTIONS: Array<{ value: SortValue; Icon: LucideIcon }> = [
  { value: 'newest', Icon: Clock },
  { value: 'price_asc', Icon: ArrowUpNarrowWide },
  { value: 'price_desc', Icon: ArrowDownWideNarrow },
]

interface SortDropdownProps {
  value: SortValue
  onChange: (value: SortValue) => void
  className?: string
}

export function SortDropdown({ value, onChange, className = '' }: SortDropdownProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const id = useId()
  const selectedIndex = Math.max(0, OPTIONS.findIndex((option) => option.value === value))
  const label = t(`home.listings.sortOptions.${OPTIONS[selectedIndex].value}`)

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
    setFocusIndex(selectedIndex)
    setOpen(true)
  }
  const close = (restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) trigger.current?.focus()
  }
  const choose = (next: SortValue) => {
    if (next !== value) onChange(next)
    close()
  }

  const onListKey = (event: KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusIndex((i) => (i + 1) % OPTIONS.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusIndex((i) => (i - 1 + OPTIONS.length) % OPTIONS.length)
        break
      case 'Home':
        event.preventDefault()
        setFocusIndex(0)
        break
      case 'End':
        event.preventDefault()
        setFocusIndex(OPTIONS.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(OPTIONS[focusIndex].value)
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
    <div ref={root} className={`relative ${className}`}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${t('listing.sort')}: ${label}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            openMenu()
          }
        }}
        className={`group inline-flex h-11 w-full items-center gap-2 rounded-full border bg-white px-4 text-sm font-semibold text-ink transition-[border-color,box-shadow] duration-200 hover:border-accent focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 ${
          open ? 'border-accent ring-2 ring-accent/40' : 'border-line'
        }`}
      >
        <ArrowUpDown size={16} aria-hidden="true" className="shrink-0 text-ink" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={t('listing.sort')}
          aria-activedescendant={`${id}-${OPTIONS[focusIndex].value}`}
          onKeyDown={onListKey}
          className="absolute right-0 top-full z-40 mt-2 w-64 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-2xl border border-night-line bg-night p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.28)] outline-none motion-safe:animate-[fadeIn_160ms_ease-out]"
        >
          {OPTIONS.map(({ value: option, Icon }, index) => {
            const selected = option === value
            const focused = focusIndex === index
            return (
              <li
                key={option}
                id={`${id}-${option}`}
                role="option"
                aria-selected={selected}
                onClick={() => choose(option)}
                onPointerMove={() => setFocusIndex(index)}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-150 ${
                  selected
                    ? 'bg-accent font-semibold text-on-accent'
                    : focused
                      ? 'bg-white/10 text-white'
                      : 'text-white'
                }`}
              >
                <Icon
                  size={16}
                  aria-hidden="true"
                  className={selected ? 'text-on-accent' : 'text-muted-night'}
                />
                <span className="min-w-0 flex-1">{t(`home.listings.sortOptions.${option}`)}</span>
                {selected && <Check size={16} aria-hidden="true" className="shrink-0" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
