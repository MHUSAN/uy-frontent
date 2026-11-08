import { locationLabel } from '@/utils/localize'
import { BedDouble, Heart, ImageOff, Maximize2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { fetchProperty } from '@/api/properties'
import type { PropertyCardData } from '@/types/property'
import { formatArea, formatPrice } from '@/utils/format'

interface PropertyCardProps {
  property: PropertyCardData
  isFavorite?: boolean
  onFavoriteToggle?: (property: PropertyCardData) => void
}

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export function PropertyCard({
  property,
  isFavorite = false,
  onFavoriteToggle,
}: PropertyCardProps) {
  const { t, i18n } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const queryClient = useQueryClient()
  const language = i18n.resolvedLanguage ?? i18n.language

  const primaryImage = useMemo(
    () =>
      [...(property.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0],
    [property.images],
  )
  const showImage = Boolean(primaryImage) && !imageFailed
  const created = new Date(property.createdAt).getTime()
  // eslint-disable-next-line react-hooks/purity
  const isNew = Number.isFinite(created) && Date.now() - created < NEW_WINDOW_MS

  const location =
    property.address && property.address !== property.city
      ? `${property.address}, ${locationLabel(property.city, t)}`
      : locationLabel(property.city, t)

  // Warm the detail page cache when the user is about to open it.
  const prefetch = () =>
    void queryClient.prefetchQuery({
      queryKey: ['property', property.id],
      queryFn: () => fetchProperty(property.id),
      staleTime: 60_000,
    })

  return (
    <article
      onPointerEnter={prefetch}
      onFocusCapture={prefetch}
      className="group relative overflow-hidden rounded-2xl bg-surface shadow-[0_2px_14px_rgba(0,0,0,0.07)] transition-shadow hover:shadow-[0_8px_26px_rgba(0,0,0,0.12)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        <Link
          to={`/elonlar/${property.id}`}
          aria-label={property.title}
          className="absolute inset-0 z-0 rounded-t-2xl"
        />
        {showImage && primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.altText?.trim() || property.title}
            width={640}
            height={480}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="pointer-events-none size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="pointer-events-none flex size-full flex-col items-center justify-center gap-1.5 text-muted">
            <ImageOff size={24} strokeWidth={1.6} aria-hidden="true" />
            <span className="text-xs">{t('property.noImage')}</span>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-1.5">
          {isNew && (
            <span className="rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-on-accent">
              {t('listing.isNew')}
            </span>
          )}
          <span className="rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink">
            {t(property.listingType === 'SALE' ? 'listingType.sale' : 'listingType.rent')}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-baseline gap-1 text-xl font-bold tracking-tight text-ink">
            {formatPrice(property.price, property.currency, language)}
            {property.listingType === 'RENT' && (
              <span className="text-xs font-medium text-muted">{t('property.perMonth')}</span>
            )}
          </p>
          <button
            type="button"
            disabled={!onFavoriteToggle}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? t('property.favoriteRemove') : t('property.favorite')}
            onClick={() => onFavoriteToggle?.(property)}
            className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-pink-500"
          >
            <Heart
              size={22}
              strokeWidth={1.7}
              aria-hidden="true"
              className={isFavorite ? 'fill-pink-500 text-pink-500' : ''}
            />
          </button>
        </div>

        <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-ink">
          <Link to={`/elonlar/${property.id}`} className="hover:underline">
            {property.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted">{location}</p>

        <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-xs font-medium text-muted">
          <span className="inline-flex items-center gap-1.5">
            <BedDouble size={15} strokeWidth={1.8} aria-hidden="true" />
            {t('property.rooms', { count: property.rooms })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Maximize2 size={14} strokeWidth={1.8} aria-hidden="true" />
            {t('property.area', { value: formatArea(property.area, language) })}
          </span>
        </div>
      </div>
    </article>
  )
}
