import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Calendar,
  Heart,
  ImageOff,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  Share2,
  Tag,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { createInquiry } from '@/api/inquiries'
import { fetchProperty } from '@/api/properties'
import { getErrorKey } from '@/api/errors'
import { Feedback } from '@/components/Feedback'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { rememberViewed } from '@/hooks/useRecentlyViewed'
import { formatArea, formatDate, formatPrice } from '@/utils/format'
import { categoryLabel, locationLabel } from '@/utils/localize'

const PHONE_PATTERN = /^(\+998)?\d{9}$/

function DetailSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto w-full max-w-[1440px] px-3 pb-16 pt-6 sm:px-6"
    >
      <div className="grid gap-8 rounded-3xl bg-surface p-4 sm:p-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] motion-safe:animate-pulse">
        <div className="aspect-[4/3] rounded-2xl bg-soft" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 rounded bg-soft" />
          <div className="h-10 w-1/3 rounded bg-soft" />
          <div className="h-24 rounded bg-soft" />
        </div>
      </div>
    </div>
  )
}

export function PropertyDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const propertyId = Number(id)
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const favorites = useFavorites()

  const validId = Number.isInteger(propertyId) && propertyId >= 1
  const detail = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => fetchProperty(propertyId),
    enabled: validId,
    staleTime: 60_000,
  })
  const property = detail.data ?? null
  const loading = validId && detail.isPending
  const error = !validId ? 'errors.notFound' : detail.isError ? getErrorKey(detail.error) : null
  const [activeImage, setActiveImage] = useState(0)
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [inquiryError, setInquiryError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setActiveImage(0)
  }, [propertyId])

  useEffect(() => {
    if (detail.data) rememberViewed(detail.data)
  }, [detail.data])

  useEffect(() => {
    if (auth.user?.phone) setPhone((current) => current || auth.user?.phone || '')
  }, [auth.user?.phone])

  if (loading) return <DetailSkeleton />
  if (error || !property) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-3 pb-16 pt-6 sm:px-6">
        <div className="rounded-3xl bg-surface p-8">
          <Feedback messageKey={error ?? 'errors.notFound'} />
          <Link
            to="/"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-ink/40"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {t('details.back')}
          </Link>
        </div>
      </div>
    )
  }

  const images = [...(property.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const current = images[Math.min(activeImage, images.length - 1)]
  const isOwner = Boolean(auth.user && property.owner && property.owner.id === auth.user.id)
  const isFavorite = favorites.ids.has(property.id)
  const language = i18n.resolvedLanguage ?? i18n.language

  const sendInquiry = async (event: React.FormEvent) => {
    event.preventDefault()
    setInquiryError(null)
    setSent(false)
    const text = message.trim()
    if (text.length < 10 || text.length > 1000) {
      setInquiryError('validation.message')
      return
    }
    const contact = phone.replace(/[\s()-]/g, '')
    if (!PHONE_PATTERN.test(contact)) {
      setInquiryError('validation.phone')
      return
    }
    setSending(true)
    try {
      await createInquiry(property.id, { message: text, phone: contact })
      setMessage('')
      setSent(true)
      toast.success('details.sent')
    } catch (err) {
      setInquiryError(getErrorKey(err))
    } finally {
      setSending(false)
    }
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: property.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success('toast.linkCopied')
    } catch {
      // The user closed the share sheet or clipboard access was denied.
    }
  }

  const goLogin = () =>
    navigate('/login', { state: { from: location.pathname } })

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 pb-16 pt-6 sm:px-6">
      <article className="rounded-3xl bg-surface p-4 sm:p-8 lg:p-10">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink hover:bg-soft"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t('details.back')}
        </Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12">
          <div className="min-w-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-soft">
              {current ? (
                <img
                  src={current.url}
                  alt={current.altText?.trim() || property.title}
                  width={1200}
                  height={900}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 text-muted">
                  <ImageOff size={32} strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-sm">{t('property.noImage')}</span>
                </div>
              )}
              <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-3 py-1 text-xs font-semibold text-ink">
                {t(property.listingType === 'SALE' ? 'listingType.sale' : 'listingType.rent')}
              </span>
            </div>
            {images.length > 1 && (
              <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <li key={image.id} className="shrink-0">
                    <button
                      type="button"
                      aria-label={t('details.gallery', { index: index + 1, total: images.length })}
                      aria-current={image.id === current?.id}
                      onClick={() => setActiveImage(index)}
                      className={`block size-20 overflow-hidden rounded-xl border-2 transition-opacity ${
                        image.id === current?.id
                          ? 'border-accent'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <h2 className="mt-8 text-lg font-bold text-ink">{t('details.description')}</h2>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-ink">
              {property.description}
            </p>
          </div>

          <div className="min-w-0 space-y-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="break-words text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                  {property.title}
                </h1>
                <button
                  type="button"
                  aria-label={t('details.share')}
                  onClick={() => void share()}
                  className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line hover:border-ink/40"
                >
                  <Share2 size={20} aria-hidden="true" className="text-ink" />
                </button>
                <button
                  type="button"
                  aria-pressed={isFavorite}
                  aria-label={isFavorite ? t('property.favoriteRemove') : t('property.favorite')}
                  onClick={() => void favorites.toggle(property)}
                  className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line hover:border-ink/40"
                >
                  <Heart
                    size={22}
                    strokeWidth={1.7}
                    aria-hidden="true"
                    className={isFavorite ? 'fill-pink-500 text-pink-500' : 'text-ink'}
                  />
                </button>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-ink">
                {formatPrice(property.price, property.currency, language)}
                {property.listingType === 'RENT' && (
                  <span className="ml-1 text-sm font-medium text-muted">{t('property.perMonth')}</span>
                )}
              </p>
              {property.area > 0 && (
                <p className="mt-1 text-sm text-muted">
                  {t('property.pricePerArea', {
                    value: formatPrice(property.price / property.area, property.currency, language),
                  })}
                </p>
              )}
              <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
                <MapPin size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                {property.address}, {locationLabel(property.city, t)}
              </p>
            </div>

            <section aria-label={t('details.specs')}>
              <ul className="grid grid-cols-2 gap-3 text-sm text-ink">
                <li className="flex items-center gap-2 rounded-2xl bg-soft p-3">
                  <BedDouble size={18} aria-hidden="true" />
                  {t('property.rooms', { count: property.rooms })}
                </li>
                <li className="flex items-center gap-2 rounded-2xl bg-soft p-3">
                  <Maximize2 size={18} aria-hidden="true" />
                  {t('property.area', { value: formatArea(property.area, language) })}
                </li>
                <li className="flex items-center gap-2 rounded-2xl bg-soft p-3">
                  <Bath size={18} aria-hidden="true" />
                  {t('details.bathrooms', { count: property.bathrooms })}
                </li>
                <li className="flex items-center gap-2 rounded-2xl bg-soft p-3">
                  <Tag size={18} aria-hidden="true" />
                  {property.category ? categoryLabel(property.category, t) : t('details.category')}
                </li>
                <li className="col-span-2 flex items-center gap-2 rounded-2xl bg-soft p-3 text-muted">
                  <Calendar size={18} aria-hidden="true" />
                  {t('details.posted')}: {formatDate(property.createdAt, language)}
                </li>
              </ul>
            </section>

            {property.owner && (
              <section className="rounded-2xl border border-line p-4" aria-label={t('details.seller')}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {t('details.seller')}
                </p>
                <p className="mt-2 flex items-center gap-2 break-words text-base font-bold text-ink">
                  <User size={18} aria-hidden="true" className="shrink-0" />
                  {property.owner.fullName}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {property.owner.phone && (
                    <a
                      href={`tel:${property.owner.phone}`}
                      className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-bold text-on-accent hover:brightness-95"
                    >
                      <Phone size={17} aria-hidden="true" />
                      {property.owner.phone}
                    </a>
                  )}
                  {property.owner.email && (
                    <a
                      href={`mailto:${property.owner.email}`}
                      className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-line px-4 text-sm font-semibold text-ink hover:border-ink/40"
                    >
                      <Mail size={17} aria-hidden="true" />
                      {t('details.emailSeller')}
                    </a>
                  )}
                </div>
              </section>
            )}

            {isOwner ? (
              <p className="rounded-2xl bg-soft p-4 text-sm text-muted">{t('details.ownProperty')}</p>
            ) : auth.user ? (
              <form noValidate onSubmit={sendInquiry} className="rounded-2xl border border-line p-4">
                <h2 className="text-base font-bold text-ink">{t('details.inquiryTitle')}</h2>
                <label htmlFor="inquiry-message" className="mt-3 block text-sm font-medium">
                  {t('details.message')}
                </label>
                <textarea
                  id="inquiry-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  aria-describedby="inquiry-message-hint"
                  className="mt-1.5 h-28 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-ink"
                />
                <p id="inquiry-message-hint" className="mt-1 text-xs text-muted">
                  {t('details.messageHint')}
                </p>
                <label htmlFor="inquiry-phone" className="mt-3 block text-sm font-medium">
                  {t('details.phoneLabel')}
                </label>
                <input
                  id="inquiry-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('details.phoneHint')}
                  className="mt-1.5 h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink focus:border-ink"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-nav px-4 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {t(sending ? 'common.sending' : 'details.send')}
                </button>
                <div className="mt-3">
                  <Feedback messageKey={inquiryError} />
                  <Feedback messageKey={sent ? 'details.sent' : null} success />
                </div>
              </form>
            ) : (
              <div className="rounded-2xl border border-line p-4 text-center">
                <p className="text-sm text-muted">{t('details.loginRequired')}</p>
                <button
                  type="button"
                  onClick={goLogin}
                  className="mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl bg-accent px-4 text-sm font-bold text-on-accent hover:brightness-95"
                >
                  {t('nav.login')}
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}
