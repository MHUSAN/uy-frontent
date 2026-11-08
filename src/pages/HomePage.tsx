import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { getErrorKey } from '@/api/errors'
import { fetchProperties } from '@/api/properties'
import { FilterSidebar } from '@/components/FilterSidebar'
import { Pagination } from '@/components/Pagination'
import { PropertyGrid, type PropertyGridState } from '@/components/PropertyGrid'
import { PropertyCard } from '@/components/PropertyCard'
import { useCategories } from '@/hooks/useCategories'
import { useFavorites } from '@/hooks/useFavorites'
import { clearRecentlyViewed, useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import {
  countActiveFilters,
  EMPTY_FILTERS,
  hasInvalidPriceRange,
  type SearchFilters,
  type SortValue,
} from '@/types/search'
import { readFilters, readPage, writeFilters } from '@/utils/searchParams'

const PAGE_SIZE = 12
const CITY_DEBOUNCE_MS = 500
const SORT_OPTIONS: SortValue[] = ['newest', 'price_asc', 'price_desc']

export function HomePage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const queryKey = params.toString()
  const applied = useMemo(() => readFilters(new URLSearchParams(queryKey)), [queryKey])
  const page = useMemo(() => readPage(new URLSearchParams(queryKey)), [queryKey])

  const [draft, setDraft] = useState<SearchFilters>(applied)
  const [priceError, setPriceError] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const openButton = useRef<HTMLButtonElement>(null)

  const categories = useCategories()
  const favorites = useFavorites()
  const recent = useRecentlyViewed()

  // Cached pages render instantly, then refresh from the server in the background.
  const listing = useQuery({
    queryKey: ['properties', applied, page],
    queryFn: () => fetchProperties(applied, page, PAGE_SIZE, applied.sort),
    placeholderData: keepPreviousData,
  })
  const items = listing.data?.items ?? []
  const total = listing.data?.total ?? 0
  const totalPages = listing.data?.totalPages ?? 1
  const state: PropertyGridState = listing.isPending
    ? 'loading'
    : listing.isError && !listing.data
      ? 'error'
      : items.length === 0
        ? 'empty'
        : 'ready'
  const errorKey = listing.isError ? getErrorKey(listing.error) : null

  useEffect(() => setDraft(applied), [applied])

  // Typing a city searches by itself after a short pause; other filters wait for "Show results".
  useEffect(() => {
    if (draft.city.trim() === applied.city.trim()) return
    const timer = window.setTimeout(() => {
      setParams(writeFilters({ ...applied, city: draft.city }, 1), { replace: true })
    }, CITY_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft.city, applied, setParams])

  useEffect(() => {
    if (!drawerOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawerRef.current?.querySelector<HTMLElement>('input, button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      openButton.current?.focus()
    }
  }, [drawerOpen])

  const patchDraft = useCallback((patch: Partial<SearchFilters>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setPriceError(false)
  }, [])

  const apply = () => {
    if (hasInvalidPriceRange(draft)) {
      setPriceError(true)
      return
    }
    setParams(writeFilters(draft, 1))
    setDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reset = () => {
    setDraft(EMPTY_FILTERS)
    setPriceError(false)
    setParams({})
  }

  const changeSort = (sort: SortValue) => setParams(writeFilters({ ...applied, sort }, 1))
  const changePage = (next: number) => {
    setParams(writeFilters(applied, next))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const sidebar = (idPrefix: string) => (
    <FilterSidebar
      idPrefix={idPrefix}
      filters={draft}
      categories={categories.categories}
      priceError={priceError}
      onChange={patchDraft}
      onApply={apply}
      onReset={reset}
    />
  )

  const activeCount = countActiveFilters(applied)
  const heading =
    state === 'loading' && items.length === 0
      ? t('common.loading')
      : state === 'error'
        ? t('home.listings.errorTitle')
        : total === 0
          ? t('listing.foundNone')
          : t('listing.found', { count: total })

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 pb-16 pt-6 sm:px-6">
      <div className="rounded-3xl bg-surface px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-14">
          <aside aria-label={t('listing.filters')} className="hidden lg:block">
            {sidebar('filters')}
          </aside>

          <section aria-labelledby="results-heading" className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1
                id="results-heading"
                aria-live="polite"
                className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl"
              >
                {heading}
              </h1>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <button
                  ref={openButton}
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-ink/40 sm:flex-none lg:hidden"
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  {t('listing.openFilters')}
                  {activeCount > 0 && (
                    <span className="grid size-5 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent">
                      {activeCount}
                    </span>
                  )}
                </button>
                <label htmlFor="sort" className="sr-only sm:not-sr-only sm:text-sm sm:text-muted">
                  {t('listing.sort')}
                </label>
                <select
                  id="sort"
                  value={applied.sort}
                  onChange={(event) => changeSort(event.target.value as SortValue)}
                  className="h-11 flex-1 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-ink/40 sm:flex-none"
                >
                  {SORT_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {t(`home.listings.sortOptions.${value}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {errorKey && state === 'error' ? (
              <p role="alert" className="mt-4 text-sm text-danger">
                {t(errorKey)}
              </p>
            ) : null}

            <div className={`mt-6 transition-opacity ${listing.isPlaceholderData ? 'opacity-60' : ''}`}>
              <PropertyGrid
                properties={items}
                state={state}
                onRetry={() => void listing.refetch()}
                favoriteIds={favorites.ids}
                onFavoriteToggle={(property) => void favorites.toggle(property)}
              />
            </div>

            {state === 'ready' && (
              <Pagination page={page} totalPages={totalPages} onChange={changePage} />
            )}

            {recent.length > 0 && (
              <section aria-labelledby="recent-heading" className="mt-14">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="recent-heading" className="text-xl font-extrabold tracking-tight text-ink">
                    {t('listing.recent')}
                  </h2>
                  <button
                    type="button"
                    onClick={clearRecentlyViewed}
                    className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    {t('listing.recentClear')}
                  </button>
                </div>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {recent.slice(0, 3).map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      isFavorite={favorites.ids.has(property.id)}
                      onFavoriteToggle={(p) => void favorites.toggle(p)}
                    />
                  ))}
                </div>
              </section>
            )}
          </section>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('listing.filters')}>
          <button
            type="button"
            aria-label={t('listing.closeFilters')}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            ref={drawerRef}
            className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-surface px-5 pb-8 pt-3 shadow-2xl"
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                aria-label={t('listing.closeFilters')}
                onClick={() => setDrawerOpen(false)}
                className="flex size-11 items-center justify-center rounded-full hover:bg-soft"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {sidebar('drawer')}
          </div>
        </div>
      )}
    </div>
  )
}
