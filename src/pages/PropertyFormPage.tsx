import { useQueryClient } from '@tanstack/react-query'
import { Check, ImagePlus, Info, Loader2, RotateCcw, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { getErrorKey } from '@/api/errors'
import {
  createProperty,
  deletePropertyImage,
  fetchMyProperties,
  updateProperty,
  uploadPropertyImage,
} from '@/api/properties'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Feedback } from '@/components/Feedback'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { useCategories } from '@/hooks/useCategories'
import type { ListingType, Property, PropertyImage } from '@/types/property'
import { categoryLabel } from '@/utils/localize'
import { REGION_CITY_NAMES } from '@/utils/location'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const INPUT =
  'h-12 w-full min-w-0 rounded-2xl border bg-surface px-4 text-base text-ink placeholder:text-muted hover:border-ink/30 focus:border-ink'

interface FormValues {
  title: string
  description: string
  listingType: ListingType
  categoryId: string
  price: string
  currency: 'USD' | 'UZS'
  city: string
  address: string
  area: string
  rooms: string
  bathrooms: string
}

const EMPTY: FormValues = {
  title: '',
  description: '',
  listingType: 'SALE',
  categoryId: '',
  price: '',
  currency: 'USD',
  city: '',
  address: '',
  area: '',
  rooms: '',
  bathrooms: '',
}

type UploadState = 'queued' | 'uploading' | 'done' | 'failed'
interface Pending {
  key: string
  file: File
  preview: string
  state: UploadState
}

const toNumber = (value: string) => Number(value.replace(',', '.'))
const isInt = (value: string) => /^\d+$/.test(value.trim())

function validateStep(step: number, v: FormValues): Record<string, string> {
  const e: Record<string, string> = {}
  if (step === 1) {
    const title = v.title.trim()
    if (title.length < 5 || title.length > 150) e.title = 'wizard.titleError'
    if (v.description.trim().length < 20) e.description = 'wizard.descriptionError'
    if (!v.categoryId) e.categoryId = 'wizard.categoryError'
  }
  if (step === 2) {
    if (!(toNumber(v.price) > 0)) e.price = 'wizard.priceError'
    if (!v.city.trim()) e.city = 'wizard.requiredError'
    if (!v.address.trim()) e.address = 'wizard.requiredError'
    if (!(toNumber(v.area) > 0)) e.area = 'wizard.areaError'
    if (!isInt(v.rooms) || Number(v.rooms) < 1) e.rooms = 'wizard.roomsError'
    if (!isInt(v.bathrooms)) e.bathrooms = 'wizard.bathroomsError'
  }
  return e
}

function toPayload(v: FormValues) {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    price: toNumber(v.price),
    currency: v.currency,
    listingType: v.listingType,
    categoryId: Number(v.categoryId),
    address: v.address.trim(),
    city: v.city.trim(),
    area: toNumber(v.area),
    rooms: Number(v.rooms),
    bathrooms: Number(v.bathrooms),
  }
}

function fromProperty(p: Property): FormValues {
  return {
    title: p.title,
    description: p.description,
    listingType: p.listingType,
    categoryId: String(p.category?.id ?? ''),
    price: String(p.price),
    currency: p.currency === 'UZS' ? 'UZS' : 'USD',
    city: p.city,
    address: p.address,
    area: String(p.area),
    rooms: String(p.rooms),
    bathrooms: String(p.bathrooms),
  }
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-danger">
          {t(error)}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function PropertyFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { id } = useParams()
  const editId = id ? Number(id) : null
  const editing = editId !== null
  const categories = useCategories()
  const { user } = useAuth()

  const [step, setStep] = useState(1)
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [original, setOriginal] = useState<FormValues | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(editing)
  const [existing, setExisting] = useState<PropertyImage[]>([])
  const [pending, setPending] = useState<Pending[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [imageToDelete, setImageToDelete] = useState<PropertyImage | null>(null)
  const [deletingImage, setDeletingImage] = useState(false)
  const pendingRef = useRef<Pending[]>([])
  pendingRef.current = pending

  useEffect(() => {
    if (!editing) return
    if (!Number.isInteger(editId) || (editId as number) < 1) {
      setLoadError('errors.notFound')
      setLoading(false)
      return
    }
    let cancelled = false
    // GET /properties/:id hides PENDING/REJECTED items, so the owner's list is the source.
    fetchMyProperties()
      .then((page) => {
        if (cancelled) return
        const found = page.items.find((item) => item.id === editId)
        if (!found) {
          setLoadError('errors.notFound')
          return
        }
        const initial = fromProperty(found)
        setValues(initial)
        setOriginal(initial)
        setExisting([...(found.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))
      })
      .catch((err) => !cancelled && setLoadError(getErrorKey(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [editing, editId])

  useEffect(
    () => () => pendingRef.current.forEach((item) => URL.revokeObjectURL(item.preview)),
    [],
  )

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const problems: string[] = []
    const accepted: Pending[] = []
    Array.from(list).forEach((file) => {
      if (!ALLOWED.includes(file.type)) {
        problems.push(t('wizard.typeError', { name: file.name }))
      } else if (file.size > MAX_BYTES) {
        problems.push(t('wizard.sizeError', { name: file.name }))
      } else {
        accepted.push({
          key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          preview: URL.createObjectURL(file),
          state: 'queued',
        })
      }
    })
    setFileErrors(problems)
    if (accepted.length) setPending((current) => [...current, ...accepted])
  }

  const removePending = (key: string) => {
    setPending((current) => {
      const target = current.find((item) => item.key === key)
      if (target) URL.revokeObjectURL(target.preview)
      return current.filter((item) => item.key !== key)
    })
  }

  const refreshListings = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['my-properties'] })
    void queryClient.invalidateQueries({ queryKey: ['properties'] })
    void queryClient.invalidateQueries({ queryKey: ['property'] })
  }, [queryClient])

  const goNext = () => {
    const found = validateStep(step, values)
    setErrors(found)
    if (Object.keys(found).length === 0) setStep((current) => current + 1)
  }

  /** Uploads queued/failed files one by one: one request per image, field `image`. */
  const uploadAll = useCallback(async (propertyId: number): Promise<boolean> => {
    let ok = true
    const mark = (key: string, state: UploadState) =>
      setPending((current) =>
        current.map((item) => (item.key === key ? { ...item, state } : item)),
      )
    for (const item of pendingRef.current) {
      if (item.state === 'done') continue
      mark(item.key, 'uploading')
      try {
        await uploadPropertyImage(propertyId, item.file)
        mark(item.key, 'done')
      } catch {
        ok = false
        mark(item.key, 'failed')
      }
    }
    return ok
  }, [])

  const submit = async () => {
    for (const s of [1, 2]) {
      const found = validateStep(s, values)
      if (Object.keys(found).length) {
        setErrors(found)
        setStep(s)
        return
      }
    }
    setSubmitting(true)
    setFormError(null)
    try {
      let propertyId = createdId ?? editId
      if (propertyId === null) {
        const created = await createProperty(toPayload(values))
        propertyId = created.id
        setCreatedId(created.id)
      } else if (editing && original) {
        const next = toPayload(values)
        const base = toPayload(original)
        const changed = Object.fromEntries(
          Object.entries(next).filter(
            ([key, value]) => value !== base[key as keyof typeof base],
          ),
        )
        if (Object.keys(changed).length) await updateProperty(propertyId, changed)
        else if (pending.length === 0) {
          toast.success('wizard.noChanges')
          navigate('/dashboard')
          return
        }
      }
      const allUploaded = await uploadAll(propertyId)
      refreshListings()
      if (!allUploaded) {
        setFormError('wizard.partial')
        return
      }
      refreshListings()
      toast.success(editing ? 'wizard.updated' : 'wizard.created')
      navigate('/dashboard')
    } catch (error) {
      setFormError(getErrorKey(error))
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDeleteImage = async (image: PropertyImage) => {
    if (editId === null) return
    setDeletingImage(true)
    try {
      await deletePropertyImage(editId, image.id)
      setExisting((current) => current.filter((item) => item.id !== image.id))
      refreshListings()
      toast.success('wizard.imageDeleted')
    } catch (error) {
      toast.error(getErrorKey(error))
    } finally {
      setDeletingImage(false)
      setImageToDelete(null)
    }
  }

  const steps = [t('wizard.step1'), t('wizard.step2'), t('wizard.step3')]
  const categoryName = useMemo(() => {
    const found = categories.categories.find((c) => String(c.id) === values.categoryId)
    return found ? categoryLabel(found, t) : ''
  }, [categories.categories, values.categoryId, t])

  const aria = (key: string, hintKey?: string) => ({
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': errors[key] ? `${key}-error` : hintKey ? `${key}-hint` : undefined,
  })
  const border = (key: string) => (errors[key] ? 'border-danger' : 'border-line')

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-3 pb-16 pt-6 sm:px-6">
        <div className="h-96 rounded-3xl bg-soft motion-safe:animate-pulse" aria-busy="true" />
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-3 pb-16 pt-6 sm:px-6">
        <div className="rounded-3xl bg-surface p-8">
          <Feedback messageKey={loadError} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 pb-16 pt-6 sm:px-6">
      <div className="rounded-3xl bg-surface px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {t(editing ? 'form.edit' : 'form.create')}
          </h1>
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-soft p-4 text-sm text-muted">
            <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            {t(editing ? 'wizard.editNotice' : 'wizard.pendingNotice')}
          </p>

          <nav aria-label={t('wizard.steps')} className="mt-6">
            <ol className="grid grid-cols-3 gap-2">
              {steps.map((label, index) => {
                const number = index + 1
                const done = number < step
                const current = number === step
                return (
                  <li key={label} aria-current={current ? 'step' : undefined}>
                    <div
                      className={`h-1.5 rounded-full ${done || current ? 'bg-accent' : 'bg-line'}`}
                    />
                    <p
                      className={`mt-2 flex items-center gap-1.5 text-xs font-semibold sm:text-sm ${
                        current ? 'text-ink' : 'text-muted'
                      }`}
                    >
                      {done && <Check size={14} aria-hidden="true" />}
                      <span className="line-clamp-2">{label}</span>
                    </p>
                  </li>
                )
              })}
            </ol>
          </nav>
          <p className="sr-only" aria-live="polite">
            {t('wizard.stepOf', { current: step, total: 3 })}
          </p>

          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              if (step < 3) goNext()
              else void submit()
            }}
            className="mt-8 space-y-5"
          >
            {step === 1 && (
              <>
                <Field id="title" label={t('form.title')} error={errors.title}>
                  <input
                    id="title"
                    value={values.title}
                    maxLength={150}
                    onChange={(e) => set('title', e.target.value)}
                    className={`${INPUT} ${border('title')}`}
                    {...aria('title')}
                  />
                </Field>
                <Field
                  id="description"
                  label={t('form.description')}
                  error={errors.description}
                  hint={t('wizard.descriptionHint')}
                >
                  <textarea
                    id="description"
                    value={values.description}
                    onChange={(e) => set('description', e.target.value)}
                    className={`min-h-36 w-full rounded-2xl border bg-surface px-4 py-3 text-base text-ink focus:border-ink ${border('description')}`}
                    {...aria('description', 'description')}
                  />
                </Field>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-ink">
                    {t('form.listingType')}
                  </legend>
                  <div className="flex gap-2">
                    {(['SALE', 'RENT'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={values.listingType === value}
                        onClick={() => set('listingType', value)}
                        className={`inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition-colors sm:flex-none sm:px-8 ${
                          values.listingType === value
                            ? 'border-accent bg-accent text-on-accent'
                            : 'border-line text-ink hover:border-ink/40'
                        }`}
                      >
                        {t(value === 'SALE' ? 'listingType.sale' : 'listingType.rent')}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {categories.status === 'empty' && (
                  <div role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                    <p>{t('wizard.noCategories')}</p>
                    {user?.role === 'ADMIN' && (
                      <Link
                        to="/admin?tab=categories"
                        className="mt-2 inline-flex min-h-11 items-center font-semibold underline"
                      >
                        {t('wizard.noCategoriesAdmin')}
                      </Link>
                    )}
                  </div>
                )}
                <Field id="categoryId" label={t('form.category')} error={errors.categoryId}>
                  <select
                    id="categoryId"
                    value={values.categoryId}
                    onChange={(e) => set('categoryId', e.target.value)}
                    className={`${INPUT} ${border('categoryId')}`}
                    {...aria('categoryId')}
                  >
                    <option value="">{t('form.selectCategory')}</option>
                    {categories.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {categoryLabel(category, t)}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <Field id="price" label={t('form.price')} error={errors.price}>
                    <input
                      id="price"
                      inputMode="decimal"
                      value={values.price}
                      onChange={(e) => set('price', e.target.value.replace(/[^\d.,]/g, ''))}
                      className={`${INPUT} ${border('price')}`}
                      {...aria('price')}
                    />
                  </Field>
                  <Field id="currency" label={t('form.currency')}>
                    <select
                      id="currency"
                      value={values.currency}
                      onChange={(e) => set('currency', e.target.value as 'USD' | 'UZS')}
                      className={`${INPUT} border-line`}
                    >
                      <option value="USD">{t('wizard.currencyUSD')}</option>
                      <option value="UZS">{t('wizard.currencyUZS')}</option>
                    </select>
                  </Field>
                </div>
                <Field id="city" label={t('wizard.city')} error={errors.city} hint={t('wizard.cityHint')}>
                  <input
                    id="city"
                    list="city-options"
                    value={values.city}
                    onChange={(e) => set('city', e.target.value)}
                    autoComplete="off"
                    className={`${INPUT} ${border('city')}`}
                    {...aria('city', 'city')}
                  />
                  <datalist id="city-options">
                    {Object.values(REGION_CITY_NAMES).map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </Field>
                <Field id="address" label={t('form.address')} error={errors.address}>
                  <input
                    id="address"
                    value={values.address}
                    onChange={(e) => set('address', e.target.value)}
                    autoComplete="street-address"
                    className={`${INPUT} ${border('address')}`}
                    {...aria('address')}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field id="area" label={t('form.area')} error={errors.area}>
                    <input
                      id="area"
                      inputMode="decimal"
                      value={values.area}
                      onChange={(e) => set('area', e.target.value.replace(/[^\d.,]/g, ''))}
                      className={`${INPUT} ${border('area')}`}
                      {...aria('area')}
                    />
                  </Field>
                  <Field id="rooms" label={t('form.rooms')} error={errors.rooms}>
                    <input
                      id="rooms"
                      inputMode="numeric"
                      value={values.rooms}
                      onChange={(e) => set('rooms', e.target.value.replace(/\D/g, ''))}
                      className={`${INPUT} ${border('rooms')}`}
                      {...aria('rooms')}
                    />
                  </Field>
                  <Field id="bathrooms" label={t('form.bathrooms')} error={errors.bathrooms}>
                    <input
                      id="bathrooms"
                      inputMode="numeric"
                      value={values.bathrooms}
                      onChange={(e) => set('bathrooms', e.target.value.replace(/\D/g, ''))}
                      className={`${INPUT} ${border('bathrooms')}`}
                      {...aria('bathrooms')}
                    />
                  </Field>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                {editing && existing.length > 0 && (
                  <section aria-label={t('wizard.existingPhotos')}>
                    <h2 className="mb-3 text-sm font-semibold text-ink">
                      {t('wizard.existingPhotos')}
                    </h2>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {existing.map((image) => (
                        <li key={image.id} className="relative aspect-square overflow-hidden rounded-2xl bg-soft">
                          <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
                          <button
                            type="button"
                            aria-label={t('wizard.deleteImage')}
                            onClick={() => setImageToDelete(image)}
                            className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full bg-white/95 text-danger shadow"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section aria-label={t('wizard.photos')}>
                  <h2 className="text-sm font-semibold text-ink">{t('wizard.photos')}</h2>
                  <p className="mt-1 text-xs text-muted">{t('wizard.photosHint')}</p>
                  <label
                    htmlFor="images"
                    className="mt-3 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 text-center text-sm font-semibold text-ink hover:border-ink/40 focus-within:border-ink"
                  >
                    <ImagePlus size={26} aria-hidden="true" />
                    {t('wizard.choose')}
                    <input
                      id="images"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        addFiles(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {fileErrors.length > 0 && (
                    <ul role="alert" className="mt-2 space-y-1 text-xs text-danger">
                      {fileErrors.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  )}
                  {pending.length > 0 && (
                    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {pending.map((item) => (
                        <li key={item.key} className="relative aspect-square overflow-hidden rounded-2xl bg-soft">
                          <img src={item.preview} alt={item.file.name} className="size-full object-cover" />
                          <span
                            className={`absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                              item.state === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : item.state === 'done'
                                  ? 'bg-accent text-on-accent'
                                  : 'bg-white/95 text-ink'
                            }`}
                          >
                            {item.state === 'uploading' && (
                              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                            )}
                            {item.state === 'done' && <Check size={12} aria-hidden="true" />}
                            {t(
                              {
                                queued: 'wizard.waiting',
                                uploading: 'wizard.uploading',
                                done: 'wizard.uploaded',
                                failed: 'wizard.failed',
                              }[item.state],
                            )}
                          </span>
                          {!submitting && item.state !== 'done' && (
                            <button
                              type="button"
                              aria-label={`${t('wizard.remove')}: ${item.file.name}`}
                              onClick={() => removePending(item.key)}
                              className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full bg-white/95 shadow"
                            >
                              <X size={16} aria-hidden="true" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-label={t('wizard.review')} className="rounded-2xl bg-soft p-4 sm:p-5">
                  <h2 className="text-sm font-bold text-ink">{t('wizard.review')}</h2>
                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    {[
                      [t('form.title'), values.title],
                      [t('form.listingType'), t(values.listingType === 'SALE' ? 'listingType.sale' : 'listingType.rent')],
                      [t('form.category'), categoryName],
                      [t('form.price'), `${values.price} ${values.currency}`],
                      [t('wizard.city'), values.city],
                      [t('form.address'), values.address],
                      [t('form.area'), values.area],
                      [t('form.rooms'), values.rooms],
                      [t('form.bathrooms'), values.bathrooms],
                      [t('wizard.photos'), t('wizard.reviewPhotos', { count: existing.length + pending.length })],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-xs text-muted">{label}</dt>
                        <dd className="break-words font-medium text-ink">{value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </>
            )}

            <Feedback messageKey={formError} />

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep((current) => current - 1)}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-line px-8 text-sm font-semibold text-ink hover:border-ink/40 disabled:opacity-60"
                >
                  {t('wizard.back')}
                </button>
              ) : (
                <span />
              )}
              {step < 3 ? (
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-nav px-8 text-sm font-semibold text-white hover:bg-black"
                >
                  {t('wizard.next')}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-8 text-sm font-bold text-on-accent hover:brightness-95 disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  ) : formError && pending.some((item) => item.state === 'failed') ? (
                    <RotateCcw size={16} aria-hidden="true" />
                  ) : null}
                  {formError && pending.some((item) => item.state === 'failed')
                    ? t('wizard.retryFailed')
                    : t(editing ? 'wizard.submitEdit' : 'wizard.submitCreate')}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {imageToDelete && (
        <ConfirmDialog
          messageKey="wizard.deleteImageConfirm"
          values={{}}
          confirmKey="common.delete"
          busy={deletingImage}
          onConfirm={() => confirmDeleteImage(imageToDelete)}
          onCancel={() => setImageToDelete(null)}
        />
      )}
    </div>
  )
}
