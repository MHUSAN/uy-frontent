import { useQueryClient } from '@tanstack/react-query'
import { Check, Eye, ImageOff, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import {
  adminListProperties,
  adminListUsers,
  adminSetStatus,
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/api/admin'
import { getErrorKey } from '@/api/errors'
import { fetchCategories } from '@/api/categories'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Feedback } from '@/components/Feedback'
import { Pagination } from '@/components/Pagination'
import { StatusPanel } from '@/components/StatusPanel'
import { useToast } from '@/context/ToastContext'
import { CATEGORIES_KEY, clearStoredCategories } from '@/hooks/useCategories'
import type { User } from '@/types/auth'
import type { Category, Property, PropertyStatus } from '@/types/property'
import { formatArea, formatDate, formatPrice } from '@/utils/format'
import { categoryLabel, locationLabel } from '@/utils/localize'
import { House, Users } from 'lucide-react'

type Section = 'properties' | 'users' | 'categories'
const SECTIONS: Section[] = ['properties', 'users', 'categories']
const STATUSES: PropertyStatus[] = ['PENDING', 'APPROVED', 'REJECTED']
const PAGE_SIZE = 12
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const BADGE: Record<PropertyStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-accent-soft text-accent-ink',
  REJECTED: 'bg-red-100 text-red-800',
}
const PILL = 'inline-flex min-h-11 shrink-0 items-center rounded-full border px-5 text-sm font-medium transition-colors'
const PILL_ON = 'border-accent bg-accent text-on-accent'
const PILL_OFF = 'border-line text-ink hover:border-ink/40'
const INPUT =
  'h-12 w-full min-w-0 rounded-2xl border bg-surface px-4 text-sm text-ink focus:border-ink'

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-soft motion-safe:animate-pulse" />
      ))}
    </div>
  )
}

/* ---------------------------- Properties ---------------------------- */

function PropertiesSection() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const statusParam = params.get('status') as PropertyStatus | null
  const status: PropertyStatus = STATUSES.includes(statusParam as PropertyStatus)
    ? (statusParam as PropertyStatus)
    : 'PENDING'
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [items, setItems] = useState<Property[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Property | null>(null)
  const [action, setAction] = useState<{ property: Property; status: 'APPROVED' | 'REJECTED' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    adminListProperties(status, page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return
        setItems(result.items)
        setTotalPages(result.totalPages)
      })
      .catch((err) => !cancelled && setError(getErrorKey(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [status, page, attempt])

  const setQuery = (nextStatus: PropertyStatus, nextPage = 1) =>
    setParams({
      tab: 'properties',
      status: nextStatus,
      ...(nextPage > 1 ? { page: String(nextPage) } : {}),
    })

  const confirm = async () => {
    if (!action) return
    setBusy(true)
    try {
      await adminSetStatus(action.property.id, action.status)
      void queryClient.invalidateQueries({ queryKey: ['properties'] })
      void queryClient.invalidateQueries({ queryKey: ['property'] })
      toast.success('admin.statusChanged')
      setPreview(null)
      setAction(null)
      setAttempt((n) => n + 1)
    } catch (err) {
      toast.error(getErrorKey(err))
      setAction(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div role="group" aria-label={t('adminUi.statusTabs')} className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => setQuery(value)}
            className={`${PILL} ${status === value ? PILL_ON : PILL_OFF}`}
          >
            {t(`status.${value}`)}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <Feedback messageKey={error} />
        {loading ? (
          <Skeleton />
        ) : items.length === 0 && !error ? (
          <StatusPanel icon={House} title={t('adminUi.emptyProperties')} body={t(`status.${status}`)} />
        ) : (
          <ul className="space-y-3">
            {items.map((property) => {
              const image = property.images?.[0]
              const current = property.status ?? status
              return (
                <li
                  key={property.id}
                  className="flex flex-col gap-4 rounded-2xl border border-line p-3 sm:flex-row sm:items-center sm:p-4"
                >
                  <div className="aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl bg-soft sm:aspect-square sm:w-24">
                    {image ? (
                      <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted">
                        <ImageOff size={20} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-sm font-bold text-ink">{property.title}</h3>
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${BADGE[current]}`}>
                        {t(`status.${current}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {formatPrice(property.price, property.currency, i18n.language)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {locationLabel(property.city, t)} · {property.owner?.fullName ?? '—'} ·{' '}
                      {formatDate(property.createdAt, i18n.language)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreview(property)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-medium text-ink hover:border-ink/40"
                    >
                      <Eye size={15} aria-hidden="true" />
                      {t('adminUi.preview')}
                    </button>
                    {current !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => setAction({ property, status: 'APPROVED' })}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-bold text-on-accent hover:brightness-95"
                      >
                        <Check size={15} aria-hidden="true" />
                        {t('admin.approve')}
                      </button>
                    )}
                    {current !== 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() => setAction({ property, status: 'REJECTED' })}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-medium text-danger hover:border-danger"
                      >
                        <X size={15} aria-hidden="true" />
                        {t('admin.reject')}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {!loading && <Pagination page={page} totalPages={totalPages} onChange={(next) => setQuery(status, next)} />}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('adminUi.previewTitle')}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onKeyDown={(e) => e.key === 'Escape' && setPreview(null)}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <h2 className="break-words text-xl font-extrabold text-ink">{preview.title}</h2>
              <button
                type="button"
                autoFocus
                aria-label={t('common.close')}
                onClick={() => setPreview(null)}
                className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-soft"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 aspect-[16/10] overflow-hidden rounded-2xl bg-soft">
              {preview.images?.[0] ? (
                <img src={preview.images[0].url} alt={preview.title} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-muted">
                  {t('adminUi.noImage')}
                </div>
              )}
            </div>
            <p className="mt-4 text-2xl font-extrabold text-ink">
              {formatPrice(preview.price, preview.currency, i18n.language)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {preview.address}, {locationLabel(preview.city, t)}
            </p>
            <p className="mt-3 text-sm text-ink">
              {t('property.rooms', { count: preview.rooms })} ·{' '}
              {t('property.area', { value: formatArea(preview.area, i18n.language) })} ·{' '}
              {t('details.bathrooms', { count: preview.bathrooms })}
              {preview.category && <> · {categoryLabel(preview.category, t)}</>}
            </p>
            <p className="mt-3 text-sm text-muted">
              {t('adminUi.owner')}: {preview.owner?.fullName ?? '—'}
              {preview.owner?.email ? ` (${preview.owner.email})` : ''}
            </p>
            <h3 className="mt-4 text-sm font-bold text-ink">{t('adminUi.descriptionLabel')}</h3>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
              {preview.description}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {(preview.status ?? status) !== 'REJECTED' && (
                <button
                  type="button"
                  onClick={() => setAction({ property: preview, status: 'REJECTED' })}
                  className="min-h-12 rounded-full border border-line px-6 text-sm font-medium text-danger hover:border-danger"
                >
                  {t('admin.reject')}
                </button>
              )}
              {(preview.status ?? status) !== 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => setAction({ property: preview, status: 'APPROVED' })}
                  className="min-h-12 rounded-full bg-accent px-6 text-sm font-bold text-on-accent hover:brightness-95"
                >
                  {t('admin.approve')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {action && (
        <ConfirmDialog
          messageKey={action.status === 'APPROVED' ? 'adminUi.approveConfirm' : 'adminUi.rejectConfirm'}
          values={{ title: action.property.title }}
          confirmKey={action.status === 'APPROVED' ? 'adminUi.confirmApprove' : 'adminUi.confirmReject'}
          danger={action.status === 'REJECTED'}
          busy={busy}
          onConfirm={confirm}
          onCancel={() => setAction(null)}
        />
      )}
    </>
  )
}

/* ------------------------------ Users ------------------------------- */

function UsersSection() {
  const { t, i18n } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminListUsers()
      .then((list) => !cancelled && setUsers(list))
      .catch((err) => !cancelled && setError(getErrorKey(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <Skeleton />
  return (
    <>
      <Feedback messageKey={error} />
      {users.length === 0 && !error ? (
        <StatusPanel icon={Users} title={t('admin.emptyUsers')} body={t('admin.users')} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            {t('admin.usersTotal', { value: users.length })}
          </p>
          <ul className="grid gap-3 lg:grid-cols-2">
            {users.map((user) => (
              <li key={user.id} className="min-w-0 rounded-2xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-sm font-bold text-ink">{user.fullName}</p>
                  <span
                    className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                      user.role === 'ADMIN' ? 'bg-nav text-white' : 'bg-soft text-muted'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <p className="mt-1 break-all text-xs text-muted">
                  {user.email}
                  {user.phone ? ` · ${user.phone}` : ''}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {t('adminUi.listingsCount', { count: user._count?.properties ?? 0 })} ·{' '}
                  {t('adminUi.joined')}: {formatDate(user.createdAt, i18n.language)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

/* --------------------------- Categories ----------------------------- */

function CategoriesSection() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; slug?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchCategories()
      .then(setItems)
      .catch((err) => setError(getErrorKey(err)))
      .finally(() => setLoading(false))
  }, [])
  const refreshCategories = useCallback(() => {
    clearStoredCategories()
    void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
  }, [queryClient])

  useEffect(load, [load])

  const open = (target: Category | 'new') => {
    setEditing(target)
    setName(target === 'new' ? '' : target.name)
    setSlug(target === 'new' ? '' : target.slug)
    setFieldErrors({})
    setFormError(null)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const next: { name?: string; slug?: string } = {}
    if (!name.trim()) next.name = t('adminUi.nameError')
    if (!SLUG_PATTERN.test(slug.trim())) next.slug = t('adminUi.slugError')
    setFieldErrors(next)
    if (next.name || next.slug || !editing) return
    setSaving(true)
    setFormError(null)
    try {
      const payload = { name: name.trim(), slug: slug.trim() }
      if (editing === 'new') await createCategory(payload)
      else await updateCategory(editing.id, payload)
      refreshCategories()
      toast.success('adminUi.categorySaved')
      setEditing(null)
      load()
    } catch (err) {
      const status = (err as { status?: number }).status
      setFormError(status === 409 ? 'errors.categorySlug' : getErrorKey(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (category: Category) => {
    setDeleting(true)
    try {
      await deleteCategory(category.id)
      refreshCategories()
      toast.success('adminUi.categoryDeleted')
      load()
    } catch (err) {
      const status = (err as { status?: number }).status
      toast.error(status === 400 ? 'errors.categoryInUse' : getErrorKey(err))
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => open('new')}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-on-accent hover:brightness-95"
        >
          <Plus size={16} aria-hidden="true" />
          {t('adminUi.addCategory')}
        </button>
      </div>

      {editing && (
        <form
          noValidate
          onSubmit={save}
          className="mb-5 grid gap-4 rounded-2xl bg-soft p-4 sm:grid-cols-2 sm:p-5"
        >
          <h2 className="text-sm font-bold text-ink sm:col-span-2">
            {t(editing === 'new' ? 'adminUi.addCategory' : 'adminUi.editCategory')}
          </h2>
          <div>
            <label htmlFor="cat-name" className="mb-2 block text-sm font-semibold">
              {t('admin.categoryName')}
            </label>
            <input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              className={`${INPUT} ${fieldErrors.name ? 'border-danger' : 'border-line'}`}
            />
            {fieldErrors.name && <p role="alert" className="mt-1.5 text-xs text-danger">{fieldErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="cat-slug" className="mb-2 block text-sm font-semibold">
              {t('admin.categorySlug')}
            </label>
            <input
              id="cat-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              aria-invalid={Boolean(fieldErrors.slug)}
              aria-describedby="cat-slug-hint"
              className={`${INPUT} ${fieldErrors.slug ? 'border-danger' : 'border-line'}`}
            />
            {fieldErrors.slug ? (
              <p role="alert" className="mt-1.5 text-xs text-danger">{fieldErrors.slug}</p>
            ) : (
              <p id="cat-slug-hint" className="mt-1.5 text-xs text-muted">{t('admin.slugHint')}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Feedback messageKey={formError} />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-full bg-nav px-6 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              {t(saving ? 'common.saving' : 'common.save')}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="min-h-12 rounded-full border border-line bg-surface px-6 text-sm font-medium text-ink"
            >
              {t('adminUi.cancelEdit')}
            </button>
          </div>
        </form>
      )}

      <Feedback messageKey={error} />
      {loading ? (
        <Skeleton rows={3} />
      ) : items.length === 0 && !error ? (
        <StatusPanel icon={House} title={t('admin.emptyCategories')} body={t('admin.categories')} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line p-4"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-ink">{category.name}</p>
                <p className="break-all text-xs text-muted">{category.slug}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  aria-label={`${t('common.edit')}: ${category.name}`}
                  onClick={() => open(category)}
                  className="flex size-11 items-center justify-center rounded-full border border-line hover:border-ink/40"
                >
                  <Pencil size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`${t('common.delete')}: ${category.name}`}
                  onClick={() => setToDelete(category)}
                  className="flex size-11 items-center justify-center rounded-full border border-line text-danger hover:border-danger"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {toDelete && (
        <ConfirmDialog
          messageKey="admin.deleteCategoryConfirm"
          values={{ name: toDelete.name }}
          confirmKey="common.delete"
          danger
          busy={deleting}
          onConfirm={() => remove(toDelete)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  )
}

/* ------------------------------- Page ------------------------------- */

export function AdminPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') as Section | null
  const section: Section = tab && SECTIONS.includes(tab) ? tab : 'properties'

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 pb-16 pt-6 sm:px-6">
      <div className="rounded-3xl bg-surface px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {t('admin.title')}
        </h1>
        <nav aria-label={t('adminUi.sections')} className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {SECTIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-current={section === value ? 'page' : undefined}
              onClick={() => setParams({ tab: value })}
              className={`${PILL} ${section === value ? PILL_ON : PILL_OFF}`}
            >
              {t(`admin.${value}`)}
            </button>
          ))}
        </nav>
        <div className="mt-8">
          {section === 'properties' && <PropertiesSection />}
          {section === 'users' && <UsersSection />}
          {section === 'categories' && <CategoriesSection />}
        </div>
      </div>
    </div>
  )
}
