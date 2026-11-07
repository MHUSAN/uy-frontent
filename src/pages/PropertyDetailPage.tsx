import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createInquiry } from '@/api/inquiries'
import { fetchProperty } from '@/api/properties'
import { addFavorite, removeFavorite } from '@/api/favorites'
import { getErrorKey } from '@/api/errors'
import { useAuth } from '@/hooks/useAuth'
import type { Property } from '@/types/property'
import { YandexMap } from '@/components/YandexMap'
import { Feedback, PageLoading } from '@/components/Feedback'
import { formatArea, formatDate, formatPrice } from '@/utils/format'
import { categoryLabel, locationLabel } from '@/utils/localize'

export function PropertyDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const propertyId = Number(id)
  const auth = useAuth()
  const navigate = useNavigate()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [inquiryError, setInquiryError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  useEffect(() => {
    if (!Number.isInteger(propertyId) || propertyId < 1) {
      setError('errors.notFound')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchProperty(propertyId, auth.token)
      .then((p) => {
        if (!cancelled) setProperty(p)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorKey(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [propertyId, auth.token])
  if (loading) return <PageLoading />
  if (error || !property)
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-12">
        <Feedback messageKey={error ?? 'errors.notFound'} />
        <Link to="/" className="mt-3 inline-block text-accent underline">
          {t('nav.home')}
        </Link>
      </div>
    )
  const primaryImage = [...(property.images ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )[0]
  const toggleFavorite = async () => {
    if (!auth.user) {
      navigate('/login')
      return
    }
    setFavoriteLoading(true)
    setInquiryError(null)
    try {
      if (favorite) await removeFavorite(property.id)
      else await addFavorite(property.id)
      setFavorite(!favorite)
    } catch (err) {
      setInquiryError(getErrorKey(err))
    } finally {
      setFavoriteLoading(false)
    }
  }
  const sendInquiry = async (event: React.FormEvent) => {
    event.preventDefault()
    setInquiryError(null)
    setSent(false)
    if (!auth.user) {
      navigate('/login')
      return
    }
    if (message.trim().length < 10 || message.length > 2000) {
      setInquiryError('validation.message')
      return
    }
    const contactPhone = phone || auth.user.phone || ''
    if (!/^\+?[0-9 ()-]{7,20}$/.test(contactPhone)) {
      setInquiryError('validation.phone')
      return
    }
    setSending(true)
    try {
      await createInquiry(property.id, { message, phone: contactPhone })
      setMessage('')
      setPhone('')
      setSent(true)
    } catch (err) {
      setInquiryError(getErrorKey(err))
    } finally {
      setSending(false)
    }
  }
  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="break-words font-display text-2xl text-ink">
        {property.title}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {locationLabel(property.city, t)}
        {property.status && property.status !== 'APPROVED' && (
          <> · {t(`status.${property.status}`)}</>
        )}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt={primaryImage.altText ?? property.title}
              className="h-80 w-full object-cover"
            />
          ) : (
            <div className="flex h-80 items-center justify-center text-muted">
              {t('property.noImage')}
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <p className="break-words text-2xl font-semibold text-ink">
            {formatPrice(property.price, property.currency, i18n.language)}
          </p>
          <p className="text-sm text-muted">
            {t('property.rooms', { count: property.rooms })} ·{' '}
            {t('property.area', {
              value: formatArea(property.area, i18n.language),
            })}{' '}
            · {t('details.bathrooms', { count: property.bathrooms })}
          </p>
          <p className="text-sm text-muted">
            {t(
              property.listingType === 'SALE'
                ? 'listingType.sale'
                : 'listingType.rent',
            )}
            {property.category && <> · {categoryLabel(property.category, t)}</>}
          </p>
          <p className="text-xs text-muted">
            {formatDate(property.createdAt, i18n.language)}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-ink">
            {property.description}
          </p>
          {property.owner && (
            <div className="rounded-md border border-line bg-canvas p-3 text-sm">
              <p className="text-xs text-muted">{t('details.seller')}</p>
              <p className="break-words font-semibold text-ink">
                {property.owner.fullName}
              </p>
              {property.owner.phone && (
                <a
                  href={`tel:${property.owner.phone}`}
                  aria-label={t('details.call')}
                  className="mt-1 block break-all text-accent"
                >
                  {property.owner.phone}
                </a>
              )}
              {property.owner.telegram && (
                <p className="mt-1 break-all text-muted">
                  {property.owner.telegram}
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            disabled={favoriteLoading}
            onClick={toggleFavorite}
            className="inline-flex w-full items-center justify-center rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent disabled:opacity-70"
          >
            {t(favorite ? 'property.favoriteRemove' : 'property.favorite')}
          </button>
          {auth.user ? (
            <form noValidate onSubmit={sendInquiry} className="space-y-2">
              <label htmlFor="inquiry-message" className="block text-sm">
                {t('details.message')}
              </label>
              <textarea
                id="inquiry-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                minLength={10}
                maxLength={2000}
                placeholder={t('details.message')}
                className="h-24 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
              />
              <label htmlFor="inquiry-phone" className="block text-sm">
                {t('account.phone')}
              </label>
              <input
                id="inquiry-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={auth.user.phone || t('account.phone')}
                className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink"
              />
              <button
                type="submit"
                disabled={sending}
                className="inline-flex w-full items-center justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent disabled:opacity-70"
              >
                {t(sending ? 'common.sending' : 'details.send')}
              </button>
            </form>
          ) : (
            <Link
              to="/login"
              className="block text-center text-sm text-accent underline"
            >
              {t('details.loginRequired')}
            </Link>
          )}
          <Feedback messageKey={inquiryError} />
          <Feedback messageKey={sent ? 'details.sent' : null} success />
        </div>
      </div>
      {property.latitude != null && property.longitude != null && (
        <div className="mt-6">
          <YandexMap
            latitude={property.latitude}
            longitude={property.longitude}
          />
        </div>
      )}
    </article>
  )
}
