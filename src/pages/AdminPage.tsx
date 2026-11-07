import { UserAvatar } from '@/components/AccountMenu'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Check, Clock, Eye, Home, MessageSquare, Pencil, Phone, Send, Trash2, Users, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import {
  adminDeleteUser,
  adminListProperties,
  adminListUsers,
  adminSetStatus,
  adminStats,
  type AdminStats,
  createCategory,
  deleteCategory,
} from '@/api/admin'
import { deleteProperty } from '@/api/properties'
import { fetchCategories } from '@/api/categories'
import { useAuth } from '@/hooks/useAuth'
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
  const auth = useAuth()
  const [params, setParams] = useSearchParams()
  const requestedTab = params.get('tab')
  const tab =
    requestedTab === 'users' || requestedTab === 'categories'
      ? requestedTab
      : 'properties'
  const requestedStatus = params.get('status')
  const page = Math.max(1, Number(params.get('page')) || 1)
  const ownerId = Number(params.get('ownerId')) || undefined
  const userQuery = params.get('q') ?? ''
  const requestedRole = params.get('role')
  const userRole: 'USER' | 'ADMIN' | undefined =
    requestedRole === 'USER' || requestedRole === 'ADMIN'
      ? requestedRole
      : undefined
  const status: PropertyStatus | undefined = STATUSES.includes(
    requestedStatus as PropertyStatus,
  )
    ? (requestedStatus as PropertyStatus)
    : undefined
  const setTab = (value: string) =>
    setParams((current) => {
      current.set('tab', value)
      current.delete('page')
      return current
    })
  const setStatus = (value: PropertyStatus | undefined) =>
    setParams((current) => {
      if (value) current.set('status', value)
      else current.delete('status')
      current.delete('page')
      return current
    })
  const [confirmation, setConfirmation] = useState<
    | { kind: 'status'; id: number; next: PropertyStatus }
    | { kind: 'category'; category: Category }
    | { kind: 'user'; user: User }
    | { kind: 'property'; property: Property }
    | null
  >(null)
  const requestId = useRef(0)
  const userDetailsRef = useRef<number | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newCat, setNewCat] = useState({ name: '', slug: '' })
  const [loading, setLoading] = useState(true)
  const [draftQuery, setDraftQuery] = useState(userQuery)
  const [userDetails, setUserDetails] = useState<User | null>(null)
  const [userListings, setUserListings] = useState<Property[]>([])
  const [userListingsState, setUserListingsState] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [userListingsError, setUserListingsError] = useState<string | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const refreshStats = useCallback(() => {
    adminStats().then(setStats).catch(() => undefined)
  }, [])
  useEffect(() => {
    refreshStats()
  }, [refreshStats, properties, users])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [detailsId, setDetailsId] = useState<number | null>(null)
  const load = useCallback(() => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    const request = tab === 'properties'
      ? adminListProperties(status, page, 20, ownerId).then((data) => {
          if (id !== requestId.current) return
          setProperties(data.items); setTotalPages(data.totalPages); setTotal(data.total)
        })
      : tab === 'users'
        ? adminListUsers(page, userQuery || undefined, userRole).then((data) => {
            if (id !== requestId.current) return
            setUsers(data.items); setTotalPages(data.totalPages); setTotal(data.total)
          })
        : fetchCategories().then((data) => { if (id === requestId.current) setCategories(data) })
    let active = true
    // Ignore completions from an older tab/filter request.
    request.catch((err) => { if (active && id === requestId.current) setError(getErrorKey(err)) })
      .finally(() => { if (active && id === requestId.current) setLoading(false) })
    return () => { active = false; if (id === requestId.current) requestId.current += 1 }
  }, [status, page, ownerId, tab, userQuery, userRole])
  useEffect(() => {
    return load()
  }, [load])
  useEffect(() => {
    if (detailsId === null && !userDetails) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetailsId(null)
        setUserDetails(null)
        userDetailsRef.current = null
      }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [detailsId, userDetails])
  const applyUserFilters = (next: { q?: string; role?: 'USER' | 'ADMIN' }) =>
    setParams((current) => {
      const updated = new URLSearchParams(current)
      if ('q' in next) {
        const value = next.q?.trim()
        if (value) updated.set('q', value)
        else updated.delete('q')
      }
      if ('role' in next) {
        if (next.role) updated.set('role', next.role)
        else updated.delete('role')
      }
      updated.delete('page')
      return updated
    })
  const submitUserSearch = (event: React.FormEvent) => {
    event.preventDefault()
    applyUserFilters({ q: draftQuery })
  }
  const openUser = async (user: User) => {
    userDetailsRef.current = user.id
    setUserDetails(user)
    setUserListings([])
    setUserListingsError(null)
    setUserListingsState('loading')
    try {
      const data = await adminListProperties(undefined, 1, 50, user.id)
      if (userDetailsRef.current !== user.id) return
      setUserListings(data.items)
      setUserListingsState('ready')
    } catch (err) {
      if (userDetailsRef.current !== user.id) return
      setUserListingsError(getErrorKey(err))
      setUserListingsState('error')
    }
  }
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
  const removeAccountOrProperty = async () => {
    if (!confirmation || !['user', 'property'].includes(confirmation.kind)) return
    setBusy(true); setError(null); setSuccess(null)
    try {
      if (confirmation.kind === 'user') await adminDeleteUser(confirmation.user.id)
      else if (confirmation.kind === 'property') await deleteProperty(confirmation.property.id)
      setSuccess('common.deleted')
      if (page > 1 && (tab === 'users' ? users.length : properties.length) === 1) {
        setParams((current) => { current.set('page', String(page - 1)); return current })
      } else load()
    } catch (err) { setError(getErrorKey(err)) }
    finally { setBusy(false); setConfirmation(null) }
  }
  const viewUserListings = (id: number) => {
    setParams({ tab: 'properties', ownerId: String(id) })
  }
  const details = detailsId
    ? properties.find((property) => property.id === detailsId)
    : null
  return (
    <section className="mx-auto w-full max-w-[88rem] px-4 py-8">
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
      {stats && (
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { key: 'properties', value: stats.properties, icon: Home, onClick: () => { setTab('properties'); setStatus(undefined) } },
            { key: 'pending', value: stats.pending, icon: Clock, tone: 'text-amber-600', onClick: () => { setTab('properties'); setStatus('PENDING') } },
            { key: 'approved', value: stats.approved, icon: Check, tone: 'text-accent', onClick: () => { setTab('properties'); setStatus('APPROVED') } },
            { key: 'rejected', value: stats.rejected, icon: X, tone: 'text-danger', onClick: () => { setTab('properties'); setStatus('REJECTED') } },
            { key: 'users', value: stats.users, icon: Users, onClick: () => setTab('users') },
            { key: 'inquiries', value: stats.inquiries, icon: MessageSquare },
          ].map(({ key, value, icon: Icon, tone, onClick }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              disabled={!onClick}
              className="rounded-xl border border-line bg-surface p-4 text-left transition-colors enabled:hover:border-accent"
            >
              <dt className="flex items-center gap-2 text-xs text-muted">
                <Icon size={15} aria-hidden="true" className={tone ?? 'text-muted'} />
                {t(`admin.stats.${key}`)}
              </dt>
              <dd className="mt-2 font-display text-3xl text-ink">
                {formatNumber(value, i18n.language)}
              </dd>
            </button>
          ))}
        </dl>
      )}
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
            <button type="button" aria-pressed={!status} onClick={() => setStatus(undefined)}
              className={`rounded-md px-3 py-2 text-sm ${!status ? 'bg-accent text-on-accent' : 'border border-line bg-surface text-ink'}`}>
              {t('admin.allListings')}
            </button>
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
                  ? formatNumber(total, i18n.language)
                  : '…'}
                )
              </button>
            ))}
          </div>
          {ownerId && <div className="mt-3 flex items-center gap-3 text-sm">
            <span>{t('admin.ownerFilter', { id: ownerId })}</span>
            <button type="button" className="underline" onClick={() => setParams((current) => { current.delete('ownerId'); current.delete('page'); return current })}>{t('common.clear')}</button>
          </div>}
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {properties.map((property) => {
              const image = [...(property.images ?? [])].sort((x, y) => x.sortOrder - y.sortOrder)[0]
              const badge =
                property.status === 'APPROVED'
                  ? 'bg-accent-soft text-accent'
                  : property.status === 'REJECTED'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
              return (
                <article
                  key={property.id}
                  className="flex min-w-0 gap-3 rounded-xl border border-line bg-surface p-3"
                >
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-canvas sm:size-28">
                    {image && (
                      <>
                        <img src={image.url} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-lg" />
                        <img src={image.url} alt={image.altText ?? property.title} className="relative size-full object-contain" />
                      </>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${badge}`}>
                        {t(`status.${property.status ?? 'PENDING'}`)}
                      </span>
                      <span className="text-[11px] text-muted">#{property.id} · {formatDate(property.createdAt, i18n.language)}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 break-words font-semibold text-ink">{property.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                      {formatPrice(property.price, property.currency, i18n.language)} ·{' '}
                      {locationLabel(property.city, t)} ·{' '}
                      {t(property.listingType === 'SALE' ? 'listingType.sale' : 'listingType.rent')} ·{' '}
                      {t('property.rooms', { count: property.rooms })}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                      <span className="line-clamp-1">{property.owner?.fullName}</span>
                      {property.owner?.phone && (
                        <span className="inline-flex items-center gap-1"><Phone size={11} aria-hidden="true" />{property.owner.phone}</span>
                      )}
                      {property.owner?.telegram && (
                        <span className="inline-flex items-center gap-1"><Send size={11} aria-hidden="true" />{property.owner.telegram}</span>
                      )}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                      {property.status !== 'APPROVED' && (
                        <button disabled={busy || loading} onClick={() => setConfirmation({ kind: 'status', id: property.id, next: 'APPROVED' })}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-accent px-2.5 text-xs font-semibold text-on-accent disabled:opacity-60">
                          <Check size={13} aria-hidden="true" />{t('admin.approve')}
                        </button>
                      )}
                      {property.status !== 'REJECTED' && (
                        <button disabled={busy || loading} onClick={() => setConfirmation({ kind: 'status', id: property.id, next: 'REJECTED' })}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-line px-2.5 text-xs disabled:opacity-60">
                          <X size={13} aria-hidden="true" />{t('admin.reject')}
                        </button>
                      )}
                      {property.status === 'APPROVED' && (
                        <button disabled={busy || loading} onClick={() => setConfirmation({ kind: 'status', id: property.id, next: 'PENDING' })}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-line px-2.5 text-xs disabled:opacity-60">
                          <Clock size={13} aria-hidden="true" />{t('admin.review')}
                        </button>
                      )}
                      <button onClick={() => setDetailsId(property.id)} aria-label={t('admin.details')} title={t('admin.details')}
                        className="inline-flex size-8 items-center justify-center rounded-md border border-line"><Eye size={14} aria-hidden="true" /></button>
                      <Link to={`/elonlar/${property.id}/tahrir`} aria-label={t('common.edit')} title={t('common.edit')}
                        className="inline-flex size-8 items-center justify-center rounded-md border border-line"><Pencil size={14} aria-hidden="true" /></Link>
                      <button type="button" disabled={busy || loading} aria-label={t('common.delete')} title={t('common.delete')}
                        onClick={() => setConfirmation({ kind: 'property', property })}
                        className="inline-flex size-8 items-center justify-center rounded-md border border-line text-danger disabled:opacity-60"><Trash2 size={14} aria-hidden="true" /></button>
                    </div>
                  </div>
                </article>
              )
            })}
            {!loading && !error && properties.length === 0 && (
              <p className="text-sm text-muted">
                {t('home.listings.emptyTitle')}
              </p>
            )}
          </div>
        </>
      )}
      {tab === 'users' && (
        <>
          <form
            noValidate
            onSubmit={submitUserSearch}
            className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor="user-search"
                className="mb-1 block text-sm text-muted"
              >
                {t('admin.searchUsers')}
              </label>
              <input
                id="user-search"
                type="search"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder={t('admin.searchUsersHint')}
                className="h-11 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="min-h-11 rounded bg-accent px-4 text-sm font-semibold text-on-accent"
              >
                {t('admin.searchAction')}
              </button>
              {(userQuery || userRole) && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftQuery('')
                    applyUserFilters({ q: '', role: undefined })
                  }}
                  className="min-h-11 rounded border border-line px-3 text-sm text-ink"
                >
                  {t('common.clear')}
                </button>
              )}
            </div>
          </form>
          <div
            role="group"
            aria-label={t('admin.roleFilter')}
            className="mt-3 flex flex-wrap gap-2"
          >
            {([undefined, 'USER', 'ADMIN'] as const).map((value) => (
              <button
                key={value ?? 'all'}
                type="button"
                aria-pressed={userRole === value}
                onClick={() => applyUserFilters({ role: value })}
                className={`rounded-md px-3 py-2 text-sm ${userRole === value ? 'bg-accent text-on-accent' : 'border border-line bg-surface text-ink'}`}
              >
                {value ? t(`roles.${value}`) : t('admin.allRoles')}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            {t('admin.usersTotal', {
              value: formatNumber(total, i18n.language),
            })}
          </p>
          <div className="mt-3 grid gap-2">
            {users.map((user) => (
              <article
                key={user.id}
                className="min-w-0 rounded-lg border border-line bg-surface p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openUser(user)}
                        className="break-words text-left text-sm font-semibold text-ink underline-offset-4 hover:underline"
                      >
                        {user.fullName || user.email}
                      </button>
                      <p className="break-all text-xs text-muted">
                        {user.email}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                        {user.phone && <span>{user.phone}</span>}
                        {user.telegram && <span>{user.telegram}</span>}
                      </p>
                      <p className="mt-1 break-words text-xs text-muted">
                        {t(`roles.${user.role}`)} ·{' '}
                        {t('admin.userStats', {
                          listings: formatNumber(
                            user._count?.properties ?? 0,
                            i18n.language,
                          ),
                          inquiries: formatNumber(
                            user._count?.inquiries ?? 0,
                            i18n.language,
                          ),
                        })}{' '}
                        · {t('common.date')}:{' '}
                        {formatDate(user.createdAt, i18n.language)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-2 md:justify-end">
                    <button type="button" onClick={() => openUser(user)} className="min-h-11 rounded border border-line px-3 text-sm">{t('admin.details')}</button>
                    <button type="button" onClick={() => viewUserListings(user.id)} className="min-h-11 rounded border border-line px-3 text-sm">{t('admin.viewListings')}</button>
                    {user.role !== 'ADMIN' && user.id !== auth.user?.id && <button type="button" disabled={busy || loading} onClick={() => setConfirmation({ kind: 'user', user })} className="min-h-11 rounded border border-line px-3 text-sm text-danger disabled:opacity-60">{t('common.delete')}</button>}
                  </div>
                </div>
              </article>
            ))}
            {!loading && !error && users.length === 0 && (
              <p className="text-sm text-muted">
                {userQuery || userRole
                  ? t('admin.emptyUsersFiltered')
                  : t('admin.emptyUsers')}
              </p>
            )}
          </div>
        </>
      )}
      {tab !== 'categories' && totalPages > 1 && (
        <nav aria-label={t('admin.pagination')} className="mt-5 flex items-center justify-center gap-3">
          <button disabled={loading || page <= 1} className="min-h-11 rounded border border-line px-3 disabled:opacity-50" onClick={() => setParams((current) => { current.set('page', String(page - 1)); return current })}>←</button>
          <span>{formatNumber(page, i18n.language)} / {formatNumber(totalPages, i18n.language)}</span>
          <button disabled={loading || page >= totalPages} className="min-h-11 rounded border border-line px-3 disabled:opacity-50" onClick={() => setParams((current) => { current.set('page', String(page + 1)); return current })}>→</button>
        </nav>
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
              disabled={busy || loading}
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
                  disabled={busy || loading}
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
      {userDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-details-title"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
        >
          <div className="max-h-[85vh] w-full min-w-0 max-w-2xl overflow-auto rounded-lg bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <UserAvatar user={userDetails} />
                <div className="min-w-0">
                  <h2
                    id="user-details-title"
                    className="min-w-0 break-words font-display text-xl text-ink"
                  >
                    {userDetails.fullName || userDetails.email}
                  </h2>
                  <p className="mt-1 break-all text-xs text-muted">
                    {userDetails.email}
                  </p>
                </div>
              </div>
              <button
                autoFocus
                type="button"
                onClick={() => {
                  setUserDetails(null)
                  userDetailsRef.current = null
                }}
                className="shrink-0 px-2 py-1 text-sm text-muted hover:text-ink"
              >
                {t('common.close')}
              </button>
            </div>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {userDetails.phone && <span>{userDetails.phone}</span>}
              {userDetails.telegram && <span>{userDetails.telegram}</span>}
              <span>{t(`roles.${userDetails.role}`)}</span>
              <span>
                {t('common.date')}:{' '}
                {formatDate(userDetails.createdAt, i18n.language)}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted">
              {t('admin.userStats', {
                listings: formatNumber(
                  userDetails._count?.properties ?? 0,
                  i18n.language,
                ),
                inquiries: formatNumber(
                  userDetails._count?.inquiries ?? 0,
                  i18n.language,
                ),
              })}
            </p>
            <h3 className="mt-4 font-display text-lg text-ink">
              {t('admin.userListingsTitle')}
            </h3>
            {userListingsState === 'loading' && (
              <p role="status" className="mt-2 text-sm text-muted">
                {t('common.loading')}
              </p>
            )}
            {userListingsState === 'error' && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {t(userListingsError ?? 'admin.userListingsError')}
              </p>
            )}
            {userListingsState === 'ready' && userListings.length === 0 && (
              <p className="mt-2 text-sm text-muted">
                {t('admin.userListingsEmpty')}
              </p>
            )}
            <div className="mt-2 grid gap-2">
              {userListings.map((listing) => (
                <div
                  key={listing.id}
                  className="min-w-0 rounded-md border border-line p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-sm font-semibold text-ink">
                      {listing.title}
                    </p>
                    <span className="rounded bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                      {t(`status.${listing.status ?? 'PENDING'}`)}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-xs text-muted">
                    {locationLabel(listing.city, t)} ·{' '}
                    {formatPrice(
                      listing.price,
                      listing.currency,
                      i18n.language,
                    )}{' '}
                    · {t('property.rooms', { count: listing.rooms })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      to={`/elonlar/${listing.id}`}
                      className="rounded border border-line px-3 py-1.5 text-xs"
                    >
                      {t('common.view')}
                    </Link>
                    <Link
                      to={`/elonlar/${listing.id}/tahrir`}
                      className="rounded border border-line px-3 py-1.5 text-xs"
                    >
                      {t('common.edit')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
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
              : confirmation.kind === 'user' ? 'admin.deleteUserConfirm'
                : confirmation.kind === 'property' ? 'seller.deleteConfirm'
                  : 'admin.deleteCategoryConfirm'
          }
          values={
            confirmation.kind === 'status'
              ? {
                  id: formatNumber(confirmation.id, i18n.language),
                  status: t(`status.${confirmation.next}`),
                }
              : confirmation.kind === 'user' ? { name: confirmation.user.fullName }
                : confirmation.kind === 'property' ? { title: confirmation.property.title }
                  : { name: categoryLabel(confirmation.category, t) }
          }
          confirmKey={
            confirmation.kind !== 'status'
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
              : confirmation.kind === 'category' ? removeCategory(confirmation.category)
                : removeAccountOrProperty()
          }
          onCancel={() => setConfirmation(null)}
        />
      )}
    </section>
  )
}
