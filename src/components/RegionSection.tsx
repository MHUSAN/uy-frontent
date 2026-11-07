import { Check, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { REGIONS, type RegionId } from '@/types/location'

interface RegionSectionProps {
  selected: RegionId | ''
  onSelect: (region: RegionId | '') => void
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[‘’ʻʼ']/g, "'")
    .trim()
}

export function RegionSection({ selected, onSelect }: RegionSectionProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const handleSelect = (region: RegionId | '') => {
    setQuery('')
    onSelect(region)
  }

  const normalizedQuery = normalize(query)
  const visibleRegions = REGIONS.filter((region) =>
    normalize(t(region.nameKey)).includes(normalizedQuery),
  )

  return (
    <section
      id="viloyatlar"
      className="mt-10 scroll-mt-20 border-t border-line pt-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl tracking-[-0.02em] text-ink">
            {t('home.regions.title')}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t('home.regions.subtitle', { count: REGIONS.length })}
          </p>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <label htmlFor="region-search" className="sr-only">
            {t('home.regions.search')}
          </label>
          <Search
            size={15}
            strokeWidth={1.8}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="region-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('home.regions.searchPlaceholder')}
            className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {!normalizedQuery ? (
          <RegionButton
            label={t('home.regions.all')}
            active={!selected}
            onClick={() => handleSelect('')}
          />
        ) : null}

        {visibleRegions.map((region) => (
          <RegionButton
            key={region.id}
            label={t(region.nameKey)}
            active={selected === region.id}
            onClick={() => handleSelect(region.id)}
          />
        ))}
      </div>

      {visibleRegions.length === 0 ? (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted"
        >
          <span>{t('home.regions.noResults')}</span>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-xs font-medium text-accent underline-offset-4 hover:underline"
          >
            {t('common.clear')}
          </button>
        </div>
      ) : null}
    </section>
  )
}

interface RegionButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

function RegionButton({ label, active, onClick }: RegionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-10 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-[13px] leading-snug transition-colors ${
        active
          ? 'border-accent bg-accent-soft text-ink'
          : 'border-line bg-surface text-muted hover:border-accent/50 hover:text-ink'
      }`}
    >
      <span className="min-w-0">{label}</span>
      {active ? (
        <Check
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          className="shrink-0 text-accent"
        />
      ) : null}
    </button>
  )
}
