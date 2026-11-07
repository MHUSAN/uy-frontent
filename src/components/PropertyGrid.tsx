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
  'inline-flex h-8 items-center rounded-md border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent'

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg border border-line bg-surface motion-safe:animate-pulse"
            >
              <div className="aspect-[4/3] bg-canvas" />
              <div className="space-y-2 p-3.5">
                <div className="h-4 w-24 rounded bg-canvas" />
                <div className="h-3 w-4/5 rounded bg-canvas" />
                <div className="h-3 w-3/5 rounded bg-canvas" />
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
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${className}`}>
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
