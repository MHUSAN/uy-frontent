import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  adminListProperties,
  adminListUsers,
  adminSetStatus,
  createCategory,
  deleteCategory,
} from '@/api/admin'
import { fetchCategories } from '@/api/categories'
import { getErrorKey } from '@/api/errors'
import { Feedback } from '@/components/Feedback'
import { categoryLabel, locationLabel } from '@/utils/localize'
import {
  formatArea,
  formatDate,
  formatNumber,
  formatPrice,
} from '@/utils/format'
import type { Category, Property, PropertyStatus } from '@/types/property'
import type { User } from '@/types/auth'

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
export function AdminPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const requestedTab = params.get('tab')
  const tab =
    requestedTab === 'users' || requestedTab === 'categories'
      ? requestedTab
      : 'properties'
  const requestedStatus = params.get('status')
  const status: PropertyStatus = STATUSES.includes(
    requestedStatus as PropertyStatus,
  )
    ? (requestedStatus as PropertyStatus)
    : 'PENDING'
  const setTab = (value: string) =>
    setParams((current) => {
      current.set('tab', value)
      return current
    })
  const setStatus = (value: PropertyStatus) =>
    setParams((current) => {
      current.set('status', value)
      return current
    })
  const [confirmation, setConfirmation] = useState<
    | { kind: 'status'; id: number; next: PropertyStatus }
    | { kind: 'category'; category: Category }
    | null
  >(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newCat, setNewCat] = useState({ name: '', slug: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [detailsId, setDetailsId] = useState<number | null>(null)
  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      adminListProperties(status, 1, 50).then((data) =>
        setProperties(data.items ?? []),
      ),
      adminListUsers().then((data) => setUsers(data.items ?? [])),
      fetchCategories().then(setCategories),
    ])
      .catch((err) => setError(getErrorKey(err)))
      .finally(() => setLoading(false))
  }, [status])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    if (detailsId === null) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailsId(null)
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [detailsId])
  const changeStatus = async (id: number, next: PropertyStatus) => {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await adminSetStatus(id, next)
      load()
      setSuccess('admin.statusChanged')
    } catch (err) {
      setError(getErrorKey(err))
    } finally {
      setBusy(false)
      setConfirmation(null)
    }
  }
  const addCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (
      !newCat.name.trim() ||
      !newCat.slug ||
      !/^[a-z0-9-]+$/.test(newCat.slug)
    ) {
      setError('validation.category')
      return
    }
    setBusy(true)
    try {
      await createCategory({ name: newCat.name.trim(), slug: newCat.slug })
      setNewCat({ name: '', slug: '' })
      load()
      setSuccess('common.saved')
    } catch (err) {
      setError(getErrorKey(err))
    } finally {
      setBusy(false)
      setConfirmation(null)
    }
  }
  const removeCategory = async (category: Category) => {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await deleteCategory(category.id)
      load()
      setSuccess('common.deleted')
    } catch (err) {
      setError(getErrorKey(err))
    } finally {
      setBusy(false)
      setConfirmation(null)
    }
  }
  const details = detailsId
    ? properties.find((property) => property.id === detailsId)
    : null
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl text-ink">{t('admin.title')}</h1>
      <div
        className="mt-4 flex flex-wrap gap-2"
        role="group"
        aria-label={t('account.admin')}
      >
        {(['properties', 'users', 'categories'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${tab === value ? 'bg-accent text-on-accent' : 'border border-line bg-surface text-ink'}`}
          >
            {t(`admin.${value}`)}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <Feedback messageKey={error} />
        <Feedback messageKey={success} success />
        {loading && (
          <p role="status" className="text-sm text-muted">
            {t('common.loading')}
          </p>
        )}
      </div>
      {tab === 'properties' && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUSES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
                className={`rounded-md px-3 py-2 text-sm ${status === value ? 'bg-accent text-on-accent' : 'border border-line bg-surface text-ink'}`}
              >
                {t(`status.${value}`)} (
                {status === value
                  ? formatNumber(properties.length, i18n.language)
                  : '…'}
                )
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            {properties.map((property) => (
              <article
                key={property.id}
                className="min-w-0 rounded-lg border border-line bg-surface p-4"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-ink">
                      {property.title}
                    </p>
                    <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                      {t(`status.${property.status ?? 'PENDING'}`)} ·{' '}
                      {locationLabel(property.city, t)} ·{' '}
                      {t(
                        property.listingType === 'SALE'
                          ? 'listingType.sale'
                          : 'listingType.rent',
                      )}{' '}
                      ·{' '}
                      {formatPrice(
                        property.price,
                        property.currency,
                        i18n.language,
                      )}{' '}
                      · {t('property.rooms', { count: property.rooms })}
                    </p>
                    <p className="mt-1 break-words text-xs text-muted">
                      {t('details.seller')}: {property.owner?.fullName}{' '}
                      {property.owner?.phone}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2 md:max-w-xs md:justify-end">
                    <button
                      onClick={() => setDetailsId(property.id)}
                      className="rounded border border-line px-3 py-2 text-xs"
                    >
                      {t('admin.details')}
                    </button>
                    {(
                      [
                        { value: 'APPROVED', key: 'admin.approve' },
                        { value: 'REJECTED', key: 'admin.reject' },
                        { value: 'PENDING', key: 'admin.review' },
                      ] as const
                    ).map(
                      (action) =>
                        property.status !== action.value && (
                          <button
                            key={action.value}
                            disabled={busy}
                            onClick={() =>
                              setConfirmation({
                                kind: 'status',
                                id: property.id,
                                next: action.value,
                              })
                            }
                            className={`rounded px-3 py-2 text-xs disabled:opacity-60 ${action.value === 'APPROVED' ? 'bg-accent font-semibold text-on-accent' : 'border border-line'}`}
                          >
                            {t(action.key)}
                          </button>
                        ),
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(property.images ?? []).map((image) => (
                    <img
                      key={image.id}
                      src={image.url}
                      alt={image.altText ?? property.title}
                      className="h-16 w-20 rounded object-cover"
                    />
                  ))}
                </div>
              </article>
            ))}
            {!loading && !error && properties.length === 0 && (
              <p className="text-sm text-muted">
                {t('home.listings.emptyTitle')}
              </p>
            )}
          </div>
        </>
      )}
      {tab === 'users' && (
        <div className="mt-4 grid gap-2">
          {users.map((user) => (
            <article
              key={user.id}
              className="min-w-0 rounded-lg border border-line bg-surface p-3"
            >
              <p className="break-words text-sm font-semibold text-ink">
                {user.fullName}
              </p>
              <p className="break-all text-xs text-muted">
                {user.email} · {t(`roles.${user.role}`)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t('common.date')}: {formatDate(user.createdAt, i18n.language)}
              </p>
            </article>
          ))}
          {!loading && !error && users.length === 0 && (
            <p className="text-sm text-muted">{t('admin.emptyUsers')}</p>
          )}
        </div>
      )}
      {tab === 'categories' && (
        <div className="mt-4 grid gap-4">
          <form
            noValidate
            onSubmit={addCategory}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
          >
            <div className="min-w-0">
              <label
                htmlFor="category-name"
                className="mb-1 block text-sm text-muted"
              >
                {t('admin.categoryName')}
              </label>
              <input
                id="category-name"
                value={newCat.name}
                onChange={(event) =>
                  setNewCat((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                className="h-11 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label
                htmlFor="category-slug"
                className="mb-1 block text-sm text-muted"
              >
                {t('admin.categorySlug')}
              </label>
              <input
                id="category-slug"
                value={newCat.slug}
                onChange={(event) =>
                  setNewCat((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                required
                aria-describedby="slug-hint"
                className="h-11 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded bg-accent px-3 py-2 text-sm font-semibold text-on-accent disabled:opacity-60"
            >
              {t(busy ? 'common.saving' : 'common.add')}
            </button>
            <p id="slug-hint" className="text-xs text-muted sm:col-span-3">
              {t('admin.slugHint')}
            </p>
          </form>
          <div className="grid gap-2">
            {categories.map((category) => (
              <article
                key={category.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3"
              >
                <p className="min-w-0 break-words text-sm">
                  {categoryLabel(category, t)} ({category.slug})
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setConfirmation({ kind: 'category', category })
                  }
                  className="min-h-11 px-2 text-sm text-danger disabled:opacity-60"
                >
                  {t('common.delete')}
                </button>
              </article>
            ))}
            {!loading && !error && categories.length === 0 && (
              <p className="text-sm text-muted">{t('admin.emptyCategories')}</p>
            )}
          </div>
        </div>
      )}
      {details && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="moderation-title"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
        >
          <div className="max-h-[80vh] w-full min-w-0 max-w-2xl overflow-auto rounded-lg bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <h2
                id="moderation-title"
                className="min-w-0 break-words font-display text-xl text-ink"
              >
                {details.title}
              </h2>
              <button
                autoFocus
                onClick={() => setDetailsId(null)}
                className="shrink-0 px-2 py-1 text-sm text-muted hover:text-ink"
              >
                {t('common.close')}
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink">
              {details.description}
            </p>
            <p className="mt-2 break-words text-xs text-muted">
              {details.address}, {locationLabel(details.city, t)} ·{' '}
              {t('property.area', {
                value: formatArea(details.area, i18n.language),
              })}{' '}
              · {t('property.rooms', { count: details.rooms })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(details.images ?? []).map((image) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt={image.altText ?? details.title}
                  className="h-24 w-32 rounded object-cover"
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {confirmation && (
        <ConfirmDialog
          messageKey={
            confirmation.kind === 'status'
              ? 'admin.statusConfirm'
              : 'admin.deleteCategoryConfirm'
          }
          values={
            confirmation.kind === 'status'
              ? {
                  id: formatNumber(confirmation.id, i18n.language),
                  status: t(`status.${confirmation.next}`),
                }
              : { name: categoryLabel(confirmation.category, t) }
          }
          confirmKey={
            confirmation.kind === 'category'
              ? 'common.delete'
              : confirmation.next === 'APPROVED'
                ? 'admin.approve'
                : confirmation.next === 'REJECTED'
                  ? 'admin.reject'
                  : 'admin.review'
          }
          busy={busy}
          onConfirm={() =>
            confirmation.kind === 'status'
              ? changeStatus(confirmation.id, confirmation.next)
              : removeCategory(confirmation.category)
          }
          onCancel={() => setConfirmation(null)}
        />
      )}
    </section>
  )
}
