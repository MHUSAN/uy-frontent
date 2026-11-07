import { locationLabel } from '@/utils/localize'
import {
  Bath,
  BedDouble,
  Heart,
  ImageOff,
  MapPin,
  Maximize2,
  Phone,
  Send,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PropertyCardData } from '@/types/property'
import { formatArea, formatPrice } from '@/utils/format'

interface PropertyCardProps {
  property: PropertyCardData
  isFavorite?: boolean
  onFavoriteToggle?: (property: PropertyCardData) => void
}

export function PropertyCard({
  property,
  isFavorite = false,
  onFavoriteToggle,
}: PropertyCardProps) {
  const { t, i18n } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)

  const language = i18n.resolvedLanguage ?? i18n.language

  const primaryImage = useMemo(() => {
    const images = property.images ?? []
    return [...images].sort((a, b) => a.sortOrder - b.sortOrder)[0]
  }, [property.images])

  const phone = property.owner?.phone
  const telegram = property.owner?.telegram

  const showImage = Boolean(primaryImage) && !imageFailed

  const location =
    property.address && property.address !== property.city
      ? `${locationLabel(property.city, t)}, ${property.address}`
      : locationLabel(property.city, t)

  return (
    <article className="relative overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-accent/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-canvas">
        <Link
          to={`/elonlar/${property.id}`}
          aria-label={property.title}
          className="absolute inset-0 z-0"
        />
        {showImage && primaryImage ? (
          <>
            <img
              src={primaryImage.url}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="pointer-events-none absolute inset-0 size-full scale-110 object-cover opacity-60 blur-xl"
            />
            <img
              src={primaryImage.url}
              alt={primaryImage.altText?.trim() || property.title}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="pointer-events-none relative size-full object-contain"
            />
          </>
        ) : (
          <div className="pointer-events-none flex size-full flex-col items-center justify-center gap-1.5 text-muted">
            <ImageOff size={22} strokeWidth={1.6} aria-hidden="true" />
            <span className="text-[11px]">{t('property.noImage')}</span>
          </div>
        )}

        <span
          className={`pointer-events-none absolute left-2.5 top-2.5 z-10 rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] ${
            property.listingType === 'SALE'
              ? 'border-accent/25 bg-accent-soft text-accent'
              : 'border-line bg-canvas text-ink'
          }`}
        >
          {t(
            property.listingType === 'SALE'
              ? 'listingType.sale'
              : 'listingType.rent',
          )}
        </span>

        <button
          type="button"
          disabled={!onFavoriteToggle}
          aria-pressed={isFavorite}
          aria-label={
            isFavorite ? t('property.favoriteRemove') : t('property.favorite')
          }
          title={
            onFavoriteToggle
              ? isFavorite
                ? t('property.favoriteRemove')
                : t('property.favorite')
              : t('property.favoriteUnavailable')
          }
          onClick={() => onFavoriteToggle?.(property)}
          className={`absolute right-2.5 top-2.5 z-10 inline-flex size-8 items-center justify-center rounded-md border border-line bg-surface transition-colors ${
            isFavorite ? 'text-accent' : 'text-muted hover:text-accent'
          } disabled:opacity-70`}
        >
          <Heart
            size={15}
            strokeWidth={1.9}
            aria-hidden="true"
            className={isFavorite ? 'fill-current' : ''}
          />
        </button>
      </div>

      <div className="p-3.5">
        <p className="flex items-baseline gap-1 text-[17px] font-semibold tracking-[-0.01em] text-ink">
          {formatPrice(property.price, property.currency, language)}
          {property.listingType === 'RENT' ? (
            <span className="text-xs font-medium text-muted">
              {t('property.perMonth')}
            </span>
          ) : null}
        </p>

        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-ink">
          <Link to={`/elonlar/${property.id}`} className="hover:text-accent">
            {property.title}
          </Link>
        </h3>

        <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-muted">
          <MapPin
            size={13}
            strokeWidth={1.8}
            aria-hidden="true"
            className="mt-1 shrink-0"
          />
          <span className="line-clamp-1">{location}</span>
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <BedDouble size={13} strokeWidth={1.8} aria-hidden="true" />
            {t('property.rooms', { count: property.rooms })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Maximize2 size={13} strokeWidth={1.8} aria-hidden="true" />
            {t('property.area', {
              value: formatArea(property.area, language),
            })}
          </span>
          {property.bathrooms != null && (
            <span className="inline-flex items-center gap-1">
              <Bath size={13} strokeWidth={1.8} aria-hidden="true" />
              {t('details.bathrooms', { count: property.bathrooms })}
            </span>
          )}
        </div>

        {(phone || telegram) && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-2.5">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-xs font-medium text-ink hover:border-accent hover:text-accent"
              >
                <Phone size={13} strokeWidth={1.9} aria-hidden="true" />
                {phone}
              </a>
            )}
            {telegram && (
              <a
                href={`https://t.me/${telegram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('details.telegramOpen')}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-xs font-medium text-ink hover:border-accent hover:text-accent"
              >
                <Send size={13} strokeWidth={1.9} aria-hidden="true" />
                {telegram.startsWith('@') ? telegram : `@${telegram}`}
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
