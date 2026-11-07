import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ImagePlus, MapPin, Phone, Send, X } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import {
  createProperty,
  fetchProperty,
  updateProperty,
  uploadPropertyImages,
} from '@/api/properties'
import { updateCurrentUser } from '@/api/auth'
import { getErrorKey } from '@/api/errors'
import { useAuth } from '@/hooks/useAuth'
import { REGION_CITY_NAMES } from '@/utils/location'
import { categoryLabel } from '@/utils/localize'
import { YandexMap } from '@/components/YandexMap'
import { Feedback } from '@/components/Feedback'

function parseCoords(value: string): [number, number] | null {
  const m = value.match(/(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)/)
  if (!m) return null
  const lat = Number(m[1].replace(',', '.'))
  const lng = Number(m[2].replace(',', '.'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return [lat, lng]
}
function Section({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-ink">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent">
          {n}
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
const MAX_IMAGES = 3
const MIN_WORDS = 10
const MAX_WORDS = 200
// Counts letters and digits only; spaces, line breaks and punctuation are ignored.
const countWords = (value: string) =>
  (value.match(/[\p{L}\p{N}]/gu) ?? []).length
const INPUT =
  'min-h-12 w-full min-w-0 rounded-lg border border-line bg-canvas px-3 py-2 text-base text-ink focus:border-accent'
function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}
export function PropertyFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const auth = useAuth()
  const categoriesHook = useCategories()
  const { id } = useParams()
  const editId = id ? Number(id) : null
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [listingType, setListingType] = useState<'SALE' | 'RENT'>('SALE')
  const [region, setRegion] = useState('')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [rooms, setRooms] = useState('1')
  const [bathrooms, setBathrooms] = useState('1')
  const [categoryId, setCategoryId] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [coordText, setCoordText] = useState('')
  const [coordError, setCoordError] = useState(false)
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  )
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])
  const setCoords = (lat: number | null, lng: number | null) => {
    setLatitude(lat)
    setLongitude(lng)
    setCoordText(lat != null && lng != null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : '')
    setCoordError(false)
  }
  const onCoordInput = (value: string) => {
    setCoordText(value)
    if (!value.trim()) {
      setLatitude(null)
      setLongitude(null)
      setCoordError(false)
      return
    }
    const parsed = parseCoords(value)
    if (parsed) {
      setLatitude(parsed[0])
      setLongitude(parsed[1])
      setCoordError(false)
    } else setCoordError(true)
  }
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(Boolean(editId))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!auth.user) return
    setPhone((v) => v || (auth.user?.phone ?? '').replace(/^\+998/, ''))
    setTelegram((v) => v || (auth.user?.telegram ?? '').replace(/^@/, ''))
  }, [auth.user])
  useEffect(() => {
    if (!editId) return
    let cancelled = false
    fetchProperty(editId, auth.token)
      .then((p) => {
        if (cancelled) return
        setTitle(p.title)
        setDescription(p.description)
        setPrice(String(p.price))
        setCurrency(p.currency)
        setListingType(p.listingType)
        setRegion(
          Object.keys(REGION_CITY_NAMES).find(
            (k) =>
              REGION_CITY_NAMES[k as keyof typeof REGION_CITY_NAMES] === p.city,
          ) ?? '',
        )
        setDistrict(p.district ?? '')
        setAddress(p.address)
        setArea(String(p.area))
        setRooms(String(p.rooms))
        setBathrooms(String(p.bathrooms))
        setCategoryId(p.category?.id ? String(p.category.id) : '')
        setLatitude(p.latitude ?? null)
        setLongitude(p.longitude ?? null)
        if (p.latitude != null && p.longitude != null)
          setCoordText(`${p.latitude}, ${p.longitude}`)
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
  }, [editId, auth.token])
  const fail = (key: string, fieldId?: string) => {
    setError(key)
    if (fieldId) {
      const el = document.getElementById(fieldId)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
    }
  }
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (title.trim().length < 3 || title.length > 200) {
      fail('validation.title', 'title')
      return
    }
    const words = countWords(description)
    if (words < MIN_WORDS || words > MAX_WORDS) {
      fail('validation.description', 'description')
      return
    }
    const phoneDigits = phone.replace(/\D/g, '')
    const tgHandle = telegram.trim().replace(/^@/, '')
    if (!editId || phoneDigits || tgHandle) {
      if (phoneDigits.length !== 9 || !tgHandle) {
        fail('validation.contact', 'contact-phone')
        return
      }
      if (!/^[a-zA-Z0-9_]{5,32}$/.test(tgHandle)) {
        fail('validation.telegram', 'contact-telegram')
        return
      }
    }
    if (coordError) {
      setError('form.coordsInvalid')
      return
    }
    if (!categoryId) {
      fail('validation.chooseCategory', 'category')
      return
    }
    if (!region) {
      fail('validation.chooseRegion', 'region')
      return
    }
    const positive = (value: string) =>
      value.trim() !== '' &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 1 &&
      Number(Number(value).toFixed(2)) === Number(value)
    if (!positive(price) || !positive(area)) {
      fail('validation.positive', 'price')
      return
    }
    if (
      !rooms.trim() ||
      !bathrooms.trim() ||
      !Number.isInteger(Number(rooms)) ||
      Number(rooms) < 1 ||
      Number(rooms) > 100 ||
      !Number.isInteger(Number(bathrooms)) ||
      Number(bathrooms) < 0 ||
      Number(bathrooms) > 50
    ) {
      fail('validation.rooms', 'rooms')
      return
    }
    if (
      (latitude !== null &&
        (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
      (longitude !== null &&
        (!Number.isFinite(longitude) || Math.abs(longitude) > 180))
    ) {
      setError('validation.coordinates')
      return
    }
    if (
      files.length > MAX_IMAGES ||
      files.some(
        (file) =>
          file.size > 5 * 1024 * 1024 ||
          !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(
            file.type,
          ),
      )
    ) {
      setError('errors.upload')
      return
    }
    setSubmitting(true)
    try {
      const city = REGION_CITY_NAMES[region as keyof typeof REGION_CITY_NAMES]
      const payload = {
        title,
        description,
        price: Number(price),
        currency,
        listingType,
        address: address || district || city,
        city,
        district: district || undefined,
        area: Number(area),
        rooms: Number(rooms),
        bathrooms: Number(bathrooms),
        categoryId: Number(categoryId),
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      }
      if (phoneDigits || tgHandle) {
        await updateCurrentUser({
          phone: `+998${phoneDigits}`,
          telegram: `@${tgHandle}`,
        })
        await auth.refresh()
      }
      const result = editId
        ? await updateProperty(editId, payload)
        : await createProperty(payload)
      if (files.length) await uploadPropertyImages(result.id, files)
      navigate(`/elonlar/${result.id}`)
    } catch (err) {
      setError(getErrorKey(err))
    } finally {
      setSubmitting(false)
    }
  }
  const segment = (value: 'SALE' | 'RENT') =>
    `flex min-h-12 flex-1 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
      listingType === value
        ? 'border-accent bg-accent text-on-accent'
        : 'border-line bg-canvas text-ink hover:border-accent'
    }`
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="font-display text-2xl text-ink sm:text-3xl">
        {t(editId ? 'form.edit' : 'form.create')}
      </h1>
      <p className="mt-1 text-sm text-muted">{t('form.steps')}</p>
      {loading && (
        <p role="status" className="mt-4 text-sm text-muted">
          {t('common.loading')}
        </p>
      )}
      <form
        noValidate
        onSubmit={handleSubmit}
        className="mt-6 space-y-5"
        aria-busy={submitting || loading}
      >
        <Section n={1} title={t('form.sBasic')}>
          <div role="radiogroup" aria-label={t('form.listingType')} className="flex gap-2">
            {(['SALE', 'RENT'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={listingType === value}
                onClick={() => setListingType(value)}
                className={segment(value)}
              >
                {t(value === 'SALE' ? 'listingType.sale' : 'listingType.rent')}
              </button>
            ))}
          </div>
          <Field id="category" label={t('form.category')}>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className={INPUT}
            >
              <option value="">{t('form.selectCategory')}</option>
              {categoriesHook.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryLabel(category, t)}
                </option>
              ))}
            </select>
          </Field>
          {categoriesHook.status === 'error' && (
            <Feedback messageKey="home.categories.errorTitle" />
          )}
          <Field id="title" label={t('form.title')}>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className={INPUT}
            />
          </Field>
          <Field id="description" label={t('form.description')}>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className={`${INPUT} min-h-32`}
            />
            <p
              className={`mt-1.5 text-xs ${
                countWords(description) > MAX_WORDS ||
                (description.trim() && countWords(description) < MIN_WORDS)
                  ? 'text-danger'
                  : 'text-muted'
              }`}
            >
              {t('form.wordCount', {
                count: countWords(description),
                min: MIN_WORDS,
                max: MAX_WORDS,
              })}
            </p>
          </Field>
        </Section>

        <Section n={2} title={t('form.sPrice')}>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field id="price" label={t('form.price')}>
              <input
                id="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min={1}
                className={INPUT}
              />
            </Field>
            <Field id="currency" label={t('form.currency')}>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={INPUT}
              >
                {['USD', 'UZS', 'EUR'].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section n={3} title={t('form.sDetails')}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'rooms', value: rooms, set: setRooms, min: 1, step: '1' },
              { id: 'area', value: area, set: setArea, min: 1, step: '0.01' },
              { id: 'bathrooms', value: bathrooms, set: setBathrooms, min: 0, step: '1' },
            ].map((field) => (
              <Field key={field.id} id={field.id} label={t(`form.${field.id}`)}>
                <input
                  id={field.id}
                  type="number"
                  inputMode="decimal"
                  step={field.step}
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  required
                  min={field.min}
                  className={INPUT}
                />
              </Field>
            ))}
          </div>
        </Section>

        <Section n={4} title={t('form.sLocation')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="region" label={t('form.region')}>
              <select
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                required
                className={INPUT}
              >
                <option value="">{t('form.selectRegion')}</option>
                {Object.keys(REGION_CITY_NAMES).map((key) => (
                  <option key={key} value={key}>
                    {t(`regions.${key}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="district" label={`${t('form.district')} (${t('form.optional')})`}>
              <input
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                maxLength={100}
                className={INPUT}
              />
            </Field>
          </div>
          <Field id="address" label={`${t('form.address')} (${t('form.optional')})`}>
            <input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={200}
              className={INPUT}
            />
          </Field>
          <Field id="coords" label={`${t('form.coords')} (${t('form.optional')})`}>
            <div className="relative">
              <MapPin
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                id="coords"
                value={coordText}
                onChange={(e) => onCoordInput(e.target.value)}
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={coordError}
                aria-describedby="coords-hint"
                className={`${INPUT} pl-10 ${coordError ? 'border-danger' : ''}`}
              />
            </div>
            <p
              id="coords-hint"
              className={`mt-1.5 text-xs ${coordError ? 'text-danger' : 'text-muted'}`}
            >
              {t(coordError ? 'form.coordsInvalid' : 'form.coordsHint')}
            </p>
          </Field>
          <p className="text-sm text-muted">{t('form.mapHint')}</p>
          <YandexMap
            latitude={latitude}
            longitude={longitude}
            selectable
            height={300}
            onSelect={(lat, lng) => setCoords(lat, lng)}
          />
          {latitude !== null && (
            <button
              type="button"
              onClick={() => setCoords(null, null)}
              className="text-sm font-medium text-accent hover:underline"
            >
              {t('form.clearLocation')}
            </button>
          )}
        </Section>

        <Section n={5} title={t('form.sPhotos')}>
          <input
            id="images"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={(e) => {
              setFiles(Array.from(e.target.files ?? []).slice(0, MAX_IMAGES))
              e.target.value = ''
            }}
            className="peer sr-only"
            aria-describedby="image-hint"
          />
          <label
            htmlFor="images"
            className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line bg-canvas px-3 py-4 text-center text-sm text-muted hover:border-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent"
          >
            <ImagePlus size={24} aria-hidden="true" className="text-accent" />
            <span className="font-medium text-ink">{t('form.chooseImages')}</span>
          </label>
          <p id="image-hint" className="text-xs text-muted">
            {t('form.fileHint')}
          </p>
          {files.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="relative aspect-square overflow-hidden rounded-lg border border-line"
                >
                  <img src={previews[index]} alt="" className="size-full object-cover" />
                  {index === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-on-accent">
                      {t('form.mainPhoto')}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={t('form.removeImage')}
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section n={6} title={t('form.sContacts')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="contact-phone" label={t('form.phone')}>
              <div className="relative">
                <Phone
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted">
                  +998
                </span>
                <input
                  id="contact-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))
                  }
                  required
                  className={`${INPUT} pl-[4.5rem]`}
                />
              </div>
            </Field>
            <Field id="contact-telegram" label={t('form.telegram')}>
              <div className="relative">
                <Send
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted">
                  @
                </span>
                <input
                  id="contact-telegram"
                  value={telegram}
                  onChange={(e) =>
                    setTelegram(e.target.value.replace(/^@/, '').slice(0, 32))
                  }
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={32}
                  required
                  className={`${INPUT} pl-14`}
                />
              </div>
            </Field>
          </div>
        </Section>

        <Feedback messageKey={error} />
        <div className="sticky bottom-0 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <button
            type="submit"
            disabled={submitting || loading}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-accent px-4 py-3 text-base font-semibold text-on-accent disabled:opacity-70"
          >
            {t(submitting ? 'common.saving' : 'common.save')}
          </button>
        </div>
      </form>
    </section>
  )
}
