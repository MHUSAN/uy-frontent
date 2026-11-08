import { House, Inbox, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PropertyCard } from '@/components/PropertyCard'
import { StatusPanel } from '@/components/StatusPanel'
import type { PropertyCardData } from '@/types/property'

export type PropertyGridState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'unavailable'

interface PropertyGridProps {
  properties: PropertyCardData[]
  state?: PropertyGridState
  onRetry?: () => void
  favoriteIds?: ReadonlySet<number>
  onFavoriteToggle?: (property: PropertyCardData) => void
  className?: string
}

const RETRY_BUTTON =
  'inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink transition-colors hover:border-ink/40'

export function PropertyGrid({
  properties,
  state = 'ready',
  onRetry,
  favoriteIds,
  onFavoriteToggle,
  className = '',
}: PropertyGridProps) {
  const { t } = useTranslation()

  const effectiveState: PropertyGridState =
    state === 'ready' && properties.length === 0 ? 'empty' : state

  if (effectiveState === 'loading') {
    return (
      <div className={className} aria-busy="true">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl bg-surface shadow-[0_2px_14px_rgba(0,0,0,0.07)] motion-safe:animate-pulse"
            >
              <div className="aspect-[4/3] bg-soft" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-28 rounded bg-soft" />
                <div className="h-3 w-4/5 rounded bg-soft" />
                <div className="h-3 w-3/5 rounded bg-soft" />
              </div>
            </div>
          ))}
        </div>
        <p role="status" className="sr-only">
          {t('home.listings.loading')}
        </p>
      </div>
    )
  }

  if (effectiveState === 'unavailable') {
    return (
      <StatusPanel
        icon={House}
        title={t('home.listings.unavailableTitle')}
        body={t('home.listings.unavailableBody')}
      />
    )
  }

  if (effectiveState === 'error') {
    return (
      <StatusPanel
        icon={TriangleAlert}
        tone="error"
        title={t('home.listings.errorTitle')}
        body={t('home.listings.errorBody')}
        action={
          onRetry ? (
            <button type="button" onClick={onRetry} className={RETRY_BUTTON}>
              {t('home.listings.retry')}
            </button>
          ) : undefined
        }
      />
    )
  }

  if (effectiveState === 'empty') {
    return (
      <StatusPanel
        icon={Inbox}
        title={t('home.listings.emptyTitle')}
        body={t('home.listings.emptyBody')}
      />
    )
  }

  return (
    <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${className}`}>
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          isFavorite={favoriteIds?.has(property.id) ?? false}
          onFavoriteToggle={onFavoriteToggle}
        />
      ))}
    </div>
  )
}
