import { categoryLabel } from '@/utils/localize'
import { ChevronDown, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { CategoryStatus } from '@/hooks/useCategories'
import { REGIONS, getDistricts, isRegionId } from '@/types/location'
import type { Category } from '@/types/property'
import {
  sanitizeNumericInput,
  type SearchFilters,
} from '@/types/search'

interface SearchPanelProps {
  filters: SearchFilters
  categories: Category[]
  categoryStatus: CategoryStatus
  priceError: boolean
  onChange: (patch: Partial<SearchFilters>) => void
  onSubmit: () => void
  onReset: () => void
}

const INPUT_CLASS =
  'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-canvas disabled:text-muted'

const SELECT_CLASS = `${INPUT_CLASS} appearance-none pr-9`

const LABEL_CLASS =
  'mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted'

export function SearchPanel({
  filters,
  categories,
  categoryStatus,
  priceError,
  onChange,
  onSubmit,
  onReset,
}: SearchPanelProps) {
  const { t } = useTranslation()

  const districts = getDistricts(filters.region)
  const districtDisabled = !filters.region || districts.length === 0
  const districtHint =
    filters.region && districts.length === 0
      ? t('home.search.districtUnavailable')
      : undefined

  const categoryDisabled = categoryStatus !== 'ready'

  const categoryPlaceholder =
    categoryStatus === 'loading'
      ? t('home.search.categoriesLoading')
      : categoryStatus === 'error'
        ? t('home.search.categoriesUnavailable')
        : categoryStatus === 'empty'
          ? t('home.search.categoriesEmpty')
          : t('home.search.allCategories')

  return (
    <form
      className="rounded-lg border border-line bg-surface p-3 sm:p-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={t('home.search.listingType')}
            className="inline-flex rounded-md border border-line bg-canvas p-0.5"
          >
            {(['SALE', 'RENT'] as const).map((type) => {
              const isActive = filters.listingType === type

              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onChange({ listingType: type })}
                  className={`h-8 rounded-[5px] px-3 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-accent text-on-accent'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {t(
                    type === 'SALE' ? 'listingType.sale' : 'listingType.rent',
                  )}
                </button>
              )
            })}
          </div>

          <span className="hidden text-[11px] text-muted sm:inline">
            {t('home.search.hint')}
          </span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {t('home.search.reset')}
        </button>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <Field id="search-query" label={t('home.search.query')}>
          <input
            id="search-query"
            type="search"
            value={filters.query}
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder={t('home.search.queryPlaceholder')}
            className={INPUT_CLASS}
          />
        </Field>

        <Field id="search-region" label={t('home.search.region')}>
          <div className="relative">
            <select
              id="search-region"
              value={filters.region}
              onChange={(event) => {
                const value = event.target.value
                onChange({ region: isRegionId(value) ? value : '' })
              }}
              className={SELECT_CLASS}
            >
              <option value="">{t('home.search.allRegions')}</option>
              {REGIONS.map((region) => (
                <option key={region.id} value={region.id}>
                  {t(region.nameKey)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              strokeWidth={1.8}
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            />
          </div>
        </Field>

        <Field id="search-category" label={t('home.search.category')}>
          <div className="relative">
            <select
              id="search-category"
              value={filters.categorySlug}
              disabled={categoryDisabled}
              onChange={(event) =>
                onChange({ categorySlug: event.target.value })
              }
              className={SELECT_CLASS}
            >
              <option value="">{categoryPlaceholder}</option>
              {categoryStatus === 'ready'
                ? categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {categoryLabel(category, t)}
                    </option>
                  ))
                : null}
            </select>
            <ChevronDown
              size={15}
              strokeWidth={1.8}
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            />
          </div>
        </Field>

        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent/90"
        >
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          {t('home.search.submit')}
        </button>
      </div>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
        <Field
          id="search-price"
          label={t('home.search.price')}
          group
          error={priceError ? t('home.search.priceError') : undefined}
          errorId="search-price-error"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label={t('home.search.minPrice')}
              aria-invalid={priceError}
              aria-describedby={priceError ? 'search-price-error' : undefined}
              placeholder={t('home.search.minPrice')}
              value={filters.minPrice}
              onChange={(event) =>
                onChange({ minPrice: sanitizeNumericInput(event.target.value) })
              }
              className={INPUT_CLASS}
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label={t('home.search.maxPrice')}
              aria-invalid={priceError}
              aria-describedby={priceError ? 'search-price-error' : undefined}
              placeholder={t('home.search.maxPrice')}
              value={filters.maxPrice}
              onChange={(event) =>
                onChange({ maxPrice: sanitizeNumericInput(event.target.value) })
              }
              className={INPUT_CLASS}
            />
          </div>
        </Field>

        <Field id="search-rooms" label={t('home.search.rooms')}>
          <div className="relative">
            <select
              id="search-rooms"
              value={filters.rooms}
              onChange={(event) => onChange({ rooms: event.target.value })}
              className={SELECT_CLASS}
            >
              <option value="">{t('home.search.anyRooms')}</option>
              {['1', '2', '3', '4'].map((value) => (
                <option key={value} value={value}>
                  {t('property.rooms', { count: Number(value) })}
                </option>
              ))}
              <option value="5">{t('home.search.roomsFivePlus')}</option>
            </select>
            <ChevronDown
              size={15}
              strokeWidth={1.8}
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            />
          </div>
        </Field>

        <Field
          id="search-district"
          label={t('home.search.district')}
          hint={districtHint}
        >
          <div className="relative">
            <select
              id="search-district"
              value={filters.district}
              disabled={districtDisabled}
              onChange={(event) => onChange({ district: event.target.value })}
              className={SELECT_CLASS}
            >
              <option value="">
                {filters.region
                  ? t('home.search.allDistricts')
                  : t('home.search.selectRegionFirst')}
              </option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {t(district.nameKey)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              strokeWidth={1.8}
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            />
          </div>
        </Field>
      </div>
    </form>
  )
}

interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  errorId?: string
  group?: boolean
  children: ReactNode
}

function Field({
  id,
  label,
  hint,
  error,
  errorId,
  group = false,
  children,
}: FieldProps) {
  return (
    <div className="min-w-0">
      {group ? (
        <span className={LABEL_CLASS}>{label}</span>
      ) : (
        <label htmlFor={id} className={LABEL_CLASS}>
          {label}
        </label>
      )}
      {children}
      {hint ? (
        <p className="mt-1 text-[11px] leading-4 text-muted">{hint}</p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-[11px] leading-4 text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
