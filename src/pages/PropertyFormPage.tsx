import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useCategories } from '@/hooks/useCategories'
import {
  createProperty,
  fetchProperty,
  updateProperty,
  uploadPropertyImages,
} from '@/api/properties'
import { getErrorKey } from '@/api/errors'
import { useAuth } from '@/hooks/useAuth'
import { REGION_CITY_NAMES } from '@/utils/location'
import { categoryLabel } from '@/utils/localize'
import { YandexMap } from '@/components/YandexMap'
import { Feedback } from '@/components/Feedback'

const INPUT =
  'min-h-11 w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink'
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
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(Boolean(editId))
  const [error, setError] = useState<string | null>(null)
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
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (title.trim().length < 3 || title.length > 200) {
      setError('validation.title')
      return
    }
    if (description.trim().length < 10 || description.length > 5000) {
      setError('validation.description')
      return
    }
    if (!region || !categoryId) {
      setError('validation.required')
      return
    }
    const positive = (value: string) =>
      value.trim() !== '' &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 1 &&
      Number(Number(value).toFixed(2)) === Number(value)
    if (!positive(price) || !positive(area)) {
      setError('validation.positive')
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
      setError('validation.rooms')
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
      files.length > 8 ||
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
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl text-ink">
        {t(editId ? 'form.edit' : 'form.create')}
      </h1>
      {loading && (
        <p role="status" className="mt-4 text-sm text-muted">
          {t('common.loading')}
        </p>
      )}
      <form
        noValidate
        onSubmit={handleSubmit}
        className="mt-6 space-y-4"
        aria-busy={submitting || loading}
      >
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
            maxLength={5000}
            className={`${INPUT} min-h-28`}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field id="price" label={t('form.price')}>
            <input
              id="price"
              type="number"
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
          <Field id="listingType" label={t('form.listingType')}>
            <select
              id="listingType"
              value={listingType}
              onChange={(e) =>
                setListingType(e.target.value as 'SALE' | 'RENT')
              }
              className={INPUT}
            >
              <option value="SALE">{t('listingType.sale')}</option>
              <option value="RENT">{t('listingType.rent')}</option>
            </select>
          </Field>
        </div>
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
          <Field id="district" label={t('form.district')}>
            <input
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              maxLength={100}
              className={INPUT}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { id: 'area', value: area, set: setArea, min: 1, step: '0.01' },
            { id: 'rooms', value: rooms, set: setRooms, min: 1, step: '1' },
            {
              id: 'bathrooms',
              value: bathrooms,
              set: setBathrooms,
              min: 0,
              step: '1',
            },
          ].map((field) => (
            <Field key={field.id} id={field.id} label={t(`form.${field.id}`)}>
              <input
                id={field.id}
                type="number"
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
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { id: 'latitude', value: latitude, set: setLatitude },
            { id: 'longitude', value: longitude, set: setLongitude },
          ].map((field) => (
            <Field key={field.id} id={field.id} label={t(`form.${field.id}`)}>
              <input
                id={field.id}
                type="number"
                step="0.0001"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.set(e.target.value ? Number(e.target.value) : null)
                }
                className={INPUT}
              />
            </Field>
          ))}
        </div>
        <YandexMap
          latitude={latitude}
          longitude={longitude}
          selectable
          onSelect={(lat, lng) => {
            setLatitude(lat)
            setLongitude(lng)
          }}
        />
        <div>
          <p className="mb-2 text-sm font-medium text-muted">
            {t('form.images')}
          </p>
          <input
            id="images"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="peer sr-only"
            aria-describedby="image-hint"
          />
          <label
            htmlFor="images"
            className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-line bg-surface px-3 text-sm peer-focus-visible:outline-2 peer-focus-visible:outline-accent"
          >
            {t('form.chooseImages')}
          </label>
          <p id="image-hint" className="mt-2 text-xs text-muted">
            {t('form.fileHint')}
          </p>
          {files.length ? (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {files.map((file, index) => (
                <li key={index} className="break-all">
                  {file.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted">{t('form.noFiles')}</p>
          )}
        </div>
        <Feedback messageKey={error} />
        <button
          type="submit"
          disabled={submitting || loading}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent disabled:opacity-70"
        >
          {t(submitting ? 'common.saving' : 'common.save')}
        </button>
      </form>
    </section>
  )
}
