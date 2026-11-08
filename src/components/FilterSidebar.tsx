import { useTranslation } from 'react-i18next'

import { categoryLabel } from '@/utils/localize'
import type { Category } from '@/types/property'
import {
  sanitizeNumericInput,
  type SearchFilters,
} from '@/types/search'

interface FilterSidebarProps {
  idPrefix: string
  filters: SearchFilters
  categories: Category[]
  priceError: boolean
  onChange: (patch: Partial<SearchFilters>) => void
  onApply: () => void
  onReset: () => void
}

const INPUT =
  'h-12 w-full min-w-0 rounded-2xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted transition-colors hover:border-ink/30 focus:border-ink'
const CHIP =
  'inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors'
const CHIP_ON = 'border-accent bg-accent text-on-accent'
const CHIP_OFF = 'border-line bg-surface text-ink hover:border-ink/40'

function Group({
  title,
  children,
  id,
}: {
  title: string
  children: React.ReactNode
  id?: string
}) {
  return (
    <div role="group" aria-labelledby={id} className="mt-7">
      <h3 id={id} className="mb-3 text-sm font-semibold text-ink">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function FilterSidebar({
  idPrefix,
  filters,
  categories,
  priceError,
  onChange,
  onApply,
  onReset,
}: FilterSidebarProps) {
  const { t } = useTranslation()
  const id = (name: string) => `${idPrefix}-${name}`

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
      noValidate
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">{t('listing.filters')}</h2>
        <button
          type="button"
          onClick={onReset}
          className="min-h-11 rounded-full px-2 text-sm font-semibold text-ink underline-offset-4 hover:underline"
        >
          {t('listing.reset')}
        </button>
      </div>

      <div className="mt-3">
        <label htmlFor={id('city')} className="mb-3 block text-sm font-semibold">
          {t('listing.city')}
        </label>
        <input
          id={id('city')}
          type="search"
          autoComplete="off"
          value={filters.city}
          placeholder={t('listing.cityPlaceholder')}
          onChange={(event) => onChange({ city: event.target.value })}
          className={INPUT}
        />
      </div>

      <Group title={t('listing.type')} id={id('type')}>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['', 'listing.all'],
              ['SALE', 'listingType.sale'],
              ['RENT', 'listingType.rent'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              aria-pressed={filters.listingType === value}
              onClick={() => onChange({ listingType: value })}
              className={`${CHIP} ${filters.listingType === value ? CHIP_ON : CHIP_OFF}`}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </Group>

      <Group title={t('listing.category')} id={id('category')}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={filters.categorySlug === ''}
            onClick={() => onChange({ categorySlug: '' })}
            className={`${CHIP} ${filters.categorySlug === '' ? CHIP_ON : CHIP_OFF}`}
          >
            {t('listing.all')}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={filters.categorySlug === category.slug}
              onClick={() =>
                onChange({
                  categorySlug:
                    filters.categorySlug === category.slug ? '' : category.slug,
                })
              }
              className={`${CHIP} ${filters.categorySlug === category.slug ? CHIP_ON : CHIP_OFF}`}
            >
              {categoryLabel(category, t)}
            </button>
          ))}
        </div>
      </Group>

      <Group title={t('listing.priceRange')} id={id('price')}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={id('min')} className="sr-only">
              {t('listing.from')}
            </label>
            <input
              id={id('min')}
              inputMode="numeric"
              autoComplete="off"
              value={filters.minPrice}
              placeholder={t('listing.from')}
              aria-invalid={priceError}
              aria-describedby={priceError ? id('price-error') : undefined}
              onChange={(event) =>
                onChange({ minPrice: sanitizeNumericInput(event.target.value) })
              }
              className={`${INPUT} ${priceError ? 'border-danger' : ''}`}
            />
          </div>
          <div>
            <label htmlFor={id('max')} className="sr-only">
              {t('listing.to')}
            </label>
            <input
              id={id('max')}
              inputMode="numeric"
              autoComplete="off"
              value={filters.maxPrice}
              placeholder={t('listing.to')}
              aria-invalid={priceError}
              aria-describedby={priceError ? id('price-error') : undefined}
              onChange={(event) =>
                onChange({ maxPrice: sanitizeNumericInput(event.target.value) })
              }
              className={`${INPUT} ${priceError ? 'border-danger' : ''}`}
            />
          </div>
        </div>
        {priceError && (
          <p id={id('price-error')} role="alert" className="mt-2 text-xs text-danger">
            {t('listing.priceError')}
          </p>
        )}
      </Group>

      <Group title={t('listing.rooms')} id={id('rooms')}>
        <div className="flex flex-wrap gap-2">
          {['1', '2', '3', '4', '5'].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filters.rooms === value}
              onClick={() =>
                onChange({ rooms: filters.rooms === value ? '' : value })
              }
              className={`${CHIP} min-w-11 ${filters.rooms === value ? CHIP_ON : CHIP_OFF}`}
            >
              {value}
            </button>
          ))}
        </div>
      </Group>

      <button
        type="submit"
        className="mt-8 flex min-h-14 w-full items-center justify-center rounded-2xl bg-nav px-4 text-sm font-semibold text-white transition-colors hover:bg-black"
      >
        {t('listing.apply')}
      </button>
    </form>
  )
}
