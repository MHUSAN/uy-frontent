import { getErrorKey } from '@/api/errors'
import { categoryLabel } from '@/utils/localize'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { CategorySection } from '@/components/CategorySection'
import { PropertyGrid } from '@/components/PropertyGrid'
import { SearchPanel } from '@/components/SearchPanel'
import { useCategories } from '@/hooks/useCategories'
import type { PropertyCardData } from '@/types/property'
import { EMPTY_FILTERS, parsePrice, type SearchFilters } from '@/types/search'
import { readFilters, writeFilters } from '@/utils/searchParams'
import { scrollToElement } from '@/utils/scroll'
import { fetchProperties } from '@/api/properties'
import { cacheGet, cacheSet } from '@/utils/cache'

const PAGE_SIZE = 12

export function HomePage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<SearchFilters>(() =>
    readFilters(searchParams),
  )
  const [priceError, setPriceError] = useState(false)
  const submitted = searchParams.size > 0
  const queryKey = searchParams.toString()
  const requestId = useRef(0)

  const categories = useCategories()

  const [properties, setProperties] = useState<PropertyCardData[]>([])
  const [total, setTotal] = useState(0)
  const [pageNo, setPageNo] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const activeFilters = useRef<Partial<SearchFilters>>({})
  const [gridState, setGridState] = useState<
    'ready' | 'loading' | 'empty' | 'error' | 'unavailable'
  >('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const load = useCallback((active: Partial<SearchFilters>) => {
    const id = ++requestId.current
    const cacheKey = `home:${JSON.stringify(active)}`
    const cached = cacheGet<{ items: PropertyCardData[]; total: number }>(cacheKey)
    activeFilters.current = active
    setPageNo(1)
    if (cached) {
      setProperties(cached.items)
      setTotal(cached.total)
      setGridState(cached.items.length === 0 ? 'empty' : 'ready')
    } else setGridState('loading')
    setErrorMessage(null)
    fetchProperties(active)
      .then((page) => {
        if (id !== requestId.current) return
        cacheSet(cacheKey, { items: page.items, total: page.total })
        setProperties(page.items)
        setTotal(page.total)
        setGridState(page.items.length === 0 ? 'empty' : 'ready')
      })
      .catch((err) => {
        if (id !== requestId.current || cached) return
        setErrorMessage(getErrorKey(err))
        setGridState('error')
      })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(queryKey)
    const active = readFilters(params)
    setFilters(active)
    load(params.size ? active : {})
    return () => { requestId.current += 1 }
  }, [queryKey, load])

  const loadMore = () => {
    const next = pageNo + 1
    setLoadingMore(true)
    fetchProperties(activeFilters.current, next, PAGE_SIZE)
      .then((page) => {
        setProperties((current) => {
          const seen = new Set(current.map((item) => item.id))
          return [...current, ...page.items.filter((item) => !seen.has(item.id))]
        })
        setTotal(page.total)
        setPageNo(next)
      })
      .catch((err) => setErrorMessage(getErrorKey(err)))
      .finally(() => setLoadingMore(false))
  }

  const selectedCategory = categories.categories.find(
    (category) => category.slug === filters.categorySlug,
  )

  const summaryItems = [
    t(filters.listingType === 'SALE' ? 'listingType.sale' : 'listingType.rent'),
    filters.region ? t(`regions.${filters.region}`) : '',
    selectedCategory ? categoryLabel(selectedCategory, t) : '',
    filters.rooms
      ? t('property.rooms', { count: Number(filters.rooms) })
      : '',
  ].filter((item) => item.length > 0)

  const handleFilterChange = (patch: Partial<SearchFilters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch }
      if (patch.region !== undefined) {
        next.district = ''
      }
      return next
    })
    if (priceError) setPriceError(false)
  }

  const handleSubmit = () => {
    const minimum = parsePrice(filters.minPrice)
    const maximum = parsePrice(filters.maxPrice)
    if (minimum !== null && maximum !== null && minimum > maximum) {
      setPriceError(true)
      return
    }
    setPriceError(false)
    setSearchParams(writeFilters(filters), { replace: true })
    if (new URLSearchParams(writeFilters(filters)).toString() === queryKey) load(filters)
    scrollToElement('elonlar')
  }

  const handleReset = () => {
    setFilters(EMPTY_FILTERS)
    setSearchParams({}, { replace: true })
    setPriceError(false)
    if (!queryKey) load({})
  }

  return (
    <div>
      <div className="border-b border-line bg-gradient-to-b from-accent-soft via-accent-soft/50 to-canvas">
      <section className="mx-auto w-full max-w-[88rem] px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-12 lg:px-8 lg:pb-12 lg:pt-16">
        <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          <span className="h-px w-6 bg-accent" aria-hidden="true" />
          {t('home.eyebrow')}
        </p>
        <h1 className="mt-3 max-w-4xl font-display text-3xl leading-[1.1] tracking-[-0.025em] text-ink sm:text-4xl lg:text-5xl xl:text-6xl">
          {t('home.title')}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7 lg:text-lg">
          {t('home.subtitle')}
        </p>
        <div className="mt-6 max-w-5xl lg:mt-8">
          <SearchPanel
            filters={filters}
            categories={categories.categories}
            categoryStatus={categories.status}
            priceError={priceError}
            onChange={handleFilterChange}
            onSubmit={handleSubmit}
            onReset={handleReset}
          />
        </div>
      </section>

      </div>
      <div className="mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-8">
      <CategorySection
        categories={categories.categories}
        status={categories.status}
        activeSlug={filters.categorySlug}
        onSelect={(slug) => {
          const next = { ...filters, categorySlug: filters.categorySlug === slug ? '' : slug }
          setFilters(next)
          setSearchParams(writeFilters(next), { replace: true })
          scrollToElement('elonlar')
        }}
        onRetry={categories.retry}
      />
      <section
        id="elonlar"
        className="mt-10 scroll-mt-20 border-t border-line pb-12 pt-8"
      >
        <div>
          <h2 className="font-display text-2xl tracking-[-0.02em] text-ink">
            {t('home.listings.title')}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t('home.listings.subtitle')}
          </p>
        </div>

        {submitted ? (
          <div
            role="status"
            className="mt-4 flex items-start gap-2.5 rounded-md border border-line bg-surface px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="text-xs leading-5 text-ink">
                {t('home.listings.searchNotice')}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                <span className="font-semibold text-ink">
                  {t('home.listings.criteria')}:
                </span>{' '}
                {summaryItems.join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="ml-auto shrink-0 text-[11px] font-medium text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              {t('common.clear')}
            </button>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 text-sm text-danger">{t(errorMessage)}</p>
        ) : null}

        <div className="mt-4">
          <PropertyGrid properties={properties} state={gridState} />
        </div>

        {gridState === 'ready' && total > 0 && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-xs text-muted">
              {t('home.listings.shown', { shown: properties.length, total })}
            </p>
            {properties.length < total && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex min-h-11 items-center rounded-lg border border-accent px-6 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-60"
              >
                {t(loadingMore ? 'common.loading' : 'home.listings.loadMore')}
              </button>
            )}
          </div>
        )}
      </section>
      </div>
    </div>
  )
}
