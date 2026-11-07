import { getErrorKey } from '@/api/errors'
import { categoryLabel } from '@/utils/localize'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { PropertyGrid } from '@/components/PropertyGrid'
import { SearchPanel } from '@/components/SearchPanel'
import { useCategories } from '@/hooks/useCategories'
import type { PropertyCardData } from '@/types/property'
import { EMPTY_FILTERS, parsePrice, type SearchFilters } from '@/types/search'
import { readFilters, writeFilters } from '@/utils/searchParams'
import { scrollToElement } from '@/utils/scroll'
import { fetchProperties } from '@/api/properties'

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
  const [gridState, setGridState] = useState<
    'ready' | 'loading' | 'empty' | 'error' | 'unavailable'
  >('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const load = useCallback((active: Partial<SearchFilters>) => {
    const id = ++requestId.current
    setGridState('loading')
    setErrorMessage(null)
    fetchProperties(active)
      .then((page) => {
        if (id !== requestId.current) return
        setProperties(page.items)
        setGridState(page.items.length === 0 ? 'empty' : 'ready')
      })
      .catch((err) => {
        if (id !== requestId.current) return
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
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <section className="pt-8 sm:pt-10">
        <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          <span className="h-px w-6 bg-accent" aria-hidden="true" />
          {t('home.eyebrow')}
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl leading-[1.12] tracking-[-0.025em] text-ink sm:text-4xl lg:text-[2.75rem]">
          {t('home.title')}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-[15px] sm:leading-7">
          {t('home.subtitle')}
        </p>
        <div className="mt-6">
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
      </section>
    </div>
  )
}
